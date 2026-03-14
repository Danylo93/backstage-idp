import {
  aggregateDeliveryStates,
  buildGitOpsFeatureBranch,
  mapArgoApplicationState,
  mapAzureBuildState,
  mapGitOpsPullRequestState,
  parseAzureProjectRepo,
  pickLatestPullRequest,
} from './deliveryUtils';

describe('deliveryUtils', () => {
  it('parses azure project/repo annotations', () => {
    expect(parseAzureProjectRepo('Devops/shield-platform')).toEqual({
      project: 'Devops',
      repo: 'shield-platform',
    });
    expect(parseAzureProjectRepo('invalid')).toBeUndefined();
  });

  it('maps azure build states into delivery states', () => {
    expect(mapAzureBuildState('completed', 'succeeded')).toBe('healthy');
    expect(mapAzureBuildState('completed', 'failed')).toBe('degraded');
    expect(mapAzureBuildState('inProgress', undefined)).toBe('progressing');
  });

  it('maps gitops pull request states', () => {
    expect(mapGitOpsPullRequestState('active')).toBe('progressing');
    expect(mapGitOpsPullRequestState('completed')).toBe('healthy');
    expect(mapGitOpsPullRequestState('abandoned')).toBe('degraded');
  });

  it('maps argo application states', () => {
    expect(mapArgoApplicationState('Synced', 'Healthy')).toBe('healthy');
    expect(mapArgoApplicationState('OutOfSync', 'Healthy')).toBe('degraded');
    expect(mapArgoApplicationState('Synced', 'Progressing')).toBe('progressing');
  });

  it('picks the latest pull request by activity date', () => {
    const latest = pickLatestPullRequest([
      {
        pullRequestId: 1,
        creationDate: '2026-03-10T10:00:00.000Z',
      },
      {
        pullRequestId: 2,
        creationDate: '2026-03-12T10:00:00.000Z',
      },
    ]);

    expect(latest?.pullRequestId).toBe(2);
  });

  it('aggregates delivery states by severity', () => {
    expect(aggregateDeliveryStates(['healthy', 'progressing'])).toBe(
      'progressing',
    );
    expect(aggregateDeliveryStates(['healthy', 'degraded'])).toBe('degraded');
  });

  it('builds the conventional gitops feature branch name', () => {
    expect(buildGitOpsFeatureBranch('shield-platform')).toBe(
      'feature/shield-platform',
    );
  });
});
