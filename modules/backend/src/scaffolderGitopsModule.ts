import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';

import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import {
  createTemplateAction,
  scaffolderActionsExtensionPoint,
} from '@backstage/plugin-scaffolder-node';

const ZERO_OBJECT_ID = '0000000000000000000000000000000000000000';
const DEFAULT_ORGANIZATION = 'argosolutions';

type AzureRepoCoordinates = {
  organization: string;
  project: string;
  repo: string;
  cloneUrl: string;
  repoWebUrl: string;
};

type AzureListResponse<T> = {
  count?: number;
  value?: T[];
};

type AzureGitRepository = {
  id?: string;
  name?: string;
  defaultBranch?: string;
  remoteUrl?: string;
  webUrl?: string;
};

type AzureGitRef = {
  name?: string;
  objectId?: string;
};

type AzureEnvironment = {
  id?: number;
  name?: string;
};

type AzurePipeline = {
  id?: number;
  name?: string;
  url?: string;
};

type AzurePipelineRun = {
  id?: number;
  name?: string;
  url?: string;
};

type AzurePolicyType = {
  id?: string;
  displayName?: string;
};

type AzurePolicyConfiguration = {
  id?: number;
  revision?: number;
  isEnabled?: boolean;
  isBlocking?: boolean;
  type?: {
    id?: string;
    displayName?: string;
  };
  settings?: {
    scope?: Array<{
      repositoryId?: string | null;
      refName?: string;
      matchKind?: string;
    }>;
  } & Record<string, unknown>;
};

type AzureIdentity = {
  id?: string;
  providerDisplayName?: string;
  properties?: Record<
    string,
    {
      $value?: string;
    }
  >;
};

type AzurePullRequest = {
  pullRequestId?: number;
  status?: string;
  sourceRefName?: string;
  targetRefName?: string;
};

function runGit(args: string[], options: { cwd?: string; authHeader?: string } = {}) {
  const gitArgs = options.authHeader
    ? ['-c', `http.extraHeader=${options.authHeader}`, ...args]
    : args;

  return execFileSync('git', gitArgs, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countLeadingSpaces(line: string) {
  return line.length - line.trimStart().length;
}

function normalizeNamespace(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveSystemFromOwner(ownerRef: string) {
  const normalizedOwnerRef = ownerRef.trim().toLowerCase();

  if (normalizedOwnerRef === 'group:default/squad-plataforma') {
    return 'shield-platform-core';
  }

  const match = normalizedOwnerRef.match(/^group:default\/squad-([a-z0-9-]+)$/);
  if (!match) {
    throw new Error(
      `Could not derive a system from owner "${ownerRef}". Expected a squad group like group:default/squad-bugs.`,
    );
  }

  return match[1];
}

function parseAzureRepoUrl(repoUrl: string): AzureRepoCoordinates {
  const url = repoUrl.startsWith('http') ? new URL(repoUrl) : new URL(`https://${repoUrl}`);
  const organization = url.searchParams.get('organization');
  const project = url.searchParams.get('project');
  const repo = url.searchParams.get('repo');

  if (!organization || !project || !repo) {
    throw new Error(`Invalid Azure DevOps repoUrl: ${repoUrl}`);
  }

  return {
    organization,
    project,
    repo,
    cloneUrl: `https://dev.azure.com/${organization}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repo)}`,
    repoWebUrl: `https://dev.azure.com/${organization}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repo)}`,
  };
}

function truncateForError(value: string) {
  return value.length > 400 ? `${value.slice(0, 400)}...` : value;
}

function refsHead(branchName: string) {
  return branchName.startsWith('refs/heads/') ? branchName : `refs/heads/${branchName}`;
}

function shortBranchName(branchName: string) {
  return branchName.replace(/^refs\/heads\//, '');
}

function webFileUrl(repo: AzureRepoCoordinates, branchName: string, path: string) {
  return `${repo.repoWebUrl}?path=/${path.replace(/^\/+/, '')}&version=GB${encodeURIComponent(shortBranchName(branchName))}&_a=contents`;
}

function webPipelineUrl(repo: AzureRepoCoordinates, pipelineId: number) {
  return `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_build?definitionId=${pipelineId}`;
}

function webPipelineRunUrl(repo: AzureRepoCoordinates, runId: number) {
  return `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_build/results?buildId=${runId}&view=results`;
}

function webPullRequestUrl(repo: AzureRepoCoordinates, pullRequestId: number) {
  return `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_git/${encodeURIComponent(repo.repo)}/pullrequest/${pullRequestId}`;
}

function normalizeMatchKind(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function normalizePolicyDisplayName(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function getAzureDevOpsToken(preferredScope: 'default' | 'gitops' = 'default') {
  const token =
    preferredScope === 'gitops'
      ? process.env.AZURE_DEVOPS_GITOPS_PAT ?? process.env.AZURE_DEVOPS_PAT
      : process.env.AZURE_DEVOPS_PAT;

  if (!token) {
    throw new Error(
      preferredScope === 'gitops'
        ? 'Set AZURE_DEVOPS_GITOPS_PAT or AZURE_DEVOPS_PAT before running GitOps bootstrap.'
        : 'Set AZURE_DEVOPS_PAT before running Azure DevOps scaffolder actions.',
    );
  }

  return token;
}

async function azureJsonRequest<T>({
  url,
  token,
  method = 'GET',
  body,
}: {
  url: string;
  token: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: unknown;
}): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const errorBody = truncateForError(await response.text());
    throw new Error(`Azure DevOps request failed (${response.status}) ${method} ${url}: ${errorBody}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function getAzureRepository(repo: AzureRepoCoordinates, token: string) {
  return azureJsonRequest<AzureGitRepository>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/git/repositories/${encodeURIComponent(repo.repo)}?api-version=7.1`,
    token,
  });
}

async function listAzureRefs(
  repo: AzureRepoCoordinates,
  repositoryId: string,
  token: string,
  filter: string,
) {
  return azureJsonRequest<AzureListResponse<AzureGitRef>>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/git/repositories/${repositoryId}/refs?filter=${encodeURIComponent(filter)}&api-version=7.1`,
    token,
  });
}

async function getAzureRef(
  repo: AzureRepoCoordinates,
  repositoryId: string,
  token: string,
  branchName: string,
) {
  const response = await listAzureRefs(
    repo,
    repositoryId,
    token,
    `heads/${shortBranchName(branchName)}`,
  );

  return response.value?.find(ref => ref.name === refsHead(branchName));
}

async function ensureAzureBranch({
  repo,
  repositoryId,
  token,
  branchName,
  sourceObjectId,
}: {
  repo: AzureRepoCoordinates;
  repositoryId: string;
  token: string;
  branchName: string;
  sourceObjectId: string;
}) {
  const existingRef = await getAzureRef(repo, repositoryId, token, branchName);
  if (existingRef?.objectId) {
    return { created: false, objectId: existingRef.objectId };
  }

  const result = await azureJsonRequest<
    Array<{
      updateStatus?: string | number;
      customMessage?: string;
      newObjectId?: string;
    }>
  >({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/git/repositories/${repositoryId}/refs?api-version=7.1`,
    token,
    method: 'POST',
    body: [
      {
        name: refsHead(branchName),
        oldObjectId: ZERO_OBJECT_ID,
        newObjectId: sourceObjectId,
      },
    ],
  });

  const update = result[0];
  const status = `${update?.updateStatus ?? ''}`.toLowerCase();
  if (update && status !== '' && status !== '0' && status !== 'succeeded') {
    throw new Error(
      `Failed to create branch ${branchName}: ${update.customMessage ?? update.updateStatus}`,
    );
  }

  return { created: true, objectId: update?.newObjectId ?? sourceObjectId };
}

async function updateAzureDefaultBranch({
  repo,
  repositoryId,
  token,
  branchName,
}: {
  repo: AzureRepoCoordinates;
  repositoryId: string;
  token: string;
  branchName: string;
}) {
  await azureJsonRequest<AzureGitRepository>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/git/repositories/${repositoryId}?api-version=7.1`,
    token,
    method: 'PATCH',
    body: {
      defaultBranch: refsHead(branchName),
    },
  });
}

async function listAzureEnvironments({
  organization,
  project,
  token,
  name,
}: {
  organization: string;
  project: string;
  token: string;
  name?: string;
}) {
  const query = name ? `?name=${encodeURIComponent(name)}&api-version=7.1` : '?api-version=7.1';
  return azureJsonRequest<AzureListResponse<AzureEnvironment>>({
    url: `https://dev.azure.com/${organization}/${encodeURIComponent(project)}/_apis/distributedtask/environments${query}`,
    token,
  });
}

