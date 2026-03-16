import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Chip,
  makeStyles,
  Typography,
} from '@material-ui/core';
import AddRoundedIcon from '@material-ui/icons/AddRounded';
import AppsRoundedIcon from '@material-ui/icons/AppsRounded';
import ArrowForwardRoundedIcon from '@material-ui/icons/ArrowForwardRounded';
import CodeRoundedIcon from '@material-ui/icons/CodeRounded';
import CloudQueueRoundedIcon from '@material-ui/icons/CloudQueueRounded';
import DescriptionRoundedIcon from '@material-ui/icons/DescriptionRounded';
import MemoryRoundedIcon from '@material-ui/icons/MemoryRounded';
import SecurityRoundedIcon from '@material-ui/icons/SecurityRounded';
import StorageRoundedIcon from '@material-ui/icons/StorageRounded';
import WidgetsRoundedIcon from '@material-ui/icons/WidgetsRounded';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import type { TemplateListPageProps } from '@backstage/plugin-scaffolder/alpha';
import type { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';
import { Link as RouterLink } from 'react-router-dom';
import {
  CommandDeckCard,
  CommandDeckLegend,
  CommandDeckPage,
  CommandDeckStat,
} from '../layout/CommandDeckPage';

type TemplateSnapshot = {
  entities: TemplateEntityV1beta3[];
  loading: boolean;
};

type TemplateTone = 'info' | 'success' | 'warning' | 'alert';

const toneTokens: Record<
  TemplateTone,
  {
    border: string;
    soft: string;
    text: string;
  }
> = {
  info: {
    border: 'rgba(43, 189, 238, 0.28)',
    soft: 'rgba(43, 189, 238, 0.12)',
    text: '#39d8ff',
  },
  success: {
    border: 'rgba(26, 217, 108, 0.28)',
    soft: 'rgba(26, 217, 108, 0.12)',
    text: '#2df598',
  },
  warning: {
    border: 'rgba(245, 158, 11, 0.28)',
    soft: 'rgba(245, 158, 11, 0.12)',
    text: '#ffcb61',
  },
  alert: {
    border: 'rgba(249, 89, 89, 0.28)',
    soft: 'rgba(249, 89, 89, 0.12)',
    text: '#ff8484',
  },
};

const useStyles = makeStyles(theme => ({
  registry: {
    display: 'grid',
    gap: theme.spacing(1.5),
  },
  registryHeader: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(0, 2.2fr) minmax(110px, 0.9fr) minmax(150px, 1fr) minmax(130px, 0.8fr) auto',
    gap: theme.spacing(2),
    padding: theme.spacing(0.5, 1.5, 1.25),
    color: '#5bcfff',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
  registryRow: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(0, 2.2fr) minmax(110px, 0.9fr) minmax(150px, 1fr) minmax(130px, 0.8fr) auto',
    gap: theme.spacing(2),
    alignItems: 'center',
    padding: theme.spacing(2.25, 2),
    borderRadius: 18,
    border: '1px solid rgba(43, 189, 238, 0.12)',
    background:
      'linear-gradient(180deg, rgba(12, 21, 36, 0.92), rgba(9, 16, 27, 0.96))',
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: '1fr',
      gap: theme.spacing(1.5),
    },
  },
  registryPrimary: {
    minWidth: 0,
  },
  registryTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.2),
    minWidth: 0,
  },
  registryRuntime: {
    borderRadius: 10,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  registryTitle: {
    color: '#f8fbff',
    fontSize: '1.2rem',
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    wordBreak: 'break-word',
  },
  registryDescription: {
    marginTop: theme.spacing(0.85),
    color: '#8fa7c5',
    lineHeight: 1.6,
  },
  registryTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: theme.spacing(1.1),
  },
  registryTag: {
    borderRadius: 10,
    color: '#51cfff',
    background: 'rgba(43, 189, 238, 0.08)',
    border: '1px solid rgba(43, 189, 238, 0.18)',
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  registryMetaBlock: {
    minWidth: 0,
  },
  registryMetaLabel: {
    color: '#56cfff',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    [theme.breakpoints.down('md')]: {
      display: 'block',
    },
  },
  registryMetaValue: {
    marginTop: theme.spacing(0.5),
    color: '#d3e4f7',
    fontSize: '0.98rem',
    wordBreak: 'break-word',
  },
  registryAction: {
    minHeight: 42,
    borderRadius: 12,
    whiteSpace: 'nowrap',
    [theme.breakpoints.down('md')]: {
      width: '100%',
    },
  },
  emptyState: {
    padding: theme.spacing(4),
    borderRadius: 18,
    border: '1px dashed rgba(43, 189, 238, 0.24)',
    textAlign: 'center',
    color: '#83a0c1',
    background:
      'linear-gradient(180deg, rgba(8, 16, 29, 0.7), rgba(6, 12, 22, 0.72))',
  },
}));

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;

