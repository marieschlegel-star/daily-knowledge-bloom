import { createJSONStorage, type StateStorage } from "zustand/middleware";

/** No-op storage on the server so SSR never reads or writes localStorage. */
export function createClientStorage(): StateStorage {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return window.localStorage;
}

export const clientJSONStorage = createJSONStorage(() => createClientStorage() as Storage);