async function createAzureEnvironment({
  organization,
  project,
  token,
  name,
}: {
  organization: string;
  project: string;
  token: string;
  name: string;
}) {
  return azureJsonRequest<AzureEnvironment>({
    url: `https://dev.azure.com/${organization}/${encodeURIComponent(project)}/_apis/distributedtask/environments?api-version=7.1`,
    token,
    method: 'POST',
    body: {
      name,
    },
  });
}

async function listAzurePipelines(repo: AzureRepoCoordinates, token: string) {
  return azureJsonRequest<AzureListResponse<AzurePipeline>>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/pipelines?api-version=7.1`,
    token,
  });
}

async function createAzurePipeline({
  repo,
  repositoryId,
  token,
  pipelineName,
  yamlPath,
}: {
  repo: AzureRepoCoordinates;
  repositoryId: string;
  token: string;
  pipelineName: string;
  yamlPath: string;
}) {
  return azureJsonRequest<AzurePipeline>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/pipelines?api-version=7.1`,
    token,
    method: 'POST',
    body: {
      name: pipelineName,
      folder: '\\',
      configuration: {
        type: 'yaml',
        path: yamlPath,
        repository: {
          id: repositoryId,
          name: repo.repo,
          type: 'azureReposGit',
        },
      },
    },
  });
}

async function runAzurePipeline({
  repo,
  token,
  pipelineId,
  branchName,
}: {
  repo: AzureRepoCoordinates;
  token: string;
  pipelineId: number;
  branchName: string;
}) {
  return azureJsonRequest<AzurePipelineRun>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/pipelines/${pipelineId}/runs?api-version=7.1`,
    token,
    method: 'POST',
    body: {
      resources: {
        repositories: {
          self: {
            refName: refsHead(branchName),
          },
        },
      },
    },
  });
}

async function listAzurePolicyTypes(repo: AzureRepoCoordinates, token: string) {
  return azureJsonRequest<AzureListResponse<AzurePolicyType>>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/policy/types?api-version=7.1`,
    token,
  });
}

