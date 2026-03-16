import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { stringifyEntityRef } from '@backstage/catalog-model';
import {
  AnalyticsContext,
  useApi,
  useRouteRef,
  useRouteRefParams,
} from '@backstage/core-plugin-api';
import { Page, Progress } from '@backstage/core-components';
import {
  scaffolderPlugin,
} from '@backstage/plugin-scaffolder';
import type { TemplateWizardPageProps } from '@backstage/plugin-scaffolder/alpha';
import {
  scaffolderApiRef,
  useTemplateSecrets,
} from '@backstage/plugin-scaffolder-react';
import {
  Workflow,
  useTemplateParameterSchema,
} from '@backstage/plugin-scaffolder-react/alpha';

const useStyles = makeStyles(theme => ({
  page: {
    padding: theme.spacing(3, 3, 4),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2, 2, 3),
    },
  },
  shell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    border: '1px solid rgba(43, 189, 238, 0.18)',
    background:
      'linear-gradient(180deg, rgba(7, 14, 25, 0.98), rgba(5, 10, 18, 0.98))',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.05), 0 28px 56px rgba(0, 0, 0, 0.36)',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage:
        'radial-gradient(circle at 1px 1px, rgba(43,189,238,0.14) 1px, transparent 0)',
      backgroundSize: '28px 28px',
      opacity: 0.12,
    },
  },
  hero: {
    position: 'relative',
    zIndex: 1,
    padding: theme.spacing(4, 4, 3),
    borderBottom: '1px solid rgba(43, 189, 238, 0.12)',
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(3, 2.5, 2.5),
    },
  },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    color: '#39d8ff',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    '&::before': {
      content: '""',
      width: 40,
      height: 4,
      borderRadius: 999,
      background: 'linear-gradient(90deg, #39d8ff, rgba(57,216,255,0.25))',
      boxShadow: '0 0 12px rgba(57,216,255,0.28)',
    },
  },
  title: {
    marginTop: theme.spacing(2.25),
    color: '#f8fbff',
    fontSize: 'clamp(2.3rem, 4vw, 3.7rem)',
    lineHeight: 0.95,
    letterSpacing: '-0.06em',
    fontWeight: 700,
  },
  subtitle: {
    marginTop: theme.spacing(1.4),
    color: '#8fb2d7',
    maxWidth: 980,
    lineHeight: 1.65,
    fontSize: '1.05rem',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: theme.spacing(2.25),
  },
  chip: {
    borderRadius: 999,
    color: '#4fd3ff',
    background: 'rgba(43, 189, 238, 0.08)',
    border: '1px solid rgba(43, 189, 238, 0.18)',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  grid: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.62fr)',
    gap: theme.spacing(3),
    padding: theme.spacing(3),
    alignItems: 'start',
    [theme.breakpoints.down('lg')]: {
      gridTemplateColumns: '1fr',
    },
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
  },
  workflow: {
    minWidth: 0,
  },
  sidebar: {
    display: 'grid',
    gap: theme.spacing(2),
  },
  panel: {
    borderRadius: 22,
    border: '1px solid rgba(43, 189, 238, 0.16)',
    background:
      'linear-gradient(180deg, rgba(12, 20, 34, 0.94), rgba(9, 16, 27, 0.96))',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 20px 36px rgba(0, 0, 0, 0.28)',
    padding: theme.spacing(2.5),
  },
  panelTitle: {
    color: '#f8fbff',
    fontSize: '0.95rem',
    fontWeight: 800,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
  },
  specList: {
    marginTop: theme.spacing(2),
    display: 'grid',
    gap: theme.spacing(1.4),
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(1.2),
    borderBottom: '1px solid rgba(43, 189, 238, 0.1)',
  },
  specLabel: {
    color: '#7086a4',
    fontSize: '0.78rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  specValue: {
    color: '#39d8ff',
    fontWeight: 700,
    textAlign: 'right',
  },
  orbCard: {
    minHeight: 260,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    borderStyle: 'dashed',
  },
  orb: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    border: '1px solid rgba(43, 189, 238, 0.28)',
    background:
      'radial-gradient(circle at 30% 30%, rgba(84, 217, 255, 0.28), rgba(15, 70, 102, 0.08) 45%, rgba(5, 12, 20, 0.1) 70%)',
    boxShadow:
      'inset 0 0 32px rgba(84, 217, 255, 0.08), 0 0 26px rgba(43, 189, 238, 0.18)',
  },
  orbCaption: {
    marginTop: theme.spacing(2.25),
    color: '#39d8ff',
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  orbDescription: {
    marginTop: theme.spacing(1),
    color: '#8096b4',
    lineHeight: 1.65,
  },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(2),
    borderTop: '1px solid rgba(43, 189, 238, 0.12)',
    color: '#6f86a4',
    fontSize: '0.74rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
}));

