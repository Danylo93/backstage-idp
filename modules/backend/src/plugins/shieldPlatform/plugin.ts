import {
  coreServices,
  createBackendPlugin,
  type LoggerService,
  type RootConfigService,
} from '@backstage/backend-plugin-api';
import { stringifyEntityRef, type Entity } from '@backstage/catalog-model';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import express from 'express';
import {
  buildAzureDevOpsBuildDefinitionUrl,
  buildAzureDevOpsBuildRunUrl,
  buildAzureDevOpsRepoWebUrl,
  normalizeOptionalNumber,
  normalizeOptionalString,
} from '../../modules/scaffolder/scaffolderUtils';
import {
  aggregateDeliveryStates,
  buildGitOpsFeatureBranch,
  mapArgoApplicationState,
  mapAzureBuildState,
  mapGitOpsPullRequestState,
  parseAzureProjectRepo,
  pickLatestPullRequest,
  type DeliveryState,
} from './deliveryUtils';

type AzureBuildDefinition = {
  id?: number;
  name?: string;
};

type AzureBuild = {
  id?: number;
  status?: string;
  result?: string;
  queueTime?: string;
  finishTime?: string;
  sourceBranch?: string;
};

type AzureRepo = {
  defaultBranch?: string;
  name?: string;
  remoteUrl?: string;
  webUrl?: string;
};

type AzurePullRequest = {
  pullRequestId?: number;
  title?: string;
  status?: string;
  creationDate?: string;
  closedDate?: string;
  sourceRefName?: string;
  targetRefName?: string;
  url?: string;
  _links?: {
    web?: {
      href?: string;
    };
  };
};

type ArgoApplication = {
  metadata?: {
    name?: string;
    namespace?: string;
  };
  spec?: {
    project?: string;
    destination?: {
      namespace?: string;
      server?: string;
    };
    source?:
      | {
          targetRevision?: string;
        }
      | Array<{
          targetRevision?: string;
        }>;
  };
  status?: {
    sync?: {
      status?: string;
      revision?: string;
    };
    health?: {
      status?: string;
    };
    operationState?: {
      finishedAt?: string;
    };
  };
};

type DeliverySignal = {
  state: DeliveryState;
  title?: string;
  url?: string;
  message?: string;
};

type DeliveryResponse = {
  entityRef: string;
  refreshedAt: string;
  overallState: DeliveryState;
  warnings: string[];
  azureDevOps: {
    repository: DeliverySignal & {
      project?: string;
      repo?: string;
      defaultBranch?: string;
    };
    pipeline: DeliverySignal & {
      id?: number;
      name?: string;
      lastRun?: {
        id?: number;
        state: DeliveryState;
        status?: string;
        result?: string;
        url?: string;
        queuedAt?: string;
        finishedAt?: string;
        sourceBranch?: string;
      };
    };
  };
  gitOps: {
    values: DeliverySignal & {
      path?: string;
      commitId?: string;
      lastChangedAt?: string;
    };
    pullRequest: DeliverySignal & {
      id?: number;
      sourceBranch?: string;
      targetBranch?: string;
    };
  };
  argoCd: {
    application: DeliverySignal & {
      name?: string;
      project?: string;
      namespace?: string;
      syncStatus?: string;
      healthStatus?: string;
      revision?: string;
      finishedAt?: string;
    };
  };
  kubernetes: {
    state: DeliveryState;
    selector?: string;
  };
};