async function listAzurePolicyConfigurations(repo: AzureRepoCoordinates, token: string) {
  return azureJsonRequest<AzureListResponse<AzurePolicyConfiguration>>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/policy/configurations?api-version=7.1`,
    token,
  });
}

function resolvePolicyTypeId(
  policyTypes: AzurePolicyType[],
  displayNames: string[],
  fallbackId?: string,
) {
  const wanted = displayNames.map(name => name.trim().toLowerCase());
  const match = policyTypes.find(type =>
    wanted.includes(normalizePolicyDisplayName(type.displayName)),
  );

  if (match?.id) {
    return match.id;
  }

  if (fallbackId) {
    return fallbackId;
  }

  throw new Error(`Could not resolve Azure DevOps policy type: ${displayNames.join(', ')}`);
}

function hasMatchingPolicyScope(
  policy: AzurePolicyConfiguration,
  repositoryId: string,
  branchName: string,
) {
  const desiredRefName = refsHead(branchName);
  return (
    policy.settings?.scope?.some(scope => {
      const sameRepository = (scope.repositoryId ?? null) === repositoryId;
      const sameRef = scope.refName === desiredRefName;
      const sameMatchKind = normalizeMatchKind(scope.matchKind) === 'exact';
      return sameRepository && sameRef && sameMatchKind;
    }) ?? false
  );
}

async function upsertAzurePolicyConfiguration({
  repo,
  token,
  policyTypeId,
  repositoryId,
  branchName,
  isBlocking,
  settings,
}: {
  repo: AzureRepoCoordinates;
  token: string;
  policyTypeId: string;
  repositoryId: string;
  branchName: string;
  isBlocking: boolean;
  settings: Record<string, unknown>;
}) {
  const existingConfigurations = (await listAzurePolicyConfigurations(repo, token)).value ?? [];
  const existingConfiguration = existingConfigurations.find(
    policy =>
      policy.type?.id === policyTypeId &&
      hasMatchingPolicyScope(policy, repositoryId, branchName),
  );

  const payload = {
    isEnabled: true,
    isBlocking,
    type: {
      id: policyTypeId,
    },
    settings: {
      ...settings,
      scope: [
        {
          repositoryId,
          refName: refsHead(branchName),
          matchKind: 'Exact',
        },
      ],
    },
  };

  if (existingConfiguration?.id) {
    const updated = await azureJsonRequest<AzurePolicyConfiguration>({
      url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/policy/configurations/${existingConfiguration.id}?api-version=7.1`,
      token,
      method: 'PUT',
      body: {
        ...payload,
        id: existingConfiguration.id,
        ...(existingConfiguration.revision === undefined
          ? {}
          : { revision: existingConfiguration.revision }),
      },
    });

    return { changed: false, policyId: updated.id ?? existingConfiguration.id };
  }

  const created = await azureJsonRequest<AzurePolicyConfiguration>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/policy/configurations?api-version=7.1`,
    token,
    method: 'POST',
    body: payload,
  });

  return { changed: true, policyId: created.id };
}

async function searchAzureIdentities({
  organization,
  token,
  filterValue,
}: {
  organization: string;
  token: string;
  filterValue: string;
}) {
  return azureJsonRequest<AzureListResponse<AzureIdentity>>({
    url: `https://vssps.dev.azure.com/${organization}/_apis/identities?searchFilter=General&filterValue=${encodeURIComponent(filterValue)}&queryMembership=None&api-version=7.1`,
    token,
  });
}

function scoreAzureIdentity(identity: AzureIdentity, principalName: string) {
  const desired = principalName.trim().toLowerCase();
  const account = identity.properties?.Account?.$value?.trim().toLowerCase();
  const providerDisplayName = identity.providerDisplayName?.trim().toLowerCase();
  const mail = identity.properties?.Mail?.$value?.trim().toLowerCase();

  if (providerDisplayName === desired) {
    return 100;
  }

  if (account === desired || mail === desired) {
    return 90;
  }

  if (providerDisplayName?.includes(desired) || desired.includes(providerDisplayName ?? '')) {
    return 70;
  }

  if (account && desired.includes(account)) {
    return 60;
  }

  return 0;
}

async function resolveAzureIdentityIds({
  organization,
  token,
  principalNames,
}: {
  organization: string;
  token: string;
  principalNames: string[];
}) {
  const resolvedIds: string[] = [];
  const unresolvedPrincipalNames: string[] = [];

  for (const principalName of principalNames) {
    const identities = (await searchAzureIdentities({
      organization,
      token,
      filterValue: principalName,
    })).value ?? [];

    const bestMatch = identities
      .map(identity => ({ identity, score: scoreAzureIdentity(identity, principalName) }))
      .sort((left, right) => right.score - left.score)[0];

    if (!bestMatch?.identity.id || bestMatch.score === 0) {
      unresolvedPrincipalNames.push(principalName);
      continue;
    }

    resolvedIds.push(bestMatch.identity.id);
  }

  return { resolvedIds, unresolvedPrincipalNames };
}

async function listAzurePullRequests({
  repo,
  repositoryId,
  token,
  sourceBranch,
  targetBranch,
}: {
  repo: AzureRepoCoordinates;
  repositoryId: string;
  token: string;
  sourceBranch: string;
  targetBranch: string;
}) {
  return azureJsonRequest<AzureListResponse<AzurePullRequest>>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/git/repositories/${repositoryId}/pullrequests?searchCriteria.status=active&searchCriteria.sourceRefName=${encodeURIComponent(refsHead(sourceBranch))}&searchCriteria.targetRefName=${encodeURIComponent(refsHead(targetBranch))}&api-version=7.1`,
    token,
  });
}

async function createAzurePullRequest({
  repo,
  repositoryId,
  token,
  sourceBranch,
  targetBranch,
  title,
  description,
}: {
  repo: AzureRepoCoordinates;
  repositoryId: string;
  token: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description: string;
}) {
  return azureJsonRequest<{
    pullRequestId?: number;
  }>({
    url: `https://dev.azure.com/${repo.organization}/${encodeURIComponent(repo.project)}/_apis/git/repositories/${repositoryId}/pullrequests?api-version=7.1`,
    token,
    method: 'POST',
    body: {
      sourceRefName: refsHead(sourceBranch),
      targetRefName: refsHead(targetBranch),
      title,
      description,
    },
  });
}

