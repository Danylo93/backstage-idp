import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Grid, Typography } from '@material-ui/core';
import { InfoCard, Link } from '@backstage/core-components';
import {
  configApiRef,
  discoveryApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';

type DeliveryState =
  | 'healthy'
  | 'progressing'
  | 'degraded'
  | 'missing'
  | 'unknown'
  | 'error';

type DeliverySnapshot = {
  entityRef: string;
  refreshedAt: string;
  overallState: DeliveryState;
  warnings: string[];
  azureDevOps: {
    repository: {
      state: DeliveryState;
      title?: string;
      url?: string;
      message?: string;
      project?: string;
      repo?: string;
      defaultBranch?: string;
    };
    pipeline: {
      state: DeliveryState;
      name?: string;
      id?: number;
      url?: string;
      message?: string;
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
    values: {
      state: DeliveryState;
      title?: string;
      url?: string;
      message?: string;
      path?: string;
      commitId?: string;
      lastChangedAt?: string;
    };
    pullRequest: {
      state: DeliveryState;
      title?: string;
      url?: string;
      message?: string;
      id?: number;
      sourceBranch?: string;
      targetBranch?: string;
    };
  };
  argoCd: {
    application: {
      state: DeliveryState;
      name?: string;
      url?: string;
      message?: string;
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

const stateLabels: Record<DeliveryState, string> = {
  healthy: 'Saudavel',
  progressing: 'Em andamento',
  degraded: 'Degradado',
  missing: 'Ausente',
  unknown: 'Indefinido',
  error: 'Erro',
};

const stateStyles: Record<DeliveryState, { background: string; color: string }> = {
  healthy: { background: '#dff5e6', color: '#0f8a3e' },
  progressing: { background: '#f8edd1', color: '#b77200' },
  degraded: { background: '#ffe4e6', color: '#b42318' },
  missing: { background: '#e5e7eb', color: '#4b5563' },
  unknown: { background: '#e0f2fe', color: '#075985' },
  error: { background: '#fee2e2', color: '#991b1b' },
};

function StatusChip({ state }: { state: DeliveryState }) {
  return (
    <Chip
      size="small"
      label={stateLabels[state]}
      style={stateStyles[state]}
    />
  );
}

function formatDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toLocaleString('pt-BR');
}

export const EntityPlatformReadinessContent = () => {
  const configApi = useApi(configApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const { entity } = useEntity();
  const [snapshot, setSnapshot] = useState<DeliverySnapshot>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshNonce, setRefreshNonce] = useState(0);

  const namespace = entity.metadata.namespace ?? 'default';
  const kind = entity.kind.toLowerCase();
  const name = entity.metadata.name;

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      setLoading(true);
      setError(undefined);

      try {
        const baseUrl = await discoveryApi.getBaseUrl('shield-platform');
        const response = await fetch(
          `${baseUrl}/delivery/${namespace}/${kind}/${name}`,
          {
            credentials: 'include',
          },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => undefined)) as
            | { error?: string }
            | undefined;
          throw new Error(payload?.error ?? `HTTP ${response.status}`);
        }

        const payload = (await response.json()) as DeliverySnapshot;
        if (!cancelled) {
          setSnapshot(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Falha ao atualizar os sinais de entrega.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [discoveryApi, kind, name, namespace, refreshNonce]);

  const argoBaseUrl =
    configApi.getOptionalString('shield.integrations.argoCd.baseUrl') ?? '';

  const warningCount = snapshot?.warnings.length ?? 0;
  const refreshedAt = useMemo(
    () => formatDate(snapshot?.refreshedAt),
    [snapshot?.refreshedAt],
  );
  let pipelineLink = null;
  if (snapshot?.azureDevOps.pipeline.lastRun?.url) {
    pipelineLink = (
      <Typography variant="body2">
        <a
          href={snapshot.azureDevOps.pipeline.lastRun.url}
          target="_blank"
          rel="noreferrer"
        >
          Abrir ultima execucao
        </a>
      </Typography>
    );
  } else if (snapshot?.azureDevOps.pipeline.url) {
    pipelineLink = (
      <Typography variant="body2">
        <a
          href={snapshot.azureDevOps.pipeline.url}
          target="_blank"
          rel="noreferrer"
        >
          Abrir pipeline no Azure DevOps
        </a>
      </Typography>
    );
  }
  let argoLink = null;
  if (snapshot?.argoCd.application.url) {
    argoLink = (
      <Typography variant="body2">
        <a
          href={snapshot.argoCd.application.url}
          target="_blank"
          rel="noreferrer"
        >
          Abrir aplicacao no Argo CD
        </a>
      </Typography>
    );
  } else if (argoBaseUrl) {
    argoLink = (
      <Typography variant="body2">
        <a href={argoBaseUrl} target="_blank" rel="noreferrer">
          Abrir Argo CD
        </a>
      </Typography>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item md={4} xs={12}>
        <InfoCard title="Azure DevOps">
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Repositorio</Typography>
            <StatusChip state={snapshot?.azureDevOps.repository.state ?? 'unknown'} />
          </Box>
          <Typography variant="body2">
            {snapshot?.azureDevOps.repository.title ??
              'Sem anotacao dev.azure.com/project-repo'}
          </Typography>
          {snapshot?.azureDevOps.repository.defaultBranch ? (
            <Typography variant="body2">
              Branch padrao: <code>{snapshot.azureDevOps.repository.defaultBranch}</code>
            </Typography>
          ) : null}
          {snapshot?.azureDevOps.repository.message ? (
            <Typography variant="body2">
              {snapshot.azureDevOps.repository.message}
            </Typography>
          ) : null}
          {snapshot?.azureDevOps.repository.url ? (
            <Typography variant="body2">
              <a
                href={snapshot.azureDevOps.repository.url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir repo no Azure Repos
              </a>
            </Typography>
          ) : null}

          <Box display="flex" alignItems="center" justifyContent="space-between" mt={3} mb={1}>
            <Typography variant="body2">Pipeline</Typography>
            <StatusChip
              state={
                snapshot?.azureDevOps.pipeline.lastRun?.state ??
                snapshot?.azureDevOps.pipeline.state ??
                'unknown'
              }
            />
          </Box>
          <Typography variant="body2">
            {snapshot?.azureDevOps.pipeline.name ??
              'Sem anotacao dev.azure.com/pipeline'}
          </Typography>
          {snapshot?.azureDevOps.pipeline.lastRun ? (
            <>
              <Typography variant="body2">
                Ultima execucao:{' '}
                <code>
                  #{snapshot.azureDevOps.pipeline.lastRun.id ?? 'sem id'}
                </code>
                {snapshot.azureDevOps.pipeline.lastRun.result
                  ? ` (${snapshot.azureDevOps.pipeline.lastRun.result})`
                  : ''}
              </Typography>
              {snapshot.azureDevOps.pipeline.lastRun.sourceBranch ? (
                <Typography variant="body2">
                  Branch: <code>{snapshot.azureDevOps.pipeline.lastRun.sourceBranch}</code>
                </Typography>
              ) : null}
              {formatDate(snapshot.azureDevOps.pipeline.lastRun.finishedAt) ? (
                <Typography variant="body2">
                  Finalizada em:{' '}
                  {formatDate(snapshot.azureDevOps.pipeline.lastRun.finishedAt)}
                </Typography>
              ) : null}
            </>
          ) : null}
          {snapshot?.azureDevOps.pipeline.message ? (
            <Typography variant="body2">
              {snapshot.azureDevOps.pipeline.message}
            </Typography>
          ) : null}
          {pipelineLink}
        </InfoCard>
      </Grid>

      <Grid item md={4} xs={12}>
        <InfoCard title="GitOps">
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="body2">values.yaml</Typography>
            <StatusChip state={snapshot?.gitOps.values.state ?? 'unknown'} />
          </Box>
          <Typography variant="body2">
            {snapshot?.gitOps.values.path ?? 'Sem anotacao shield.io/gitops-values-path'}
          </Typography>
          {snapshot?.gitOps.values.lastChangedAt ? (
            <Typography variant="body2">
              Ultima alteracao: {formatDate(snapshot.gitOps.values.lastChangedAt)}
            </Typography>
          ) : null}
          {snapshot?.gitOps.values.commitId ? (
            <Typography variant="body2">
              Commit: <code>{snapshot.gitOps.values.commitId.slice(0, 8)}</code>
            </Typography>
          ) : null}
          {snapshot?.gitOps.values.message ? (
            <Typography variant="body2">{snapshot.gitOps.values.message}</Typography>
          ) : null}
          {snapshot?.gitOps.values.url ? (
            <Typography variant="body2">
              <a href={snapshot.gitOps.values.url} target="_blank" rel="noreferrer">
                Abrir values no argo-gitops
              </a>
            </Typography>
          ) : null}

          <Box display="flex" alignItems="center" justifyContent="space-between" mt={3} mb={1}>
            <Typography variant="body2">Pull request</Typography>
            <StatusChip state={snapshot?.gitOps.pullRequest.state ?? 'unknown'} />
          </Box>
          <Typography variant="body2">
            {snapshot?.gitOps.pullRequest.title ??
              snapshot?.gitOps.pullRequest.message ??
              'Nenhum PR GitOps encontrado'}
          </Typography>
          {snapshot?.gitOps.pullRequest.sourceBranch ? (
            <Typography variant="body2">
              Origem: <code>{snapshot.gitOps.pullRequest.sourceBranch}</code>
            </Typography>
          ) : null}
          {snapshot?.gitOps.pullRequest.targetBranch ? (
            <Typography variant="body2">
              Destino: <code>{snapshot.gitOps.pullRequest.targetBranch}</code>
            </Typography>
          ) : null}
          {snapshot?.gitOps.pullRequest.url ? (
            <Typography variant="body2">
              <a href={snapshot.gitOps.pullRequest.url} target="_blank" rel="noreferrer">
                Abrir PR do argo-gitops
              </a>
            </Typography>
          ) : null}
        </InfoCard>
      </Grid>

      <Grid item md={4} xs={12}>
        <InfoCard title="Argo CD">
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="body2">Aplicacao</Typography>
            <StatusChip state={snapshot?.argoCd.application.state ?? 'unknown'} />
          </Box>
          <Typography variant="body2">
            {snapshot?.argoCd.application.name ??
              'Sem anotacao shield.io/argocd-app-name'}
          </Typography>
          {snapshot?.argoCd.application.project ? (
            <Typography variant="body2">
              Projeto: <code>{snapshot.argoCd.application.project}</code>
            </Typography>
          ) : null}
          {snapshot?.argoCd.application.namespace ? (
            <Typography variant="body2">
              Namespace: <code>{snapshot.argoCd.application.namespace}</code>
            </Typography>
          ) : null}
          {snapshot?.argoCd.application.syncStatus ? (
            <Typography variant="body2">
              Sync: <code>{snapshot.argoCd.application.syncStatus}</code>
            </Typography>
          ) : null}
          {snapshot?.argoCd.application.healthStatus ? (
            <Typography variant="body2">
              Health: <code>{snapshot.argoCd.application.healthStatus}</code>
            </Typography>
          ) : null}
          {snapshot?.argoCd.application.revision ? (
            <Typography variant="body2">
              Revisao: <code>{snapshot.argoCd.application.revision}</code>
            </Typography>
          ) : null}
          {snapshot?.argoCd.application.message ? (
            <Typography variant="body2">
              {snapshot.argoCd.application.message}
            </Typography>
          ) : null}
          {argoLink}
          <Typography variant="body2">
            Ver blueprint em{' '}
            <Link to="/docs/default/component/shield-platform/argocd">
              TechDocs
            </Link>
            .
          </Typography>
        </InfoCard>
      </Grid>

      <Grid item xs={12}>
        <InfoCard title="Sinais da Plataforma">
          <Box display="flex" flexWrap="wrap" gridGap={12}>
            <Box display="flex" alignItems="center" gridGap={8}>
              <Typography variant="body2">Estado geral</Typography>
              <StatusChip state={snapshot?.overallState ?? 'unknown'} />
            </Box>
            <Box display="flex" alignItems="center" gridGap={8}>
              <Typography variant="body2">Kubernetes</Typography>
              <StatusChip state={snapshot?.kubernetes.state ?? 'unknown'} />
            </Box>
            {snapshot?.kubernetes.selector ? (
              <Typography variant="body2">
                Seletor: <code>{snapshot.kubernetes.selector}</code>
              </Typography>
            ) : null}
            {refreshedAt ? (
              <Typography variant="body2">Atualizado em: {refreshedAt}</Typography>
            ) : null}
          </Box>

          {loading ? (
            <Box mt={2}>
              <Typography variant="body2">Atualizando sinais ao vivo...</Typography>
            </Box>
          ) : null}

          {error ? (
            <Box mt={2}>
              <Typography variant="body2" style={{ color: '#b42318' }}>
                {error}
              </Typography>
            </Box>
          ) : null}

          {warningCount > 0 ? (
            <Box mt={2}>
              <Typography variant="body2">
                Avisos de integracao: {warningCount}
              </Typography>
              {snapshot?.warnings.map(warning => (
                <Typography key={warning} variant="body2">
                  - {warning}
                </Typography>
              ))}
            </Box>
          ) : null}

          <Box mt={2} display="flex" gridGap={12} flexWrap="wrap">
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setRefreshNonce(current => current + 1)}
              disabled={loading}
            >
              Atualizar sinais
            </Button>
            <Box display="flex" alignItems="center">
              <Link to="/catalog-graph">Abrir topologia</Link>
            </Box>
          </Box>
        </InfoCard>
      </Grid>
    </Grid>
  );
};