export const shieldPlatformPlugin = createBackendPlugin({
  pluginId: 'shield-platform',
  register(env) {
    env.registerInit({
      deps: {
        auth: coreServices.auth,
        catalog: catalogServiceRef,
        config: coreServices.rootConfig,
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ auth, catalog, config, httpRouter, logger }) {
        const router = express.Router();

        router.get('/delivery/:namespace/:kind/:name', async (req, res) => {
          try {
            const entityRef = stringifyEntityRef({
              kind: req.params.kind,
              namespace: req.params.namespace,
              name: req.params.name,
            });
            const credentials = await auth.getOwnServiceCredentials();
            const entity = await catalog.getEntityByRef(entityRef, {
              credentials,
            });

            if (!entity) {
              res.status(404).json({
                error: `Entity ${entityRef} was not found in the catalog.`,
              });
              return;
            }

            res.json(await buildDeliveryResponse(entity, config, logger));
          } catch (error) {
            logger.error(
              error instanceof Error
                ? `Failed to build SHIELD delivery snapshot: ${error.message}`
                : 'Failed to build SHIELD delivery snapshot.',
            );
            res.status(500).json({
              error:
                error instanceof Error
                  ? error.message
                  : 'Unexpected delivery snapshot failure.',
            });
          }
        });

        httpRouter.addAuthPolicy({
          path: '/delivery/:namespace/:kind/:name',
          allow: 'user-cookie',
        });
        httpRouter.use(router);
      },
    });
  },
});

async function buildDeliveryResponse(
  entity: Entity,
  config: RootConfigService,
  logger: LoggerService,
): Promise<DeliveryResponse> {
  const annotations = entity.metadata.annotations ?? {};
  const warnings: string[] = [];
  const entityRef = stringifyEntityRef(entity);

  const azureOrg =
    config.getOptionalString('shield.integrations.azureDevOps.organization') ??
    'argosolutions';
  const azureDefaultProject =
    config.getOptionalString('shield.integrations.azureDevOps.defaultProject') ??
    'Devops';
  const gitOpsRepo =
    config.getOptionalString('shield.integrations.azureDevOps.gitOpsRepo') ??
    'argo-gitops';
  const argoBaseUrl =
    config.getOptionalString('shield.integrations.argoCd.baseUrl') ?? '';

  const azureRepoRef = parseAzureProjectRepo(
    annotations['dev.azure.com/project-repo'],
  );
  const azureProject = azureRepoRef?.project ?? azureDefaultProject;
  const azureRepo = azureRepoRef?.repo;
  const azurePipelineName = annotations['dev.azure.com/pipeline'];
  const azurePipelineId = normalizeOptionalNumber(
    annotations['dev.azure.com/pipeline-id'],
  );
  const gitOpsValuesPath = annotations['shield.io/gitops-values-path'];
  const kubernetesSelector =
    annotations['backstage.io/kubernetes-id'] ??
    annotations['backstage.io/kubernetes-label-selector'];
  const argoAppName = annotations['shield.io/argocd-app-name'];

  const azureRepository = await getAzureRepositorySignal({
    organization: azureOrg,
    project: azureProject,
    repo: azureRepo,
    warnings,
  });
  const azurePipeline = await getAzurePipelineSignal({
    organization: azureOrg,
    project: azureProject,
    pipelineId: azurePipelineId,
    pipelineName: azurePipelineName,
    warnings,
  });
  const gitOpsValues = await getGitOpsValuesSignal({
    organization: azureOrg,
    project: azureDefaultProject,
    repo: gitOpsRepo,
    valuesPath: gitOpsValuesPath,
    warnings,
  });
  const gitOpsPullRequest = await getGitOpsPullRequestSignal({
    organization: azureOrg,
    project: azureDefaultProject,
    repo: gitOpsRepo,
    serviceName: entity.metadata.name,
    warnings,
  });
  const argoApplication = await getArgoApplicationSignal({
    appName: argoAppName,
    baseUrl: argoBaseUrl,
    warnings,
  });

  const response: DeliveryResponse = {
    entityRef,
    refreshedAt: new Date().toISOString(),
    overallState: aggregateDeliveryStates([
      azureRepository.state,
      azurePipeline.lastRun?.state ?? azurePipeline.state,
      gitOpsValues.state,
      gitOpsPullRequest.state,
      argoApplication.state,
      kubernetesSelector ? 'healthy' : 'missing',
    ]),
    warnings,
    azureDevOps: {
      repository: azureRepository,
      pipeline: azurePipeline,
    },
    gitOps: {
      values: gitOpsValues,
      pullRequest: gitOpsPullRequest,
    },
    argoCd: {
      application: argoApplication,
    },
    kubernetes: {
      state: kubernetesSelector ? 'healthy' : 'missing',
      selector: kubernetesSelector,
    },
  };

  if (warnings.length) {
    logger.warn(
      `Delivery snapshot for ${entityRef} completed with warnings: ${warnings.join(
        ' | ',
      )}`,
    );
  }

  return response;
}

