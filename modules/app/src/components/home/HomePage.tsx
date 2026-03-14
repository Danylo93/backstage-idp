import {
  Box,
  Button,
  Chip,
  Grid,
  Link as MuiLink,
  makeStyles,
  Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import AccountTreeOutlinedIcon from '@material-ui/icons/AccountTreeOutlined';
import AssignmentTurnedInOutlinedIcon from '@material-ui/icons/AssignmentTurnedInOutlined';
import DeviceHubOutlinedIcon from '@material-ui/icons/DeviceHubOutlined';
import LibraryBooksOutlinedIcon from '@material-ui/icons/LibraryBooksOutlined';
import PlayCircleOutlineRoundedIcon from '@material-ui/icons/PlayCircleOutlineRounded';
import SettingsEthernetRoundedIcon from '@material-ui/icons/SettingsEthernetRounded';
import { Content, Header, Link, Page } from '@backstage/core-components';

const useStyles = makeStyles(theme => ({
  page: {
    '& [class*=ContentHeader_title]': {
      display: 'none',
    },
    color: '#f8fbff',
  },
  shell: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(4),
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    padding: theme.spacing(5, 6),
    background:
      'linear-gradient(180deg, rgba(10, 18, 31, 0.96), rgba(7, 14, 24, 0.98))',
    border: '1px solid rgba(43, 189, 238, 0.18)',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 18px 40px rgba(0, 0, 0, 0.42), 0 0 32px rgba(43, 189, 238, 0.08)',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage:
        'linear-gradient(rgba(43, 189, 238, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(43, 189, 238, 0.05) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
      opacity: 0.45,
      pointerEvents: 'none',
    },
    '&::after': {
      content: '"◬"',
      position: 'absolute',
      right: 80,
      top: 72,
      fontSize: 170,
      opacity: 0.08,
      color: '#2bbdee',
      pointerEvents: 'none',
    },
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(4, 3),
    },
  },
  heroTopRow: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: theme.spacing(3),
  },
  heroBadge: {
    width: 54,
    height: 54,
    borderRadius: 10,
    background: 'rgba(43, 189, 238, 0.08)',
    border: '1px solid rgba(43, 189, 238, 0.26)',
    display: 'grid',
    placeItems: 'center',
    color: '#2bbdee',
    fontSize: 28,
    fontWeight: 700,
    boxShadow: '0 0 18px rgba(43, 189, 238, 0.16)',
  },
  eyebrow: {
    color: '#2bbdee',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
  },
  headline: {
    fontWeight: 700,
    marginTop: theme.spacing(2),
    maxWidth: 720,
    fontSize: '3.55rem',
    lineHeight: 1.02,
    fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
    color: '#f8fbff',
    [theme.breakpoints.down('sm')]: {
      fontSize: '2.45rem',
    },
  },
  accentText: {
    background: 'linear-gradient(90deg, #20b9ff 0%, #6ee7f9 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  body: {
    color: '#8b9ab1',
    marginTop: theme.spacing(2),
    maxWidth: 760,
    fontSize: '1.12rem',
    lineHeight: 1.7,
  },
  heroButtons: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    gap: 18,
    flexWrap: 'wrap',
    marginTop: theme.spacing(4),
  },
  primaryButton: {
    minWidth: 288,
    minHeight: 64,
    borderRadius: 10,
    boxShadow: '0 0 18px rgba(43, 189, 238, 0.36)',
    textTransform: 'none',
    fontSize: 15,
    fontWeight: 700,
  },
  secondaryButton: {
    minWidth: 232,
    minHeight: 64,
    borderRadius: 10,
    textTransform: 'none',
    fontSize: 15,
    fontWeight: 700,
    color: '#2bbdee',
    border: '1px solid rgba(43, 189, 238, 0.24)',
    background: 'rgba(43, 189, 238, 0.08)',
  },
  buttonLink: {
    textDecoration: 'none',
  },
  quickCard: {
    borderRadius: 18,
    border: '1px solid rgba(43, 189, 238, 0.16)',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 18px 40px rgba(0, 0, 0, 0.3)',
    background: 'linear-gradient(180deg, rgba(13, 22, 36, 0.96), rgba(9, 17, 29, 0.96))',
    padding: theme.spacing(3.5),
    height: '100%',
  },
  quickHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(3),
  },
  quickLabel: {
    color: '#74839a',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    display: 'grid',
    placeItems: 'center',
  },
  quickCaption: {
    color: '#8b9ab1',
    fontSize: 16,
    lineHeight: 1.65,
  },
  sectionTitle: {
    margin: theme.spacing(1, 0, 2),
    fontWeight: 800,
    fontSize: '2rem',
    color: '#f8fbff',
    fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
  },
  sectionSubtitle: {
    color: '#8b9ab1',
    marginBottom: theme.spacing(2.5),
    fontSize: '1.02rem',
  },
  workflowCard: {
    borderRadius: 18,
    border: '1px solid rgba(43, 189, 238, 0.16)',
    background:
      'linear-gradient(180deg, rgba(13, 22, 36, 0.96), rgba(9, 17, 29, 0.96))',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 18px 40px rgba(0, 0, 0, 0.3)',
    padding: theme.spacing(3.5),
  },
  workflowGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: theme.spacing(2.5),
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    [theme.breakpoints.down('xs')]: {
      gridTemplateColumns: '1fr',
    },
  },
  workflowItem: {
    minHeight: 180,
    borderRadius: 14,
    padding: theme.spacing(3),
    background: 'linear-gradient(180deg, rgba(12, 20, 33, 0.98), rgba(8, 15, 26, 0.98))',
    border: '1px solid rgba(43, 189, 238, 0.12)',
    boxShadow: '0 14px 30px rgba(0, 0, 0, 0.24)',
  },
  workflowIcon: {
    width: 52,
    height: 52,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 18,
    marginBottom: theme.spacing(2),
  },
  workflowTitle: {
    fontWeight: 700,
    color: '#f8fbff',
    marginBottom: theme.spacing(1),
  },
  workflowBody: {
    color: '#8b9ab1',
    lineHeight: 1.7,
  },
  featureCard: {
    borderRadius: 14,
    border: '1px solid rgba(43, 189, 238, 0.12)',
    background: 'linear-gradient(180deg, rgba(13, 22, 36, 0.96), rgba(9, 17, 29, 0.96))',
    padding: theme.spacing(3),
    height: '100%',
    boxShadow: '0 14px 30px rgba(0, 0, 0, 0.24)',
  },
  featureTitle: {
    fontWeight: 700,
    marginBottom: theme.spacing(1.25),
    color: '#f8fbff',
  },
  featureBody: {
    color: '#8b9ab1',
    lineHeight: 1.7,
  },
  infoChip: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
    borderRadius: 10,
    fontWeight: 600,
  },
}));

