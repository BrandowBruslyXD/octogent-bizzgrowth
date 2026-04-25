import { useEffect, useRef } from "react";

import {
  buildDeckTentaclesUrl,
  buildTerminalSnapshotsUrl,
  buildTerminalUrl,
  buildTerminalsUrl,
} from "../../runtime/runtimeEndpoints";

const OCTOBOSS_TENTACLE_ID = "__octoboss__";
const ORQUESTADOR_PROMPT_TEMPLATE = "octoboss-consultor-orquestador";

type ConsultorAgent = {
  name: string;
  description: string;
  color: string;
};

const CONSULTOR_AGENTS: ConsultorAgent[] = [
  {
    name: "consultor-entrevistador",
    description:
      "Fase 1: el orquestador escribe acá interview.json con el resultado de la entrevista al prospecto.",
    color: "#ffd166",
  },
  {
    name: "consultor-analista",
    description:
      "Fase 2: el orquestador escribe acá current-flow.json y current-flow.md con el mapa del flujo actual.",
    color: "#ff9f1c",
  },
  {
    name: "consultor-arquitecto",
    description:
      "Fase 3: el orquestador escribe acá ideal-flow.json y ideal-flow.md con el diseño automatizado.",
    color: "#ef476f",
  },
  {
    name: "consultor-comercial",
    description:
      "Fase 4: el orquestador escribe acá propuesta.md, el entregable final para el cliente.",
    color: "#06d6a0",
  },
];

type DeckTentacleSummaryResponse = {
  tentacleId?: unknown;
};

type DeckTentaclesListResponse = {
  tentacles?: DeckTentacleSummaryResponse[];
};

type TerminalSnapshotResponse = {
  terminalId?: unknown;
  tentacleId?: unknown;
  initialPrompt?: unknown;
  createdAt?: unknown;
};

const fetchExistingTentacleNames = async (signal?: AbortSignal): Promise<Set<string>> => {
  const requestInit: RequestInit = {
    method: "GET",
    headers: { Accept: "application/json" },
  };
  if (signal) {
    requestInit.signal = signal;
  }
  const response = await fetch(buildDeckTentaclesUrl(), requestInit);
  if (!response.ok) {
    throw new Error(`Unable to list tentacles: HTTP ${response.status}`);
  }
  const payload = (await response.json()) as
    | DeckTentaclesListResponse
    | DeckTentacleSummaryResponse[];
  const list = Array.isArray(payload) ? payload : (payload?.tentacles ?? []);
  const names = new Set<string>();
  for (const entry of list) {
    if (entry && typeof entry.tentacleId === "string") {
      names.add(entry.tentacleId);
    }
  }
  return names;
};