function selectBackendApplicationFiles(directory: string) {
  const canonicalFiles = [
    'backend-apps-autosync-dev.yaml',
    'backend-apps-manual-rc.yaml',
    'backend-apps-manual-stg.yaml',
    'backend-apps-manual-prd.yaml',
  ];

  const resolvedFiles = canonicalFiles.map(name => resolve(directory, name));
  const missingFiles = resolvedFiles.filter(path => !existsSync(path));

  if (missingFiles.length > 0) {
    const missingNames = missingFiles
      .map(path => relative(directory, path).replace(/\\/g, '/'))
      .join(', ');
    throw new Error(
      `Missing canonical backend ApplicationSet manifests under gitops/application/backend: ${missingNames}`,
    );
  }

  return resolvedFiles;
}

function addAppToElements(content: string, appName: string, namespace: string) {
  const existingAppPattern = new RegExp(`^\\s*-\\s+app:\\s*${escapeRegExp(appName)}\\s*$`, 'm');
  if (existingAppPattern.test(content)) {
    return { changed: false, nextContent: content };
  }

  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const elementsIndex = lines.findIndex(line => /^\s*elements:\s*$/.test(line));

  if (elementsIndex === -1) {
    throw new Error('Could not find an elements: block in backend application manifest');
  }

  const elementsIndent = countLeadingSpaces(lines[elementsIndex]);
  let blockEnd = lines.length;
  for (let index = elementsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) {
      continue;
    }

    if (countLeadingSpaces(line) <= elementsIndent) {
      blockEnd = index;
      break;
    }
  }

  let itemIndent = elementsIndent + 2;
  let lastAppIndex = -1;
  for (let index = elementsIndex + 1; index < blockEnd; index += 1) {
    const match = lines[index].match(/^(\s*)-\s+app:\s*.+$/);
    if (!match) {
      continue;
    }

    itemIndent = match[1].length;
    lastAppIndex = index;
  }

  let insertIndex = lastAppIndex === -1 ? elementsIndex + 1 : lastAppIndex + 1;
  while (insertIndex < blockEnd) {
    const line = lines[insertIndex];
    if (!line.trim()) {
      break;
    }

    const indent = countLeadingSpaces(line);
    if (indent <= itemIndent) {
      break;
    }

    insertIndex += 1;
  }

  lines.splice(
    insertIndex,
    0,
    `${' '.repeat(itemIndent)}- app: ${appName}`,
    `${' '.repeat(itemIndent + 2)}namespace: ${namespace}`,
  );

  return {
    changed: true,
    nextContent: lines.join(eol),
  };
}

function getGitopsEnvironments(tier: string) {
  return tier === 'platform' ? ['hub'] : ['dev', 'rc', 'stg', 'prd'];
}

function renderGitopsValuesYaml({
  serviceName,
  tier,
  owner,
  projectContext,
  imageRepository,
  telemetryInjectionAnnotation,
  environment,
}: {
  serviceName: string;
  tier: string;
  owner: string;
  projectContext: string;
  imageRepository: string;
  telemetryInjectionAnnotation: string;
  environment: string;
}) {
  const namespace = normalizeNamespace(projectContext);
  const externalSecretPath = `${environment}/${projectContext}/${serviceName}`;

  return [
    'app:',
    `  name: ${serviceName}`,
    `  tier: ${tier}`,
    `  owner: ${owner}`,
    `  system: ${projectContext}`,
    'deployment:',
    `  environment: ${environment}`,
    `  namespace: ${namespace}`,
    '  image:',
    `    repository: ${imageRepository}`,
    '    tag: latest',
    'observability:',
    `  telemetryInjectionAnnotation: ${telemetryInjectionAnnotation}`,
    'secrets:',
    `  externalSecretPath: ${externalSecretPath}`,
    '',
  ].join('\n');
}

function createResolveSystemFromOwnerAction() {
  return createTemplateAction({
    id: 'shield:catalog:resolve-system-from-owner',
    description:
      'Derives the Backstage system name from the selected squad owner reference.',
    schema: {
      input: {
        owner: z => z.string({ description: 'Owner entity reference, usually a squad group.' }),
      },
      output: {
        system: z => z.string(),
      },
    },
    async handler(ctx) {
      ctx.output('system', resolveSystemFromOwner(ctx.input.owner));
    },
  });
}

function createAzureBootstrapBranchesAction() {
  return createTemplateAction({
    id: 'azure:repo:bootstrap-branches',
    description: 'Creates the standard repository branches in Azure Repos.',
    schema: {
      input: {
        repoUrl: z => z.string({ description: 'Azure DevOps repoUrl query.' }),
        sourceBranch: z =>
          z
            .string({ description: 'Branch used as the source for new branches.' })
            .default('main'),
        defaultBranch: z =>
          z
            .string({ description: 'Repository default branch.' })
            .default('main'),
        mainBranch: z =>
          z
            .string({ description: 'Main branch name.' })
            .default('main'),
        featureBranch: z =>
          z
            .string({ description: 'Bootstrap feature branch name.' })
            .default('feature/bootstrap'),
        releaseBranch: z =>
          z
            .string({ description: 'Bootstrap release branch name.' })
            .default('release/bootstrap'),
      },
      output: {
        defaultBranch: z => z.string(),
        createdBranches: z => z.array(z.string()),
        existingBranches: z => z.array(z.string()),
      },
    },
    async handler(ctx) {
      const token = getAzureDevOpsToken();
      const repo = parseAzureRepoUrl(ctx.input.repoUrl);
      const repository = await getAzureRepository(repo, token);

      if (!repository.id) {
        throw new Error(`Could not resolve repository id for ${repo.repo}.`);
      }

      const sourceRef = await getAzureRef(repo, repository.id, token, ctx.input.sourceBranch);
      if (!sourceRef?.objectId) {
        throw new Error(
          `Source branch ${ctx.input.sourceBranch} does not exist in ${repo.project}/${repo.repo}.`,
        );
      }

      const createdBranches: string[] = [];
      const existingBranches: string[] = [];

      for (const branchName of new Set([
        ctx.input.defaultBranch,
        ctx.input.mainBranch,
        ctx.input.featureBranch,
        ctx.input.releaseBranch,
      ])) {
        const ensured = await ensureAzureBranch({
          repo,
          repositoryId: repository.id,
          token,
          branchName,
          sourceObjectId: sourceRef.objectId,
        });

        if (ensured.created) {
          createdBranches.push(branchName);
        } else {
          existingBranches.push(branchName);
        }
      }

      await updateAzureDefaultBranch({
        repo,
        repositoryId: repository.id,
        token,
        branchName: ctx.input.defaultBranch,
      });

      ctx.output('defaultBranch', ctx.input.defaultBranch);
      ctx.output('createdBranches', createdBranches);
      ctx.output('existingBranches', existingBranches);
    },
  });
}

