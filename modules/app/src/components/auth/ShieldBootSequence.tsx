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

const ORBITAL_LABELS = ['link seguro', 'malha do catalogo', 'hud online'];
const DECORATIVE_CODE = [
  'shield_core.init()',
  'mesh.sync=stable',
  'uplink=secure',
];

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at top center, rgba(43, 189, 238, 0.16), transparent 24%), linear-gradient(180deg, #040a12 0%, #07101a 100%)',
    color: '#f7fbff',
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    opacity: 0.18,
    backgroundImage:
      'linear-gradient(rgba(43, 189, 238, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(43, 189, 238, 0.08) 1px, transparent 1px)',
    backgroundSize: '44px 44px',
    pointerEvents: 'none',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background:
      'radial-gradient(circle at center, transparent 0%, transparent 42%, rgba(3, 8, 14, 0.34) 72%, rgba(3, 8, 14, 0.72) 100%)',
    pointerEvents: 'none',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: 2,
    background:
      'linear-gradient(90deg, transparent, rgba(43, 189, 238, 0.8), transparent)',
    boxShadow: '0 0 24px rgba(43, 189, 238, 0.55)',
    animation: '$scanline 4.2s linear infinite',
    pointerEvents: 'none',
  },
  shell: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 760,
    padding: '40px 24px 48px',
    display: 'grid',
    justifyItems: 'center',
    gap: 26,
  },
  decorativeCode: {
    display: 'flex',
    gap: 18,
    flexWrap: 'wrap',
    justifyContent: 'center',
    color: 'rgba(134, 223, 255, 0.58)',
    fontSize: 10,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  decorativeCodeItem: {
    padding: '7px 12px',
    borderRadius: 999,
    border: '1px solid rgba(43, 189, 238, 0.12)',
    background: 'rgba(8, 18, 29, 0.5)',
  },
  halo: {
    position: 'relative',
    width: 390,
    height: 390,
    display: 'grid',
    placeItems: 'center',
    [ '@media (max-width: 768px)' ]: {
      width: 290,
      height: 290,
    },
  },
  ringOuter: {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    border: '1px solid rgba(43, 189, 238, 0.18)',
    boxShadow: '0 0 42px rgba(43, 189, 238, 0.08)',
    animation: '$spinSlow 18s linear infinite',
  },
  ringMid: {
    position: 'absolute',
    inset: 34,
    borderRadius: '50%',
    border: '1px dashed rgba(43, 189, 238, 0.24)',
    animation: '$spinReverse 14s linear infinite',
  },
  ringInner: {
    position: 'absolute',
    inset: 84,
    borderRadius: '50%',
    border: '1px solid rgba(127, 231, 255, 0.36)',
    boxShadow: '0 0 32px rgba(43, 189, 238, 0.16), inset 0 0 20px rgba(43, 189, 238, 0.1)',
    animation: '$pulseRing 2.4s ease-in-out infinite',
  },
  orbitMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    color: '#84dcff',
    fontSize: 10,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    transformOrigin: 'center',
    opacity: 0.8,
    '&:nth-of-type(1)': {
      transform: 'translate(-50%, -50%) rotate(-18deg) translateY(-182px)',
    },
    '&:nth-of-type(2)': {
      transform: 'translate(-50%, -50%) rotate(102deg) translateY(-176px)',
    },
    '&:nth-of-type(3)': {
      transform: 'translate(-50%, -50%) rotate(222deg) translateY(-178px)',
    },
  },
  centerCore: {
    position: 'relative',
    width: 170,
    height: 170,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    background:
      'radial-gradient(circle, rgba(43, 189, 238, 0.24) 0%, rgba(12, 25, 40, 0.94) 68%, rgba(5, 11, 18, 0.98) 100%)',
    border: '1px solid rgba(43, 189, 238, 0.28)',
    boxShadow: '0 0 48px rgba(43, 189, 238, 0.22), inset 0 0 26px rgba(43, 189, 238, 0.12)',
  },
  centerGlow: {
    position: 'absolute',
    inset: 14,
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  centerEyebrow: {
    color: '#84dcff',
    fontSize: 10,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  centerPercent: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 700,
    letterSpacing: '-0.08em',
    lineHeight: 1,
  },
  centerCaption: {
    marginTop: 10,
    color: '#7f93ac',
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 640,
    padding: '26px 28px 24px',
    borderRadius: 24,
    background: 'rgba(6, 17, 28, 0.74)',
    border: '1px solid rgba(43, 189, 238, 0.16)',
    boxShadow:
      '0 0 0 1px rgba(43, 189, 238, 0.04), 0 18px 38px rgba(0, 0, 0, 0.28), inset 0 0 24px rgba(43, 189, 238, 0.05)',
    textAlign: 'center',
  },
  eyebrow: {
    color: '#2bbdee',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 14,
    color: '#f8fbff',
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: '-0.05em',
    lineHeight: 1.05,
  },
  subtitle: {
    marginTop: 10,
    color: '#8fa1b8',
    fontSize: 12,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  progressTrack: {
    marginTop: 24,
    height: 10,
    borderRadius: 999,
    background: 'rgba(43, 189, 238, 0.08)',
    overflow: 'hidden',
    border: '1px solid rgba(43, 189, 238, 0.12)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
    background:
      'linear-gradient(90deg, rgba(43, 189, 238, 0.22) 0%, rgba(127, 231, 255, 0.88) 45%, rgba(43, 189, 238, 0.34) 100%)',
    boxShadow: '0 0 18px rgba(43, 189, 238, 0.34)',
    transition: 'width 220ms ease-out',
  },
  activeStepWrap: {
    marginTop: 22,
    padding: '18px 18px 16px',
    borderRadius: 18,
    background: 'rgba(8, 20, 32, 0.74)',
    border: '1px solid rgba(43, 189, 238, 0.1)',
  },
  activeStepState: {
    color: '#2bbdee',
    fontSize: 10,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
  },
  activeStepTitle: {
    marginTop: 10,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.04em',
  },
  activeStepDetail: {
    marginTop: 10,
    color: '#8da0b8',
    fontSize: 12,
    lineHeight: 1.7,
  },
  rail: {
    marginTop: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  railItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(7, 15, 24, 0.68)',
    border: '1px solid rgba(43, 189, 238, 0.08)',
  },
  railDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'rgba(87, 114, 145, 0.8)',
  },
  railDotDone: {
    background: '#16d96c',
    boxShadow: '0 0 12px rgba(22, 217, 108, 0.34)',
  },
  railDotActive: {
    background: '#2bbdee',
    boxShadow: '0 0 14px rgba(43, 189, 238, 0.42)',
    animation: '$pulseDot 1.5s ease-in-out infinite',
  },
  railText: {
    color: '#91a3bb',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
    color: '#84dcff',
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  footerDivider: {
    width: 18,
    height: 1,
    background: 'rgba(43, 189, 238, 0.24)',
  },
  '@media (max-width: 768px)': {
    shell: {
      padding: '26px 16px 34px',
      gap: 22,
    },
    card: {
      padding: '22px 18px 20px',
    },
    title: {
      fontSize: 28,
    },
    activeStepTitle: {
      fontSize: 19,
    },
    orbitMarker: {
      display: 'none',
    },
  },
  '@keyframes scanline': {
    '0%': {
      top: '0%',
    },
    '100%': {
      top: '100%',
    },
  },
  '@keyframes spinSlow': {
    '0%': {
      transform: 'rotate(0deg)',
    },
    '100%': {
      transform: 'rotate(360deg)',
    },
  },
  '@keyframes spinReverse': {
    '0%': {
      transform: 'rotate(360deg)',
    },
    '100%': {
      transform: 'rotate(0deg)',
    },
  },
  '@keyframes pulseRing': {
    '0%, 100%': {
      boxShadow: '0 0 32px rgba(43, 189, 238, 0.16), inset 0 0 20px rgba(43, 189, 238, 0.1)',
      opacity: 1,
    },
    '50%': {
      boxShadow: '0 0 42px rgba(43, 189, 238, 0.28), inset 0 0 28px rgba(43, 189, 238, 0.14)',
      opacity: 0.78,
    },
  },
  '@keyframes pulseDot': {
    '0%, 100%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.45,
    },
  },
});

