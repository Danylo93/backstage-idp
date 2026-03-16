import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import HomeIcon from '@material-ui/icons/Home';
import AppsIcon from '@material-ui/icons/Apps';
import ExtensionIcon from '@material-ui/icons/Extension';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import GroupIcon from '@material-ui/icons/People';
import SettingsIcon from '@material-ui/icons/Settings';
import ArrowForwardRoundedIcon from '@material-ui/icons/ArrowForwardRounded';
import ChevronLeftRoundedIcon from '@material-ui/icons/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@material-ui/icons/ChevronRightRounded';
import MenuRoundedIcon from '@material-ui/icons/MenuRounded';
import CloseRoundedIcon from '@material-ui/icons/CloseRounded';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';
import { UserSettingsSignInAvatar } from '@backstage/plugin-user-settings';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { Link, useLocation } from 'react-router-dom';
import { useMenuHoverSoundPreference } from '../../utils/menuHoverSoundPreference';

const SIDEBAR_OPEN_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 92;
const MOBILE_SIDEBAR_WIDTH = 306;
const MENU_HOVER_SOUND_THROTTLE_MS = 72;

type HoverAudioGraph = {
  audioContext: AudioContext;
  masterGain: GainNode;
  noiseBuffer: AudioBuffer;
};

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: {
      new (): AudioContext;
    };
  };

type PageMeta = {
  eyebrow: string;
  title: string;
  path: string;
  topBarVariant: 'full' | 'compact';
};

const NAV_SECTIONS = [
  {
    id: 'operations',
    title: 'Operacoes',
    items: [
      { icon: HomeIcon, to: '/', label: 'Central de Comando' },
      { icon: AppsIcon, to: '/catalog', label: 'Catalogo' },
      { icon: CreateComponentIcon, to: '/create', label: 'Templates' },
      { icon: ExtensionIcon, to: '/api-docs', label: 'APIs' },
      { icon: LibraryBooks, to: '/docs', label: 'Documentacao' },
      { icon: AccountTreeIcon, to: '/catalog-graph', label: 'Topologia' },
      { icon: GroupIcon, to: '/squads', label: 'Squads' },
      { icon: AppsIcon, to: '/catalog-import', label: 'Registrar' },
    ],
  },
  {
    id: 'admin',
    title: 'Administracao',
    items: [{ icon: SettingsIcon, to: '/settings', label: 'Configuracoes' }],
  },
] as const;

const getAudioContextConstructor = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const audioWindow = window as AudioWindow;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
};

const createHoverNoiseBuffer = (audioContext: AudioContext) => {
  const frameCount = Math.floor(audioContext.sampleRate * 0.035);
  const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    const decay = 1 - index / frameCount;
    channel[index] = (Math.random() * 2 - 1) * decay;
  }

  return buffer;
};

const ensureHoverAudioGraph = ({
  audioContextRef,
  masterGainRef,
  noiseBufferRef,
}: {
  audioContextRef: { current: AudioContext | null };
  masterGainRef: { current: GainNode | null };
  noiseBufferRef: { current: AudioBuffer | null };
}): HoverAudioGraph | null => {
  const AudioContextConstructor = getAudioContextConstructor();

  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
    const audioContext = new AudioContextConstructor();
    const masterGain = audioContext.createGain();

    masterGain.gain.value = 0.14;
    masterGain.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    masterGainRef.current = masterGain;
    noiseBufferRef.current = createHoverNoiseBuffer(audioContext);
  }

  if (!audioContextRef.current || !masterGainRef.current || !noiseBufferRef.current) {
    return null;
  }

  return {
    audioContext: audioContextRef.current,
    masterGain: masterGainRef.current,
    noiseBuffer: noiseBufferRef.current,
  };
};