function createAzureEnsureEnvironmentsAction(options: { defaultOrganization: string }) {
  return createTemplateAction({
    id: 'azure:project:ensure-environments',
    description: 'Ensures Azure DevOps environments exist in the project.',
    schema: {
      input: {
        project: z => z.string({ description: 'Azure DevOps project name.' }),
        environments: z => z.array(z.string({ description: 'Environment name.' })),
        organization: z =>
          z
            .string({ description: 'Azure DevOps organization. Defaults to configured organization.' })
            .optional(),
      },
      output: {
        organization: z => z.string(),
        createdEnvironments: z => z.array(z.string()),
        existingEnvironments: z => z.array(z.string()),
      },
    },
    async handler(ctx) {
      const token = getAzureDevOpsToken();
      const organization = ctx.input.organization ?? options.defaultOrganization;
      const createdEnvironments: string[] = [];
      const existingEnvironments: string[] = [];

      for (const environmentName of ctx.input.environments) {
        const environments = await listAzureEnvironments({
          organization,
          project: ctx.input.project,
          token,
          name: environmentName,
        });

        const existing = environments.value?.find(env => env.name === environmentName);
        if (existing) {
          existingEnvironments.push(environmentName);
          continue;
        }

        await createAzureEnvironment({
          organization,
          project: ctx.input.project,
          token,
          name: environmentName,
        });
        createdEnvironments.push(environmentName);
      }

      ctx.output('organization', organization);
      ctx.output('createdEnvironments', createdEnvironments);
      ctx.output('existingEnvironments', existingEnvironments);
    },
  });
}

function createAzureCreatePipelineAndRunAction() {
  return createTemplateAction({
    id: 'azure:repo:create-pipeline-and-run',
    description:
      'Creates a YAML Azure Pipeline for the repository when needed and queues the first run.',
    schema: {
      input: {
        repoUrl: z => z.string({ description: 'Azure DevOps repoUrl query.' }),
        pipelineName: z => z.string({ description: 'Azure Pipeline display name.' }),
        yamlPath: z => z.string({ description: 'Path to the pipeline YAML file.' }),
        branchName: z =>
          z
            .string({ description: 'Branch used for the first pipeline run.' })
            .default('main'),
      },
      output: {
        pipelineId: z => z.number(),
        pipelineUrl: z => z.string(),
        runId: z => z.number(),
        runUrl: z => z.string(),
      },
    },
    async handler(ctx) {
      const token = getAzureDevOpsToken();
      const repo = parseAzureRepoUrl(ctx.input.repoUrl);
      const repository = await getAzureRepository(repo, token);

      if (!repository.id) {
        throw new Error(`Could not resolve repository id for ${repo.repo}.`);
      }

      const pipelines = (await listAzurePipelines(repo, token)).value ?? [];
      let pipeline = pipelines.find(item => item.name === ctx.input.pipelineName);

      if (!pipeline?.id) {
        pipeline = await createAzurePipeline({
          repo,
          repositoryId: repository.id,
          token,
          pipelineName: ctx.input.pipelineName,
          yamlPath: ctx.input.yamlPath,
        });
      }

      if (!pipeline?.id) {
        throw new Error(`Could not create or resolve pipeline ${ctx.input.pipelineName}.`);
      }

      const run = await runAzurePipeline({
        repo,
        token,
        pipelineId: pipeline.id,
        branchName: ctx.input.branchName,
      });

      if (!run.id) {
        throw new Error(`Could not queue the first run for pipeline ${ctx.input.pipelineName}.`);
      }

      ctx.output('pipelineId', pipeline.id);
      ctx.output('pipelineUrl', webPipelineUrl(repo, pipeline.id));
      ctx.output('runId', run.id);
      ctx.output('runUrl', webPipelineRunUrl(repo, run.id));
    },
  });
}

