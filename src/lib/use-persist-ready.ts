import { useEffect, useState } from "react";
import { useDayStore } from "@/lib/day-store";
import { useGCalStore } from "@/lib/gcal-store";

/** True once local day plans have been rehydrated from localStorage. */
export function useDayPlansReady(): boolean {
  const [ready, setReady] = useState(() => useDayStore.persist.hasHydrated());

  useEffect(() => {
    if (useDayStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }
    return useDayStore.persist.onFinishHydration(() => setReady(true));
  }, []);

  return ready;
}

/** True once Google Calendar auth has been rehydrated from localStorage. */
export function useGCalReady(): boolean {
  const [ready, setReady] = useState(() => useGCalStore.persist.hasHydrated());

  useEffect(() => {
    if (useGCalStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }
    return useGCalStore.persist.onFinishHydration(() => setReady(true));
  }, []);

  return ready;
}