const quickActions = [
  {
    title: 'Catalogo central',
    caption: 'Ownership, systems, squads e componentes da plataforma.',
    href: '/catalog',
    action: 'Abrir catalogo',
    icon: <AccountTreeOutlinedIcon />,
    accent: '#dcebfb',
    color: '#2c7be5',
  },
  {
    title: 'Templates',
    caption: 'Crie repositorios e pipelines a partir dos templates oficiais.',
    href: '/create',
    action: 'Abrir templates',
    icon: <DeviceHubOutlinedIcon />,
    accent: '#f8edd1',
    color: '#e3a81f',
  },
  {
    title: 'Documentacao',
    caption: 'Acesse TechDocs, onboarding e padroes operacionais.',
    href: '/docs',
    action: 'Abrir documentacao',
    icon: <LibraryBooksOutlinedIcon />,
    accent: '#dff5e6',
    color: '#24b15a',
  },
  {
    title: 'Topologia',
    caption: 'Visualize relacoes entre componentes, sistemas, APIs e recursos.',
    href: '/catalog-graph',
    action: 'Abrir topologia',
    icon: <SettingsEthernetRoundedIcon />,
    accent: '#f8ecd7',
    color: '#ef9f14',
  },
];

const workflowSteps = [
  {
    title: 'Escolha o template',
    body: 'Selecione Java, .NET ou Python e informe squad, contexto, projeto Azure DevOps e ambiente inicial.',
    icon: <DeviceHubOutlinedIcon />,
    accent: '#dcebfb',
    color: '#2c7be5',
  },
  {
    title: 'Provisionamento automatico',
    body: 'O SHIELD cria o repositorio, branches, policies, pipeline e environments padrao do projeto.',
    icon: <PlayCircleOutlineRoundedIcon />,
    accent: '#f8edd1',
    color: '#e3a81f',
  },
  {
    title: 'Bootstrap GitOps',
    body: 'O fluxo abre PR no argo-gitops com os values por ambiente seguindo o padrao operacional da Argo.',
    icon: <AssignmentTurnedInOutlinedIcon />,
    accent: '#dff5e6',
    color: '#24b15a',
  },
  {
    title: 'Acompanhe no catalogo',
    body: 'Depois da criacao, o componente entra no catalogo central com links para repo, pipeline, GitOps e entrega.',
    icon: <AccountTreeOutlinedIcon />,
    accent: '#f8ecd7',
    color: '#ef9f14',
  },
];

