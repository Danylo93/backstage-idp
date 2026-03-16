import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { Content, ErrorPanel, Header, Page } from '@backstage/core-components';
import { useTaskEventStream, scaffolderApiRef } from '@backstage/plugin-scaffolder-react';
import {
  DefaultTemplateOutputs,
  TaskLogStream,
} from '@backstage/plugin-scaffolder-react/alpha';
import { usePermission } from '@backstage/plugin-permission-react';
import {
  taskCancelPermission,
  taskCreatePermission,
  taskReadPermission,
} from '@backstage/plugin-scaffolder-common/alpha';

type ShieldTaskPageProps = PropsWithChildren<{
  TemplateOutputsComponent?: React.ComponentType<{ output?: unknown }>;
}>;

const useStyles = makeStyles(theme => ({
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
  },
  buttonBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'right',
    flexWrap: 'wrap',
    gap: theme.spacing(1.5),
  },
}));

function RepoExistsIllustration() {
  return (
    <svg
      className="shield-task-error-state__illustration"
      viewBox="0 0 320 220"
      role="img"
      aria-label="Repositorio ja existente"
    >
      <defs>
        <linearGradient id="shieldRepoGlow" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#39d8ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#0f6fff" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect
        x="20"
        y="30"
        width="120"
        height="84"
        rx="10"
        fill="rgba(9,17,29,0.85)"
        stroke="url(#shieldRepoGlow)"
        strokeWidth="2"
      />
      <path
        d="M34 57h36l12 12h44"
        fill="none"
        stroke="url(#shieldRepoGlow)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="52"
        y="70"
        width="56"
        height="10"
        rx="5"
        fill="rgba(57,216,255,0.35)"
      />
      <rect
        x="52"
        y="88"
        width="76"
        height="10"
        rx="5"
        fill="rgba(57,216,255,0.18)"
      />
      <rect
        x="114"
        y="82"
        width="120"
        height="84"
        rx="10"
        fill="rgba(9,17,29,0.75)"
        stroke="rgba(57,216,255,0.3)"
        strokeWidth="2"
        strokeDasharray="8 8"
      />
      <path
        d="M128 109h36l12 12h44"
        fill="none"
        stroke="rgba(57,216,255,0.35)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="236"
        cy="50"
        r="30"
        fill="rgba(249,89,89,0.14)"
        stroke="rgba(249,89,89,0.66)"
        strokeWidth="2"
      />
      <path
        d="M224 38l24 24M248 38l-24 24"
        stroke="#ff6c6c"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M60 170h152"
        fill="none"
        stroke="rgba(57,216,255,0.24)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="60" cy="170" r="5" fill="#39d8ff" />
      <circle cx="132" cy="170" r="5" fill="#39d8ff" fillOpacity="0.45" />
      <circle cx="212" cy="170" r="5" fill="#ff6c6c" />
    </svg>
  );
}

function extractRepoExistsMatch(logText: string) {
  const match =
    /TF400948:\s*A Git repository with the name ([^.\r\n]+) already exists/i.exec(
      logText,
    ) ??
    /repository with the name ([^.\r\n]+) already exists/i.exec(logText);

  return match?.[1]?.trim();
}

function formatStepDuration(step: { startedAt?: string; endedAt?: string }) {
  if (!step.startedAt || !step.endedAt) {
    return undefined;
  }

  const started = new Date(step.startedAt).getTime();
  const ended = new Date(step.endedAt).getTime();

  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started) {
    return undefined;
  }

  const durationSeconds = Math.max(0, Math.round((ended - started) / 1000));
  return `${durationSeconds} second${durationSeconds === 1 ? '' : 's'}`;
}

