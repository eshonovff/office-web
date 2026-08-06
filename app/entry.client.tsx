import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { i18nConfig } from "~/lib/i18n";

async function hydrate() {
  await i18next
    .use(initReactI18next)
    .use(Backend)
    .use(LanguageDetector)
    .init({
      ...i18nConfig,
      backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
    });

  document.documentElement.lang = i18next.language;
  i18next.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
  });

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
}

hydrate();
