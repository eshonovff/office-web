import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import { i18nConfig } from "~/lib/i18n";

async function hydrate() {
  await i18next
    .use(initReactI18next)
    .use(Backend)
    .init({
      ...i18nConfig,
      backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
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