export function ShieldTaskPage(props: ShieldTaskPageProps) {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const classes = useStyles();
  const configApi = useApi(configApiRef);
  const scaffolderApi = useApi(scaffolderApiRef);
  const taskStream = useTaskEventStream(taskId ?? '');

  const [logsVisible, setLogsVisible] = useState(false);
  const [buttonBarVisible, setButtonBarVisible] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);

  const { allowed: canCancelTask } = usePermission({
    permission: taskCancelPermission,
    resourceRef: taskId,
  });
  const { allowed: canReadTask } = usePermission({
    permission: taskReadPermission,
    resourceRef: taskId,
  });
  const { allowed: canCreateTask } = usePermission({
    permission: taskCreatePermission,
  });

  useEffect(() => {
    if (taskStream.error) {
      setLogsVisible(true);
    }
  }, [taskStream.error]);

  useEffect(() => {
    if (taskStream.completed && !taskStream.error) {
      setLogsVisible(true);
      setButtonBarVisible(false);
    }
  }, [taskStream.completed, taskStream.error]);

  const steps = useMemo(
    () =>
      taskStream.task?.spec.steps.map(step => ({
        ...step,
        ...taskStream.steps?.[step.id],
      })) ?? [],
    [taskStream.steps, taskStream.task],
  );

  const activeStep = useMemo(() => {
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].status !== 'open') {
        return i;
      }
    }

    return 0;
  }, [steps]);

  const stepLogText = useMemo(
    () => Object.values(taskStream.stepLogs ?? {}).flat().join('\n'),
    [taskStream.stepLogs],
  );
  const isTransientStreamError = useMemo(() => {
    const errorText = [
      taskStream.error?.name,
      taskStream.error?.message,
      stepLogText,
    ]
      .filter(Boolean)
      .join('\n');

    return (
      Boolean(taskStream.error) &&
      /AbortError|BodyStreamBuffer was aborted|Failed to fetch/i.test(errorText) &&
      steps.length > 0 &&
      !steps.some(step => step.status === 'failed')
    );
  }, [stepLogText, steps, taskStream.error]);
  const warningStepIds = useMemo(() => {
    return new Set(
      Object.entries(taskStream.stepLogs ?? {})
        .filter(([, lines]) =>
          lines.some(line => /\bwarn:/i.test(line) || /\bwarning:/i.test(line)),
        )
        .map(([stepId]) => stepId),
    );
  }, [taskStream.stepLogs]);

  const repoName =
    String(taskStream.task?.spec.parameters?.name ?? '') ||
    extractRepoExistsMatch(
      `${taskStream.error?.message ?? ''}\n${stepLogText}`.trim(),
    );
  const azureProject = String(
    taskStream.task?.spec.parameters?.azureDevOpsProject ?? '',
  );
  const azureOrg =
    configApi.getOptionalString('shield.integrations.azureDevOps.organization') ??
    'argosolutions';
  const repoExists = Boolean(
    extractRepoExistsMatch(`${taskStream.error?.message ?? ''}\n${stepLogText}`),
  );
  const repoUrl =
    repoName && azureProject
      ? `https://dev.azure.com/${azureOrg}/${azureProject}/_git/${repoName}`
      : undefined;

  const cancelEnabled = !(taskStream.cancelled || taskStream.completed);
  const canStartOver = canReadTask && canCreateTask;
  const isRetryableTask =
    taskStream.task?.spec.EXPERIMENTAL_recovery?.EXPERIMENTAL_strategy ===
    'startOver';
  const canRetry = canReadTask && canCreateTask && isRetryableTask;

  const startOver = useCallback(() => {
    const metadata = taskStream.task?.spec.templateInfo?.entity?.metadata;
    const formData = taskStream.task?.spec.parameters ?? {};

    if (!metadata?.namespace || !metadata?.name) {
      navigate('/create');
      return;
    }

    const params = new URLSearchParams();
    params.set('formData', JSON.stringify(formData));
    const namespace = encodeURIComponent(metadata.namespace);
    const templateName = encodeURIComponent(metadata.name);

    navigate({
      pathname: `/create/templates/${namespace}/${templateName}`,
      search: `?${params.toString()}`,
    });
  }, [navigate, taskStream.task]);

  const cancelTask = useCallback(async () => {
    if (!taskId) {
      return;
    }

    setCancelLoading(true);
    try {
      await scaffolderApi.cancelTask(taskId);
    } finally {
      setCancelLoading(false);
    }
  }, [scaffolderApi, taskId]);

  const retryTask = useCallback(async () => {
    if (!taskId || !scaffolderApi.retry) {
      return;
    }

    setRetryLoading(true);
    try {
      await scaffolderApi.retry(taskId);
    } finally {
      setRetryLoading(false);
    }
  }, [scaffolderApi, taskId]);

  const Outputs = props.TemplateOutputsComponent ?? DefaultTemplateOutputs;

  return (
    <Page themeId="website">
      <Header
        title="Protocolo de Implantacao"
        subtitle={taskId ? `Task ${taskId}` : 'Operacao em andamento'}
      />
      <Content className={classes.contentWrapper}>
        {taskStream.error && !isTransientStreamError ? (
          <Box paddingBottom={2}>
            {repoExists ? (
              <Paper className="shield-task-error-state shield-task-error-state--repo-exists">
                <div className="shield-task-error-state__grid">
                  <div className="shield-task-error-state__content">
                    <span className="shield-task-error-state__eyebrow">
                      Conflito de inventario
                    </span>
                    <h3 className="shield-task-error-state__title">
                      Repositorio ja existe no Azure Repos
                    </h3>
                    <p className="shield-task-error-state__body">
                      O nome <code>{repoName || 'informado no template'}</code> ja
                      esta em uso no projeto <code>{azureProject || 'Azure DevOps'}</code>.
                      Escolha outro nome para continuar ou abra o repositorio
                      existente para reutilizar o ativo.
                    </p>
                    <div className="shield-task-error-state__meta">
                      <div>
                        <span>Projeto</span>
                        <strong>{azureProject || 'Nao identificado'}</strong>
                      </div>
                      <div>
                        <span>Repositorio</span>
                        <strong>{repoName || 'Nao identificado'}</strong>
                      </div>
                    </div>
                    <div className="shield-task-error-state__actions">
                      {repoUrl ? (
                        <Button
                          component="a"
                          href={repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          variant="contained"
                          color="primary"
                        >
                          Abrir repositorio existente
                        </Button>
                      ) : null}
                      <Button variant="outlined" onClick={startOver}>
                        Escolher outro nome
                      </Button>
                      <Button variant="text" onClick={() => setLogsVisible(true)}>
                        Ver detalhes tecnicos
                      </Button>
                    </div>
                  </div>
                  <div className="shield-task-error-state__visual">
                    <RepoExistsIllustration />
                    <span className="shield-task-error-state__visual-caption">
                      Duplicidade detectada no inventario Git
                    </span>
                  </div>
                </div>
              </Paper>
            ) : (
              <ErrorPanel
                error={taskStream.error}
                titleFormat="markdown"
                title={taskStream.error.message}
              />
            )}
          </Box>
        ) : null}

        <Box paddingBottom={2}>
          <Paper className="shield-task-steps-panel">
            <div className="shield-task-steps-panel__track">
              {steps.map((step, index) => {
                const isActive = index === activeStep && step.status === 'processing';
                const hasWarning =
                  warningStepIds.has(step.id) && step.status !== 'failed';
                let stateClass = 'pending';
                if (step.status === 'failed') {
                  stateClass = 'error';
                } else if (hasWarning) {
                  stateClass = 'warning';
                } else if (step.status === 'completed') {
                  stateClass = 'completed';
                } else if (isActive) {
                  stateClass = 'active';
                }
                const duration = formatStepDuration(step);
                let stepMeta = duration ?? 'Concluido';
                if (stateClass === 'warning') {
                  stepMeta = 'Atencao';
                } else if (stateClass === 'active') {
                  stepMeta = 'Em andamento';
                } else if (stateClass === 'pending') {
                  stepMeta = 'Aguardando';
                }

                return (
                  <div
                    key={step.id}
                    className={`shield-task-step shield-task-step--${stateClass}`}
                  >
                    <div className="shield-task-step__indicatorRow">
                      <div className="shield-task-step__indicator">
                        <span
                          className={`shield-task-step__indicatorSymbol shield-task-step__indicatorSymbol--${stateClass}`}
                        />
                      </div>
                      {index < steps.length - 1 ? (
                        <div className="shield-task-step__connector" />
                      ) : null}
                    </div>
                    <div className="shield-task-step__content">
                      <div className="shield-task-step__title">{step.name}</div>
                      <div className="shield-task-step__meta">
                        {stepMeta}
                        {/*
                        {stateClass === 'warning'
                          ? 'Atenção'
                          : duration ??
                            (stateClass === 'active'
                              ? 'Em andamento'
                              : stateClass === 'pending'
                              ? 'Aguardando'
                              : 'Concluído')}
                        */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Paper>
        </Box>

        <Outputs output={taskStream.output} />

        {buttonBarVisible ? (
          <Box paddingBottom={2}>
            <Paper>
              <Box padding={2}>
                <div className={classes.buttonBar}>
                  <Button
                    disabled={!cancelEnabled || cancelLoading || !canCancelTask}
                    onClick={cancelTask}
                  >
                    Cancelar
                  </Button>
                  {isRetryableTask ? (
                    <Button
                      disabled={cancelEnabled || retryLoading || !canRetry}
                      onClick={retryTask}
                    >
                      Tentar novamente
                    </Button>
                  ) : null}
                  <Button
                    color="primary"
                    variant="outlined"
                    onClick={() => setLogsVisible(!logsVisible)}
                  >
                    {logsVisible ? 'Ocultar logs' : 'Mostrar logs'}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={cancelEnabled || !canStartOver}
                    onClick={startOver}
                  >
                    Comecar de novo
                  </Button>
                </div>
              </Box>
            </Paper>
          </Box>
        ) : null}

        {logsVisible ? (
          <Paper style={{ height: '100%' }}>
            <Box padding={2} height="100%">
              <TaskLogStream logs={taskStream.stepLogs} />
            </Box>
          </Paper>
        ) : null}
      </Content>
    </Page>
  );
}
