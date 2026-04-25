import { useCallback, useEffect, useState } from "react";

import type { DeckAvailableSkill, DeckTentacleSummary } from "@octogent/core";
import type { OctopusAppearancePayload } from "../../components/deck/AddTentacleForm";
import {
  buildDeckSkillsUrl,
  buildDeckTentacleSkillsUrl,
  buildDeckTentacleUrl,
  buildDeckTentaclesUrl,
  buildDeckTodoToggleUrl,
} from "../../runtime/runtimeEndpoints";

const normalizeDeckAvailableSkill = (value: unknown): DeckAvailableSkill | null => {
  if (value === null || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string") return null;

  return {
    name: record.name,
    description: typeof record.description === "string" ? record.description : "",
    source: record.source === "project" ? "project" : "user",
  };
};

export type UseDeckTentaclesOptions = {
  onRefreshWorkspaceSetup: () => Promise<unknown>;
};

export type UseDeckTentaclesReturn = {
  tentacles: DeckTentacleSummary[];
  availableSkills: DeckAvailableSkill[];
  isCreating: boolean;
  createError: string | null;
  deletingTentacleId: string | null;
  savingTentacleSkillsId: string | null;
  setCreateError: (error: string | null) => void;
  fetchTentacles: (signal?: AbortSignal) => Promise<void>;
  handleCreateTentacle: (
    name: string,
    description: string,
    color: string,
    octopus: OctopusAppearancePayload,
    suggestedSkills: string[],
  ) => Promise<boolean>;
  handleDeleteTentacle: (tentacleId: string) => Promise<void>;
  handleDeleteAllTentacles: () => Promise<void>;
  handleTentacleSkillsSave: (tentacleId: string, suggestedSkills: string[]) => Promise<boolean>;
  handleTodoToggle: (tentacleId: string, itemIndex: number, done: boolean) => Promise<void>;
};

export const useDeckTentacles = ({
  onRefreshWorkspaceSetup,
}: UseDeckTentaclesOptions): UseDeckTentaclesReturn => {
  const [tentacles, setTentacles] = useState<DeckTentacleSummary[]>([]);
  const [availableSkills, setAvailableSkills] = useState<DeckAvailableSkill[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingTentacleId, setDeletingTentacleId] = useState<string | null>(null);
  const [savingTentacleSkillsId, setSavingTentacleSkillsId] = useState<string | null>(null);

  // Fetch tentacle list. Acepta un AbortSignal para poder cancelar la
  // petición cuando el componente se desmonta y evitar setState sobre un
  // componente destruido.
  const fetchTentacles = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const requestInit: RequestInit = { headers: { Accept: "application/json" } };
        if (signal) requestInit.signal = signal;
        const response = await fetch(buildDeckTentaclesUrl(), requestInit);
        if (!response.ok) return;
        const data = await response.json();
        if (signal?.aborted) return;
        setTentacles(data);
        await onRefreshWorkspaceSetup();
      } catch (error) {
        if ((error as { name?: string } | null)?.name === "AbortError") return;
        // silently ignore otros errores de red
      }
    },
    [onRefreshWorkspaceSetup],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchTentacles(controller.signal);
    return () => controller.abort();
  }, [fetchTentacles]);

  useEffect(() => {
    let cancelled = false;

    const fetchSkills = async () => {
      try {
        const response = await fetch(buildDeckSkillsUrl(), {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;
        const payload = (await response.json()) as unknown;
        if (!Array.isArray(payload) || cancelled) return;
        const skills = payload
          .map((entry) => normalizeDeckAvailableSkill(entry))
          .filter((entry): entry is DeckAvailableSkill => entry !== null);
        if (!cancelled) {
          setAvailableSkills(skills);
        }
      } catch {
        // silently ignore
      }
    };

    void fetchSkills();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreateTentacle = useCallback(
    async (
      name: string,
      description: string,
      color: string,
      octopus: OctopusAppearancePayload,
      suggestedSkills: string[],
    ): Promise<boolean> => {
      setIsCreating(true);
      setCreateError(null);
      try {
        const response = await fetch(buildDeckTentaclesUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name, description, color, octopus, suggestedSkills }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const msg =
            body && typeof body === "object" && "error" in body && typeof body.error === "string"
              ? body.error
              : "Failed to create tentacle";
          setCreateError(msg);
          return false;
        }
        await fetchTentacles();
        await onRefreshWorkspaceSetup();
        return true;
      } catch {
        setCreateError("Network error");
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [fetchTentacles, onRefreshWorkspaceSetup],
  );

  const handleDeleteTentacle = useCallback(
    async (tentacleId: string) => {
      setDeletingTentacleId(tentacleId);
      try {
        const response = await fetch(buildDeckTentacleUrl(tentacleId), { method: "DELETE" });
        if (!response.ok) return;
        await fetchTentacles();
      } catch {
        // silently ignore
      } finally {
        setDeletingTentacleId(null);
      }
    },
    [fetchTentacles],
  );

  const handleDeleteAllTentacles = useCallback(async () => {
    for (const t of tentacles) {
      await fetch(buildDeckTentacleUrl(t.tentacleId), { method: "DELETE" });
    }
    await fetchTentacles();
  }, [tentacles, fetchTentacles]);

  const handleTentacleSkillsSave = useCallback(
    async (tentacleId: string, suggestedSkills: string[]) => {
      setSavingTentacleSkillsId(tentacleId);
      try {
        const response = await fetch(buildDeckTentacleSkillsUrl(tentacleId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ suggestedSkills }),
        });
        if (!response.ok) return false;
        await fetchTentacles();
        return true;
      } catch {
        return false;
      } finally {
        setSavingTentacleSkillsId((current) => (current === tentacleId ? null : current));
      }
    },
    [fetchTentacles],
  );

  const handleTodoToggle = useCallback(
    async (tentacleId: string, itemIndex: number, done: boolean) => {
      try {
        const response = await fetch(buildDeckTodoToggleUrl(tentacleId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIndex, done }),
        });
        if (!response.ok) return;
        await fetchTentacles();
      } catch {
        // silently ignore
      }
    },
    [fetchTentacles],
  );

  return {
    tentacles,
    availableSkills,
    isCreating,
    createError,
    deletingTentacleId,
    savingTentacleSkillsId,
    setCreateError,
    fetchTentacles,
    handleCreateTentacle,
    handleDeleteTentacle,
    handleDeleteAllTentacles,
    handleTentacleSkillsSave,
    handleTodoToggle,
  };
};
