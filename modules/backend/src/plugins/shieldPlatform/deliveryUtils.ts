export type DeliveryState =
  | 'healthy'
  | 'progressing'
  | 'degraded'
  | 'missing'
  | 'unknown'
  | 'error';

type PullRequestLike = {
  creationDate?: string;
  closedDate?: string;
  pullRequestId?: number;
  status?: string;
};

export function parseAzureProjectRepo(value?: string) {
  if (!value) {
    return undefined;
  }

  const [project, repo] = value.split('/', 2).map(part => part?.trim());
  if (!project || !repo) {
    return undefined;
  }

  return { project, repo };
}

export function buildGitOpsFeatureBranch(serviceName: string) {
  return `feature/${serviceName}`;
}

export function mapAzureBuildState(
  status?: string | null,
  result?: string | null,
): DeliveryState {
  const normalizedStatus = status?.toLowerCase();
  const normalizedResult = result?.toLowerCase();

  if (!normalizedStatus) {
    return 'unknown';
  }

  if (
    normalizedStatus === 'inprogress' ||
    normalizedStatus === 'notstarted' ||
    normalizedStatus === 'postponed'
  ) {
    return 'progressing';
  }

  if (normalizedStatus === 'completed') {
    if (
      normalizedResult === 'succeeded' ||
      normalizedResult === 'partiallysucceeded'
    ) {
      return 'healthy';
    }

    if (
      normalizedResult === 'failed' ||
      normalizedResult === 'canceled'
    ) {
      return 'degraded';
    }
  }

  return 'unknown';
}

export function mapGitOpsPullRequestState(
  status?: string | null,
): DeliveryState {
  const normalizedStatus = status?.toLowerCase();

  if (!normalizedStatus) {
    return 'missing';
  }

  if (normalizedStatus === 'active') {
    return 'progressing';
  }

  if (normalizedStatus === 'completed') {
    return 'healthy';
  }

  if (normalizedStatus === 'abandoned') {
    return 'degraded';
  }

  return 'unknown';
}

export function mapArgoApplicationState(
  syncStatus?: string | null,
  healthStatus?: string | null,
): DeliveryState {
  const normalizedSync = syncStatus?.toLowerCase();
  const normalizedHealth = healthStatus?.toLowerCase();

  if (!normalizedSync && !normalizedHealth) {
    return 'unknown';
  }

  if (
    normalizedHealth === 'degraded' ||
    normalizedHealth === 'missing' ||
    normalizedSync === 'outofsync'
  ) {
    return 'degraded';
  }

  if (
    normalizedHealth === 'progressing' ||
    normalizedHealth === 'suspended'
  ) {
    return 'progressing';
  }

  if (normalizedSync === 'synced' && normalizedHealth === 'healthy') {
    return 'healthy';
  }

  if (normalizedSync === 'synced') {
    return 'progressing';
  }

  return 'unknown';
}

export function pickLatestPullRequest<T extends PullRequestLike>(
  pullRequests: T[],
) {
  return [...pullRequests].sort((left, right) => {
    const leftDate = Date.parse(
      rightDateCandidate(left.creationDate, left.closedDate),
    );
    const rightDate = Date.parse(
      rightDateCandidate(right.creationDate, right.closedDate),
    );

    if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) {
      return rightDate - leftDate;
    }

    return (right.pullRequestId ?? 0) - (left.pullRequestId ?? 0);
  })[0];
}

function rightDateCandidate(
  creationDate?: string,
  closedDate?: string,
) {
  return closedDate || creationDate || '';
}

export function aggregateDeliveryStates(
  states: Array<DeliveryState | undefined>,
): DeliveryState {
  const normalized = states.filter(Boolean) as DeliveryState[];

  if (!normalized.length) {
    return 'unknown';
  }

  const severity: Record<DeliveryState, number> = {
    error: 5,
    degraded: 4,
    progressing: 3,
    unknown: 2,
    missing: 1,
    healthy: 0,
  };

  return normalized.reduce((current, candidate) =>
    severity[candidate] > severity[current] ? candidate : current,
  );
}
