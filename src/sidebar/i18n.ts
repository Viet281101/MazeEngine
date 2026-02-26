import en from './locales/en.json';
import fr from './locales/fr.json';
import vi from './locales/vi.json';

const LANGUAGE_STORAGE_KEY = 'maze_solver_3d_language';

export const SUPPORTED_LANGUAGES = ['vi', 'en', 'fr'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type TranslationKey = keyof typeof en;

type TranslationMap = Record<TranslationKey, string>;

const translations: Record<AppLanguage, TranslationMap> = {
  vi: vi as TranslationMap,
  en: en as TranslationMap,
  fr: fr as TranslationMap,
};

const listeners = new Set<() => void>();

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
  const selected = translations[currentLanguage][key];
  if (selected) {
    return selected;
  }
  return translations.en[key];
}

export function getLanguage(): AppLanguage {
  return currentLanguage;
}

export function setLanguage(language: AppLanguage): void {
  if (currentLanguage === language) {
    return;
  }
  currentLanguage = language;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to save language:', error);
  }
  listeners.forEach(listener => listener());
}

export function subscribeLanguageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
