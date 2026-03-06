import en from './locales/en.json';
import solveInsightsEn from './locales/solve-insights-en.json';

const LANGUAGE_STORAGE_KEY = 'maze_solver_3d_language';

export const SUPPORTED_LANGUAGES = ['vi', 'en', 'fr'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type TranslationKey = keyof typeof en;

type TranslationMap = Record<TranslationKey, string>;
export type SolveInsightsDataset = typeof solveInsightsEn;

const localeCache = new Map<AppLanguage, TranslationMap>([['en', en as TranslationMap]]);
const pendingLoads = new Map<AppLanguage, Promise<TranslationMap>>();
let activeTranslations: TranslationMap = en as TranslationMap;
const solveInsightsCache = new Map<AppLanguage, SolveInsightsDataset>([
  ['en', solveInsightsEn as SolveInsightsDataset],
]);
const pendingSolveInsightsLoads = new Map<AppLanguage, Promise<SolveInsightsDataset>>();
let activeSolveInsights: SolveInsightsDataset = solveInsightsEn as SolveInsightsDataset;

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

async function loadSolveInsights(language: AppLanguage): Promise<SolveInsightsDataset> {
  const cached = solveInsightsCache.get(language);
  if (cached) {
    return cached;
  }
  const pending = pendingSolveInsightsLoads.get(language);
  if (pending) {
    return pending;
  }

  const loadPromise = (async () => {
    let loaded: SolveInsightsDataset;
    switch (language) {
      case 'vi': {
        const module = await import('./locales/solve-insights-vi.json');
        loaded = module.default as SolveInsightsDataset;
        break;
      }
      case 'fr': {
        const module = await import('./locales/solve-insights-fr.json');
        loaded = module.default as SolveInsightsDataset;
        break;
      }
      case 'en':
      default: {
        loaded = solveInsightsEn as SolveInsightsDataset;
        break;
      }
    }
    solveInsightsCache.set(language, loaded);
    return loaded;
  })();

  pendingSolveInsightsLoads.set(language, loadPromise);
  try {
    return await loadPromise;
  } finally {
    pendingSolveInsightsLoads.delete(language);
  }
}

function notifyLanguageChange(): void {
  listeners.forEach(listener => listener());
}

export async function initializeI18n(): Promise<void> {
  if (currentLanguage === 'en') {
    activeTranslations = en as TranslationMap;
    activeSolveInsights = solveInsightsEn as SolveInsightsDataset;
    return;
  }

  const version = ++languageSwitchVersion;
  const [loaded, loadedSolveInsights] = await Promise.all([
    loadLanguagePack(currentLanguage),
    loadSolveInsights(currentLanguage),
  ]);
  if (version !== languageSwitchVersion) {
    return;
  }
  activeTranslations = loaded;
  activeSolveInsights = loadedSolveInsights;
}

export async function setLanguage(language: AppLanguage): Promise<void> {
  if (
    currentLanguage === language &&
    localeCache.has(language) &&
    solveInsightsCache.has(language)
  ) {
    return;
  }
  const version = ++languageSwitchVersion;
  const [loaded, loadedSolveInsights] = await Promise.all([
    loadLanguagePack(language),
    loadSolveInsights(language),
  ]);
  if (version !== languageSwitchVersion) {
    return;
  }
  currentLanguage = language;
  activeTranslations = loaded;
  activeSolveInsights = loadedSolveInsights;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language:', error);
  }
  notifyLanguageChange();
}

export async function prefetchLanguage(language: AppLanguage): Promise<void> {
  if (
    language === currentLanguage &&
    localeCache.has(language) &&
    solveInsightsCache.has(language)
  ) {
    return;
  }
  await Promise.all([loadLanguagePack(language), loadSolveInsights(language)]);
}

export function getSolveInsights(): SolveInsightsDataset {
  return activeSolveInsights;
}

export function subscribeLanguageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