function createAzureConfigurePoliciesAction(options: {
  defaultAutomaticReviewerPrincipalNames: string[];
}) {
  return createTemplateAction({
    id: 'azure:repo:configure-policies',
    description: 'Configures Azure Repos branch policies for the repository.',
    schema: {
      input: {
        repoUrl: z => z.string({ description: 'Azure DevOps repoUrl query.' }),
        branches: z => z.array(z.string({ description: 'Protected branch name.' })),
        minimumApproverCount: z => z.number().default(1),
        allowRequestorsToApprove: z => z.boolean().default(false),
        blockLastPusherApproval: z => z.boolean().default(true),
        allowCompletionWithRejectsOrWaits: z => z.boolean().default(false),
        resetOnSourcePush: z => z.boolean().default(false),
        requireCommentResolution: z => z.boolean().default(true),
        allowBasicNoFastForward: z => z.boolean().default(true),
        allowSquash: z => z.boolean().default(true),
        allowRebase: z => z.boolean().default(false),
        allowRebaseMerge: z => z.boolean().default(false),
        automaticReviewerPrincipalNames: z =>
          z
            .array(z.string({ description: 'Azure DevOps principal name for the reviewer.' }))
            .optional(),
        automaticReviewerRequired: z => z.boolean().default(false),
        buildValidationPipelineId: z =>
          z
            .union([z.string(), z.number()])
            .describe('Azure Pipeline id used for build validation.')
            .optional(),
      },
      output: {
        configuredBranches: z => z.array(z.string()),
        unresolvedAutomaticReviewerPrincipalNames: z => z.array(z.string()),
      },
    },
    async handler(ctx) {
      const token = getAzureDevOpsToken();
      const repo = parseAzureRepoUrl(ctx.input.repoUrl);
      const repository = await getAzureRepository(repo, token);

      if (!repository.id) {
        throw new Error(`Could not resolve repository id for ${repo.repo}.`);
      }

      const policyTypes = (await listAzurePolicyTypes(repo, token)).value ?? [];
      const minimumApproverCountPolicyTypeId = resolvePolicyTypeId(
        policyTypes,
        ['Minimum number of reviewers', 'Minimum approval count'],
        'fa4e907d-c16b-4a4c-9dfa-4906e5d171dd',
      );
      const buildValidationPolicyTypeId = resolvePolicyTypeId(
        policyTypes,
        ['Build'],
        '0609b952-1397-4640-95ec-e00a01b2c241',
      );
      const requiredReviewersPolicyTypeId = resolvePolicyTypeId(
        policyTypes,
        ['Required reviewers'],
        'fd2167ab-b0be-447a-8ec8-39368250530e',
      );
      const mergeStrategyPolicyTypeId = resolvePolicyTypeId(
        policyTypes,
        ['Require a merge strategy', 'Merge strategy'],
        'fa4e907d-c16b-4a4c-9dfa-4916e5d171ab',
      );
      const commentRequirementsPolicyTypeId = resolvePolicyTypeId(policyTypes, [
        'Comment requirements',
      ]);

      const pipelineId = Number(ctx.input.buildValidationPipelineId);
      const automaticReviewerPrincipalNames =
        ctx.input.automaticReviewerPrincipalNames?.length
          ? ctx.input.automaticReviewerPrincipalNames
          : options.defaultAutomaticReviewerPrincipalNames;

      const { resolvedIds, unresolvedPrincipalNames } = automaticReviewerPrincipalNames.length
        ? await resolveAzureIdentityIds({
            organization: repo.organization,
            token,
            principalNames: automaticReviewerPrincipalNames,
          })
        : { resolvedIds: [], unresolvedPrincipalNames: [] };

      const configuredBranches: string[] = [];
      for (const branchName of ctx.input.branches) {
        await upsertAzurePolicyConfiguration({
          repo,
          token,
          policyTypeId: minimumApproverCountPolicyTypeId,
          repositoryId: repository.id,
          branchName,
          isBlocking: true,
          settings: {
            minimumApproverCount: ctx.input.minimumApproverCount,
            creatorVoteCounts: ctx.input.allowRequestorsToApprove,
            allowDownvotes: ctx.input.allowCompletionWithRejectsOrWaits,
            resetOnSourcePush: ctx.input.resetOnSourcePush,
            resetRejectionsOnSourcePush: ctx.input.resetOnSourcePush,
            blockLastPusherVote: ctx.input.blockLastPusherApproval,
          },
        });

        if (ctx.input.requireCommentResolution) {
          await upsertAzurePolicyConfiguration({
            repo,
            token,
            policyTypeId: commentRequirementsPolicyTypeId,
            repositoryId: repository.id,
            branchName,
            isBlocking: true,
            settings: {},
          });
        }

        await upsertAzurePolicyConfiguration({
          repo,
          token,
          policyTypeId: mergeStrategyPolicyTypeId,
          repositoryId: repository.id,
          branchName,
          isBlocking: true,
          settings: {
            allowNoFastForward: ctx.input.allowBasicNoFastForward,
            allowSquash: ctx.input.allowSquash,
            allowRebase: ctx.input.allowRebase,
            allowRebaseMerge: ctx.input.allowRebaseMerge,
            useSquashMerge:
              ctx.input.allowSquash &&
              !ctx.input.allowBasicNoFastForward &&
              !ctx.input.allowRebase &&
              !ctx.input.allowRebaseMerge,
          },
        });

        if (Number.isInteger(pipelineId) && pipelineId > 0) {
          await upsertAzurePolicyConfiguration({
            repo,
            token,
            policyTypeId: buildValidationPolicyTypeId,
            repositoryId: repository.id,
            branchName,
            isBlocking: true,
            settings: {
              buildDefinitionId: pipelineId,
              displayName: `${repo.repo} validation`,
              manualQueueOnly: false,
              queueOnSourceUpdateOnly: false,
              validDuration: 0,
            },
          });
        }

        if (resolvedIds.length > 0) {
          await upsertAzurePolicyConfiguration({
            repo,
            token,
            policyTypeId: requiredReviewersPolicyTypeId,
            repositoryId: repository.id,
            branchName,
            isBlocking: ctx.input.automaticReviewerRequired,
            settings: {
              requiredReviewerIds: resolvedIds,
              filenamePatterns: [],
              addedFilesOnly: false,
              message: 'Review required by SHIELD Platform branch policy.',
            },
          });
        }

        configuredBranches.push(branchName);
      }

      if (unresolvedPrincipalNames.length > 0) {
        ctx.logger.warn(
          `Could not resolve Azure DevOps automatic reviewers: ${unresolvedPrincipalNames.join(', ')}`,
        );
      }

      ctx.output('configuredBranches', configuredBranches);
      ctx.output('unresolvedAutomaticReviewerPrincipalNames', unresolvedPrincipalNames);
    },
  });
}