async function getAzureRepositorySignal(params: {
  organization: string;
  project: string;
  repo?: string;
  warnings: string[];
}) {
  if (!params.repo) {
    return {
      state: 'missing' as DeliveryState,
      message: 'Configure the dev.azure.com/project-repo annotation.',
    };
  }

  const url = buildAzureDevOpsRepoWebUrl({
    host: 'dev.azure.com',
    organization: params.organization,
    project: params.project,
    repo: params.repo,
  });
  const token = process.env.AZURE_DEVOPS_PAT;

  if (!token) {
    params.warnings.push(
      'AZURE_DEVOPS_PAT is not configured. Azure DevOps repository status is live-link only.',
    );
    return {
      state: 'unknown' as DeliveryState,
      project: params.project,
      repo: params.repo,
      title: `${params.project}/${params.repo}`,
      url,
      message: 'Configure AZURE_DEVOPS_PAT to read repository metadata.',
    };
  }

  try {
    const repository = await fetchJson<AzureRepo>(
      buildAzureGitRepositoryApiUrl({
        organization: params.organization,
        project: params.project,
        repo: params.repo,
      }),
      {
        headers: buildAzureHeaders(token),
      },
    );

    if (!repository) {
      return {
        state: 'missing' as DeliveryState,
        project: params.project,
        repo: params.repo,
        url,
        message: 'Repository was not found in Azure DevOps.',
      };
    }

    return {
      state: 'healthy' as DeliveryState,
      project: params.project,
      repo: params.repo,
      defaultBranch: repository.defaultBranch,
      title: `${params.project}/${repository.name ?? params.repo}`,
      url: repository.webUrl ?? url,
    };
  } catch (error) {
    params.warnings.push(
      `Azure repository lookup failed for ${params.project}/${params.repo}: ${error}`,
    );
    return {
      state: 'error' as DeliveryState,
      project: params.project,
      repo: params.repo,
      url,
      message: 'Unable to fetch repository status from Azure DevOps.',
    };
  }
}