const playMenuHoverSound = (
  audioContext: AudioContext,
  masterGain: GainNode,
  noiseBuffer: AudioBuffer,
) => {
  const startTime = audioContext.currentTime;
  const lead = audioContext.createOscillator();
  const leadFilter = audioContext.createBiquadFilter();
  const leadGain = audioContext.createGain();
  const accent = audioContext.createOscillator();
  const accentFilter = audioContext.createBiquadFilter();
  const accentGain = audioContext.createGain();
  const shimmer = audioContext.createBufferSource();
  const shimmerFilter = audioContext.createBiquadFilter();
  const shimmerGain = audioContext.createGain();
  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();

  const schedulePulse = (
    gainNode: GainNode,
    pulseStart: number,
    peak: number,
    attack: number,
    release: number,
  ) => {
    gainNode.gain.setValueAtTime(0.0001, pulseStart);
    gainNode.gain.exponentialRampToValueAtTime(peak, pulseStart + attack);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      pulseStart + attack + release,
    );
  };

  lead.type = 'sawtooth';
  lead.frequency.setValueAtTime(2140, startTime);
  lead.frequency.exponentialRampToValueAtTime(1560, startTime + 0.016);
  lead.frequency.setValueAtTime(1880, startTime + 0.024);
  lead.frequency.exponentialRampToValueAtTime(1280, startTime + 0.044);
  lead.frequency.setValueAtTime(1480, startTime + 0.05);
  lead.frequency.exponentialRampToValueAtTime(920, startTime + 0.078);

  leadFilter.type = 'bandpass';
  leadFilter.frequency.setValueAtTime(1980, startTime);
  leadFilter.frequency.linearRampToValueAtTime(1380, startTime + 0.08);
  leadFilter.Q.setValueAtTime(11, startTime);

  schedulePulse(leadGain, startTime, 0.034, 0.003, 0.018);
  schedulePulse(leadGain, startTime + 0.024, 0.026, 0.002, 0.016);
  schedulePulse(leadGain, startTime + 0.05, 0.02, 0.002, 0.015);

  accent.type = 'square';
  accent.frequency.setValueAtTime(2680, startTime);
  accent.frequency.setValueAtTime(2440, startTime + 0.024);
  accent.frequency.setValueAtTime(2280, startTime + 0.05);
  accent.detune.setValueAtTime(-18, startTime);

  accentFilter.type = 'highpass';
  accentFilter.frequency.setValueAtTime(2100, startTime);
  accentFilter.Q.setValueAtTime(0.9, startTime);

  schedulePulse(accentGain, startTime + 0.002, 0.014, 0.0015, 0.01);
  schedulePulse(accentGain, startTime + 0.027, 0.011, 0.0015, 0.009);
  schedulePulse(accentGain, startTime + 0.053, 0.009, 0.0015, 0.008);

  shimmer.buffer = noiseBuffer;

  shimmerFilter.type = 'bandpass';
  shimmerFilter.frequency.setValueAtTime(4800, startTime);
  shimmerFilter.Q.setValueAtTime(1.1, startTime);

  schedulePulse(shimmerGain, startTime + 0.001, 0.01, 0.001, 0.008);
  schedulePulse(shimmerGain, startTime + 0.026, 0.008, 0.001, 0.007);
  schedulePulse(shimmerGain, startTime + 0.052, 0.006, 0.001, 0.006);

  lfo.type = 'triangle';
  lfo.frequency.setValueAtTime(32, startTime);
  lfoGain.gain.setValueAtTime(18, startTime);

  lead.connect(leadFilter);
  leadFilter.connect(leadGain);
  leadGain.connect(masterGain);

  accent.connect(accentFilter);
  accentFilter.connect(accentGain);
  accentGain.connect(masterGain);

  shimmer.connect(shimmerFilter);
  shimmerFilter.connect(shimmerGain);
  shimmerGain.connect(masterGain);

  lfo.connect(lfoGain);
  lfoGain.connect(lead.frequency);

  lead.start(startTime);
  accent.start(startTime);
  shimmer.start(startTime);
  lfo.start(startTime);

  lead.stop(startTime + 0.088);
  accent.stop(startTime + 0.082);
  shimmer.stop(startTime + 0.07);
  lfo.stop(startTime + 0.088);
};

