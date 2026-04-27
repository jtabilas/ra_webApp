"use client";
import Link from "next/link";
import { useUiStore } from "@/lib/store/ui-store";
import { useDbStore } from "@/lib/store/db-store";
import { messages, type Locale } from "@/lib/i18n/messages";
import { exportDb } from "@/lib/db/engine";

interface Props {
  locale: Locale;
}

export function TopBar({ locale }: Props) {
  const t = messages[locale];
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const setLocale = useUiStore((s) => s.setLocale);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sourceLabel = useDbStore((s) => s.sourceLabel);
  const reset = useDbStore((s) => s.reset);
  const db = useDbStore((s) => s.db);

  const download = () => {
    if (!db) return;
    const bytes = exportDb(db);
    const buf = new Uint8Array(bytes).slice().buffer;
    const blob = new Blob([buf], { type: "application/x-sqlite3" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ra-export.sqlite";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="border-b border-rule bg-paper relative z-30">
      <div className="px-3 sm:px-5 py-2 flex items-center gap-3 sm:gap-6">
        {/* Hamburger — only visible below lg (iPad portrait + phone) */}
        <button
          type="button"
          className="btn btn-ghost lg:hidden touch-target"
          onClick={toggleSidebar}
          aria-label="Schema explorer"
        >
          <span aria-hidden className="block leading-none text-lg">☰</span>
        </button>

        <Link href="/" className="flex items-baseline gap-2 group shrink-0">
          <span className="font-display text-2xl sm:text-3xl leading-none tracking-tightest">
            <span className="italic text-accent">R</span>
            <span>A</span>
          </span>
          <span className="hidden xl:inline-block smallcaps-serif text-ink-faint group-hover:text-ink transition-colors">
            — {t.app.title}
          </span>
        </Link>

        <div className="hidden xl:flex items-baseline gap-2 ml-auto mr-4 text-xs">
          <span className="smallcaps text-ink-faint">{t.topbar.activeDb}:</span>
          <span className="font-mono text-ink truncate max-w-[24ch]">{sourceLabel}</span>
        </div>

        <nav className="flex items-center gap-1 text-xs ml-auto xl:ml-0">
          <Link href="/cheat-sheet" className="btn btn-ghost touch-target hidden sm:inline-flex">
            {t.topbar.cheatSheet}
          </Link>
          <Link href="/esercizi" className="btn btn-ghost touch-target hidden sm:inline-flex">
            {t.topbar.exercises}
          </Link>
          <span aria-hidden className="rule-v mx-2 h-5 hidden sm:inline-block" />

          {/* Compact icon-only buttons on narrower screens */}
          <button
            type="button"
            className="btn btn-ghost touch-target"
            onClick={download}
            title={t.topbar.download}
            aria-label={t.topbar.download}
          >
            <span aria-hidden>⬇</span>
            <span className="hidden md:inline ml-1">{t.topbar.download}</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost touch-target"
            onClick={() => reset()}
            title={t.topbar.reset}
            aria-label={t.topbar.reset}
          >
            <span aria-hidden>↺</span>
            <span className="hidden md:inline ml-1">{t.topbar.reset}</span>
          </button>
          <span aria-hidden className="rule-v mx-2 h-5" />
          <button
            type="button"
            className="btn btn-ghost touch-target"
            onClick={() => setLocale(locale === "it" ? "en" : "it")}
            aria-label={t.topbar.language}
            title={t.topbar.language}
          >
            {locale.toUpperCase()}
          </button>
          <button
            type="button"
            className="btn btn-ghost touch-target"
            onClick={toggleTheme}
            aria-label={t.topbar.theme}
            title={t.topbar.theme}
          >
            {theme === "light" ? "◐" : "◑"}
          </button>
        </nav>
      </div>
    </header>
  );
}
