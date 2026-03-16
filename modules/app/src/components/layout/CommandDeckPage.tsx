import { ReactNode } from 'react';
import {
  Button,
  Chip,
  Container,
  makeStyles,
  Typography,
} from '@material-ui/core';
import ArrowForwardRoundedIcon from '@material-ui/icons/ArrowForwardRounded';
import { Link as RouterLink } from 'react-router-dom';

type CommandDeckTone = 'info' | 'success' | 'warning' | 'alert';

type CommandDeckAction = {
  label: string;
  to: string;
  icon?: ReactNode;
  variant: 'primary' | 'secondary';
};

type CommandDeckStat = {
  label: string;
  value: string;
  tone?: CommandDeckTone;
};

type CommandDeckLegend = {
  label: string;
  value: string;
  tone?: CommandDeckTone;
};

type CommandDeckCardMeta = {
  label: string;
  value: string;
};

type CommandDeckCard = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: ReactNode;
  tone?: CommandDeckTone;
  badgeLabel?: string;
  badgeTone?: CommandDeckTone;
  meta: CommandDeckCardMeta[];
  tags?: string[];
  to?: string;
  ctaLabel?: string;
};

type CommandDeckCallout = {
  title: string;
  description: string;
  label: string;
  to: string;
  icon: ReactNode;
};

type CommandDeckPageProps = {
  pageClassName: string;
  statusLabel: string;
  title: string;
  subtitle: string;
  actions: CommandDeckAction[];
  stats: CommandDeckStat[];
  cards: CommandDeckCard[];
  callout: CommandDeckCallout;
  feedEyebrow: string;
  feedTitle: string;
  feedSubtitle: string;
  legend: CommandDeckLegend[];
  children: ReactNode;
};

const toneTokens: Record<
  CommandDeckTone,
  {
    border: string;
    soft: string;
    text: string;
    glow: string;
  }
> = {
  info: {
    border: 'rgba(43, 189, 238, 0.32)',
    soft: 'rgba(43, 189, 238, 0.12)',
    text: '#39d8ff',
    glow: 'rgba(43, 189, 238, 0.2)',
  },
  success: {
    border: 'rgba(26, 217, 108, 0.3)',
    soft: 'rgba(26, 217, 108, 0.1)',
    text: '#2df598',
    glow: 'rgba(26, 217, 108, 0.18)',
  },
  warning: {
    border: 'rgba(245, 158, 11, 0.32)',
    soft: 'rgba(245, 158, 11, 0.12)',
    text: '#ffcb61',
    glow: 'rgba(245, 158, 11, 0.18)',
  },
  alert: {
    border: 'rgba(249, 89, 89, 0.32)',
    soft: 'rgba(249, 89, 89, 0.12)',
    text: '#ff8484',
    glow: 'rgba(249, 89, 89, 0.18)',
  },
};