const normalize = (value: string) => value.trim().toLowerCase();

const toTemplateLink = (entity: TemplateEntityV1beta3) => {
  const namespace = encodeURIComponent(entity.metadata.namespace ?? 'default');
  const templateName = encodeURIComponent(entity.metadata.name);

  return `/create/templates/${namespace}/${templateName}`;
};

const getTemplateLanguage = (entity: TemplateEntityV1beta3) => {
  const tags = entity.metadata.tags?.map(normalize) ?? [];

  if (tags.some(tag => tag.includes('java'))) {
    return 'Java';
  }

  if (
    tags.some(
      tag => tag.includes('dotnet') || tag.includes('.net') || tag.includes('csharp'),
    )
  ) {
    return '.NET';
  }

  if (tags.some(tag => tag.includes('python'))) {
    return 'Python';
  }

  if (tags.some(tag => tag.includes('node') || tag.includes('typescript'))) {
    return 'Node';
  }

  return String(entity.spec.type ?? 'Template');
};

const getTemplateTone = (entity: TemplateEntityV1beta3): TemplateTone => {
  const language = getTemplateLanguage(entity).toLowerCase();

  if (language.includes('java')) {
    return 'info';
  }

  if (language.includes('.net')) {
    return 'success';
  }

  if (language.includes('python')) {
    return 'warning';
  }

  if (language.includes('security')) {
    return 'alert';
  }

  return 'info';
};

const getTemplateIcon = (entity: TemplateEntityV1beta3) => {
  const language = getTemplateLanguage(entity).toLowerCase();
  const type = String(entity.spec.type ?? '').toLowerCase();

  if (language.includes('java')) {
    return <MemoryRoundedIcon fontSize="large" />;
  }

  if (language.includes('.net')) {
    return <WidgetsRoundedIcon fontSize="large" />;
  }

  if (language.includes('python')) {
    return <CloudQueueRoundedIcon fontSize="large" />;
  }

  if (type.includes('service') || type.includes('api')) {
    return <CodeRoundedIcon fontSize="large" />;
  }

  if (type.includes('library')) {
    return <StorageRoundedIcon fontSize="large" />;
  }

  return <DescriptionRoundedIcon fontSize="large" />;
};

const fallbackCards: CommandDeckCard[] = [
  {
    id: 'template-fallback-1',
    title: 'Registro de templates',
    eyebrow: 'Scaffolder',
    description:
      'Biblioteca de templates homologados para provisionamento padrao de repositorios, pipelines e bootstrap GitOps.',
    icon: <CodeRoundedIcon fontSize="large" />,
    badgeLabel: 'PRONTO',
    badgeTone: 'info',
    meta: [
      { label: 'Owner', value: 'Engenharia de Plataforma' },
      { label: 'Tipo', value: 'Templates' },
      { label: 'Linguagens', value: 'Java / .NET / Python' },
      { label: 'Status', value: 'Disponivel' },
    ],
    tags: ['Provisionamento', 'Templates'],
    tone: 'info',
    to: '/create',
    ctaLabel: 'Abrir registro',
  },
  {
    id: 'template-fallback-2',
    title: 'Entrega padronizada',
    eyebrow: 'Fluxo GitOps',
    description:
      'Cada template nasce alinhado com repositorio, pipeline, policies e trilha operacional esperada pela plataforma.',
    icon: <SecurityRoundedIcon fontSize="large" />,
    badgeLabel: 'GITOPS',
    badgeTone: 'success',
    meta: [
      { label: 'Owner', value: 'DevOps' },
      { label: 'Tipo', value: 'Automacao' },
      { label: 'Escopo', value: 'Provisionamento' },
      { label: 'Status', value: 'Ativo' },
    ],
    tags: ['Pipelines', 'Argo CD'],
    tone: 'success',
    to: '/docs',
    ctaLabel: 'Abrir documentacao',
  },
];

