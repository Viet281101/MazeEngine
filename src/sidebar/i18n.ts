import en from './locales/en.json';

const LANGUAGE_STORAGE_KEY = 'maze_solver_3d_language';

export const SUPPORTED_LANGUAGES = ['vi', 'en', 'fr'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type TranslationKey = keyof typeof en;

type TranslationMap = Record<TranslationKey, string>;

const localeCache = new Map<AppLanguage, TranslationMap>([['en', en as TranslationMap]]);
const pendingLoads = new Map<AppLanguage, Promise<TranslationMap>>();
let activeTranslations: TranslationMap = en as TranslationMap;

const listeners = new Set<() => void>();
let languageSwitchVersion = 0;

function isLanguage(value: string): value is AppLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function detectInitialLanguage(): AppLanguage {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && isLanguage(saved)) {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read saved language:', error);
  }

  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith('vi')) {
    return 'vi';
  }
  if (browserLanguage.startsWith('fr')) {
    return 'fr';
  }
  return 'en';
}

let currentLanguage: AppLanguage = detectInitialLanguage();

export function t(key: TranslationKey): string {
  const selected = activeTranslations[key];
  if (selected) {
    return selected;
  }
  return (en as TranslationMap)[key];
}

export function getLanguage(): AppLanguage {
  return currentLanguage;
}

async function loadLanguagePack(language: AppLanguage): Promise<TranslationMap> {
  const cached = localeCache.get(language);
  if (cached) {
    return cached;
  }
  const pending = pendingLoads.get(language);
  if (pending) {
    return pending;
  }

  const loadPromise = (async () => {
    let loaded: TranslationMap;
    switch (language) {
      case 'vi': {
        const module = await import('./locales/vi.json');
        loaded = module.default as TranslationMap;
        break;
      }
      case 'fr': {
        const module = await import('./locales/fr.json');
        loaded = module.default as TranslationMap;
        break;
      }
      case 'en':
      default: {
        loaded = en as TranslationMap;
        break;
      }
    }
    localeCache.set(language, loaded);
    return loaded;
  })();

  pendingLoads.set(language, loadPromise);
  try {
    return await loadPromise;
  } finally {
    pendingLoads.delete(language);
  }
}

function notifyLanguageChange(): void {
  listeners.forEach(listener => listener());
}

export async function initializeI18n(): Promise<void> {
  if (currentLanguage === 'en') {
    activeTranslations = en as TranslationMap;
    return;
  }

  const version = ++languageSwitchVersion;
  const loaded = await loadLanguagePack(currentLanguage);
  if (version !== languageSwitchVersion) {
    return;
  }
  activeTranslations = loaded;
}

export async function setLanguage(language: AppLanguage): Promise<void> {
  if (currentLanguage === language && localeCache.has(language)) {
    return;
  }
  const version = ++languageSwitchVersion;
  const loaded = await loadLanguagePack(language);
  if (version !== languageSwitchVersion) {
    return;
  }
  currentLanguage = language;
  activeTranslations = loaded;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language:', error);
  }
  notifyLanguageChange();
}

export async function prefetchLanguage(language: AppLanguage): Promise<void> {
  if (language === currentLanguage && localeCache.has(language)) {
    return;
  }
  await loadLanguagePack(language);
}

export function subscribeLanguageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
