import { FormEvent, useEffect, useMemo, useState } from 'react';
import { makeStyles } from '@material-ui/core';
import {
  DiscoveryApi,
  discoveryApiRef,
  IdentityApi,
  SignInPageProps,
  useApi,
} from '@backstage/core-plugin-api';
import { ProfileInfo, BackstageUserIdentity } from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';
import { ShieldBootSequence } from './ShieldBootSequence';

const DEFAULT_AGENT_ID = 'danylo.oliveira@useargo.com';
const DEFAULT_ACCESS_KEY = '123456';
const BOOT_STEP_DURATION_MS = 540;
const BOOT_PROGRESS_TICK_MS = 60;
const BOOT_STEPS = [
  {
    id: 'identity',
    label: 'Matriz de identidade',
    detail: 'Validando perfil do operador, grafo de governanca e mapeamento seguro da entidade de usuario.',
  },
  {
    id: 'catalog',
    label: 'Hidratacao do catalogo',
    detail: 'Reconstruindo visoes de system, dominio, API e dependencias para o painel de comando.',
  },
  {
    id: 'delivery',
    label: 'Telemetria de entrega',
    detail: 'Conectando pipelines, GitOps e canais de deploy a malha operacional do SHIELD.',
  },
  {
    id: 'interface',
    label: 'Materializacao da interface',
    detail: 'Renderizando paineis taticos, superficies de navegacao e pontos criticos de entrada.',
  },
] as const;

type ProxiedSession = {
  profile: ProfileInfo;
  backstageIdentity: {
    token: string;
    identity: BackstageUserIdentity;
  };
};

class ShieldGuestIdentity implements IdentityApi {
  private readonly discoveryApi: DiscoveryApi;
  private session?: ProxiedSession;

  constructor(discoveryApi: DiscoveryApi) {
    this.discoveryApi = discoveryApi;
  }

