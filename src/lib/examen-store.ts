import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clientJSONStorage } from "./client-storage";

interface ExamenState {
  examDate: string | null;
  setExamDate: (date: string | null) => void;
}

export const useExamenStore = create<ExamenState>()(
  persist(
    (set) => ({
      examDate: null,
      setExamDate: (date) => set({ examDate: date }),
    }),
    {
      name: "juris-staatsexamen",
      storage: clientJSONStorage,
      skipHydration: true,
    }
  )
);
