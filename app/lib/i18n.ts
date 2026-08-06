export const defaultNS = "common";
export const fallbackLng = "tg";
export const supportedLngs = ["tg"] as const;

export type SupportedLng = (typeof supportedLngs)[number];

export const i18nConfig = {
  supportedLngs,
  fallbackLng,
  lng: fallbackLng,
  defaultNS,
  fallbackNS: defaultNS,
  ns: [defaultNS],
};