const useMenuHoverSound = (enabled: boolean) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const enabledRef = useRef(enabled);
  const lastTriggeredAtRef = useRef(0);

  useEffect(() => {
    enabledRef.current = enabled;

    if (enabled || !audioContextRef.current || audioContextRef.current.state !== 'running') {
      return;
    }

    void audioContextRef.current.suspend().catch(() => undefined);
  }, [enabled]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const unlockAudio = () => {
      if (!enabledRef.current) {
        return;
      }

      const graph = ensureHoverAudioGraph({
        audioContextRef,
        masterGainRef,
        noiseBufferRef,
      });

      if (!graph || graph.audioContext.state !== 'suspended') {
        return;
      }

      void graph.audioContext.resume().catch(() => undefined);
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);

      const audioContext = audioContextRef.current;

      audioContextRef.current = null;
      masterGainRef.current = null;
      noiseBufferRef.current = null;

      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch(() => undefined);
      }
    };
  }, []);

  return () => {
    if (!enabledRef.current) {
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (now - lastTriggeredAtRef.current < MENU_HOVER_SOUND_THROTTLE_MS) {
      return;
    }

    lastTriggeredAtRef.current = now;

    const graph = ensureHoverAudioGraph({
      audioContextRef,
      masterGainRef,
      noiseBufferRef,
    });

    if (!graph) {
      return;
    }

    const triggerPlayback = () => {
      playMenuHoverSound(graph.audioContext, graph.masterGain, graph.noiseBuffer);
    };

    if (graph.audioContext.state === 'running') {
      triggerPlayback();
      return;
    }

    void graph.audioContext
      .resume()
      .then(() => {
        if (graph.audioContext.state === 'running') {
          triggerPlayback();
        }
      })
      .catch(() => undefined);
  };
};