export const HomePage = () => {
  const classes = useStyles();

  return (
    <Page themeId="home" className={classes.page}>
      <Header title="Central de Comando" subtitle="Operacoes da plataforma SHIELD" />
      <Content>
        <div className={classes.shell}>
          <div className={classes.hero}>
            <div className={classes.heroTopRow}>
              <div className={classes.heroBadge}>S</div>
              <Typography className={classes.eyebrow}>S.H.I.E.L.D Platform</Typography>
            </div>
            <Typography variant="h3" className={classes.headline}>
              Central de <span className={classes.accentText}>Comando</span>
            </Typography>
            <Typography variant="body1" className={classes.body}>
              Crie componentes a partir de templates aprovados, acompanhe
              pipelines, GitOps e ownership em uma unica plataforma interna de
              desenvolvimento.
            </Typography>
            <div className={classes.heroButtons}>
              <Link to="/create" className={classes.buttonLink}>
                <Button
                  variant="contained"
                  color="primary"
                  className={classes.primaryButton}
                  startIcon={<AddIcon />}
                >
                  Novo Componente
                </Button>
              </Link>
              <Link to="/catalog" className={classes.buttonLink}>
                <Button
                  variant="outlined"
                  className={classes.secondaryButton}
                  startIcon={<AccountTreeOutlinedIcon />}
                >
                  Ver Catalogo
                </Button>
              </Link>
            </div>
          </div>

          <Grid container spacing={3}>
            {quickActions.map(action => (
              <Grid item md={3} sm={6} xs={12} key={action.title}>
                <div className={classes.quickCard}>
                  <div className={classes.quickHead}>
                    <Typography className={classes.quickLabel}>
                      {action.title}
                    </Typography>
                    <div
                      className={classes.quickIcon}
                      style={{
                        background: action.accent,
                        color: action.color,
                      }}
                    >
                      {action.icon}
                    </div>
                  </div>
                  <div className={classes.quickCaption}>{action.caption}</div>
                  <Box mt={3}>
                    <MuiLink component={Link} to={action.href}>
                      {action.action}
                    </MuiLink>
                  </Box>
                </div>
              </Grid>
            ))}
          </Grid>

          <div className={classes.workflowCard}>
            <Typography className={classes.sectionTitle}>Fluxo operacional</Typography>
            <Typography className={classes.sectionSubtitle}>
              O SHIELD continua em cima do Backstage oficial, mas agora guiando
              o fluxo real de criacao de componentes, pipeline, policies e
              GitOps da Argo.
            </Typography>
            <div className={classes.workflowGrid}>
              {workflowSteps.map(step => (
                <div className={classes.workflowItem} key={step.title}>
                  <div
                    className={classes.workflowIcon}
                    style={{ background: step.accent, color: step.color }}
                  >
                    {step.icon}
                  </div>
                  <Typography variant="h6" className={classes.workflowTitle}>
                    {step.title}
                  </Typography>
                  <Typography className={classes.workflowBody}>
                    {step.body}
                  </Typography>
                </div>
              ))}
            </div>
          </div>

          <Grid container spacing={3}>
            <Grid item md={4} xs={12}>
              <div className={classes.featureCard}>
                <Typography variant="h6" className={classes.featureTitle}>
                  Operacoes centrais
                </Typography>
                <Typography className={classes.featureBody}>
                  Catalogo, software templates, TechDocs, readiness para Azure
                  DevOps, Argo CD e Kubernetes sem duplicar funcoes que o
                  Backstage ja resolve.
                </Typography>
                <Box mt={2}>
                  <Chip label="Catalogo" className={classes.infoChip} />
                  <Chip label="Templates" className={classes.infoChip} />
                  <Chip label="TechDocs" className={classes.infoChip} />
                </Box>
              </div>
            </Grid>
            <Grid item md={4} xs={12}>
              <div className={classes.featureCard}>
                <Typography variant="h6" className={classes.featureTitle}>
                  Fluxo do desenvolvedor
                </Typography>
                <Typography className={classes.featureBody}>
                  O dev cria o componente, o repo nasce no Azure Repos, a
                  pipeline ja e criada e executada, o GitOps recebe PR e o item
                  entra no catalogo central.
                </Typography>
                <Box mt={2}>
                  <MuiLink component={Link} to="/create">
                    Abrir templates
                  </MuiLink>
                </Box>
              </div>
            </Grid>
            <Grid item md={4} xs={12}>
              <div className={classes.featureCard}>
                <Typography variant="h6" className={classes.featureTitle}>
                  Governanca da plataforma
                </Typography>
                <Typography className={classes.featureBody}>
                  Ownership por squad, systems alinhados ao contexto da Argo,
                  branch policies, environments Azure e links diretos para
                  pipeline e GitOps dentro do proprio IDP.
                </Typography>
                <Box mt={2}>
                  <MuiLink component={Link} to="/catalog">
                    Ver catalogo
                  </MuiLink>
                </Box>
              </div>
            </Grid>
          </Grid>
        </div>
      </Content>
    </Page>
  );
};