  private async fetchSession() {
    if (this.session) {
      return this.session;
    }

    const baseUrl = await this.discoveryApi.getBaseUrl('auth');
    const response = await fetch(`${baseUrl}/guest/refresh`, {
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }

    this.session = (await response.json()) as ProxiedSession;
    return this.session;
  }

  getUserId(): string {
    if (!this.session) {
      return 'devops';
    }

    const ref = this.session.backstageIdentity.identity.userEntityRef;
    const match = /^([^:/]+:)?([^:/]+\/)?([^:/]+)$/.exec(ref);

    if (!match) {
      throw new TypeError(`Invalid user entity reference "${ref}"`);
    }

    return match[3];
  }

  async getIdToken() {
    const session = await this.fetchSession();
    return session.backstageIdentity.token;
  }

  getProfile() {
    if (!this.session) {
      throw new Error('Nenhuma sessao disponivel. Tente novamente apos a autenticacao.');
    }

    return this.session.profile;
  }

  async getProfileInfo() {
    const session = await this.fetchSession();
    return session.profile;
  }

  async getBackstageIdentity() {
    const session = await this.fetchSession();
    return session.backstageIdentity.identity;
  }

  async getCredentials() {
    const session = await this.fetchSession();
    return {
      token: session.backstageIdentity.token,
    };
  }

  async signOut() {
    this.session = undefined;
  }
}

type SignInStage = 'idle' | 'authenticating' | 'booting';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#050a10',
    backgroundImage:
      'linear-gradient(rgba(0, 210, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 210, 255, 0.05) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    color: '#e2e8f0',
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  },
  dataStream: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.1,
    background:
      'repeating-linear-gradient(0deg, transparent, transparent 1px, #00d2ff 1px, #00d2ff 2px)',
    backgroundSize: '100% 4px',
  },
  metaInfo: {
    position: 'fixed',
    top: 40,
    left: 48,
    fontSize: 10,
    lineHeight: 1.8,
    color: '#64748b',
    opacity: 0.4,
    textTransform: 'uppercase',
    letterSpacing: '0.22em',
    pointerEvents: 'none',
  },
  versionInfo: {
    position: 'fixed',
    right: 48,
    bottom: 40,
    fontSize: 10,
    color: '#64748b',
    opacity: 0.4,
    textTransform: 'uppercase',
    letterSpacing: '0.22em',
    pointerEvents: 'none',
  },
  portal: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: 560,
    padding: '32px 24px',
  },
  branding: {
    textAlign: 'center',
    marginBottom: 40,
  },
  brandIconWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 88,
    height: 88,
    borderRadius: '50%',
    marginBottom: 20,
    background: 'rgba(0, 210, 255, 0.05)',
    border: '1px solid rgba(0, 210, 255, 0.3)',
    boxShadow:
      '0 0 20px rgba(0, 210, 255, 0.2), inset 0 0 10px rgba(0, 210, 255, 0.1)',
  },
  brandIcon: {
    width: 48,
    height: 48,
    color: '#00d2ff',
  },
  brandTitle: {
    margin: 0,
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    textShadow: '2px 0 #ff00c1, -2px 0 #00fff9',
  },
  brandSubtitle: {
    marginTop: 12,
    color: '#00d2ff',
    fontSize: 12,
    letterSpacing: '0.26em',
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    padding: 40,
    background: 'rgba(10, 18, 29, 0.8)',
    border: '1px solid #1a2b3c',
    boxShadow:
      '0 0 20px rgba(0, 210, 255, 0.2), inset 0 0 10px rgba(0, 210, 255, 0.1)',
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#00d2ff',
    borderStyle: 'solid',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBottomLeft: {
    left: 0,
    bottom: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  accessHead: {
    marginBottom: 32,
    paddingBottom: 18,
    borderBottom: '1px solid #1a2b3c',
  },
  accessTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  accessDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#ef4444',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)',
    animation: '$pulse 1.6s infinite',
  },
  accessSubtitle: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  label: {
    color: '#00d2ff',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.24em',
  },
  input: {
    height: 46,
    padding: '0 16px',
    borderRadius: 0,
    border: '1px solid #1a2b3c',
    background: 'rgba(5, 10, 16, 0.5)',
    color: '#ffffff',
    fontSize: 16,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    '&:focus': {
      borderColor: '#00d2ff',
      boxShadow: '0 0 0 1px rgba(0, 210, 255, 0.24)',
    },
    '&::placeholder': {
      color: 'rgba(100, 116, 139, 0.5)',
    },
  },
  biometric: {
    padding: '18px 0',
    borderTop: '1px solid rgba(26, 43, 60, 0.6)',
    borderBottom: '1px solid rgba(26, 43, 60, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  biometricMuted: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  biometricActive: {
    marginTop: 6,
    color: '#00d2ff',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    animation: '$pulse 1.8s infinite',
  },
  biometricBox: {
    position: 'relative',
    width: 56,
    height: 56,
    display: 'grid',
    placeItems: 'center',
    border: '1px solid rgba(0, 210, 255, 0.3)',
    background: 'rgba(0, 210, 255, 0.05)',
    overflow: 'hidden',
  },
  biometricScan: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: 2,
    background: 'rgba(0, 210, 255, 0.5)',
    boxShadow: '0 0 10px rgba(0, 210, 255, 0.8)',
    animation: '$scan 3s linear infinite',
  },
  button: {
    position: 'relative',
    width: '100%',
    height: 72,
    marginTop: 8,
    border: '1px solid #00d2ff',
    background: 'rgba(0, 210, 255, 0.1)',
    color: '#00d2ff',
    cursor: 'pointer',
    overflow: 'hidden',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.38em',
    textTransform: 'uppercase',
    transition: 'background-color 0.25s ease, color 0.25s ease, opacity 0.25s ease',
    '&:hover': {
      background: '#00d2ff',
      color: '#050a10',
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'progress',
    },
  },
  buttonGlint: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255,255,255,0.14)',
    transform: 'translateX(-100%)',
    transition: 'transform 0.5s ease-in-out',
    '$button:hover &': {
      transform: 'translateX(100%)',
    },
  },
  hint: {
    textAlign: 'center',
    marginTop: 26,
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
  },
  error: {
    padding: '12px 14px',
    border: '1px solid rgba(244, 63, 94, 0.25)',
    background: 'rgba(127, 29, 29, 0.22)',
    color: '#fecdd3',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  statuses: {
    marginTop: 28,
    display: 'flex',
    justifyContent: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    animation: '$pulse 1.8s infinite',
  },
  cyan: {
    background: '#00d2ff',
  },
  green: {
    background: '#16d96c',
  },
  '@media (max-width: 768px)': {
    metaInfo: {
      display: 'none',
    },
    versionInfo: {
      display: 'none',
    },
    portal: {
      maxWidth: '100%',
      padding: '24px 18px',
    },
    card: {
      padding: 26,
    },
    brandTitle: {
      fontSize: 28,
    },
  },
  '@keyframes pulse': {
    '0%, 100%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.5,
    },
  },
  '@keyframes scan': {
    '0%': {
      top: '0%',
    },
    '100%': {
      top: '100%',
    },
  },
});

