import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';
import { ScmIntegrations } from '@backstage/integration';
import {
  createTemplateAction,
  parseRepoUrl,
  scaffolderActionsExtensionPoint,
} from '@backstage/plugin-scaffolder-node';
import * as azureDevopsNodeApi from 'azure-devops-node-api';
import type { GitPullRequest } from 'azure-devops-node-api/interfaces/GitInterfaces';
import type { IPolicyApi } from 'azure-devops-node-api/PolicyApi';
import type { PolicyConfiguration } from 'azure-devops-node-api/interfaces/PolicyInterfaces';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  buildAzureDevOpsBuildDefinitionUrl,
  buildAzureDevOpsBuildRunUrl,
  buildAzureDevOpsRepoWebUrl,
  createValuesContent,
  normalizeOptionalNumber,
  normalizeOptionalString,
  resolveSystemFromOwner,
} from './scaffolderUtils';

const execFileAsync = promisify(execFile);
const defaultGitOpsEnvironments = ['dev', 'rc', 'stg', 'prd'];

type ExecGitOptions = {
  args: string[];
  cwd?: string;
  authHeader?: string;
};

async function runGit({ args, cwd, authHeader }: ExecGitOptions) {
  await execFileAsync(
    'git',
    authHeader ? ['-c', `http.extraHeader=${authHeader}`, ...args] : args,
    { cwd },
  );
}

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function createAndPushBranch(params: {
  repoPath: string;
  sourceRef: string;
  branchName: string;
  authHeader: string;
}) {
  await runGit({
    args: ['checkout', '-B', params.branchName, params.sourceRef],
    cwd: params.repoPath,
  });
  await runGit({
    args: ['push', '--set-upstream', 'origin', params.branchName],
    cwd: params.repoPath,
    authHeader: params.authHeader,
  });
}

async function findAzureIdentityIds(params: {
  organization: string;
  token: string;
  principalNames: string[];
}) {
  const ids: string[] = [];

  for (const principalName of params.principalNames) {
    const response = await fetch(
      `https://vssps.dev.azure.com/${params.organization}/_apis/identities?searchFilter=General&filterValue=${encodeURIComponent(
        principalName,
      )}&queryMembership=None&api-version=7.1-preview.1`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${params.token}`).toString('base64')}`,
        },
      },
    );

    if (!response.ok) {
      continue;
    }

    const body = (await response.json()) as {
      value?: Array<{ id?: string; providerDisplayName?: string; customDisplayName?: string }>;
    };
    const match = body.value?.find(
      candidate =>
        candidate.providerDisplayName === principalName ||
        candidate.customDisplayName === principalName,
    );

    if (match?.id) {
      ids.push(match.id);
    }
  }

  return ids;
}

function buildBranchScope(repositoryId: string, branchName: string) {
  return [
    {
      repositoryId,
      refName: `refs/heads/${branchName}`,
      matchKind: 'Exact',
    },
  ];
}

async function upsertBranchPolicy(params: {
  policyApi: IPolicyApi;
  project: string;
  repositoryId: string;
  branchName: string;
  typeId: string;
  isBlocking: boolean;
  settings: Record<string, unknown>;
}) {
  const existingPolicies = await params.policyApi.getPolicyConfigurations(
    params.project,
  );
  const existing = existingPolicies.find(
    (policy: PolicyConfiguration) =>
      policy.type?.id === params.typeId &&
      Array.isArray(policy.settings?.scope) &&
      policy.settings.scope.some(
        (scope: { repositoryId?: string; refName?: string }) =>
          scope.repositoryId === params.repositoryId &&
          scope.refName === `refs/heads/${params.branchName}`,
      ),
  );

  const configuration = {
    isEnabled: true,
    isBlocking: params.isBlocking,
    type: { id: params.typeId },
    settings: {
      ...params.settings,
      scope: buildBranchScope(params.repositoryId, params.branchName),
    },
  };

  if (existing?.id) {
    await params.policyApi.updatePolicyConfiguration(
      {
        ...existing,
        ...configuration,
        id: existing.id,
      },
      params.project,
      existing.id,
    );
    return;
  }

  await params.policyApi.createPolicyConfiguration(configuration, params.project);
}

