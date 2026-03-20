import { makeStyles } from '@material-ui/core';

type ShieldBootSequenceProps = {
  agentId: string;
  activeStepIndex: number;
  progress: number;
  steps: Array<{
    id: string;
    label: string;
    detail: string;
  }>;
};

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at top center, rgba(43, 189, 238, 0.12), transparent 28%), linear-gradient(180deg, #040a12 0%, #07101a 100%)',
    color: '#f7fbff',
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    padding: '24px',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    opacity: 0.16,
    backgroundImage:
      'linear-gradient(rgba(43, 189, 238, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(43, 189, 238, 0.08) 1px, transparent 1px)',
    backgroundSize: '44px 44px',
    pointerEvents: 'none',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at center, transparent 0%, transparent 42%, rgba(3, 8, 14, 0.28) 72%, rgba(3, 8, 14, 0.68) 100%)',
    pointerEvents: 'none',
  },
  shell: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 420,
  },
  card: {
    padding: '28px 26px',
    borderRadius: 20,
    background: 'rgba(6, 17, 28, 0.82)',
    border: '1px solid rgba(43, 189, 238, 0.14)',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 18px 38px rgba(0, 0, 0, 0.28), inset 0 0 24px rgba(43, 189, 238, 0.04)',
  },
  percentRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
  },
  percentLabel: {
    color: '#84dcff',
    fontSize: 10,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
  },
  percentValue: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: '-0.06em',
    lineHeight: 1,
  },
  progressTrack: {
    marginTop: 18,
    height: 8,
    borderRadius: 999,
    background: 'rgba(43, 189, 238, 0.08)',
    overflow: 'hidden',
    border: '1px solid rgba(43, 189, 238, 0.12)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
    background:
      'linear-gradient(90deg, rgba(43, 189, 238, 0.24) 0%, rgba(127, 231, 255, 0.92) 50%, rgba(43, 189, 238, 0.34) 100%)',
    boxShadow: '0 0 18px rgba(43, 189, 238, 0.34)',
    transition: 'width 220ms ease-out',
  },
  '@media (max-width: 768px)': {
    root: {
      padding: '18px',
    },
    card: {
      padding: '22px 18px',
    },
    percentValue: {
      fontSize: 30,
    },
  },
});

export const ShieldBootSequence = ({ progress }: ShieldBootSequenceProps) => {
  const classes = useStyles();
  const progressLabel = `${Math.round(progress)}%`;

  return (
    <div className={classes.root}>
      <div className={classes.grid} />
      <div className={classes.vignette} />

      <div className={classes.shell}>
        <div className={classes.card}>
          <div className={classes.percentRow}>
            <span className={classes.percentLabel}>Carregando</span>
            <span className={classes.percentValue}>{progressLabel}</span>
          </div>

          <div className={classes.progressTrack}>
            <div className={classes.progressBar} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShieldBootSequence;