const useStyles = makeStyles(theme => ({
  page: {
    padding: theme.spacing(3, 3, 5),
    position: 'relative',
    zIndex: 1,
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2, 2, 4),
    },
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    padding: theme.spacing(4, 4, 3.5),
    border: '1px solid rgba(43, 189, 238, 0.18)',
    background:
      'linear-gradient(180deg, rgba(8, 16, 29, 0.98), rgba(5, 11, 20, 0.96))',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 24px 44px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage:
        'radial-gradient(circle at 1px 1px, rgba(43,189,238,0.18) 1px, transparent 0)',
      backgroundSize: '28px 28px',
      opacity: 0.16,
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background:
        'radial-gradient(circle at top right, rgba(43, 189, 238, 0.14), transparent 34%)',
    },
  },
  statusRow: {
    position: 'relative',
    zIndex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    color: '#6fd9ff',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#2bbdee',
    boxShadow: '0 0 0 6px rgba(43, 189, 238, 0.12)',
  },
  heroGrid: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.55fr) minmax(240px, 0.75fr)',
    gap: theme.spacing(4),
    alignItems: 'end',
    marginTop: theme.spacing(2.5),
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: '1fr',
    },
  },
  title: {
    margin: 0,
    color: '#f8fbff',
    fontSize: 'clamp(2.4rem, 4vw, 3.9rem)',
    lineHeight: 0.96,
    letterSpacing: '-0.06em',
    fontWeight: 700,
    textShadow:
      '2px 0 0 rgba(255, 92, 92, 0.18), -2px 0 0 rgba(43, 189, 238, 0.18)',
  },
  subtitle: {
    marginTop: theme.spacing(1.75),
    color: '#7ec8e7',
    fontSize: '1.18rem',
    lineHeight: 1.65,
    maxWidth: 760,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(3.25),
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    [theme.breakpoints.down('xs')]: {
      gridTemplateColumns: '1fr',
    },
  },
  statCard: {
    minWidth: 0,
    padding: theme.spacing(1.6, 2),
    borderRadius: 16,
    border: '1px solid rgba(43, 189, 238, 0.16)',
    background: 'rgba(10, 18, 31, 0.72)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)',
  },
  statValue: {
    color: '#f8fbff',
    fontSize: '1.55rem',
    fontWeight: 700,
    letterSpacing: '-0.04em',
  },
  statLabel: {
    marginTop: theme.spacing(0.5),
    color: '#6f86a4',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  actions: {
    display: 'grid',
    gap: theme.spacing(1.5),
    justifyItems: 'stretch',
    alignSelf: 'center',
  },
  actionButton: {
    minHeight: 56,
    borderRadius: 14,
    justifyContent: 'space-between',
    paddingLeft: theme.spacing(2.2),
    paddingRight: theme.spacing(2.2),
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: theme.spacing(3),
    marginTop: theme.spacing(3.5),
    [theme.breakpoints.down('lg')]: {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: '1fr',
    },
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    minWidth: 0,
    minHeight: 320,
    padding: theme.spacing(3.25),
    borderRadius: 22,
    border: '1px solid rgba(43, 189, 238, 0.2)',
    background:
      'linear-gradient(180deg, rgba(14, 23, 39, 0.98), rgba(10, 18, 31, 0.96))',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 22px 38px rgba(0, 0, 0, 0.28)',
    display: 'flex',
    flexDirection: 'column',
  },
  cardGlow: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background:
      'radial-gradient(circle at top left, rgba(43, 189, 238, 0.1), transparent 42%)',
    opacity: 0.7,
  },
  cardTop: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(1.5),
  },
  cardIdentity: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1.8),
    minWidth: 0,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    display: 'grid',
    placeItems: 'center',
    border: '1px solid rgba(43, 189, 238, 0.24)',
    background: 'rgba(43, 189, 238, 0.12)',
    color: '#39d8ff',
    flex: '0 0 auto',
    boxShadow: '0 0 18px rgba(43, 189, 238, 0.12)',
  },
  cardEyebrow: {
    color: '#2bbdee',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    marginTop: theme.spacing(0.6),
  },
  cardTitle: {
    color: '#f8fbff',
    fontSize: '1.8rem',
    lineHeight: 1,
    letterSpacing: '-0.05em',
    fontWeight: 700,
    marginTop: theme.spacing(1),
    wordBreak: 'break-word',
  },
  badge: {
    flex: '0 0 auto',
    borderRadius: 10,
    padding: theme.spacing(1, 1.4),
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    border: '1px solid rgba(43, 189, 238, 0.24)',
  },
  cardDescription: {
    position: 'relative',
    zIndex: 1,
    marginTop: theme.spacing(3),
    color: '#9bb3cf',
    fontSize: '1rem',
    lineHeight: 1.7,
    minHeight: 84,
  },
  metaGrid: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: theme.spacing(1.5),
    marginTop: 'auto',
    paddingTop: theme.spacing(2.5),
    borderTop: '1px solid rgba(43, 189, 238, 0.12)',
  },
  metaLabel: {
    color: '#4fc6ff',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  metaValue: {
    marginTop: theme.spacing(0.65),
    color: '#d9e7f7',
    fontSize: '0.98rem',
    wordBreak: 'break-word',
  },
  tagsRow: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: theme.spacing(2),
  },
  tag: {
    borderRadius: 10,
    background: 'rgba(43, 189, 238, 0.08)',
    color: '#2bbdee',
    border: '1px solid rgba(43, 189, 238, 0.18)',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  cardLink: {
    position: 'relative',
    zIndex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing(2.25),
    color: '#39d8ff',
    textDecoration: 'none',
    fontWeight: 700,
  },
  calloutCard: {
    minHeight: 320,
    borderRadius: 22,
    border: '1px dashed rgba(43, 189, 238, 0.36)',
    background:
      'linear-gradient(180deg, rgba(8, 16, 29, 0.7), rgba(6, 12, 22, 0.62))',
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    padding: theme.spacing(3.25),
  },
  calloutInner: {
    maxWidth: 280,
  },
  calloutIcon: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    margin: '0 auto',
    display: 'grid',
    placeItems: 'center',
    border: '1px solid rgba(43, 189, 238, 0.26)',
    background: 'rgba(43, 189, 238, 0.08)',
    color: '#39d8ff',
    boxShadow: '0 0 0 8px rgba(43, 189, 238, 0.04)',
  },
  calloutTitle: {
    marginTop: theme.spacing(3),
    color: '#f8fbff',
    fontSize: '1.35rem',
    lineHeight: 1.1,
    fontWeight: 700,
  },
  calloutDescription: {
    marginTop: theme.spacing(1.4),
    color: '#7f96b4',
    lineHeight: 1.7,
  },
  calloutLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing(2.2),
    color: '#39d8ff',
    textDecoration: 'none',
    fontWeight: 700,
  },
  feedSection: {
    marginTop: theme.spacing(3.5),
    borderRadius: 26,
    overflow: 'hidden',
    border: '1px solid rgba(43, 189, 238, 0.16)',
    background:
      'linear-gradient(180deg, rgba(8, 16, 29, 0.94), rgba(6, 12, 22, 0.98))',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 24px 42px rgba(0, 0, 0, 0.3)',
  },
  feedHeader: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: theme.spacing(2),
    alignItems: 'center',
    padding: theme.spacing(3, 3.25, 2.5),
    borderBottom: '1px solid rgba(43, 189, 238, 0.12)',
    [theme.breakpoints.down('sm')]: {
      gridTemplateColumns: '1fr',
    },
  },
  feedEyebrow: {
    color: '#66d6ff',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
  },
  feedTitle: {
    marginTop: theme.spacing(1),
    color: '#f8fbff',
    fontSize: '2rem',
    lineHeight: 1,
    letterSpacing: '-0.05em',
    fontWeight: 700,
  },
  feedSubtitle: {
    marginTop: theme.spacing(1.2),
    color: '#7a90ac',
    lineHeight: 1.6,
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
  },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing(0.8, 1.2),
    borderRadius: 999,
    border: '1px solid rgba(43, 189, 238, 0.16)',
    background: 'rgba(10, 18, 31, 0.7)',
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
  },
  legendText: {
    color: '#d1e3f8',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  feedBody: {
    padding: theme.spacing(2.5, 3.25, 3.25),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2, 2, 2.5),
    },
  },
}));

