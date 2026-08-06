import { useEffect, useState } from "react";

const splashHints = [
  "Омода кардани муҳити кор…",
  "Санҷидани сессия…",
  "Боркунии таскҳо…",
  "Тайёр аст, чароғҳоро равшан мекунем…",
];

// Rendered by React Router as `HydrateFallback` (see app/root.tsx) in place of
// the app while the initial route tree's clientLoaders and lazy chunks are
// still loading — the framework swaps it out for the real page automatically
// once everything is ready, so there's no manual navigation/CSS-readiness
// tracking needed here.
export function Splash() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % splashHints.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div id="app-splash">
      <div className="splash-content">
        <p className="splash-logo">
          Office<span>.nizom</span>
        </p>
        <div className="splash-loader" />
        <p className="splash-hint" key={index}>
          {splashHints[index]}
        </p>
      </div>
    </div>
  );
}