export const TemplateCatalogPage = ({
  headerOptions,
  templateFilter,
}: TemplateListPageProps) => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const [snapshot, setSnapshot] = useState<TemplateSnapshot>({
    entities: [],
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function loadTemplates() {
      try {
        const response = await catalogApi.getEntities({
          filter: { kind: 'Template' },
          limit: 24,
          order: [{ field: 'metadata.name', order: 'asc' }],
        });

        if (!active) {
          return;
        }

        const templates = response.items.filter(
          (entity): entity is TemplateEntityV1beta3 =>
            entity.kind.toLowerCase() === 'template',
        );

        setSnapshot({
          entities: templates,
          loading: false,
        });
      } catch {
        if (!active) {
          return;
        }

        setSnapshot(current => ({
          ...current,
          loading: false,
        }));
      }
    }

    void loadTemplates();

    return () => {
      active = false;
    };
  }, [catalogApi]);

  const templates = useMemo(
    () =>
      templateFilter ? snapshot.entities.filter(entity => templateFilter(entity)) : snapshot.entities,
    [snapshot.entities, templateFilter],
  );

  const cards = useMemo<CommandDeckCard[]>(() => {
    const highlights = templates.slice(0, 5);

    if (!highlights.length) {
      return fallbackCards;
    }

    return highlights.map(entity => {
      const title = entity.metadata.title || entity.metadata.name;
      const description =
        entity.metadata.description ||
        'Template homologado para iniciar novos componentes com trilha operacional padronizada.';
      const language = getTemplateLanguage(entity);
      const tone = getTemplateTone(entity);
      const owner = String(entity.spec.owner ?? 'Engenharia de Plataforma');
      const namespace = entity.metadata.namespace ?? 'default';

      return {
        id: entity.metadata.uid || entity.metadata.name,
        title,
        eyebrow: language,
        description: truncate(description, 148),
        icon: getTemplateIcon(entity),
        tone,
        badgeLabel: 'HOMOLOGADO',
        badgeTone: tone,
        meta: [
          { label: 'Owner', value: owner },
          { label: 'Tipo', value: String(entity.spec.type ?? 'template') },
          { label: 'Namespace', value: namespace },
          {
            label: 'Tags',
            value: entity.metadata.tags?.slice(0, 2).join(' / ') || 'Sem tags',
          },
        ],
        tags: entity.metadata.tags?.slice(0, 3) ?? [],
        to: toTemplateLink(entity),
        ctaLabel: 'Executar template',
      };
    });
  }, [templates]);

  const stats = useMemo<CommandDeckStat[]>(() => {
    if (snapshot.loading) {
      return [
        { label: 'Templates', value: '--' },
        { label: 'Java', value: '--' },
        { label: '.NET', value: '--' },
        { label: 'Python', value: '--' },
      ];
    }

    const languageBuckets = templates.reduce<Record<string, number>>((acc, entity) => {
      const language = getTemplateLanguage(entity);

      acc[language] = (acc[language] ?? 0) + 1;
      return acc;
    }, {});

    return [
      {
        label: 'Templates',
        value: String(templates.length),
        tone: 'info',
      },
      {
        label: 'Java',
        value: String(languageBuckets.Java ?? 0),
        tone: 'info',
      },
      {
        label: '.NET',
        value: String(languageBuckets['.NET'] ?? 0),
        tone: 'success',
      },
      {
        label: 'Python',
        value: String(languageBuckets.Python ?? 0),
        tone: 'warning',
      },
    ];
  }, [snapshot.loading, templates]);

  const legend = useMemo<CommandDeckLegend[]>(() => {
    const owners = new Set(templates.map(entity => String(entity.spec.owner ?? 'desconhecido')));
    const runtimes = new Set(templates.map(entity => getTemplateLanguage(entity)));

    return [
      {
        label: 'templates',
        value: String(templates.length || 0),
        tone: 'info',
      },
      {
        label: 'owners',
        value: String(owners.size || 0),
        tone: 'success',
      },
      {
        label: 'runtimes',
        value: String(runtimes.size || 0),
        tone: 'warning',
      },
    ];
  }, [templates]);

  const primaryTemplate = templates[0];

  return (
    <CommandDeckPage
      pageClassName="shield-templates-page shield-command-deck-page"
      statusLabel="Status: matriz de templates online"
      title={headerOptions?.title ?? 'Templates de Provisionamento'}
      subtitle={
        headerOptions?.subtitle ??
        'Biblioteca oficial de templates para iniciar componentes com repositorio, pipeline, policies e trilha GitOps alinhados ao SHIELD.'
      }
      actions={[
        {
          label: 'Ver catalogo',
          to: '/catalog',
          icon: <AppsRoundedIcon />,
          variant: 'secondary',
        },
        {
          label: 'Ir para a matriz',
          to: '/create#template-registry',
          icon: <AddRoundedIcon />,
          variant: 'primary',
        },
      ]}
      stats={stats}
      cards={cards}
      callout={{
        title: 'Iniciar provisionamento',
        description:
          'Entre no template certo e siga direto para o assistente com os parametros do template homologado.',
        label: primaryTemplate ? 'Executar template' : 'Abrir catalogo',
        to: primaryTemplate ? toTemplateLink(primaryTemplate) : '/catalog',
        icon: <AddRoundedIcon fontSize="large" />,
      }}
      feedEyebrow="Registro de templates"
      feedTitle="Matriz de provisionamento"
      feedSubtitle="Selecione um template homologado, valide owner e runtime, e entre direto no assistente do scaffolder sem voltar para uma listagem generica."
      legend={legend}
    >
      <div id="template-registry" className={classes.registry}>
        <div className={classes.registryHeader}>
          <span>Template</span>
          <span>Tipo</span>
          <span>Owner</span>
          <span>Runtime</span>
          <span>Acoes</span>
        </div>

        {templates.length ? (
          templates.map(entity => {
            const tone = getTemplateTone(entity);
            const token = toneTokens[tone];
            const title = entity.metadata.title || entity.metadata.name;
            const description =
              entity.metadata.description ||
              'Template homologado para provisionamento padronizado.';

            return (
              <div
                key={entity.metadata.uid || entity.metadata.name}
                className={classes.registryRow}
                style={{
                  borderColor: token.border,
                  boxShadow: `inset 3px 0 0 ${token.text}`,
                }}
              >
                <div className={classes.registryPrimary}>
                  <div className={classes.registryTitleRow}>
                    <Chip
                      label={getTemplateLanguage(entity)}
                      className={classes.registryRuntime}
                      style={{
                        color: token.text,
                        background: token.soft,
                        border: `1px solid ${token.border}`,
                      }}
                    />
                    <Typography className={classes.registryTitle}>{title}</Typography>
                  </div>

                  <Typography className={classes.registryDescription}>
                    {truncate(description, 180)}
                  </Typography>

                  {entity.metadata.tags?.length ? (
                    <div className={classes.registryTags}>
                      {entity.metadata.tags.slice(0, 4).map(tag => (
                        <Chip
                          key={`${entity.metadata.name}-${tag}`}
                          label={tag}
                          size="small"
                          className={classes.registryTag}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className={classes.registryMetaBlock}>
                  <div className={classes.registryMetaLabel}>Tipo</div>
                  <div className={classes.registryMetaValue}>
                    {String(entity.spec.type ?? 'template')}
                  </div>
                </div>

                <div className={classes.registryMetaBlock}>
                  <div className={classes.registryMetaLabel}>Owner</div>
                  <div className={classes.registryMetaValue}>
                    {String(entity.spec.owner ?? 'Engenharia de Plataforma')}
                  </div>
                </div>

                <div className={classes.registryMetaBlock}>
                  <div className={classes.registryMetaLabel}>Namespace</div>
                  <div className={classes.registryMetaValue}>
                    {entity.metadata.namespace ?? 'default'}
                  </div>
                </div>

                <Button
                  component={RouterLink}
                  to={toTemplateLink(entity)}
                  variant="outlined"
                  className={classes.registryAction}
                  style={{
                    color: token.text,
                    borderColor: token.border,
                    background: token.soft,
                  }}
                  endIcon={<ArrowForwardRoundedIcon />}
                >
                  Executar
                </Button>
              </div>
            );
          })
        ) : (
          <div className={classes.emptyState}>
            Nenhum template homologado foi encontrado no catalogo. Verifique a sincronizacao
            do Backstage ou cadastre novos templates para abastecer a matriz.
          </div>
        )}
      </div>
    </CommandDeckPage>
  );
};
