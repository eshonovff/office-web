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
  ns: [
    defaultNS,
    'auth',
    'customerAuth',
    'validation',
    'users',
    'roles',
    'navigation',
    'projects',
    'board',
    'inbox',
    'notifications',
    'dashboard',
    'instagramAutomation',
    'automations',
    'flows',
  ],
  detection: {
    order: ['localStorage'],
    caches: ['localStorage'],
    lookupLocalStorage: languageStorageKey,
  },
};