function createAzureGitopsBootstrapAction() {
  return createTemplateAction({
    id: 'azure:gitops:bootstrap',
    description:
      'Creates or updates the GitOps values structure for the service and opens a pull request.',
    schema: {
      input: {
        repoUrl: z => z.string({ description: 'Azure DevOps repoUrl query for the GitOps repository.' }),
        serviceName: z => z.string({ description: 'Service name.' }),
        tier: z => z.string({ description: 'Service tier.' }),
        owner: z => z.string({ description: 'Backstage owner entity reference.' }),
        projectContext: z => z.string({ description: 'Context or system name for the service.' }),
        imageRepository: z => z.string({ description: 'Container image repository.' }),
        telemetryInjectionAnnotation: z =>
          z.string({ description: 'OpenTelemetry injection annotation value.' }),
        gitAuthorName: z =>
          z
            .string({ description: 'Git author name.' })
            .optional(),
        gitAuthorEmail: z =>
          z
            .string({ description: 'Git author email.' })
            .optional(),
      },
      output: {
        branchName: z => z.string(),
        valuesPath: z => z.string(),
        valuesUrl: z => z.string(),
        pullRequestUrl: z => z.string(),
      },
    },
    async handler(ctx) {
      const token = getAzureDevOpsToken('gitops');
      const repo = parseAzureRepoUrl(ctx.input.repoUrl);
      const gitAuthorName = ctx.input.gitAuthorName ?? 'ArgoIT Devops';
      const gitAuthorEmail = ctx.input.gitAuthorEmail ?? 'devopsacesso@useargo.com';
      const authHeader = `AUTHORIZATION: Basic ${Buffer.from(`:${token}`).toString('base64')}`;
      const branchName = `feature/${ctx.input.serviceName}`;
      const targetBranch = 'main';
      const worktreePath = mkdtempSync(resolve(tmpdir(), 'shield-platform-gitops-'));
      const repoPath = resolve(worktreePath, repo.repo);

      try {
        try {
          runGit(['clone', '--branch', branchName, '--single-branch', repo.cloneUrl, repoPath], {
            authHeader,
          });
        } catch {
          runGit(['clone', '--branch', targetBranch, '--single-branch', repo.cloneUrl, repoPath], {
            authHeader,
          });
          runGit(['checkout', '-b', branchName], { cwd: repoPath });
        }

        const environments = getGitopsEnvironments(ctx.input.tier);
        const changedFiles: string[] = [];

        for (const environment of environments) {
          const valuesPath = resolve(
            repoPath,
            'gitops',
            'apps',
            ctx.input.tier,
            ctx.input.serviceName,
            environment,
            'values.yaml',
          );
          const relativeValuesPath = relative(repoPath, valuesPath).replace(/\\/g, '/');
          const nextContent = renderGitopsValuesYaml({
            serviceName: ctx.input.serviceName,
            tier: ctx.input.tier,
            owner: ctx.input.owner,
            projectContext: ctx.input.projectContext,
            imageRepository: ctx.input.imageRepository,
            telemetryInjectionAnnotation: ctx.input.telemetryInjectionAnnotation,
            environment,
          });

          mkdirSync(dirname(valuesPath), { recursive: true });
          const currentContent = existsSync(valuesPath) ? readFileSync(valuesPath, 'utf8') : undefined;
          if (currentContent === nextContent) {
            continue;
          }

          writeFileSync(valuesPath, nextContent, 'utf8');
          changedFiles.push(relativeValuesPath);
        }

        runGit(['config', 'user.name', gitAuthorName], { cwd: repoPath });
        runGit(['config', 'user.email', gitAuthorEmail], { cwd: repoPath });

        if (changedFiles.length > 0) {
          runGit(['add', ...changedFiles], { cwd: repoPath });
          runGit(
            ['commit', '-m', `chore(gitops): bootstrap ${ctx.input.serviceName} values`],
            { cwd: repoPath },
          );
          runGit(['push', 'origin', branchName], { cwd: repoPath, authHeader });
        }

        const repository = await getAzureRepository(repo, token);
        if (!repository.id) {
          throw new Error(`Could not resolve repository id for ${repo.repo}.`);
        }

        const existingPullRequests = (
          await listAzurePullRequests({
            repo,
            repositoryId: repository.id,
            token,
            sourceBranch: branchName,
            targetBranch,
          })
        ).value ?? [];

        let pullRequestId = existingPullRequests[0]?.pullRequestId;
        if (!pullRequestId) {
          const pullRequest = await createAzurePullRequest({
            repo,
            repositoryId: repository.id,
            token,
            sourceBranch: branchName,
            targetBranch,
            title: `chore(gitops): bootstrap ${ctx.input.serviceName}`,
            description:
              'Automated bootstrap from SHIELD Platform to create the initial GitOps values structure.',
          });
          pullRequestId = pullRequest.pullRequestId;
        }

        if (!pullRequestId) {
          throw new Error(`Could not create or resolve the GitOps pull request for ${ctx.input.serviceName}.`);
        }

        const valuesPath = `gitops/apps/${ctx.input.tier}/${ctx.input.serviceName}/${environments[0]}/values.yaml`;

        ctx.output('branchName', branchName);
        ctx.output('valuesPath', valuesPath);
        ctx.output('valuesUrl', webFileUrl(repo, branchName, valuesPath));
        ctx.output('pullRequestUrl', webPullRequestUrl(repo, pullRequestId));
      } finally {
        rmSync(worktreePath, { recursive: true, force: true });
      }
    },
  });
}