const createTentacle = async (agent: ConsultorAgent, signal?: AbortSignal): Promise<void> => {
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: agent.name,
      description: agent.description,
      color: agent.color,
    }),
  };
  if (signal) {
    requestInit.signal = signal;
  }
  const response = await fetch(buildDeckTentaclesUrl(), requestInit);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Unable to create ${agent.name}: HTTP ${response.status} ${detail}`);
  }
};

// Reconcilia los terminales del Octoboss: si hay más de uno acumulados (por
// hot reloads o crashes), elimina los duplicados y deja solo el primero
// (el del bootstrap original). Devuelve el terminalId que sobrevive.
//
// Por qué no matchear por prompt: el endpoint /api/terminal-snapshots no
// preserva el `initialPrompt` después del primer turno (lo devuelve como
// string vacío). Cualquier matcher por contenido del prompt falla y
// genera un nuevo terminal en cada arranque, acumulando zombies.
//
// Política: tentacleId === __octoboss__ ⇒ es el orquestador. Solo creamos
// uno con ese tentacleId, así que cualquier match es válido.
const reconcileOctobossTerminals = async (signal?: AbortSignal): Promise<string | null> => {
  const requestInit: RequestInit = {
    method: "GET",
    headers: { Accept: "application/json" },
  };
  if (signal) {
    requestInit.signal = signal;
  }
  const response = await fetch(buildTerminalSnapshotsUrl(), requestInit);
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as TerminalSnapshotResponse[] | undefined;
  if (!Array.isArray(payload)) {
    return null;
  }

  const octobosses = payload.filter(
    (entry): entry is TerminalSnapshotResponse & { terminalId: string } =>
      Boolean(
        entry && typeof entry.terminalId === "string" && entry.tentacleId === OCTOBOSS_TENTACLE_ID,
      ),
  );

  if (octobosses.length === 0) return null;

  // Ordenar por createdAt ascendente para preservar el primero (el más
  // viejo, normalmente el del bootstrap original que tiene la conversación
  // más establecida).
  octobosses.sort((left, right) => {
    const lt = typeof left.createdAt === "string" ? Date.parse(left.createdAt) : 0;
    const rt = typeof right.createdAt === "string" ? Date.parse(right.createdAt) : 0;
    return lt - rt;
  });

  const survivor = octobosses[0]?.terminalId ?? null;
  const duplicates = octobosses.slice(1);

  // Eliminar zombies en paralelo. Si alguno falla (terminal ya muerto,
  // race con otro DELETE), seguimos: el objetivo es reducir, no perfecto.
  if (duplicates.length > 0) {
    await Promise.all(
      duplicates.map(async (dup) => {
        try {
          const init: RequestInit = {
            method: "DELETE",
            headers: { Accept: "application/json" },
          };
          if (signal) init.signal = signal;
          await fetch(buildTerminalUrl(dup.terminalId), init);
        } catch {
          // ignorar fallas de cleanup
        }
      }),
    );
  }

  return survivor;
};

const createOctobossOrquestadorTerminal = async (signal?: AbortSignal): Promise<string | null> => {
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspaceMode: "shared",
      tentacleId: OCTOBOSS_TENTACLE_ID,
      promptTemplate: ORQUESTADOR_PROMPT_TEMPLATE,
    }),
  };
  if (signal) {
    requestInit.signal = signal;
  }
  const response = await fetch(buildTerminalsUrl(), requestInit);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Unable to create octoboss terminal: HTTP ${response.status} ${detail}`);
  }
  const snapshot = (await response.json()) as { terminalId?: unknown };
  return typeof snapshot.terminalId === "string" ? snapshot.terminalId : null;
};

type UseConsultorBootstrapOptions = {
  enabled: boolean;
  onCompleted?: (octobossTerminalId: string | null) => void;
};

export const useConsultorBootstrap = ({
  enabled,
  onCompleted,
}: UseConsultorBootstrapOptions): void => {
  const ranRef = useRef(false);
  // Mantener onCompleted en ref evita que el efecto se re-corra si la
  // referencia cambia (p.ej. por useCallback con deps inestables) y aborte
  // el AbortController mientras el bootstrap está creando terminales.
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  useEffect(() => {
    if (!enabled || ranRef.current) {
      return;
    }
    ranRef.current = true;
    const controller = new AbortController();

    (async () => {
      try {
        const existing = await fetchExistingTentacleNames(controller.signal);
        const missing = CONSULTOR_AGENTS.filter((agent) => !existing.has(agent.name));
        for (const agent of missing) {
          if (controller.signal.aborted) return;
          await createTentacle(agent, controller.signal);
        }

        if (controller.signal.aborted) return;

        // Reconciliar primero: si hay terminales Octoboss zombies de
        // hot reloads o crashes anteriores, sobrevive el más viejo y los
        // demás se eliminan. Si no hay ninguno, creamos uno fresco con
        // el orquestador.
        let octobossTerminalId = await reconcileOctobossTerminals(controller.signal);
        if (!octobossTerminalId) {
          octobossTerminalId = await createOctobossOrquestadorTerminal(controller.signal);
        }

        onCompletedRef.current?.(octobossTerminalId);
      } catch (error) {
        if (controller.signal.aborted) return;
        // Best-effort: si falla, el operador recarga la página o crea
        // los tentáculos y el terminal manualmente desde la UI. No hay
        // reintento automático dentro de la misma sesión.
        console.warn("[consultor-bootstrap] Failed to bootstrap:", error);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [enabled]);
};
