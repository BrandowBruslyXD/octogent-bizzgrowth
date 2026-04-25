import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "octogent.consultor.showNonConsultorTentacles";

const readInitial = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const useShowNonConsultorTentacles = (): {
  isShowingNonConsultorTentacles: boolean;
  setIsShowingNonConsultorTentacles: (value: boolean) => void;
} => {
  const [isShowingNonConsultorTentacles, setIsShowingNonConsultorTentacles] =
    useState<boolean>(readInitial);
  // En el primer render el valor ya viene de localStorage; evitamos reescribirlo
  // y solo persistimos en cambios reales disparados por el operador.
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, isShowingNonConsultorTentacles ? "true" : "false");
    } catch {
      // localStorage may be disabled (private mode); silently ignore.
    }
  }, [isShowingNonConsultorTentacles]);

  return {
    isShowingNonConsultorTentacles,
    setIsShowingNonConsultorTentacles,
  };
};