function createUpdateBackendApplicationsAction() {
  return createTemplateAction({
    id: 'shield:gitops:update-backend-applications',
    description:
      'Adds the service entry to backend ApplicationSet manifests in the GitOps repository branch created during bootstrap.',
    schema: {
      input: {
        repoUrl: z =>
          z.string({ description: 'Azure DevOps repoUrl query for the GitOps repository.' }),
        serviceName: z =>
          z.string({ description: 'Service name to register in backend ApplicationSets.' }),
        tier: z => z.string({ description: 'Service tier.' }),
        namespace: z =>
          z.string({ description: 'Namespace or project name used to derive the Kubernetes namespace.' }),
        branchName: z =>
          z
            .string({ description: 'Git branch to update. Defaults to feature/<service>.' })
            .optional(),
        gitAuthorName: z =>
          z
            .string({ description: 'Git author name.' })
            .optional(),
        gitAuthorEmail: z =>
          z
            .string({ description: 'Git author email.' })
            .optional(),
      },
      output: {
        changedFiles: z => z.array(z.string()),
        branchName: z => z.string(),
        namespace: z => z.string(),
      },
    },
    async handler(ctx) {
      if (ctx.input.tier !== 'backend') {
        ctx.output('changedFiles', []);
        ctx.output('branchName', ctx.input.branchName ?? `feature/${ctx.input.serviceName}`);
        ctx.output('namespace', normalizeNamespace(ctx.input.namespace));
        return;
      }

      const token = getAzureDevOpsToken('gitops');
      const { cloneUrl, repo } = parseAzureRepoUrl(ctx.input.repoUrl);
      const branchName = ctx.input.branchName ?? `feature/${ctx.input.serviceName}`;
      const normalizedNamespace = normalizeNamespace(ctx.input.namespace);
      const gitAuthorName = ctx.input.gitAuthorName ?? 'ArgoIT Devops';
      const gitAuthorEmail = ctx.input.gitAuthorEmail ?? 'devopsacesso@useargo.com';
      const authHeader = `AUTHORIZATION: Basic ${Buffer.from(`:${token}`).toString('base64')}`;
      const worktreePath = mkdtempSync(resolve(tmpdir(), 'shield-platform-backend-apps-'));
      const repoPath = resolve(worktreePath, repo);

      try {
        try {
          runGit(['clone', '--branch', branchName, '--single-branch', cloneUrl, repoPath], {
            authHeader,
          });
        } catch {
          runGit(['clone', '--branch', 'main', '--single-branch', cloneUrl, repoPath], {
            authHeader,
          });
          runGit(['checkout', '-b', branchName], { cwd: repoPath });
        }

        const backendApplicationsRoot = resolve(repoPath, 'gitops/application/backend');
        const backendApplicationFiles = selectBackendApplicationFiles(backendApplicationsRoot);

        const changedFiles: string[] = [];
        for (const filePath of backendApplicationFiles) {
          const currentContent = readFileSync(filePath, 'utf8');
          const { changed, nextContent } = addAppToElements(
            currentContent,
            ctx.input.serviceName,
            normalizedNamespace,
          );

          if (!changed) {
            continue;
          }

          writeFileSync(filePath, nextContent, 'utf8');
          changedFiles.push(relative(repoPath, filePath).replace(/\\/g, '/'));
        }

        if (changedFiles.length === 0) {
          ctx.logger.info(
            `Service ${ctx.input.serviceName} is already registered in backend ApplicationSets.`,
          );
          ctx.output('changedFiles', []);
          ctx.output('branchName', branchName);
          ctx.output('namespace', normalizedNamespace);
          return;
        }

        runGit(['config', 'user.name', gitAuthorName], { cwd: repoPath });
        runGit(['config', 'user.email', gitAuthorEmail], { cwd: repoPath });
        runGit(['add', ...changedFiles], { cwd: repoPath });
        runGit(
          ['commit', '-m', `chore(gitops): register ${ctx.input.serviceName} in backend applications`],
          { cwd: repoPath },
        );
        runGit(['push', 'origin', branchName], { cwd: repoPath, authHeader });

        ctx.output('changedFiles', changedFiles);
        ctx.output('branchName', branchName);
        ctx.output('namespace', normalizedNamespace);
      } finally {
        rmSync(worktreePath, { recursive: true, force: true });
      }
    },
  });
}

export default createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'shield-gitops',
  register(reg) {
    reg.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        rootConfig: coreServices.rootConfig,
      },
      async init({ scaffolder, rootConfig }) {
        const defaultOrganization =
          rootConfig.getOptionalString('shield.integrations.azureDevOps.organization') ??
          process.env.AZURE_DEVOPS_ORGANIZATION ??
          DEFAULT_ORGANIZATION;
        const defaultAutomaticReviewerPrincipalNames =
          rootConfig.getOptionalStringArray(
            'shield.integrations.azureDevOps.branchPolicies.automaticReviewerPrincipalNames',
          ) ?? [];

        scaffolder.addActions(
          createResolveSystemFromOwnerAction(),
          createAzureBootstrapBranchesAction(),
          createAzureEnsureEnvironmentsAction({ defaultOrganization }),
          createAzureCreatePipelineAndRunAction(),
          createAzureConfigurePoliciesAction({ defaultAutomaticReviewerPrincipalNames }),
          createAzureGitopsBootstrapAction(),
          createUpdateBackendApplicationsAction(),
        );
      },
    });
  },
});