const useStyles = makeStyles(theme => ({
  appFrame: {
    minHeight: '100vh',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 1200,
    width: SIDEBAR_COLLAPSED_WIDTH,
    color: '#f3f7ff',
    background:
      'linear-gradient(180deg, rgba(2, 8, 18, 0.985) 0%, rgba(3, 10, 21, 0.985) 45%, rgba(4, 12, 24, 0.985) 100%)',
    borderRight: '1px solid rgba(43, 189, 238, 0.14)',
    boxShadow: '18px 0 40px rgba(0, 0, 0, 0.18)',
    transition: 'width 180ms ease, transform 180ms ease',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage:
        'linear-gradient(rgba(43, 189, 238, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(43, 189, 238, 0.03) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
      opacity: 0.34,
    },
  },
  sidebarExpanded: {
    width: SIDEBAR_OPEN_WIDTH,
  },
  sidebarMobile: {
    width: MOBILE_SIDEBAR_WIDTH,
    transform: 'translateX(-100%)',
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)',
  },
  sidebarInner: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: '12px 12px 18px',
    overflow: 'hidden',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 92,
    marginBottom: 10,
  },
  sidebarHeaderCollapsed: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 0,
    textDecoration: 'none',
  },
  logoLinkCollapsed: {
    justifyContent: 'center',
    width: '100%',
  },
  toggleButton: {
    width: 42,
    height: 42,
    flex: '0 0 auto',
    border: '1px solid rgba(43, 189, 238, 0.18)',
    borderRadius: 12,
    background: 'rgba(10, 19, 31, 0.88)',
    color: '#d9ebff',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
    '&:hover': {
      background: 'rgba(18, 31, 48, 0.96)',
      borderColor: 'rgba(43, 189, 238, 0.32)',
      transform: 'translateY(-1px)',
    },
  },
  section: {
    marginTop: 2,
  },
  sectionSpacer: {
    marginTop: 20,
  },
  sectionTitle: {
    margin: '0 12px 10px',
    color: 'rgba(123, 140, 165, 0.7)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
  },
  navList: {
    display: 'grid',
    gap: 6,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    height: 48,
    padding: '0 14px',
    borderRadius: 14,
    color: '#9bb7e2',
    textDecoration: 'none',
    transition: 'background-color 0.16s ease, color 0.16s ease, transform 0.16s ease',
    '&:hover': {
      background: 'rgba(17, 42, 64, 0.68)',
      color: '#f5fbff',
    },
  },
  navItemCollapsed: {
    justifyContent: 'center',
    padding: 0,
  },
  navItemActive: {
    background:
      'linear-gradient(90deg, rgba(17, 42, 64, 0.9), rgba(13, 31, 46, 0.82))',
    color: '#ffffff',
    boxShadow:
      'inset 3px 0 0 #2bbdee, 0 0 0 1px rgba(43, 189, 238, 0.06), 0 14px 24px rgba(1, 10, 18, 0.22)',
  },
  navIconWrap: {
    width: 34,
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
  },
  navLabel: {
    minWidth: 0,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  navScrollArea: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: 4,
    marginRight: -4,
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(43, 189, 238, 0.3) transparent',
    '&::-webkit-scrollbar': {
      width: 8,
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      borderRadius: 999,
      background: 'rgba(43, 189, 238, 0.26)',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: 'rgba(43, 189, 238, 0.4)',
    },
  },
  sidebarFooter: {
    flex: '0 0 auto',
  },
  divider: {
    height: 1,
    margin: '18px 8px',
    background:
      'linear-gradient(90deg, rgba(43,189,238,0.04), rgba(43,189,238,0.18), rgba(43,189,238,0.02))',
  },
  userDock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userDockCollapsed: {
    justifyContent: 'center',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: 1,
    padding: '10px 12px',
    borderRadius: 14,
    background: 'rgba(13, 22, 36, 0.72)',
    border: '1px solid rgba(43, 189, 238, 0.1)',
  },
  userBadgeCollapsed: {
    flex: '0 0 auto',
    justifyContent: 'center',
    padding: 10,
  },
  userMeta: {
    minWidth: 0,
  },
  userLabel: {
    color: '#f3f7ff',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userHint: {
    marginTop: 3,
    color: '#2bbdee',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    color: '#d9e5f7',
    background: 'rgba(13, 22, 36, 0.72)',
    border: '1px solid rgba(43, 189, 238, 0.1)',
    textDecoration: 'none',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1100,
    background: 'rgba(3, 8, 14, 0.58)',
    backdropFilter: 'blur(4px)',
  },
  contentShell: {
    minHeight: '100vh',
    marginLeft: SIDEBAR_COLLAPSED_WIDTH,
    background:
      'radial-gradient(circle at top center, rgba(43, 189, 238, 0.1), transparent 26%), linear-gradient(180deg, #07101a 0%, #040a13 100%)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'margin-left 180ms ease',
    '&::before': {
      content: '""',
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      backgroundImage:
        'linear-gradient(rgba(43, 189, 238, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(43, 189, 238, 0.04) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
      opacity: 0.3,
      zIndex: 0,
    },
    '&::after': {
      content: '""',
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 0,
      background:
        'repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)',
      opacity: 0.12,
    },
  },
  contentShellExpanded: {
    marginLeft: SIDEBAR_OPEN_WIDTH,
  },
  contentShellMobile: {
    marginLeft: 0,
  },
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '18px 32px 14px',
    backdropFilter: 'blur(18px)',
    background:
      'linear-gradient(180deg, rgba(5, 11, 20, 0.88), rgba(5, 11, 20, 0.72))',
    borderBottom: '1px solid rgba(43, 189, 238, 0.12)',
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.24)',
    [theme.breakpoints.down('sm')]: {
      padding: '16px 14px 12px',
    },
  },
  topBarLead: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    minWidth: 0,
  },
  topBarMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: '1px solid rgba(43, 189, 238, 0.16)',
    background: 'rgba(13, 22, 36, 0.92)',
    color: '#d9ebff',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    flex: '0 0 auto',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
    '&:hover': {
      background: 'rgba(18, 31, 48, 0.96)',
      transform: 'translateY(-1px)',
    },
  },
  topBarMeta: {
    minWidth: 0,
  },
  topBarMetaCompact: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  topBarEyebrow: {
    color: '#73839a',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  topBarTitle: {
    color: '#f8fbff',
    fontSize: 25,
    fontWeight: 700,
    letterSpacing: '-0.04em',
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    [theme.breakpoints.down('sm')]: {
      fontSize: 20,
    },
  },
  topBarPath: {
    marginTop: 5,
    color: '#70819b',
    fontSize: 13,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    [theme.breakpoints.down('sm')]: {
      fontSize: 12,
    },
  },
  topBarPathStrong: {
    color: '#d8e7fa',
    fontWeight: 600,
  },
  topBarPathCompact: {
    marginTop: 0,
  },
  topBarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  topBarPill: {
    height: 38,
    padding: '0 16px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    background: 'rgba(22, 163, 74, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.26)',
    color: '#1ee67b',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    boxShadow: '0 0 18px rgba(34, 197, 94, 0.08)',
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
  },
  topBarDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    background: '#1ee67b',
    boxShadow: '0 0 0 5px rgba(34, 197, 94, 0.12)',
  },
  topBarAvatarButton: {
    width: 42,
    height: 42,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 12,
    background: 'rgba(13, 22, 36, 0.92)',
    border: '1px solid rgba(43, 189, 238, 0.14)',
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
  },
  pageBody: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
}));