const getToneToken = (tone: CommandDeckTone = 'info') => toneTokens[tone];

export const CommandDeckPage = ({
  pageClassName,
  statusLabel,
  title,
  subtitle,
  actions,
  stats,
  cards,
  callout,
  feedEyebrow,
  feedTitle,
  feedSubtitle,
  legend,
  children,
}: CommandDeckPageProps) => {
  const classes = useStyles();

  return (
    <div className={`${classes.page} ${pageClassName}`}>
      <Container maxWidth="xl">
        <section className={classes.hero}>
          <div className={classes.statusRow}>
            <span className={classes.statusDot} />
            <span>{statusLabel}</span>
          </div>

          <div className={classes.heroGrid}>
            <div>
              <Typography component="h1" className={classes.title}>
                {title}
              </Typography>
              <Typography className={classes.subtitle}>{subtitle}</Typography>

              <div className={classes.stats}>
                {stats.map(stat => {
                  const token = getToneToken(stat.tone);

                  return (
                    <div
                      key={stat.label}
                      className={classes.statCard}
                      style={{
                        borderColor: token.border,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.02), 0 0 0 1px ${token.glow}`,
                      }}
                    >
                      <div className={classes.statValue}>{stat.value}</div>
                      <div className={classes.statLabel}>{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={classes.actions}>
              {actions.map(action => (
                <Button
                  key={action.label}
                  component={RouterLink}
                  to={action.to}
                  variant={action.variant === 'primary' ? 'contained' : 'outlined'}
                  color={action.variant === 'primary' ? 'primary' : undefined}
                  className={classes.actionButton}
                  startIcon={action.icon}
                  endIcon={<ArrowForwardRoundedIcon />}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className={classes.cardsGrid}>
          {cards.map(card => {
            const toneToken = getToneToken(card.tone);
            const badgeToken = getToneToken(card.badgeTone ?? card.tone ?? 'info');

            return (
              <div
                key={card.id}
                className={classes.card}
                style={{
                  borderColor: toneToken.border,
                  boxShadow: `0 0 0 1px ${toneToken.glow}, 0 22px 38px rgba(0, 0, 0, 0.28)`,
                }}
              >
                <div className={classes.cardGlow} />
                <div className={classes.cardTop}>
                  <div className={classes.cardIdentity}>
                    <div
                      className={classes.cardIcon}
                      style={{
                        background: toneToken.soft,
                        borderColor: toneToken.border,
                        color: toneToken.text,
                        boxShadow: `0 0 18px ${toneToken.glow}`,
                      }}
                    >
                      {card.icon}
                    </div>
                    <div>
                      <div className={classes.cardEyebrow}>{card.eyebrow}</div>
                      <div className={classes.cardTitle}>{card.title}</div>
                    </div>
                  </div>

                  {card.badgeLabel ? (
                    <div
                      className={classes.badge}
                      style={{
                        background: badgeToken.soft,
                        borderColor: badgeToken.border,
                        color: badgeToken.text,
                      }}
                    >
                      {card.badgeLabel}
                    </div>
                  ) : null}
                </div>

                <div className={classes.cardDescription}>{card.description}</div>

                <div className={classes.metaGrid}>
                  {card.meta.map(item => (
                    <div key={`${card.id}-${item.label}`}>
                      <div className={classes.metaLabel}>{item.label}</div>
                      <div className={classes.metaValue}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {card.tags?.length ? (
                  <div className={classes.tagsRow}>
                    {card.tags.map(tag => (
                      <Chip key={`${card.id}-${tag}`} label={tag} className={classes.tag} />
                    ))}
                  </div>
                ) : null}

                {card.to && card.ctaLabel ? (
                  <RouterLink to={card.to} className={classes.cardLink}>
                    <span>{card.ctaLabel}</span>
                    <ArrowForwardRoundedIcon fontSize="small" />
                  </RouterLink>
                ) : null}
              </div>
            );
          })}

          <div className={classes.calloutCard}>
            <div className={classes.calloutInner}>
              <div className={classes.calloutIcon}>{callout.icon}</div>
              <div className={classes.calloutTitle}>{callout.title}</div>
              <div className={classes.calloutDescription}>{callout.description}</div>
              <RouterLink to={callout.to} className={classes.calloutLink}>
                <span>{callout.label}</span>
                <ArrowForwardRoundedIcon fontSize="small" />
              </RouterLink>
            </div>
          </div>
        </section>

        <section className={classes.feedSection}>
          <div className={classes.feedHeader}>
            <div>
              <div className={classes.feedEyebrow}>{feedEyebrow}</div>
              <div className={classes.feedTitle}>{feedTitle}</div>
              <div className={classes.feedSubtitle}>{feedSubtitle}</div>
            </div>
            <div className={classes.legend}>
              {legend.map(item => {
                const token = getToneToken(item.tone);

                return (
                  <div key={item.label} className={classes.legendItem}>
                    <span
                      className={classes.legendDot}
                      style={{
                        background: token.text,
                        boxShadow: `0 0 12px ${token.glow}`,
                      }}
                    />
                    <span className={classes.legendText}>
                      {item.value} {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={classes.feedBody}>{children}</div>
        </section>
      </Container>
    </div>
  );
};

export type { CommandDeckCard, CommandDeckLegend, CommandDeckStat, CommandDeckTone };