async function getAzurePipelineSignal(params: {
  organization: string;
  project: string;
  pipelineId?: number;
  pipelineName?: string;
  warnings: string[];
}) {
  if (!params.pipelineId && !params.pipelineName) {
    return {
      state: 'missing' as DeliveryState,
      message: 'Configure the dev.azure.com/pipeline annotation.',
    };
  }

  const token = process.env.AZURE_DEVOPS_PAT;
  const fallbackUrl = params.pipelineId
    ? buildAzureDevOpsBuildDefinitionUrl({
        organization: params.organization,
        project: params.project,
        definitionId: params.pipelineId,
      })
    : undefined;

  if (!token) {
    params.warnings.push(
      'AZURE_DEVOPS_PAT is not configured. Azure DevOps pipeline status is live-link only.',
    );
    return {
      state: 'unknown' as DeliveryState,
      id: params.pipelineId,
      name: params.pipelineName,
      url: fallbackUrl,
      message: 'Configure AZURE_DEVOPS_PAT to read pipeline metadata.',
    };
  }

  try {
    const definition = await findAzureBuildDefinition({
      organization: params.organization,
      project: params.project,
      pipelineId: params.pipelineId,
      pipelineName: params.pipelineName,
      token,
    });

    if (!definition?.id) {
      return {
        state: 'missing' as DeliveryState,
        id: params.pipelineId,
        name: params.pipelineName,
        url: fallbackUrl,
        message: 'Pipeline definition was not found in Azure DevOps.',
      };
    }

    const builds = await fetchJson<{ value?: AzureBuild[] }>(
      buildAzureBuildsApiUrl({
        organization: params.organization,
        project: params.project,
        definitionId: definition.id,
      }),
      {
        headers: buildAzureHeaders(token),
      },
    );
    const latestRun = builds?.value?.[0];
    const definitionUrl = buildAzureDevOpsBuildDefinitionUrl({
      organization: params.organization,
      project: params.project,
      definitionId: definition.id,
    });

    return {
      state: latestRun
        ? mapAzureBuildState(latestRun.status, latestRun.result)
        : 'unknown',
      id: definition.id,
      name: normalizeOptionalString(definition.name) ?? params.pipelineName,
      url: definitionUrl,
      message: latestRun
        ? undefined
        : 'Pipeline exists but does not have build runs yet.',
      lastRun: latestRun
        ? {
            id: latestRun.id,
            state: mapAzureBuildState(latestRun.status, latestRun.result),
            status: latestRun.status,
            result: latestRun.result,
            url:
              latestRun.id && definition.id
                ? buildAzureDevOpsBuildRunUrl({
                    organization: params.organization,
                    project: params.project,
                    buildId: latestRun.id,
                  })
                : definitionUrl,
            queuedAt: latestRun.queueTime,
            finishedAt: latestRun.finishTime,
            sourceBranch: latestRun.sourceBranch,
          }
        : undefined,
    };
  } catch (error) {
    params.warnings.push(
      `Azure pipeline lookup failed for ${params.project}/${
        params.pipelineName ?? params.pipelineId
      }: ${error}`,
    );
    return {
      state: 'error' as DeliveryState,
      id: params.pipelineId,
      name: params.pipelineName,
      url: fallbackUrl,
      message: 'Unable to fetch pipeline status from Azure DevOps.',
    };
  }
}

async function getGitOpsValuesSignal(params: {
  organization: string;
  project: string;
  repo: string;
  valuesPath?: string;
  warnings: string[];
}) {
  if (!params.valuesPath) {
    return {
      state: 'missing' as DeliveryState,
      message: 'Configure the shield.io/gitops-values-path annotation.',
    };
  }

  const token = process.env.AZURE_DEVOPS_GITOPS_PAT ?? process.env.AZURE_DEVOPS_PAT;
  const url = `${buildAzureDevOpsRepoWebUrl({
    host: 'dev.azure.com',
    organization: params.organization,
    project: params.project,
    repo: params.repo,
  })}?path=/${params.valuesPath}`;

  if (!token) {
    params.warnings.push(
      'AZURE_DEVOPS_GITOPS_PAT/AZURE_DEVOPS_PAT is not configured. GitOps values are live-link only.',
    );
    return {
      state: 'unknown' as DeliveryState,
      path: params.valuesPath,
      url,
      message: 'Configure AZURE_DEVOPS_GITOPS_PAT to read GitOps values.',
    };
  }

  try {
    const item = await fetchJson<{
      commitId?: string;
      contentMetadata?: {
        lastChangedDate?: string;
      };
    }>(
      buildAzureGitItemApiUrl({
        organization: params.organization,
        project: params.project,
        repo: params.repo,
        itemPath: params.valuesPath,
      }),
      {
        headers: buildAzureHeaders(token),
      },
    );

    if (!item) {
      return {
        state: 'missing' as DeliveryState,
        path: params.valuesPath,
        url,
        message: 'GitOps values.yaml was not found in argo-gitops.',
      };
    }

    return {
      state: 'healthy' as DeliveryState,
      path: params.valuesPath,
      url,
      commitId: item.commitId,
      lastChangedAt: item.contentMetadata?.lastChangedDate,
      title: params.valuesPath,
    };
  } catch (error) {
    params.warnings.push(
      `GitOps values lookup failed for ${params.valuesPath}: ${error}`,
    );
    return {
      state: 'error' as DeliveryState,
      path: params.valuesPath,
      url,
      message: 'Unable to fetch GitOps values metadata.',
    };
  }
}

