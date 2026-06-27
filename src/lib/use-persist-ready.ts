import { useEffect, useState } from "react";
import { useDayStore } from "@/lib/day-store";

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
