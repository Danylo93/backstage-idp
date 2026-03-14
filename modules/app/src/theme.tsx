import { PropsWithChildren } from 'react';
import {
  UnifiedThemeProvider,
  createUnifiedTheme,
  genPageTheme,
} from '@backstage/theme';

const createShieldPalette = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';

  return {
    type: mode,
    mode,
    primary: {
      main: isDark ? '#63a8ff' : '#0e63cc',
      dark: isDark ? '#3f8ff6' : '#094eaa',
      light: isDark ? '#8ec2ff' : '#4f8fe0',
      contrastText: isDark ? '#03101f' : '#f8fbff',
    },
    secondary: {
      main: isDark ? '#7db8e8' : '#0a1e35',
    },
    error: {
      main: isDark ? '#ff8a80' : '#b42318',
    },
    warning: {
      main: isDark ? '#efb23c' : '#ef9f14',
    },
    info: {
      main: isDark ? '#63a8ff' : '#0e63cc',
    },
    success: {
      main: isDark ? '#59d98e' : '#24b15a',
    },
    background: {
      default: isDark ? '#07111d' : '#f2f5fb',
      paper: isDark ? '#0d1726' : '#ffffff',
    },
    text: {
      primary: isDark ? '#eef5ff' : '#0f1729',
      secondary: isDark ? '#a7b6cc' : '#67748b',
    },
    textContrast: isDark ? '#eef5ff' : '#0f1729',
    textVerySubtle: isDark ? '#324154' : '#d7deea',
    textSubtle: isDark ? '#8ea3c4' : '#6b7a90',
    link: isDark ? '#8ec2ff' : '#0e63cc',
    linkHover: isDark ? '#b2d8ff' : '#0a4ea8',
    border: isDark ? '#1d2b3d' : '#d9e2ef',
    highlight: isDark ? '#22344d' : '#fff5c2',
    errorBackground: isDark ? '#3a1717' : '#fbe8e7',
    warningBackground: isDark ? '#4a3510' : '#fff1cf',
    infoBackground: isDark ? '#112746' : '#dcecff',
    errorText: isDark ? '#ffb4ac' : '#8c1d18',
    warningText: isDark ? '#ffd995' : '#7b4d00',
    infoText: isDark ? '#cfe5ff' : '#0a4e8a',
    gold: '#ffd24d',
    status: {
      ok: isDark ? '#59d98e' : '#24b15a',
      warning: isDark ? '#efb23c' : '#ef9f14',
      error: isDark ? '#ff8a80' : '#b42318',
      running: isDark ? '#63a8ff' : '#0e63cc',
      pending: isDark ? '#ffd24d' : '#ffdb5c',
      aborted: isDark ? '#7f8ea3' : '#8b98ab',
    },
    bursts: {
      fontColor: '#f8fbff',
      slackChannelText: '#d7deea',
      backgroundColor: {
        default: isDark ? '#123054' : '#0e63cc',
      },
      gradient: {
        linear: isDark
          ? 'linear-gradient(-137deg, #2e5b8f 0%, #0d1726 100%)'
          : 'linear-gradient(-137deg, #4ea5c2 0%, #0e63cc 100%)',
      },
    },
    banner: {
      info: isDark ? '#112746' : '#dcecff',
      error: isDark ? '#3a1717' : '#fbe8e7',
      warning: isDark ? '#4a3510' : '#fff1cf',
      text: isDark ? '#eef5ff' : '#0f1729',
      link: isDark ? '#8ec2ff' : '#0e63cc',
      closeButtonColor: isDark ? '#eef5ff' : '#0f1729',
    },
    navigation: {
      background: isDark ? '#030d19' : '#05172d',
      indicator: isDark ? '#63a8ff' : '#0e63cc',
      color: isDark ? '#8ea3c4' : '#9fb2cc',
      selectedColor: '#ffffff',
      navItem: {
        hoverBackground: isDark
          ? 'rgba(99, 168, 255, 0.16)'
          : 'rgba(27, 118, 222, 0.14)',
      },
      submenu: {
        background: isDark ? '#081423' : '#071e37',
      },
    },
    pinSidebarButton: {
      icon: isDark ? '#d7deea' : '#05172d',
      background: isDark ? '#22344d' : '#d9e2ef',
    },
    tabbar: {
      indicator: isDark ? '#63a8ff' : '#0e63cc',
    },
  };
};

const pageThemes = {
  home: genPageTheme({
    colors: ['#0e63cc', '#4ea5c2'],
    shape: 'wave',
  }),
  documentation: genPageTheme({
    colors: ['#0e63cc', '#7db8e8'],
    shape: 'wave',
  }),
  tool: genPageTheme({
    colors: ['#0e63cc', '#7db8e8'],
    shape: 'wave',
  }),
  service: genPageTheme({
    colors: ['#0e63cc', '#7db8e8'],
    shape: 'wave',
  }),
  website: genPageTheme({
    colors: ['#0e63cc', '#7db8e8'],
    shape: 'wave',
  }),
  library: genPageTheme({
    colors: ['#0e63cc', '#7db8e8'],
    shape: 'wave',
  }),
  other: genPageTheme({
    colors: ['#0e63cc', '#7db8e8'],
    shape: 'wave',
  }),
  app: genPageTheme({
    colors: ['#0e63cc', '#7db8e8'],
    shape: 'wave',
  }),
  apis: genPageTheme({
    colors: ['#0e63cc', '#7db8e8'],
    shape: 'wave',
  }),
};

const shieldLightTheme = createUnifiedTheme({
  defaultPageTheme: 'home',
  palette: createShieldPalette('light'),
  typography: {
    htmlFontSize: 16,
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 52,
      fontWeight: 700,
      marginBottom: 16,
    },
    h2: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 40,
      fontWeight: 700,
      marginBottom: 14,
    },
    h3: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 34,
      fontWeight: 700,
      marginBottom: 12,
    },
    h4: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 28,
      fontWeight: 700,
      marginBottom: 10,
    },
    h5: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 22,
      fontWeight: 700,
      marginBottom: 10,
    },
    h6: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 8,
    },
  },
  pageTheme: pageThemes,
});

const shieldDarkTheme = createUnifiedTheme({
  defaultPageTheme: 'home',
  palette: createShieldPalette('dark'),
  typography: {
    htmlFontSize: 16,
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 52,
      fontWeight: 700,
      marginBottom: 16,
    },
    h2: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 40,
      fontWeight: 700,
      marginBottom: 14,
    },
    h3: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 34,
      fontWeight: 700,
      marginBottom: 12,
    },
    h4: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 28,
      fontWeight: 700,
      marginBottom: 10,
    },
    h5: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 22,
      fontWeight: 700,
      marginBottom: 10,
    },
    h6: {
      fontFamily: '"Space Grotesk", "Inter", sans-serif',
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 8,
    },
  },
  pageTheme: pageThemes,
});

const LightThemeProvider = ({ children }: PropsWithChildren<{}>) => (
  <UnifiedThemeProvider theme={shieldLightTheme}>{children}</UnifiedThemeProvider>
);

const DarkThemeProvider = ({ children }: PropsWithChildren<{}>) => (
  <UnifiedThemeProvider theme={shieldDarkTheme}>{children}</UnifiedThemeProvider>
);

export const shieldThemes = [
  {
    id: 'shield-light',
    title: 'SHIELD Claro',
    variant: 'light' as const,
    Provider: LightThemeProvider,
  },
  {
    id: 'shield-dark',
    title: 'SHIELD Escuro',
    variant: 'dark' as const,
    Provider: DarkThemeProvider,
  },
];
