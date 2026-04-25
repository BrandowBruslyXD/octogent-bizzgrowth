import { useEffect, useRef, useState } from "react";

import { buildDeckVaultFileUrl } from "../../runtime/runtimeEndpoints";

// Tres estados visuales por tool:
// - idle:    el archivo aún no existe (gris/desaturado).
// - done:    el archivo existe pero no cambió en la ventana reciente
//            (color sólido sin animación: fase ya completada).
// - current: el archivo cambió en los últimos CURRENT_WINDOW_MS y es el
//            más reciente de las 4 tools (pulse + glow: fase corriendo
//            ahora). Solo UNA puede estar "current" a la vez.
type ConsultorToolState = "idle" | "done" | "current";

const TOOL_FILES: Record<string, string> = {
  "consultor-entrevistador": "interview.json",
  "consultor-analista": "current-flow.md",
  "consultor-arquitecto": "ideal-flow.md",
  "consultor-comercial": "propuesta.md",
};

const POLL_INTERVAL_MS = 4000;
// Después de un cambio detectado, la tool se marca "current" por esta
// ventana. Pasada la ventana baja a "done". 30s es suficiente para que
// el orquestador termine de escribir un archivo grande sin que parpadee
// y para que el operador note el pulse antes de que se apague.
const CURRENT_WINDOW_MS = 30_000;

type Snapshot = { size: number; head: string; lastChangedAt: number };

const fingerprint = (content: string): { size: number; head: string } => ({
  size: content.length,
  // Primeros 200 chars son suficientes para detectar reescrituras del
  // orquestador sin necesidad de hashing real (los archivos de output
  // tienen secciones cambiantes en el inicio: phase tag, fecha, etc).
  head: content.slice(0, 200),
});

export const useConsultorActiveTools = (enabled: boolean): Map<string, ConsultorToolState> => {
  const [tools, setTools] = useState<Map<string, ConsultorToolState>>(() => new Map());
  const snapshotsRef = useRef<Map<string, Snapshot>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setTools(new Map());
      snapshotsRef.current = new Map();
      return;
    }

    let aborted = false;
    const controller = new AbortController();

    const checkAll = async () => {
      const present = new Map<string, Snapshot>();
      await Promise.all(
        Object.entries(TOOL_FILES).map(async ([tentacleId, fileName]) => {
          try {
            const url = buildDeckVaultFileUrl(tentacleId, fileName);
            const response = await fetch(url, {
              method: "GET",
              signal: controller.signal,
            });
            if (!response.ok) return;
            const content = await response.text();
            const fp = fingerprint(content);
            const prev = snapshotsRef.current.get(tentacleId);
            const lastChangedAt =
              !prev || prev.size !== fp.size || prev.head !== fp.head
                ? Date.now()
                : prev.lastChangedAt;
            present.set(tentacleId, { ...fp, lastChangedAt });
          } catch {
            // signal abort u otro error de red: ignorar este ciclo
          }
        }),
      );
      if (aborted) return;

      // Sincronizar refs con archivos presentes (los que dejaron de
      // existir se eliminan del cache de snapshots).
      const nextSnapshots = new Map<string, Snapshot>();
      for (const [id, snap] of present) nextSnapshots.set(id, snap);
      snapshotsRef.current = nextSnapshots;

      // El más reciente dentro de la ventana es el "current".
      const now = Date.now();
      let currentId: string | null = null;
      let currentTs = 0;
      for (const [id, snap] of present) {
        if (now - snap.lastChangedAt < CURRENT_WINDOW_MS && snap.lastChangedAt > currentTs) {
          currentTs = snap.lastChangedAt;
          currentId = id;
        }
      }

      const next = new Map<string, ConsultorToolState>();
      for (const tentacleId of Object.keys(TOOL_FILES)) {
        if (!present.has(tentacleId)) {
          next.set(tentacleId, "idle");
        } else if (tentacleId === currentId) {
          next.set(tentacleId, "current");
        } else {
          next.set(tentacleId, "done");
        }
      }

      setTools((prev) => {
        if (prev.size === next.size) {
          let same = true;
          for (const [k, v] of next) {
            if (prev.get(k) !== v) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return next;
      });
    };

    void checkAll();
    const interval = window.setInterval(() => {
      void checkAll();
    }, POLL_INTERVAL_MS);

    return () => {
      aborted = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [enabled]);

  return tools;
};
