import { useEffect, useState } from 'react';

const MENU_HOVER_SOUND_STORAGE_KEY = 'shield.menuHoverSoundEnabled';
const MENU_HOVER_SOUND_EVENT = 'shield:menu-hover-sound-changed';
const DEFAULT_MENU_HOVER_SOUND_ENABLED = true;

const canUseBrowserStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const readMenuHoverSoundEnabled = () => {
  if (!canUseBrowserStorage()) {
    return DEFAULT_MENU_HOVER_SOUND_ENABLED;
  }

  try {
    const storedValue = window.localStorage.getItem(MENU_HOVER_SOUND_STORAGE_KEY);

    if (storedValue === null) {
      return DEFAULT_MENU_HOVER_SOUND_ENABLED;
    }

    return storedValue !== 'false';
  } catch {
    return DEFAULT_MENU_HOVER_SOUND_ENABLED;
  }
};

export const writeMenuHoverSoundEnabled = (enabled: boolean) => {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(MENU_HOVER_SOUND_STORAGE_KEY, String(enabled));
  } catch {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<boolean>(MENU_HOVER_SOUND_EVENT, {
      detail: enabled,
    }),
  );
};

export const useMenuHoverSoundPreference = () => {
  const [menuHoverSoundEnabled, setMenuHoverSoundEnabledState] = useState(
    readMenuHoverSoundEnabled,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncFromStorage = () => {
      setMenuHoverSoundEnabledState(readMenuHoverSoundEnabled());
    };

    const handlePreferenceChange = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;

      if (typeof customEvent.detail === 'boolean') {
        setMenuHoverSoundEnabledState(customEvent.detail);
        return;
      }

      syncFromStorage();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== MENU_HOVER_SOUND_STORAGE_KEY) {
        return;
      }

      syncFromStorage();
    };

    window.addEventListener(MENU_HOVER_SOUND_EVENT, handlePreferenceChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(MENU_HOVER_SOUND_EVENT, handlePreferenceChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setMenuHoverSoundEnabled = (enabled: boolean) => {
    setMenuHoverSoundEnabledState(enabled);
    writeMenuHoverSoundEnabled(enabled);
  };

  return {
    menuHoverSoundEnabled,
    setMenuHoverSoundEnabled,
  };
};