export const ShieldSignInPage = ({ onSignInSuccess }: SignInPageProps) => {
  const classes = useStyles();
  const discoveryApi = useApi(discoveryApiRef);
  const [agentId, setAgentId] = useState(DEFAULT_AGENT_ID);
  const [accessKey, setAccessKey] = useState(DEFAULT_ACCESS_KEY);
  const [error, setError] = useState<string>();
  const [stage, setStage] = useState<SignInStage>('idle');
  const [bootStepIndex, setBootStepIndex] = useState(0);
  const [bootProgress, setBootProgress] = useState(0);
  const [pendingIdentity, setPendingIdentity] = useState<IdentityApi>();

  const footerLabel = useMemo(
    () => 'SHIELD OS V1.38.3 // MODULO_TATICO',
    [],
  );
  const loading = stage !== 'idle';

  useEffect(() => {
    if (stage !== 'booting' || !pendingIdentity) {
      return undefined;
    }

    setBootStepIndex(0);
    setBootProgress(0);

    const totalDuration = BOOT_STEPS.length * BOOT_STEP_DURATION_MS;
    const stepTimers = BOOT_STEPS.map((_, index) =>
      window.setTimeout(() => {
        setBootStepIndex(index);
      }, index * BOOT_STEP_DURATION_MS),
    );

    const progressTimer = window.setInterval(() => {
      setBootProgress(previous => {
        const next = previous + 100 / (totalDuration / BOOT_PROGRESS_TICK_MS);
        return next >= 100 ? 100 : next;
      });
    }, BOOT_PROGRESS_TICK_MS);

    const completionTimer = window.setTimeout(() => {
      setBootProgress(100);
      onSignInSuccess(pendingIdentity);
    }, totalDuration + 180);

    return () => {
      window.clearInterval(progressTimer);
      stepTimers.forEach(timer => window.clearTimeout(timer));
      window.clearTimeout(completionTimer);
    };
  }, [onSignInSuccess, pendingIdentity, stage]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedAgentId = agentId.trim().toLowerCase();

    if (normalizedAgentId !== DEFAULT_AGENT_ID || accessKey !== DEFAULT_ACCESS_KEY) {
      setError('Credenciais invalidas. Utilize o usuario operacional padrao.');
      return;
    }

    setStage('authenticating');
    setError(undefined);

    try {
      const identity = new ShieldGuestIdentity(discoveryApi);
      await identity.getBackstageIdentity();
      setPendingIdentity(identity);
      setStage('booting');
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : 'Falha ao autenticar no portal tatico.',
      );
      setPendingIdentity(undefined);
      setStage('idle');
    }
  };

  if (stage === 'booting') {
    return (
      <ShieldBootSequence
        agentId={agentId.trim().toLowerCase()}
        activeStepIndex={bootStepIndex}
        progress={bootProgress}
        steps={[...BOOT_STEPS]}
      />
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.dataStream} />
      <div className={classes.metaInfo}>
        STATUS_DO_SISTEMA: OTIMO
        <br />
        LINK_SEGURO: ESTABELECIDO
        <br />
        LAT: 40.7128° N
        <br />
        LON: 74.0060° W
      </div>
      <div className={classes.versionInfo}>{footerLabel}</div>

      <main className={classes.portal}>
        <div className={classes.branding}>
          <div className={classes.brandIconWrap}>
            <svg className={classes.brandIcon} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
            </svg>
          </div>
          <h1 className={classes.brandTitle}>S.H.I.E.L.D. IDP</h1>
          <div className={classes.brandSubtitle}>Portal tatico de acesso</div>
        </div>

        <div className={classes.card}>
          <div className={`${classes.corner} ${classes.cornerTopLeft}`} />
          <div className={`${classes.corner} ${classes.cornerTopRight}`} />
          <div className={`${classes.corner} ${classes.cornerBottomLeft}`} />
          <div className={`${classes.corner} ${classes.cornerBottomRight}`} />

          <div className={classes.accessHead}>
            <div className={classes.accessTitle}>
              <span className={classes.accessDot} />
              Acesso Restrito
            </div>
            <div className={classes.accessSubtitle}>Nivel de Seguranca 7 Requerido</div>
          </div>

          <form className={classes.form} onSubmit={handleSubmit}>
            <div className={classes.field}>
              <label className={classes.label} htmlFor="agent-id">
                ID do agente
              </label>
              <input
                id="agent-id"
                className={classes.input}
                value={agentId}
                onChange={event => setAgentId(event.target.value)}
                placeholder="A_STARK_001"
                autoComplete="username"
              />
            </div>

            <div className={classes.field}>
              <label className={classes.label} htmlFor="access-key">
                Chave de acesso
              </label>
              <input
                id="access-key"
                type="password"
                className={classes.input}
                value={accessKey}
                onChange={event => setAccessKey(event.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className={classes.biometric}>
              <div>
                <div className={classes.biometricMuted}>Verificacao biometrica</div>
                <div className={classes.biometricActive}>Aguardando leitura...</div>
              </div>
              <div className={classes.biometricBox}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 004 12c0-5.523 4.477-10 10-10s10 4.477 10 10c0 1.285-.24 2.512-.676 3.638m-4.433 1.056c-.66.381-1.344.698-2.045.952m-5.874-2.623A10.031 10.031 0 0110 13c.298 0 .583.02.863.06m3.937 1.48a9.96 9.96 0 01-2.288 3.593"
                    stroke="#00d2ff"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className={classes.biometricScan} />
              </div>
            </div>

            {error ? <div className={classes.error}>{error}</div> : null}

            <button className={classes.button} type="submit" disabled={loading}>
              <span>{stage === 'authenticating' ? 'Verificando' : 'Autenticar'}</span>
              <span className={classes.buttonGlint} />
            </button>

            <div className={classes.hint}>Protocolo de sobrecarga emergencial</div>
          </form>
        </div>

        <div className={classes.statuses}>
          <div className={classes.statusItem}>
            <span className={`${classes.statusDot} ${classes.cyan}`} />
            Link neural ativo
          </div>
          <div className={classes.statusItem}>
            <span className={`${classes.statusDot} ${classes.green}`} />
            Tunel criptografado
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShieldSignInPage;