async function getGitOpsPullRequestSignal(params: {
  organization: string;
  project: string;
  repo: string;
  serviceName: string;
  warnings: string[];
}) {
  const token = process.env.AZURE_DEVOPS_GITOPS_PAT ?? process.env.AZURE_DEVOPS_PAT;
  const sourceBranch = `refs/heads/${buildGitOpsFeatureBranch(params.serviceName)}`;

  if (!token) {
    params.warnings.push(
      'AZURE_DEVOPS_GITOPS_PAT/AZURE_DEVOPS_PAT is not configured. GitOps PR status is unavailable.',
    );
    return {
      state: 'unknown' as DeliveryState,
      sourceBranch,
      message: 'Configure AZURE_DEVOPS_GITOPS_PAT to read GitOps pull requests.',
    };
  }

  try {
    const response = await fetchJson<{ value?: AzurePullRequest[] }>(
      buildAzureGitPullRequestsApiUrl({
        organization: params.organization,
        project: params.project,
        repo: params.repo,
        sourceBranch,
      }),
      {
        headers: buildAzureHeaders(token),
      },
    );
    const latestPullRequest = pickLatestPullRequest(response?.value ?? []);

    if (!latestPullRequest) {
      return {
        state: 'missing' as DeliveryState,
        sourceBranch,
        message: 'No GitOps pull request was found for this service.',
      };
    }

    return {
      state: mapGitOpsPullRequestState(latestPullRequest.status),
      id: latestPullRequest.pullRequestId,
      title: latestPullRequest.title,
      sourceBranch: latestPullRequest.sourceRefName,
      targetBranch: latestPullRequest.targetRefName,
      url:
        latestPullRequest._links?.web?.href ??
        latestPullRequest.url,
    };
  } catch (error) {
    params.warnings.push(
      `GitOps pull request lookup failed for ${params.serviceName}: ${error}`,
    );
    return {
      state: 'error' as DeliveryState,
      sourceBranch,
      message: 'Unable to fetch GitOps pull request status.',
    };
  }
}