const formatTemplateName = (templateName: string) =>
  templateName
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const inferRuntime = (templateName: string, title?: string) => {
  const source = `${templateName} ${title ?? ''}`.toLowerCase();

  if (source.includes('python')) {
    return 'Python';
  }

  if (source.includes('dotnet') || source.includes('.net')) {
    return '.NET';
  }

  if (source.includes('java')) {
    return 'Java';
  }

  return 'Servico';
};

export const ShieldTemplateWizardPage = (props: TemplateWizardPageProps) => {
  const classes = useStyles();
  const rootRef = useRouteRef(scaffolderPlugin.routes.root);
  const taskRoute = useRouteRef(scaffolderPlugin.routes.ongoingTask);
  const { secrets: contextSecrets } = useTemplateSecrets();
  const scaffolderApi = useApi(scaffolderApiRef);
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { templateName, namespace } = useRouteRefParams(
    scaffolderPlugin.routes.selectedTemplate,
  );
  const templateRef = stringifyEntityRef({
    kind: 'Template',
    namespace,
    name: templateName,
  });
  const { manifest } = useTemplateParameterSchema(templateRef);

  const runtime = useMemo(
    () => inferRuntime(templateName, manifest?.title),
    [manifest?.title, templateName],
  );

  const onCreate = useCallback(
    async (initialValues: Record<string, unknown>) => {
      if (isCreating) {
        return;
      }

      setIsCreating(true);
      try {
        const { taskId } = await scaffolderApi.scaffold({
          templateRef,
          values: initialValues,
          secrets: contextSecrets,
        });

        navigate(taskRoute({ taskId }));
      } catch (error) {
        setIsCreating(false);
        throw error;
      }
    },
    [
      contextSecrets,
      isCreating,
      navigate,
      scaffolderApi,
      taskRoute,
      templateRef,
    ],
  );

  const onError = useCallback(() => <Navigate to={rootRef()} />, [rootRef]);

  return (
    <AnalyticsContext attributes={{ entityRef: templateRef }}>
      <Page themeId="website">
        <div className={classes.page}>
          <div className={`${classes.shell} shield-scaffolder-shell shield-scaffolder-shell--wizard`}>
            {isCreating ? <Progress /> : null}

            <div className={classes.hero}>
              <div className={classes.eyebrow}>Protocolo de registro</div>
              <Typography component="h1" className={classes.title}>
                Configuracao de ativos
              </Typography>
              <Typography className={classes.subtitle}>
                {manifest?.description ??
                  `Provisione ${formatTemplateName(templateName)} com pipeline compartilhado, GitOps inicial e governanca alinhada ao catalogo.`}
              </Typography>

              <div className={classes.chipRow}>
                <Chip label={`Template ${runtime}`} className={classes.chip} />
                <Chip label="Owner define o system" className={classes.chip} />
                <Chip label="Pipeline compartilhado" className={classes.chip} />
                <Chip label={`Namespace ${namespace}`} className={classes.chip} />
              </div>
            </div>

            <div className={classes.grid}>
              <div className={classes.workflow}>
                <Workflow
                  namespace={namespace}
                  templateName={templateName}
                  onCreate={onCreate}
                  components={props.components}
                  onError={onError}
                  extensions={props.customFieldExtensions}
                  formProps={props.formProps}
                  layouts={props.layouts}
                />
              </div>

              <aside className={classes.sidebar}>
                <div className={classes.panel}>
                  <Typography className={classes.panelTitle}>
                    Especificacoes tecnicas
                  </Typography>

                  <div className={classes.specList}>
                    <div className={classes.specRow}>
                      <span className={classes.specLabel}>Runtime</span>
                      <span className={classes.specValue}>{runtime}</span>
                    </div>
                    <div className={classes.specRow}>
                      <span className={classes.specLabel}>Owner/System</span>
                      <span className={classes.specValue}>Owner define o system</span>
                    </div>
                    <div className={classes.specRow}>
                      <span className={classes.specLabel}>Pipeline</span>
                      <span className={classes.specValue}>argo-code/base-argoit</span>
                    </div>
                    <div className={classes.specRow}>
                      <span className={classes.specLabel}>Ambientes</span>
                      <span className={classes.specValue}>dev / rc / stg / prd</span>
                    </div>
                  </div>
                </div>

                <div className={`${classes.panel} ${classes.orbCard}`}>
                  <Box>
                    <div className={classes.orb} />
                    <Typography className={classes.orbCaption}>
                      System aguardando parametrizacao
                    </Typography>
                    <Typography className={classes.orbDescription}>
                      O system agora e derivado automaticamente a partir da squad
                      escolhida em owner, evitando preenchimento duplicado no formulario.
                    </Typography>
                  </Box>
                </div>

                <div className={classes.panel}>
                  <div className={classes.footer}>
                    <span>Node: shield-idp-01</span>
                    <span>Protocolo: stark-7-ghost</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </Page>
    </AnalyticsContext>
  );
};
