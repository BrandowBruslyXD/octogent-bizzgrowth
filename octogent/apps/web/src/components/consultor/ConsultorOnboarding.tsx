import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "octogent.consultor.onboardingDismissedAt";

type ConsultorOnboardingProps = {
  // Cuando isFirstRun es true (no hay archivos de output todavía y el
  // operador nunca cerró el onboarding) mostramos la guía. El componente
  // se auto-oculta tras dismiss y queda persistido en localStorage.
  isFirstRun: boolean;
};

const wasDismissed = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
};

export const ConsultorOnboarding = ({ isFirstRun }: ConsultorOnboardingProps) => {
  const [dismissed, setDismissed] = useState<boolean>(wasDismissed);

  // localStorage se evalúa una sola vez al montar; si el operador cambia
  // la flag desde otro tab, no propagamos.
  useEffect(() => {
    if (!dismissed) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage puede estar bloqueado (modo privado); aceptamos que
      // el onboarding reaparezca en la próxima sesión.
    }
  }, [dismissed]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (dismissed || !isFirstRun) return null;

  return (
    // biome-ignore lint/a11y/useSemanticElements: usamos <aside role="dialog"> en vez de <dialog> nativo porque el modal queda dentro del flujo del Canvas (no top-layer) y necesitamos que respete el contenedor
    <aside className="consultor-onboarding" role="dialog" aria-label="Cómo empezar">
      <header className="consultor-onboarding__header">
        <span className="consultor-onboarding__kicker">Bienvenida a tu Consultor IA</span>
        <h2 className="consultor-onboarding__title">¿Cómo funciona?</h2>
      </header>
      <ol className="consultor-onboarding__steps">
        <li>
          <strong>Andá al chat de la derecha.</strong> Es el Octoboss — tu consultor digital. Te va
          a hacer preguntas sobre el negocio del prospecto.
        </li>
        <li>
          <strong>Respondé natural.</strong> Pasa por 4 fases: entrevista, análisis del flujo
          actual, diseño del flujo ideal, y propuesta comercial. Vos solo conversás.
        </li>
        <li>
          <strong>Mirá los pulpos del canvas.</strong> Cada uno representa una fase. El que está
          brillando con halo amarillo es la fase corriendo en este momento.
        </li>
        <li>
          <strong>Cuando termine, descargá la propuesta.</strong> Aparece un botón arriba a la
          derecha del chat con la propuesta lista en formato Word.
        </li>
        <li>
          <strong>Para entrevistar a otro prospecto</strong>, usá "Nuevo prospecto" arriba a la
          derecha. Borra el flujo anterior y empezás fresco.
        </li>
      </ol>
      <button
        type="button"
        className="consultor-onboarding__cta"
        onClick={handleDismiss}
        // biome-ignore lint/a11y/noAutofocus: el onboarding es un modal de única acción ("Entendido"); enfocar el botón al montar reduce fricción para usuarios de teclado y screenreader anuncia el dialog
        autoFocus
      >
        Entendido — empezar
      </button>
    </aside>
  );
};