async function getArgoApplicationSignal(params: {
  appName?: string;
  baseUrl: string;
  warnings: string[];
}) {
  if (!params.appName) {
    return {
      state: 'missing' as DeliveryState,
      message: 'Configure the shield.io/argocd-app-name annotation.',
    };
  }

  const appUrl = params.baseUrl
    ? `${params.baseUrl.replace(/\/$/, '')}/applications/${params.appName}`
    : undefined;
  const token = process.env.ARGOCD_AUTH_TOKEN;

  if (!params.baseUrl) {
    return {
      state: 'missing' as DeliveryState,
      name: params.appName,
      message: 'Argo CD baseUrl is not configured.',
    };
  }

  if (!token) {
    params.warnings.push(
      'ARGOCD_AUTH_TOKEN is not configured. Argo CD application status is live-link only.',
    );
    return {
      state: 'unknown' as DeliveryState,
      name: params.appName,
      url: appUrl,
      message: 'Configure ARGOCD_AUTH_TOKEN to read Argo CD application status.',
    };
  }

  try {
    const application = await fetchJson<ArgoApplication>(
      `${params.baseUrl.replace(/\/$/, '')}/api/v1/applications/${encodeURIComponent(
        params.appName,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!application) {
      return {
        state: 'missing' as DeliveryState,
        name: params.appName,
        url: appUrl,
        message: 'Application was not found in Argo CD.',
      };
    }

    const syncStatus = application.status?.sync?.status;
    const healthStatus = application.status?.health?.status;
    const source = Array.isArray(application.spec?.source)
      ? application.spec?.source[0]
      : application.spec?.source;

    return {
      state: mapArgoApplicationState(syncStatus, healthStatus),
      name: application.metadata?.name ?? params.appName,
      project: application.spec?.project,
      namespace:
        application.spec?.destination?.namespace ?? application.metadata?.namespace,
      syncStatus,
      healthStatus,
      revision: application.status?.sync?.revision ?? source?.targetRevision,
      finishedAt: application.status?.operationState?.finishedAt,
      url: appUrl,
    };
  } catch (error) {
    params.warnings.push(
      `Argo CD application lookup failed for ${params.appName}: ${error}`,
    );
    return {
      state: 'error' as DeliveryState,
      name: params.appName,
      url: appUrl,
      message: 'Unable to fetch Argo CD application status.',
    };
  }
}

async function findAzureBuildDefinition(params: {
  organization: string;
  project: string;
  pipelineId?: number;
  pipelineName?: string;
  token: string;
}) {
  if (params.pipelineId) {
    return fetchJson<AzureBuildDefinition>(
      buildAzureDefinitionApiUrl({
        organization: params.organization,
        project: params.project,
        definitionId: params.pipelineId,
      }),
      {
        headers: buildAzureHeaders(params.token),
      },
    );
  }

  const response = await fetchJson<{ value?: AzureBuildDefinition[] }>(
    buildAzureDefinitionsApiUrl({
      organization: params.organization,
      project: params.project,
      pipelineName: params.pipelineName ?? '',
    }),
    {
      headers: buildAzureHeaders(params.token),
    },
  );

  return response?.value?.find(
    definition =>
      definition.name?.toLowerCase() === params.pipelineName?.toLowerCase(),
  );
}

function buildAzureHeaders(token: string) {
  return {
    Authorization: `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
  };
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function buildAzureGitRepositoryApiUrl(params: {
  organization: string;
  project: string;
  repo: string;
}) {
  return `https://dev.azure.com/${params.organization}/${encodeURIComponent(
    params.project,
  )}/_apis/git/repositories/${encodeURIComponent(
    params.repo,
  )}?api-version=7.1-preview.1`;
}

function buildAzureDefinitionApiUrl(params: {
  organization: string;
  project: string;
  definitionId: number;
}) {
  return `https://dev.azure.com/${params.organization}/${encodeURIComponent(
    params.project,
  )}/_apis/build/definitions/${params.definitionId}?api-version=7.1-preview.7`;
}

function buildAzureDefinitionsApiUrl(params: {
  organization: string;
  project: string;
  pipelineName: string;
}) {
  return `https://dev.azure.com/${params.organization}/${encodeURIComponent(
    params.project,
  )}/_apis/build/definitions?name=${encodeURIComponent(
    params.pipelineName,
  )}&api-version=7.1-preview.7`;
}

function buildAzureBuildsApiUrl(params: {
  organization: string;
  project: string;
  definitionId: number;
}) {
  return `https://dev.azure.com/${params.organization}/${encodeURIComponent(
    params.project,
  )}/_apis/build/builds?definitions=${params.definitionId}&$top=1&queryOrder=queueTimeDescending&api-version=7.1-preview.7`;
}

function buildAzureGitItemApiUrl(params: {
  organization: string;
  project: string;
  repo: string;
  itemPath: string;
}) {
  return `https://dev.azure.com/${params.organization}/${encodeURIComponent(
    params.project,
  )}/_apis/git/repositories/${encodeURIComponent(
    params.repo,
  )}/items?path=/${encodeURIComponent(params.itemPath).replace(/%2F/g, '/')}&includeContentMetadata=true&api-version=7.1-preview.1`;
}

function buildAzureGitPullRequestsApiUrl(params: {
  organization: string;
  project: string;
  repo: string;
  sourceBranch: string;
}) {
  return `https://dev.azure.com/${params.organization}/${encodeURIComponent(
    params.project,
  )}/_apis/git/repositories/${encodeURIComponent(
    params.repo,
  )}/pullrequests?searchCriteria.sourceRefName=${encodeURIComponent(
    params.sourceBranch,
  )}&searchCriteria.status=all&api-version=7.1-preview.1`;
}

export default shieldPlatformPlugin;