const getPageMeta = (pathname: string): PageMeta => {
  if (pathname.startsWith('/catalog/') && pathname.split('/').length >= 5) {
    const name = decodeURIComponent(pathname.split('/')[4] ?? 'Componente');
    return {
      eyebrow: 'Componente',
      title: name,
      path: 'Catalogo / Componente',
      topBarVariant: 'full',
    };
  }

  const mappings = [
    {
      match: (path: string) => path === '/' || path === '/home',
      eyebrow: 'Operacoes',
      title: 'Central de Comando',
      path: 'Inicio / Operacoes',
      topBarVariant: 'compact' as const,
    },
    {
      match: (path: string) => path.startsWith('/squads'),
      eyebrow: 'Governanca',
      title: 'Squads e Times',
      path: 'Organizacao / Squads',
      topBarVariant: 'compact' as const,
    },
    {
      match: (path: string) => path.startsWith('/catalog-graph'),
      eyebrow: 'Topologia',
      title: 'Mapa da Plataforma',
      path: 'Catalogo / Topologia',
      topBarVariant: 'compact' as const,
    },
    {
      match: (path: string) => path.startsWith('/catalog-import'),
      eyebrow: 'Cadastro',
      title: 'Registrar Componente',
      path: 'Catalogo / Registrar',
      topBarVariant: 'compact' as const,
    },
    {
      match: (path: string) => path === '/catalog',
      eyebrow: 'Catalogo',
      title: 'Todos os Componentes',
      path: 'Catalogo / Visao geral',
      topBarVariant: 'compact' as const,
    },
    {
      match: (path: string) => path.startsWith('/create'),
      eyebrow: 'Templates',
      title: 'Templates Oficiais',
      path: 'Templates / Criacao',
      topBarVariant: 'compact' as const,
    },
    {
      match: (path: string) => path === '/docs',
      eyebrow: 'TechDocs',
      title: 'Base de Conhecimento',
      path: 'Docs / TechDocs',
      topBarVariant: 'compact' as const,
    },
    {
      match: (path: string) => path.startsWith('/api-docs'),
      eyebrow: 'APIs',
      title: 'Contratos e Integracoes',
      path: 'APIs / Explorer',
      topBarVariant: 'compact' as const,
    },
    {
      match: (path: string) => path === '/settings',
      eyebrow: 'Configuracoes',
      title: 'Preferencias',
      path: 'Configuracoes / Preferencias',
      topBarVariant: 'compact' as const,
    },
  ];

  return (
    mappings.find(item => item.match(pathname)) ?? {
      eyebrow: 'SHIELD',
      title: 'Plataforma',
      path: 'SHIELD / Plataforma',
      topBarVariant: 'full',
    }
  );
};

const isItemActive = (pathname: string, to: string) => {
  if (to === '/') {
    return pathname === '/' || pathname === '/home';
  }

  return pathname === to || pathname.startsWith(`${to}/`);
};

type SidebarNavigationProps = {
  expanded: boolean;
  userEmail: string;
  userLabel: string;
  pathname: string;
  onToggle: () => void;
  onNavigate: () => void;
  onInteractionCue: () => void;
  onCloseMobile?: () => void;
  mobile: boolean;
};

