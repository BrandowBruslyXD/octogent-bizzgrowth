import { useCallback, useState } from "react";

import {
  type ArtifactDownloadFormat,
  downloadPropuesta,
  resetConsultorOutputs,
} from "./artifactDownload";

type ConsultorPropuestaButtonProps = {
  // Visible solo cuando la tool consultor-comercial publicó propuesta.md.
  // El polling vive en useConsultorActiveTools y se inyecta vía esta prop.
  isActive: boolean;
  // Callback para reiniciar el flujo: el componente borra los 4 archivos
  // de output y delega a este handler la limpieza adicional (cerrar el
  // terminal viejo del Octoboss y disparar bootstrap del nuevo).
  onReset?: () => void;
};

export const ConsultorPropuestaButton = ({ isActive, onReset }: ConsultorPropuestaButtonProps) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleDownload = useCallback(async (format: ArtifactDownloadFormat) => {
    setBusy(true);
    setError(null);
    try {
      const ok = await downloadPropuesta(format);
      if (!ok) setError("No se pudo leer propuesta.md");
    } catch {
      setError("Error al descargar");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleReset = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await resetConsultorOutputs();
      onReset?.();
      setConfirmingReset(false);
    } catch {
      setError("Error al reiniciar el flujo");
    } finally {
      setBusy(false);
    }
  }, [onReset]);

  // Botón visible incluso sin propuesta para permitir reset cuando hay
  // archivos viejos pero el flujo está en estado intermedio.
  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> rompe el layout flex; role="group" es intencional para agrupar las acciones del consultor sin recompose visual
    <div className="consultor-propuesta-download" role="group" aria-label="Acciones del consultor">
      {isActive ? (
        <>
          <button
            type="button"
            className="consultor-propuesta-download__btn consultor-propuesta-download__btn--primary"
            onClick={() => void handleDownload("word")}
            disabled={busy}
            title="Word / Google Docs lo abren como documento; guardalo como .docx desde ahí"
          >
            {busy ? "Trabajando…" : "Descargar propuesta (.doc)"}
          </button>
          <button
            type="button"
            className="consultor-propuesta-download__btn"
            onClick={() => void handleDownload("markdown")}
            disabled={busy}
          >
            .md
          </button>
        </>
      ) : null}
      {confirmingReset ? (
        <>
          <span className="consultor-propuesta-download__warning">¿Empezar nuevo prospecto?</span>
          <button
            type="button"
            className="consultor-propuesta-download__btn consultor-propuesta-download__btn--danger"
            onClick={() => void handleReset()}
            disabled={busy}
          >
            Sí, reiniciar
          </button>
          <button
            type="button"
            className="consultor-propuesta-download__btn"
            onClick={() => setConfirmingReset(false)}
            disabled={busy}
          >
            Cancelar
          </button>
        </>
      ) : (
        <button
          type="button"
          className="consultor-propuesta-download__btn"
          onClick={() => setConfirmingReset(true)}
          disabled={busy}
          title="Borra los archivos del flujo actual y empezás a entrevistar a otro prospecto"
        >
          Nuevo prospecto
        </button>
      )}
      {error ? <span className="consultor-propuesta-download__error">{error}</span> : null}
    </div>
  );
};