export const ShieldBootSequence = ({
  agentId,
  activeStepIndex,
  progress,
  steps,
}: ShieldBootSequenceProps) => {
  const classes = useStyles();
  const activeStep = steps[Math.max(activeStepIndex, 0)] ?? steps[0];
  const progressLabel = `${Math.round(progress)}%`;

  return (
    <div className={classes.root}>
      <div className={classes.grid} />
      <div className={classes.vignette} />
      <div className={classes.scanline} />

      <div className={classes.shell}>
        <div className={classes.decorativeCode}>
          {DECORATIVE_CODE.map(item => (
            <div key={item} className={classes.decorativeCodeItem}>
              {item}
            </div>
          ))}
        </div>

        <div className={classes.halo}>
          <div className={classes.ringOuter} />
          <div className={classes.ringMid} />
          <div className={classes.ringInner} />
          {ORBITAL_LABELS.map(label => (
            <div key={label} className={classes.orbitMarker}>
              {label}
            </div>
          ))}
          <div className={classes.centerCore}>
            <div className={classes.centerGlow} />
            <div>
              <div className={classes.centerEyebrow}>Link SHIELD</div>
              <div className={classes.centerPercent}>{progressLabel}</div>
              <div className={classes.centerCaption}>Sincronia tatica</div>
            </div>
          </div>
        </div>

        <div className={classes.card}>
          <div className={classes.eyebrow}>Sequencia de inicializacao</div>
          <div className={classes.title}>Sincronizacao da interface tatica</div>
          <div className={classes.subtitle}>Inicializacao da superficie de comando central</div>

          <div className={classes.progressTrack}>
            <div className={classes.progressBar} style={{ width: `${progress}%` }} />
          </div>

          <div className={classes.activeStepWrap}>
            <div className={classes.activeStepState}>Sequencia atual</div>
            <div className={classes.activeStepTitle}>{activeStep.label}</div>
            <div className={classes.activeStepDetail}>{activeStep.detail}</div>
          </div>

          <div className={classes.rail}>
            {steps.map((step, index) => {
              const isDone = index < activeStepIndex;
              const isActive = index === activeStepIndex;
              const dotClassName = [
                classes.railDot,
                isDone ? classes.railDotDone : '',
                isActive ? classes.railDotActive : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div key={step.id} className={classes.railItem}>
                  <span className={dotClassName} />
                  <span className={classes.railText}>{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className={classes.footer}>
            <span>{agentId}</span>
            <span className={classes.footerDivider} />
            <span>sessao segura</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShieldBootSequence;