async function authorizePipelineForRepositoryResource(params: {
  organization: string;
  pipelineProject: string;
  resourceProject: string;
  repositoryId: string;
  repositoryName: string;
  pipelineId: number;
  token: string;
}) {
  const response = await fetch(
    `https://dev.azure.com/${params.organization}/${params.pipelineProject}/_apis/pipelines/pipelinepermissions?api-version=7.1-preview.1`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Basic ${Buffer.from(`:${params.token}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          resource: {
            type: 'repository',
            id: params.repositoryId,
            name:
              params.resourceProject === params.pipelineProject
                ? params.repositoryName
                : `${params.resourceProject}/${params.repositoryName}`,
          },
          pipelines: [
            {
              id: params.pipelineId,
              authorized: true,
            },
          ],
        },
      ]),
    },
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to authorize pipeline ${params.pipelineId} for repository ${params.resourceProject}/${params.repositoryName}: ${response.status} ${response.statusText} ${responseText}`,
    );
  }
}

export const shieldScaffolderModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'shield-platform',
  register(env) {
    env.registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
      },
      async init({ scaffolderActions, config }) {
        const integrations = ScmIntegrations.fromConfig(config);

        scaffolderActions.addActions(
          createTemplateAction({
            id: 'shield:owner:resolve-system',
            description:
              'Derives the Backstage system name from the selected owner squad.',
            schema: {
              input: {
                owner: z =>
                  z.string({
                    description:
                      'Owner entity reference used to resolve the matching system.',
                  }),
              },
              output: {
                system: z =>
                  z.string({
                    description: 'Resolved Backstage system name for the owner.',
                  }),
              },
            },
            async handler(ctx) {
              ctx.output('system', resolveSystemFromOwner(ctx.input.owner));
            },
          }),
          createTemplateAction({
            id: 'azure:project:ensure-environments',
            description:
              'Ensures Azure DevOps environments exist in the target project.',
            schema: {
              input: {
                project: z => z.string(),
                environments: z => z.array(z.string()).optional(),
                descriptions: z =>
                  z.record(z.string()).optional(),
                token: z =>
                  z
                    .string({
                      description:
                        'Optional PAT. When omitted, the action uses AZURE_DEVOPS_PAT.',
                    })
                    .optional(),
              },
              output: {
                environments: z => z.array(z.string()),
              },
            },
            async handler(ctx) {
              const {
                project,
                environments = ['dev', 'rc', 'stg', 'prd'],
                descriptions = {},
                token,
              } = ctx.input;
              const azureToken = token ?? process.env.AZURE_DEVOPS_PAT;
              const organization =
                config.getOptionalString(
                  'shield.integrations.azureDevOps.organization',
                ) ?? 'argosolutions';

              if (!azureToken) {
                throw new InputError(
                  'No Azure DevOps PAT configured. Set AZURE_DEVOPS_PAT in the backend environment.',
                );
              }

              const authHandler =
                azureDevopsNodeApi.getPersonalAccessTokenHandler(azureToken);
              const webApi = new azureDevopsNodeApi.WebApi(
                `https://dev.azure.com/${organization}`,
                authHandler,
              );
              const taskAgentApi = await webApi.getTaskAgentApi();

              for (const environmentName of environments) {
                const existing = await taskAgentApi.getEnvironments(
                  project,
                  environmentName,
                );
                const alreadyExists = existing.some(
                  environment =>
                    environment.name?.toLowerCase() === environmentName.toLowerCase(),
                );

                if (alreadyExists) {
                  ctx.logger.info(
                    `Azure DevOps environment ${project}/${environmentName} already exists, skipping.`,
                  );
                  continue;
                }

                await taskAgentApi.addEnvironment(
                  {
                    name: environmentName,
                    description:
                      descriptions[environmentName] ??
                      `Environment ${environmentName} bootstrapado pelo SHIELD Platform.`,
                  },
                  project,
                );
                ctx.logger.info(
                  `Created Azure DevOps environment ${project}/${environmentName}.`,
                );
              }

              ctx.output('environments', environments);
            },
          }),
          createTemplateAction({
            id: 'azure:repo:create-pipeline-and-run',
            description:
              'Creates an Azure DevOps YAML pipeline for the repository and runs it immediately.',
            schema: {
              input: {
                repoUrl: z =>
                  z.string({
                    description:
                      'Repository location in the form dev.azure.com?organization=...&project=...&repo=...',
                  }),
                pipelineName: z => z.string(),
                yamlPath: z =>
                  z
                    .string({
                      description: 'Path to azure-pipelines.yml inside the repository.',
                    })
                    .optional(),
                branchName: z =>
                  z
                    .string({
                      description: 'Branch used for the first pipeline run.',
                    })
                    .optional(),
                folder: z =>
                  z
                    .string({
                      description: 'Optional folder for the pipeline.',
                    })
                    .optional(),
                token: z =>
                  z
                    .string({
                      description:
                        'Optional PAT. When omitted, the action uses AZURE_DEVOPS_PAT.',
                    })
                    .optional(),
              },
              output: {
                pipelineId: z => z.number(),
                pipelineName: z => z.string(),
                pipelineUrl: z => z.string().optional(),
                runId: z => z.number().optional(),
                runUrl: z => z.string().optional(),
                runPendingAuthorization: z => z.boolean().optional(),
                runWarning: z => z.string().optional(),
                pipelineCreated: z => z.boolean().optional(),
                runQueued: z => z.boolean().optional(),
              },
            },
            async handler(ctx) {
              const {
                repoUrl,
                pipelineName,
                yamlPath = '/azure-pipelines.yml',
                branchName = 'developer',
                folder = '\\',
                token,
              } = ctx.input;
              const azureToken = token ?? process.env.AZURE_DEVOPS_PAT;
              const normalizedFolder =
                !folder || folder.trim() === '' || folder.trim() === '/'
                  ? '\\'
                  : folder;

              if (!azureToken) {
                throw new InputError(
                  'No Azure DevOps PAT configured. Set AZURE_DEVOPS_PAT in the backend environment.',
                );
              }

              const { project, repo, host, organization } = parseRepoUrl(
                repoUrl,
                integrations,
              );

              if (!organization || !project) {
                throw new InputError(
                  `Invalid Azure DevOps repoUrl: ${repoUrl}. The organization and project query parameters are required.`,
                );
              }

              const authHandler =
                azureDevopsNodeApi.getPersonalAccessTokenHandler(azureToken);
              const webApi = new azureDevopsNodeApi.WebApi(
                `https://${host}/${organization}`,
                authHandler,
              );
              const gitApi = await webApi.getGitApi();
              const buildApi = await webApi.getBuildApi();
              const sharedTemplatesProject =
                config.getOptionalString(
                  'shield.integrations.azureDevOps.defaultProject',
                ) ?? 'Root Cause';
              const sharedTemplatesRepo =
                config.getOptionalString(
                  'shield.integrations.azureDevOps.templatesRepo',
                ) ?? 'poc-argo-code';
              const repository = await gitApi.getRepository(repo, project);

              if (!repository?.id) {
                throw new InputError(
                  `Unable to resolve repository id for ${project}/${repo} when creating the pipeline.`,
                );
              }
              let pipeline;
              let pipelineUrl: string | undefined;
              let run;
              let runPendingAuthorization = false;
              let runWarning: string | undefined;
              let pipelineCreated = false;
              let runQueued = false;

              try {
                const existingDefinitions = await buildApi.getDefinitions(
                  project,
                  pipelineName,
                  repository.id,
                  'TfsGit',
                );
                pipeline = existingDefinitions.find(
                  item => item.name?.toLowerCase() === pipelineName.toLowerCase(),
                );

                if (!pipeline?.id) {
                  pipeline = await buildApi.createDefinition(
                    {
                      name: pipelineName,
                      path: normalizedFolder,
                      type: 'build',
                      process: {
                        type: 2,
                        yamlFilename: yamlPath.replace(/^\//, ''),
                      } as any,
                      repository: {
                        id: repository.id,
                        name: repository.name,
                        type: 'TfsGit',
                        url: repository.webUrl ?? repository.remoteUrl,
                        defaultBranch: `refs/heads/${branchName}`,
                        clean: 'false',
                      } as any,
                    } as any,
                    project,
                  );
                  pipelineCreated = true;
                  ctx.logger.info(
                    `Created Azure DevOps pipeline ${project}/${pipelineName} (${pipeline.id}).`,
                  );
                } else {
                  pipelineCreated = true;
                  ctx.logger.info(
                    `Azure DevOps pipeline ${project}/${pipelineName} already exists, reusing ${pipeline.id}.`,
                  );
                }

                if (!pipeline?.id) {
                  throw new Error(
                    `Pipeline ${pipelineName} could not be resolved after creation.`,
                  );
                }

                pipelineUrl = buildAzureDevOpsBuildDefinitionUrl({
                  organization,
                  project,
                  definitionId: pipeline.id,
                });
                const sharedTemplatesRepository = await gitApi.getRepository(
                  sharedTemplatesRepo,
                  sharedTemplatesProject,
                );
                let resourceAuthorizationPending = false;

                try {
                  await authorizePipelineForRepositoryResource({
                    organization,
                    pipelineProject: project,
                    resourceProject: project,
                    repositoryId: repository.id,
                    repositoryName: repository.name ?? repo,
                    pipelineId: pipeline.id,
                    token: azureToken,
                  });
                  ctx.logger.info(
                    `Authorized pipeline ${project}/${pipelineName} for repository ${project}/${repo}.`,
                  );
                } catch (error) {
                  resourceAuthorizationPending = true;
                  ctx.logger.warn(
                    `Could not pre-authorize ${project}/${repo} for pipeline ${project}/${pipelineName}: ${error}`,
                  );
                }

                if (sharedTemplatesRepository?.id) {
                  try {
                    await authorizePipelineForRepositoryResource({
                      organization,
                      pipelineProject: project,
                      resourceProject: sharedTemplatesProject,
                      repositoryId: sharedTemplatesRepository.id,
                      repositoryName:
                        sharedTemplatesRepository.name ?? sharedTemplatesRepo,
                      pipelineId: pipeline.id,
                      token: azureToken,
                    });
                    ctx.logger.info(
                      `Authorized pipeline ${project}/${pipelineName} for repository ${sharedTemplatesProject}/${sharedTemplatesRepo}.`,
                    );
                  } catch (error) {
                    resourceAuthorizationPending = true;
                    ctx.logger.warn(
                      `Could not pre-authorize ${sharedTemplatesProject}/${sharedTemplatesRepo} for pipeline ${project}/${pipelineName}: ${error}`,
                    );
                  }
                } else {
                  ctx.logger.warn(
                    `Shared templates repository ${sharedTemplatesProject}/${sharedTemplatesRepo} could not be resolved for pipeline authorization.`,
                  );
                }

                try {
                  run = await buildApi.queueBuild(
                    {
                      definition: {
                        id: pipeline.id,
                      } as any,
                      sourceBranch: `refs/heads/${branchName}`,
                    } as any,
                    project,
                    true,
                  );
                  runQueued = true;
                } catch (error: any) {
                  const validationResults = Array.isArray(error?.result?.validationResults)
                    ? error.result.validationResults
                        .map(
                          (item: { message?: string; result?: string | number }) =>
                            `${item.result ?? 'unknown'}: ${item.message ?? 'No validation message provided.'}`,
                        )
                        .join(' | ')
                    : undefined;
                  const responseHeaders = error?.responseHeaders
                    ? JSON.stringify(error.responseHeaders)
                    : undefined;
                  const errorMessage = String(error?.message ?? '');
                  const isAuthorizationGate =
                    resourceAuthorizationPending &&
                    !validationResults &&
                    /validation errors or warnings/i.test(errorMessage);

                  if (isAuthorizationGate) {
                    runPendingAuthorization = true;
                    runWarning =
                      `Pipeline ${project}/${pipelineName} foi criada, mas a primeira execucao exige autorizacao manual do recurso compartilhado ${sharedTemplatesProject}/${sharedTemplatesRepo}. Siga pelo link da pipeline para aprovar e executar manualmente.`;
                    ctx.logger.warn(runWarning);
                    ctx.logger.warn(
                      `Abra ${pipelineUrl} e autorize o repositório compartilhado antes da primeira execução.`,
                    );
                  } else {
                    const errorParts = [
                      `Pipeline ${project}/${pipelineName} criada, mas a primeira execucao nao foi enfileirada automaticamente. A pipeline devera ser validada e executada manualmente no Azure DevOps.`,
                      validationResults,
                      error?.message,
                      responseHeaders,
                      pipelineUrl ? `Pipeline URL: ${pipelineUrl}` : undefined,
                    ].filter(Boolean);

                    runWarning = errorParts.join(' ');
                    ctx.logger.warn(runWarning);
                  }
                }
              } catch (error: any) {
                runWarning = [
                  `Nao foi possivel criar ou preparar a pipeline ${project}/${pipelineName}. A pipeline devera ser criada manualmente no Azure DevOps.`,
                  error?.message ?? String(error),
                ].join(' ');
                ctx.logger.warn(runWarning);
              }

              const runUrl =
                run?.id && pipelineCreated
                  ? buildAzureDevOpsBuildRunUrl({
                      organization,
                      project,
                      buildId: run.id,
                    })
                  : pipelineUrl;

              ctx.output('pipelineId', pipeline?.id ?? 0);
              ctx.output(
                'pipelineName',
                normalizeOptionalString(pipeline?.name) ?? pipelineName,
              );
              ctx.output('pipelineUrl', normalizeOptionalString(pipelineUrl));
              ctx.output('runId', run?.id);
              ctx.output('runUrl', normalizeOptionalString(runUrl));
              ctx.output('runPendingAuthorization', runPendingAuthorization);
              ctx.output('runWarning', normalizeOptionalString(runWarning));
              ctx.output('pipelineCreated', pipelineCreated);
              ctx.output('runQueued', runQueued);
            },
          }),
          createTemplateAction({
            id: 'azure:repo:bootstrap-branches',
            description:
              'Creates the default branch layout for a newly created Azure DevOps repository.',
            schema: {
              input: {
                repoUrl: z =>
                  z.string({
                    description:
                      'Repository location in the form dev.azure.com?organization=...&project=...&repo=...',
                  }),
                sourceBranch: z =>
                  z
                    .string({
                      description:
                        'Branch that already exists after publish:azure and is used as the bootstrap source.',
                    })
                    .optional(),
                defaultBranch: z =>
                  z
                    .string({
                      description: 'Default branch to configure in Azure DevOps.',
                    })
                    .optional(),
                mainBranch: z =>
                  z
                    .string({
                      description: 'Main integration branch created in the repository.',
                    })
                    .optional(),
                releaseBranch: z =>
                  z
                    .string({
                      description:
                        'Seed release branch created so the release/* convention already exists in the repository.',
                    })
                    .optional(),
                featureBranch: z =>
                  z
                    .string({
                      description:
                        'Seed feature branch created so the feature/* convention already exists in the repository.',
                    })
                    .optional(),
                token: z =>
                  z
                    .string({
                      description:
                        'Optional PAT. When omitted, the action uses AZURE_DEVOPS_PAT.',
                    })
                    .optional(),
              },
              output: {
                defaultBranch: z => z.string(),
                mainBranch: z => z.string(),
                featureBranch: z => z.string(),
                releaseBranch: z => z.string(),
              },
            },
            async handler(ctx) {
              const {
                repoUrl,
                sourceBranch = 'main',
                defaultBranch = 'developer',
                mainBranch = 'main',
                featureBranch = 'feature/bootstrap',
                releaseBranch = 'release/bootstrap',
                token,
              } = ctx.input;
              const azureToken = token ?? process.env.AZURE_DEVOPS_PAT;

              if (!azureToken) {
                throw new InputError(
                  'No Azure DevOps PAT configured. Set AZURE_DEVOPS_PAT in the backend environment.',
                );
              }

              const { project, repo, host, organization } = parseRepoUrl(
                repoUrl,
                integrations,
              );

              if (!organization || !project) {
                throw new InputError(
                  `Invalid Azure DevOps repoUrl: ${repoUrl}. The organization and project query parameters are required.`,
                );
              }

              const authHeader = `AUTHORIZATION: Basic ${Buffer.from(
                `:${azureToken}`,
              ).toString('base64')}`;
              const authHandler =
                azureDevopsNodeApi.getPersonalAccessTokenHandler(azureToken);
              const webApi = new azureDevopsNodeApi.WebApi(
                `https://${host}/${organization}`,
                authHandler,
              );
              const gitApi = await webApi.getGitApi();
              const cloneUrl = buildAzureDevOpsRepoWebUrl({
                host,
                organization,
                project,
                repo,
              });
              const worktreePath = await mkdtemp(
                resolve(tmpdir(), 'shield-repo-branches-'),
              );
              const repoPath = resolve(worktreePath, repo);

              try {
                await runGit({
                  args: [
                    'clone',
                    '--branch',
                    sourceBranch,
                    '--single-branch',
                    cloneUrl,
                    repoPath,
                  ],
                  authHeader,
                });

                await createAndPushBranch({
                  repoPath,
                  sourceRef: `origin/${sourceBranch}`,
                  branchName: defaultBranch,
                  authHeader,
                });
                if (mainBranch !== sourceBranch) {
                  await createAndPushBranch({
                    repoPath,
                    sourceRef: `origin/${sourceBranch}`,
                    branchName: mainBranch,
                    authHeader,
                  });
                }
                await createAndPushBranch({
                  repoPath,
                  sourceRef: `origin/${sourceBranch}`,
                  branchName: featureBranch,
                  authHeader,
                });
                await createAndPushBranch({
                  repoPath,
                  sourceRef: `origin/${sourceBranch}`,
                  branchName: releaseBranch,
                  authHeader,
                });

                const repository = await gitApi.getRepository(repo, project);
                if (!repository?.id) {
                  throw new InputError(
                    `Unable to resolve repository id for ${project}/${repo} when configuring default branch.`,
                  );
                }

                await gitApi.updateRepository(
                  {
                    defaultBranch: `refs/heads/${defaultBranch}`,
                  },
                  repository.id,
                  project,
                );

                ctx.output('defaultBranch', defaultBranch);
                ctx.output('mainBranch', mainBranch);
                ctx.output('featureBranch', featureBranch);
                ctx.output('releaseBranch', releaseBranch);
              } finally {
                await rm(worktreePath, { recursive: true, force: true });
              }
            },
          }),
          createTemplateAction({
            id: 'azure:repo:configure-policies',
            description:
              'Configures Azure DevOps branch policies for a repository.',
            schema: {
              input: {
                repoUrl: z =>
                  z.string({
                    description:
                      'Repository location in the form dev.azure.com?organization=...&project=...&repo=...',
                  }),
                branches: z =>
                  z
                    .array(z.string())
                    .describe('Branches that should receive the policy set.')
                    .optional(),
                minimumApproverCount: z =>
                  z.number({ description: 'Minimum number of required reviewers.' }).optional(),
                allowRequestorsToApprove: z =>
                  z.boolean({ description: 'Allow requestors to approve their own changes.' }).optional(),
                blockLastPusherApproval: z =>
                  z.boolean({
                    description:
                      'Prohibit the most recent pusher from approving their own changes.',
                  }).optional(),
                allowCompletionWithRejectsOrWaits: z =>
                  z.boolean({
                    description:
                      'Allow PR completion even if reviewers vote wait or reject.',
                  }).optional(),
                resetOnSourcePush: z =>
                  z.boolean({
                    description: 'Reset reviewer votes when new changes are pushed.',
                  }).optional(),
                requireCommentResolution: z =>
                  z.boolean({ description: 'Require all pull request comments to be resolved.' }).optional(),
                allowBasicNoFastForward: z =>
                  z.boolean({ description: 'Allow basic merge (no fast-forward).' }).optional(),
                allowSquash: z =>
                  z.boolean({ description: 'Allow squash merge.' }).optional(),
                allowRebase: z =>
                  z.boolean({ description: 'Allow rebase and fast-forward.' }).optional(),
                allowRebaseMerge: z =>
                  z.boolean({ description: 'Allow rebase with merge commit.' }).optional(),
                automaticReviewerPrincipalNames: z =>
                  z
                    .array(z.string())
                    .describe('Optional Azure DevOps principal names added as automatic reviewers.')
                    .optional(),
                automaticReviewerRequired: z =>
                  z.boolean({ description: 'Whether automatic reviewers are required.' }).optional(),
                buildValidationPipelineId: z => z.any().optional(),
                token: z =>
                  z
                    .string({
                      description:
                        'Optional PAT. When omitted, the action uses AZURE_DEVOPS_PAT.',
                    })
                    .optional(),
              },
              output: {
                branches: z => z.array(z.string()),
                automaticReviewerIds: z => z.array(z.string()).optional(),
              },
            },
            async handler(ctx) {
              const {
                repoUrl,
                branches = ['main', 'developer'],
                minimumApproverCount = 1,
                allowRequestorsToApprove = true,
                blockLastPusherApproval = false,
                allowCompletionWithRejectsOrWaits = false,
                resetOnSourcePush = false,
                requireCommentResolution = true,
                allowBasicNoFastForward = true,
                allowSquash = true,
                allowRebase = false,
                allowRebaseMerge = false,
                automaticReviewerPrincipalNames = [],
                automaticReviewerRequired = false,
                buildValidationPipelineId,
                token,
              } = ctx.input;
              const normalizedBuildValidationPipelineId =
                normalizeOptionalNumber(buildValidationPipelineId);
              const azureToken = token ?? process.env.AZURE_DEVOPS_PAT;

              if (!azureToken) {
                throw new InputError(
                  'No Azure DevOps PAT configured. Set AZURE_DEVOPS_PAT in the backend environment.',
                );
              }

              const { project, repo, host, organization } = parseRepoUrl(
                repoUrl,
                integrations,
              );

              if (!organization || !project) {
                throw new InputError(
                  `Invalid Azure DevOps repoUrl: ${repoUrl}. The organization and project query parameters are required.`,
                );
              }

              const authHandler =
                azureDevopsNodeApi.getPersonalAccessTokenHandler(azureToken);
              const webApi = new azureDevopsNodeApi.WebApi(
                `https://${host}/${organization}`,
                authHandler,
              );
              const gitApi = await webApi.getGitApi();
              const policyApi = await webApi.getPolicyApi();
              const repository = await gitApi.getRepository(repo, project);

              if (!repository?.id) {
                throw new InputError(
                  `Unable to resolve repository id for ${project}/${repo} when configuring policies.`,
                );
              }

              const policyTypes = await policyApi.getPolicyTypes(project);
              const minReviewersType = policyTypes.find(type =>
                type.displayName?.toLowerCase().includes('minimum number of reviewers'),
              );
              const commentResolutionType = policyTypes.find(type =>
                type.displayName?.toLowerCase().includes('comment requirements'),
              );
              const mergeStrategyType = policyTypes.find(type =>
                type.displayName?.toLowerCase().includes('merge strategy'),
              );
              const requiredReviewersType = policyTypes.find(type =>
                type.displayName?.toLowerCase().includes('required reviewers'),
              );
              const buildType = policyTypes.find(type =>
                type.displayName?.toLowerCase().includes('build'),
              );

              const automaticReviewerIds = automaticReviewerPrincipalNames.length
                ? await findAzureIdentityIds({
                    organization,
                    token: azureToken,
                    principalNames: automaticReviewerPrincipalNames,
                  })
                : [];

              for (const branchName of branches) {
                if (minReviewersType?.id) {
                  await upsertBranchPolicy({
                    policyApi,
                    project,
                    repositoryId: repository.id,
                    branchName,
                    typeId: minReviewersType.id,
                    isBlocking: true,
                    settings: {
                      minimumApproverCount,
                      creatorVoteCounts: allowRequestorsToApprove,
                      prohibitMostRecentPusher: blockLastPusherApproval,
                      allowDownvotes: allowCompletionWithRejectsOrWaits,
                      resetOnSourcePush,
                    },
                  });
                }

                if (requireCommentResolution && commentResolutionType?.id) {
                  await upsertBranchPolicy({
                    policyApi,
                    project,
                    repositoryId: repository.id,
                    branchName,
                    typeId: commentResolutionType.id,
                    isBlocking: true,
                    settings: {},
                  });
                }

                if (mergeStrategyType?.id) {
                  await upsertBranchPolicy({
                    policyApi,
                    project,
                    repositoryId: repository.id,
                    branchName,
                    typeId: mergeStrategyType.id,
                    isBlocking: true,
                    settings: {
                      useSquashMerge: allowSquash,
                      allowNoFastForward: allowBasicNoFastForward,
                      useRebase: allowRebase,
                      useRebaseMerge: allowRebaseMerge,
                    },
                  });
                }

                if (automaticReviewerIds.length && requiredReviewersType?.id) {
                  await upsertBranchPolicy({
                    policyApi,
                    project,
                    repositoryId: repository.id,
                    branchName,
                    typeId: requiredReviewersType.id,
                    isBlocking: automaticReviewerRequired,
                    settings: {
                      requiredReviewerIds: automaticReviewerIds,
                      filenamePatterns: [],
                      addedFilesOnly: false,
                      message:
                        'Reviewers included automatically pelo bootstrap do SHIELD Platform.',
                    },
                  });
                }

                if (normalizedBuildValidationPipelineId && buildType?.id) {
                  await upsertBranchPolicy({
                    policyApi,
                    project,
                    repositoryId: repository.id,
                    branchName,
                    typeId: buildType.id,
                    isBlocking: true,
                    settings: {
                      buildDefinitionId: normalizedBuildValidationPipelineId,
                      queueOnSourceUpdateOnly: true,
                      manualQueueOnly: false,
                      validDuration: 720,
                    },
                  });
                }
              }

              if (automaticReviewerPrincipalNames.length && !automaticReviewerIds.length) {
                ctx.logger.warn(
                  `Automatic reviewers could not be resolved for ${automaticReviewerPrincipalNames.join(', ')}.`,
                );
              }

              ctx.output('branches', branches);
              ctx.output('automaticReviewerIds', automaticReviewerIds);
            },
          }),
          createTemplateAction({
            id: 'azure:gitops:bootstrap',
            description:
              'Creates the initial GitOps structure at gitops/apps/<tier>/<service>/<environment>/values.yaml for Azure DevOps.',
            schema: {
              input: {
                repoUrl: z =>
                  z.string({
                    description:
                      'GitOps repository location in the form dev.azure.com?organization=...&project=...&repo=...',
                  }),
                serviceName: z =>
                  z.string({ description: 'Service name to bootstrap in GitOps.' }),
                tier: z =>
                  z.string({
                    description:
                      'Layer used in GitOps, for example backend or frontend.',
                  }),
                defaultEnvironment: z =>
                  z
                    .string({
                      description:
                        'Default environment used for links and entity annotations.',
                    })
                    .optional(),
                environments: z =>
                  z
                    .array(z.string())
                    .describe('Environment folders that should receive a values.yaml.')
                    .optional(),
                namespace: z =>
                  z
                    .string({
                      description: 'Default Kubernetes namespace for the generated values files.',
                    })
                    .optional(),
                imageRepository: z =>
                  z
                    .string({
                      description:
                        'Image repository written into the initial values.yaml files.',
                    })
                    .optional(),
                projectContext: z =>
                  z
                    .string({
                      description:
                        'Project or product context used in the GitOps and ExternalSecret conventions.',
                    })
                    .optional(),
                owner: z =>
                  z
                    .string({
                      description:
                        'Owner entity reference used to infer the GitOps project context when no explicit context is provided.',
                    })
                    .optional(),
                labelOwner: z =>
                  z
                    .string({ description: 'Value written into labels.owner.' })
                    .optional(),
                labelTeam: z =>
                  z
                    .string({ description: 'Value written into labels.team.' })
                    .optional(),
                labelDepartment: z =>
                  z
                    .string({ description: 'Value written into labels.department.' })
                    .optional(),
                servicePort: z =>
                  z
                    .number({ description: 'ClusterIP port written into the values.yaml.' })
                    .optional(),
                telemetryInjectionAnnotation: z =>
                  z
                    .string({
                      description:
                        'Annotation key used in podAnnotations for OpenTelemetry injection.',
                    })
                    .optional(),
                defaultBranch: z =>
                  z
                    .string({ description: 'Target branch in the GitOps repository.' })
                    .optional(),
                featureBranchName: z =>
                  z
                    .string({
                      description: 'Feature branch used for the GitOps pull request.',
                    })
                    .optional(),
                token: z =>
                  z
                    .string({
                      description:
                        'Optional PAT. When omitted, the action uses AZURE_DEVOPS_GITOPS_PAT or AZURE_DEVOPS_PAT.',
                    })
                    .optional(),
                gitAuthorName: z =>
                  z
                    .string({ description: 'Commit author name for the GitOps repository.' })
                    .optional(),
                gitAuthorEmail: z =>
                  z
                    .string({
                      description: 'Commit author email for the GitOps repository.',
                    })
                    .optional(),
                commitMessage: z =>
                  z
                    .string({ description: 'Commit message for the GitOps repository.' })
                    .optional(),
              },
              output: {
                commitHash: z =>
                  z
                    .string({ description: 'Commit hash created in the GitOps repository.' })
                    .optional(),
                repoContentsUrl: z =>
                  z.string({
                    description: 'Azure DevOps web URL for the GitOps repository.',
                  }),
                valuesPath: z =>
                  z.string({
                    description: 'Relative path to the default values.yaml inside the GitOps repository.',
                  }),
                valuesUrl: z =>
                  z.string({
                    description: 'Azure DevOps web URL for the default values.yaml.',
                  }),
                pullRequestUrl: z =>
                  z
                    .string({
                      description: 'Azure DevOps web URL for the pull request created in the GitOps repository.',
                    })
                    .optional(),
                branchName: z =>
                  z
                    .string({
                      description: 'Feature branch created in the GitOps repository.',
                    })
                    .optional(),
              },
            },
            async handler(ctx) {
              const {
                repoUrl,
                serviceName,
                tier,
                defaultEnvironment = 'dev',
                environments = defaultGitOpsEnvironments,
                namespace = serviceName,
                imageRepository = serviceName,
                projectContext,
                owner,
                labelOwner = 'argoIT',
                labelTeam = 'argoIT',
                labelDepartment = 'TI',
                servicePort = 8080,
                telemetryInjectionAnnotation = 'instrumentation.opentelemetry.io/inject-dotnet',
                defaultBranch = 'main',
                featureBranchName = `feature/${serviceName}`,
                token,
                gitAuthorName,
                gitAuthorEmail,
                commitMessage,
              } = ctx.input;
              const azureToken =
                token ??
                process.env.AZURE_DEVOPS_GITOPS_PAT ??
                process.env.AZURE_DEVOPS_PAT;
              const defaultGitAuthorName =
                config.getOptionalString('scaffolder.defaultAuthor.name') ??
                'ArgoIT Devops';
              const defaultGitAuthorEmail =
                config.getOptionalString('scaffolder.defaultAuthor.email') ??
                'devopsacesso@useargo.com';
              const normalizedProjectContext = (
                projectContext?.split('/').pop()?.split(':').pop() ??
                resolveSystemFromOwner(owner ?? '', undefined) ??
                namespace
              ).trim();

              if (!azureToken) {
                throw new InputError(
                  'No GitOps PAT configured. Set AZURE_DEVOPS_GITOPS_PAT or AZURE_DEVOPS_PAT in the backend environment.',
                );
              }

              const { project, repo, host, organization } = parseRepoUrl(
                repoUrl,
                integrations,
              );

              if (!organization || !project) {
                throw new InputError(
                  `Invalid Azure DevOps repoUrl: ${repoUrl}. The organization and project query parameters are required.`,
                );
              }

              const authHeader = `AUTHORIZATION: Basic ${Buffer.from(
                `:${azureToken}`,
              ).toString('base64')}`;
              const authHandler =
                azureDevopsNodeApi.getPersonalAccessTokenHandler(azureToken);
              const webApi = new azureDevopsNodeApi.WebApi(
                `https://${host}/${organization}`,
                authHandler,
              );
              const gitApi = await webApi.getGitApi();
              const cloneUrl = buildAzureDevOpsRepoWebUrl({
                host,
                organization,
                project,
                repo,
              });
              const repoContentsUrl = cloneUrl;
              const valuesPath = `gitops/apps/${tier}/${serviceName}/${defaultEnvironment}/values.yaml`;
              const valuesUrl = `${cloneUrl}?path=${encodeURIComponent(`/${valuesPath}`)}`;
              const worktreePath = await mkdtemp(
                resolve(tmpdir(), 'shield-gitops-bootstrap-'),
              );
              const repoPath = resolve(worktreePath, repo);

              try {
                ctx.logger.info(
                  `Cloning ${organization}/${project}/${repo} for GitOps bootstrap`,
                );
                await runGit({
                  args: [
                    'clone',
                    '--branch',
                    defaultBranch,
                    '--single-branch',
                    cloneUrl,
                    repoPath,
                  ],
                  authHeader,
                });
                await runGit({
                  args: ['checkout', '-b', featureBranchName, `origin/${defaultBranch}`],
                  cwd: repoPath,
                });

                for (const environment of environments) {
                  const targetDir = resolve(
                    repoPath,
                    'gitops',
                    'apps',
                    tier,
                    serviceName,
                    environment,
                  );
                  const valuesFilePath = resolve(targetDir, 'values.yaml');
                  await mkdir(targetDir, { recursive: true });

                  if (!(await pathExists(valuesFilePath))) {
                    await writeFile(
                      valuesFilePath,
                      createValuesContent({
                        serviceName,
                        environment,
                        namespace,
                        projectContext: normalizedProjectContext,
                        imageRepository,
                        labelOwner,
                        labelTeam,
                        labelDepartment,
                        servicePort,
                        telemetryInjectionAnnotation,
                      }),
                      'utf8',
                    );
                  }
                }

                const { stdout: gitStatus } = await execFileAsync(
                  'git',
                  ['status', '--porcelain'],
                  { cwd: repoPath },
                );

                let outputCommitHash: string | undefined;
                let pullRequestUrl: string | undefined;

                if (gitStatus.trim()) {
                  await runGit({ args: ['add', '.'], cwd: repoPath });
                  await runGit({
                    args: ['config', 'user.name', gitAuthorName ?? defaultGitAuthorName],
                    cwd: repoPath,
                  });
                  await runGit({
                    args: [
                      'config',
                      'user.email',
                      gitAuthorEmail ?? defaultGitAuthorEmail,
                    ],
                    cwd: repoPath,
                  });
                  await runGit({
                    args: [
                      'commit',
                      '-m',
                      commitMessage ??
                        `chore(gitops): bootstrap ${serviceName} in gitops/apps/${tier}/${serviceName}`,
                    ],
                    cwd: repoPath,
                  });
                  await runGit({
                    args: ['push', '--set-upstream', 'origin', featureBranchName],
                    cwd: repoPath,
                    authHeader,
                  });

                  const { stdout: commitHash } = await execFileAsync(
                    'git',
                    ['rev-parse', 'HEAD'],
                    { cwd: repoPath },
                  );
                  outputCommitHash = commitHash.trim();

                  const repository = await gitApi.getRepository(repo, project);
                  if (!repository?.id) {
                    throw new InputError(
                      `Unable to resolve repository id for ${project}/${repo} when creating the GitOps pull request.`,
                    );
                  }

                  const pullRequest = (await gitApi.createPullRequest(
                    {
                      title: `Bootstrap ${serviceName} in GitOps`,
                      description:
                        `PR criada automaticamente pelo SHIELD Platform para adicionar ${serviceName} em gitops/apps/${tier}/${serviceName}.`,
                      sourceRefName: `refs/heads/${featureBranchName}`,
                      targetRefName: `refs/heads/${defaultBranch}`,
                    } as GitPullRequest,
                    repository.id,
                    project,
                  )) as GitPullRequest;

                  pullRequestUrl =
                    pullRequest._links?.web?.href ??
                    (pullRequest.pullRequestId
                      ? `${cloneUrl}/pullrequest/${pullRequest.pullRequestId}`
                      : undefined) ??
                    pullRequest.url ??
                    `${cloneUrl}/pullrequest`;
                  ctx.logger.info(
                    `Created GitOps pull request ${featureBranchName} -> ${defaultBranch}: ${pullRequestUrl}`,
                  );
                }

                ctx.output('commitHash', outputCommitHash);
                ctx.output('repoContentsUrl', repoContentsUrl);
                ctx.output('valuesPath', valuesPath);
                ctx.output('valuesUrl', valuesUrl);
                ctx.output('pullRequestUrl', normalizeOptionalString(pullRequestUrl));
                ctx.output('branchName', featureBranchName);
              } finally {
                await rm(worktreePath, { recursive: true, force: true });
              }
            },
          }),
        );
      },
    });
  },
});

export default shieldScaffolderModule;
