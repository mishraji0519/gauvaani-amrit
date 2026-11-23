// Light / dark preference shared by the login page and the dashboard.
// "auto" = follow the device setting (nothing stored). Choosing light or dark stores it.

const KEY = 'ga_theme';
export type ThemePref = 'light' | 'dark' | 'auto';

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function writeThemePref(p: ThemePref) {
  try {
    if (p === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch {
    /* storage blocked */
  }
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export const resolveDark = (p: ThemePref) => (p === 'auto' ? systemPrefersDark() : p === 'dark');
export const getInitialDark = () => resolveDark(readThemePref());
