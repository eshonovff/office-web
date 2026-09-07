export const defaultNS = 'common';
export const fallbackLng = 'tg';
export const supportedLngs = ['tg', 'ru'] as const;
export const languageStorageKey = 'i18nextLng';

export type SupportedLng = (typeof supportedLngs)[number];

export const i18nConfig = {
  supportedLngs,
  fallbackLng,
  defaultNS,
  fallbackNS: defaultNS,
  ns: [defaultNS, 'auth', 'validation', 'users', 'roles', 'navigation', 'projects', 'board', 'inbox', 'notifications', 'dashboard'],
  detection: {
    order: ['localStorage'],
    caches: ['localStorage'],
    lookupLocalStorage: languageStorageKey,
  },
};
