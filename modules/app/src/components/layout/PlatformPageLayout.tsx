import { PropsWithChildren } from 'react';
import { Box, Chip, Container, makeStyles, Typography } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  page: {
    padding: theme.spacing(0, 3, 5),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(0, 2, 4),
    },
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    margin: theme.spacing(1, 0, 3),
    padding: theme.spacing(5, 5),
    background:
      'linear-gradient(180deg, rgba(9, 17, 29, 0.96), rgba(7, 14, 24, 0.96))',
    border: '1px solid rgba(43, 189, 238, 0.18)',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 18px 40px rgba(0, 0, 0, 0.42), 0 0 32px rgba(43, 189, 238, 0.08)',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage:
        'linear-gradient(rgba(43, 189, 238, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(43, 189, 238, 0.05) 1px, transparent 1px)',
      backgroundSize: '38px 38px',
      opacity: 0.5,
      pointerEvents: 'none',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: 2,
      background:
        'linear-gradient(90deg, transparent, rgba(43, 189, 238, 0.38), transparent)',
      opacity: 0.7,
      animation: '$scanLine 5s linear infinite',
      pointerEvents: 'none',
    },
  },
  heroInner: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 980,
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: theme.spacing(1.5),
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 10,
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(43, 189, 238, 0.08)',
    border: '1px solid rgba(43, 189, 238, 0.26)',
    color: '#2bbdee',
    boxShadow: '0 0 18px rgba(43, 189, 238, 0.16)',
    fontSize: 26,
    fontWeight: 700,
  },
  eyebrow: {
    color: '#2bbdee',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    marginBottom: theme.spacing(1.5),
  },
  title: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontWeight: 700,
    fontSize: '3.7rem',
    lineHeight: 1.02,
    letterSpacing: '-0.05em',
    color: '#f8fbff',
    textShadow: '0 0 18px rgba(43, 189, 238, 0.06)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '2.6rem',
    },
  },
  subtitle: {
    marginTop: theme.spacing(2),
    color: '#8b9ab1',
    fontSize: '1.08rem',
    lineHeight: 1.7,
    maxWidth: 760,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: theme.spacing(3),
  },
  chip: {
    borderRadius: 10,
    background: 'rgba(43, 189, 238, 0.08)',
    color: '#2bbdee',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    border: '1px solid rgba(43, 189, 238, 0.22)',
  },
  content: {
    position: 'relative',
  },
  '@keyframes scanLine': {
    '0%': {
      transform: 'translateY(-4px)',
    },
    '100%': {
      transform: 'translateY(420px)',
    },
  },
}));

type PlatformPageLayoutProps = PropsWithChildren<{
  pageClassName: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  chips?: string[];
}>;

export const PlatformPageLayout = ({
  pageClassName,
  eyebrow,
  title,
  subtitle,
  chips = [],
  children,
}: PlatformPageLayoutProps) => {
  const classes = useStyles();

  return (
    <div className={`${classes.page} ${pageClassName}`}>
      <Container maxWidth="xl">
        <div className={classes.hero}>
          <div className={classes.heroInner}>
            <div className={classes.badgeRow}>
              <div className={classes.badgeIcon}>S</div>
              <Typography className={classes.eyebrow}>{eyebrow}</Typography>
            </div>
            <Typography className={classes.title}>{title}</Typography>
            <Typography className={classes.subtitle}>{subtitle}</Typography>
            {chips.length ? (
              <Box className={classes.chips}>
                {chips.map(chip => (
                  <Chip key={chip} label={chip} className={classes.chip} />
                ))}
              </Box>
            ) : null}
          </div>
        </div>
        <div className={classes.content}>{children}</div>
      </Container>
    </div>
  );
};