const SidebarNavigation = ({
  expanded,
  userEmail,
  userLabel,
  pathname,
  onToggle,
  onNavigate,
  onInteractionCue,
  onCloseMobile,
  mobile,
}: SidebarNavigationProps) => {
  const classes = useStyles();
  let toggleIcon = <ChevronRightRoundedIcon />;
  let toggleAriaLabel = 'Expandir menu';

  if (mobile) {
    toggleIcon = <CloseRoundedIcon />;
    toggleAriaLabel = 'Fechar menu';
  } else if (expanded) {
    toggleIcon = <ChevronLeftRoundedIcon />;
    toggleAriaLabel = 'Recolher menu';
  }

  return (
    <div className={classes.sidebarInner}>
      <div
        className={`${classes.sidebarHeader} ${
          !expanded ? classes.sidebarHeaderCollapsed : ''
        }`}
      >
        <Link
          to="/"
          className={`${classes.logoLink} ${
            !expanded ? classes.logoLinkCollapsed : ''
          }`}
          aria-label="Home"
          onClick={() => {
            onNavigate();
            onCloseMobile?.();
          }}
        >
          {expanded ? <LogoFull /> : <LogoIcon />}
        </Link>

        <button
          type="button"
          className={classes.toggleButton}
          onClick={onToggle}
          onMouseEnter={onInteractionCue}
          onFocus={onInteractionCue}
          aria-label={toggleAriaLabel}
        >
          {toggleIcon}
        </button>
      </div>

      <div className={classes.navScrollArea}>
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div
            key={section.id}
            className={sectionIndex > 0 ? classes.sectionSpacer : classes.section}
          >
            {expanded ? <div className={classes.sectionTitle}>{section.title}</div> : null}
            <div className={classes.navList}>
              {section.items.map(item => {
                const active = isItemActive(pathname, item.to);
                const Icon = item.icon;
                const className = [
                  classes.navItem,
                  !expanded ? classes.navItemCollapsed : '',
                  active ? classes.navItemActive : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={className}
                    title={!expanded ? item.label : undefined}
                    aria-label={item.label}
                    onMouseEnter={onInteractionCue}
                    onFocus={onInteractionCue}
                    onClick={() => {
                      onNavigate();
                      onCloseMobile?.();
                    }}
                  >
                    <span className={classes.navIconWrap}>
                      <Icon fontSize="small" />
                    </span>
                    {expanded ? <span className={classes.navLabel}>{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className={classes.sidebarFooter}>
        <div className={classes.divider} />

        <div
          className={`${classes.userDock} ${
            !expanded ? classes.userDockCollapsed : ''
          }`}
        >
          <div
            className={`${classes.userBadge} ${
              !expanded ? classes.userBadgeCollapsed : ''
            }`}
            title={!expanded ? userLabel : undefined}
          >
            <UserSettingsSignInAvatar />
            {expanded ? (
              <div className={classes.userMeta}>
                <div className={classes.userLabel}>{userLabel}</div>
                <div className={classes.userHint}>{userEmail}</div>
              </div>
            ) : null}
          </div>

          {expanded ? (
            <Link
              to="/settings"
              className={classes.userAction}
              aria-label="Abrir configuracoes"
              onMouseEnter={onInteractionCue}
              onFocus={onInteractionCue}
              onClick={() => {
                onNavigate();
                onCloseMobile?.();
              }}
            >
              <ArrowForwardRoundedIcon fontSize="small" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const Root = ({ children }: PropsWithChildren<{}>) => {
  const classes = useStyles();
  const location = useLocation();
  const identityApi = useApi(identityApiRef);
  const isMobile = useMediaQuery(theme => theme.breakpoints.down('sm'));
  const { menuHoverSoundEnabled } = useMenuHoverSoundPreference();
  const [userEmail, setUserEmail] = useState('danylo.oliveira@useargo.com');
  const [userLabel, setUserLabel] = useState('Danylo Oliveira');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const triggerMenuHoverSound = useMenuHoverSound(menuHoverSoundEnabled);
  const pageMeta = getPageMeta(location.pathname);
  const compactTopBar = pageMeta.topBarVariant === 'compact';

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const profile = await identityApi.getProfileInfo();
        if (!active) {
          return;
        }

        setUserEmail(profile.email ?? 'danylo.oliveira@useargo.com');
        setUserLabel(profile.displayName ?? 'Danylo Oliveira');
      } catch {
        if (!active) {
          return;
        }

        setUserEmail('danylo.oliveira@useargo.com');
        setUserLabel('Danylo Oliveira');
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [identityApi]);

  useEffect(() => {
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile, location.pathname]);

  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile]);

  const desktopSidebarClassName = [
    classes.sidebar,
    sidebarExpanded ? classes.sidebarExpanded : '',
  ]
    .filter(Boolean)
    .join(' ');

  const mobileSidebarClassName = [
    classes.sidebar,
    classes.sidebarMobile,
    mobileSidebarOpen ? classes.sidebarMobileOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  const contentShellClassName = [
    classes.contentShell,
    isMobile ? classes.contentShellMobile : '',
    !isMobile && sidebarExpanded ? classes.contentShellExpanded : '',
  ]
    .filter(Boolean)
    .join(' ');
  let topBarToggleIcon = <MenuRoundedIcon />;
  let topBarToggleAriaLabel = 'Abrir menu lateral';

  if (isMobile) {
    topBarToggleIcon = mobileSidebarOpen ? (
      <CloseRoundedIcon />
    ) : (
      <MenuRoundedIcon />
    );
    topBarToggleAriaLabel = mobileSidebarOpen
      ? 'Fechar menu lateral'
      : 'Abrir menu lateral';
  }

  const handleTopBarToggle = () => {
    if (isMobile) {
      setMobileSidebarOpen(previous => !previous);
      return;
    }

    setSidebarExpanded(previous => !previous);
  };

  const handleSidebarNavigate = useMemo(
    () => () => {
      if (isMobile) {
        setMobileSidebarOpen(false);
      }
    },
    [isMobile],
  );

  return (
    <div className={classes.appFrame}>
      {!isMobile ? (
        <aside className={desktopSidebarClassName}>
          <SidebarNavigation
            expanded={sidebarExpanded}
            userEmail={userEmail}
            userLabel={userLabel}
            pathname={location.pathname}
            onToggle={() => setSidebarExpanded(previous => !previous)}
            onNavigate={handleSidebarNavigate}
            onInteractionCue={triggerMenuHoverSound}
            mobile={false}
          />
        </aside>
      ) : (
        <>
          {mobileSidebarOpen ? (
            <button
              type="button"
              className={classes.backdrop}
              aria-label="Fechar menu"
              onClick={() => setMobileSidebarOpen(false)}
            />
          ) : null}
          <aside className={mobileSidebarClassName}>
            <SidebarNavigation
              expanded
              userEmail={userEmail}
              userLabel={userLabel}
              pathname={location.pathname}
              onToggle={() => setMobileSidebarOpen(false)}
              onNavigate={handleSidebarNavigate}
              onInteractionCue={triggerMenuHoverSound}
              onCloseMobile={() => setMobileSidebarOpen(false)}
              mobile
            />
          </aside>
        </>
      )}

      <div className={contentShellClassName}>
        <div className={classes.topBar}>
          <div className={classes.topBarLead}>
            {isMobile ? (
              <button
                type="button"
                className={classes.topBarMenuButton}
                onClick={handleTopBarToggle}
                onMouseEnter={triggerMenuHoverSound}
                onFocus={triggerMenuHoverSound}
                aria-label={topBarToggleAriaLabel}
              >
                {topBarToggleIcon}
              </button>
            ) : null}
            <div
              className={`${classes.topBarMeta} ${
                compactTopBar ? classes.topBarMetaCompact : ''
              }`}
            >
              <div className={classes.topBarEyebrow}>{pageMeta.eyebrow}</div>
              {!compactTopBar ? (
                <div className={classes.topBarTitle}>{pageMeta.title}</div>
              ) : null}
              <div
                className={`${classes.topBarPath} ${
                  compactTopBar ? classes.topBarPathCompact : ''
                }`}
              >
                {compactTopBar ? 'Navegacao ativa: ' : 'Caminho atual: '}
                <span className={classes.topBarPathStrong}>{pageMeta.path}</span>
              </div>
            </div>
          </div>

          <div className={classes.topBarActions}>
            <div className={classes.topBarPill}>
              <span className={classes.topBarDot} />
              Plataforma ativa
            </div>
            <div className={classes.topBarAvatarButton}>
              <UserSettingsSignInAvatar />
            </div>
          </div>
        </div>
        <div className={classes.pageBody}>{children}</div>
      </div>
    </div>
  );
};
