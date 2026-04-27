"use client";
import { create } from "zustand";
import { type Locale } from "../i18n/messages";

type Theme = "light" | "dark";

interface UiState {
  theme: Theme;
  locale: Locale;
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setLocale: (l: Locale) => void;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  hydrate: () => void;
}

const KEY = "ra-web:ui:v1";

const safeRead = (): { theme?: Theme; locale?: Locale } => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const persist = (s: { theme: Theme; locale: Locale }) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
};

export const useUiStore = create<UiState>((set, get) => ({
  theme: "light",
  locale: "it",
  sidebarOpen: false,

  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

  hydrate: () => {
    const r = safeRead();
    const theme: Theme =
      r.theme ??
      (typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    const locale: Locale = r.locale ?? "it";
    set({ theme, locale });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.lang = locale;
    }
  },

  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    set({ theme: next });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
    persist({ theme: next, locale: get().locale });
  },

  setLocale: (l) => {
    set({ locale: l });
    if (typeof document !== "undefined") document.documentElement.lang = l;
    persist({ theme: get().theme, locale: l });
  },
}));
