"use client";
import { create } from "zustand";

export interface HistoryEntry {
  id: string;
  ra: string;
  sql?: string;
  ts: number;
  durationMs?: number;
  rowCount?: number;
  status: "ok" | "error";
  error?: string;
  starred?: boolean;
}

interface HistoryState {
  entries: HistoryEntry[];
  add: (e: Omit<HistoryEntry, "id" | "ts">) => void;
  toggleStar: (id: string) => void;
  clear: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = "ra-web:history:v1";
const MAX_ENTRIES = 200;

const safeRead = (): HistoryEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
};

const safeWrite = (entries: HistoryEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* quota or other */
  }
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],

  hydrate: () => {
    const entries = safeRead();
    set({ entries });
  },

  add: (e) => {
    const entry: HistoryEntry = {
      ...e,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
    };
    const next = [entry, ...get().entries].slice(0, MAX_ENTRIES);
    safeWrite(next);
    set({ entries: next });
  },

  toggleStar: (id) => {
    const next = get().entries.map((e) =>
      e.id === id ? { ...e, starred: !e.starred } : e,
    );
    safeWrite(next);
    set({ entries: next });
  },

  clear: () => {
    safeWrite([]);
    set({ entries: [] });
  },
}));
