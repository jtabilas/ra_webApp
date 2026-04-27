"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDbStore } from "@/lib/store/db-store";
import { useUiStore } from "@/lib/store/ui-store";
import { useHistoryStore } from "@/lib/store/history-store";
import { compile } from "@/lib/ra-parser";
import type { RANode } from "@/lib/ra-parser/ast";
import { exec } from "@/lib/db/engine";
import { messages } from "@/lib/i18n/messages";
import { TopBar } from "./TopBar";
import { SchemaExplorer } from "./SchemaExplorer";
import { DropZone } from "./DropZone";
import { ResultsTable } from "./ResultsTable";
import { SqlPreview } from "./SqlPreview";
import { AstTree } from "./AstTree";
import { HistoryPanel } from "./HistoryPanel";

// Monaco is heavy → lazy-loaded only on the workspace page (`bundle-dynamic-imports`).
const RAEditor = dynamic(() => import("./RAEditor").then((m) => m.RAEditor), {
  ssr: false,
  loading: () => (
    <div className="p-6 font-mono text-sm text-ink-faint">caricamento editor…</div>
  ),
});

type Tab = "result" | "sql" | "ast";

interface RunState {
  ra: string;
  sql?: string;
  ast?: RANode;
  columns?: string[];
  rows?: unknown[][];
  error?: string;
  durationMs?: number;
  metaMessage?: string;
  cleared?: number; // bumped on \clear
}

const STARTER_QUERY = `// Benvenuto! Eseguito su sample.db (Beers, Duke).
// Cmd/Ctrl+Enter per eseguire.

\\project_{name}
  \\select_{address='Maple Street'} Bar;
`;

export function Workspace() {
  const locale = useUiStore((s) => s.locale);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const hydrateUi = useUiStore((s) => s.hydrate);
  const hydrateHistory = useHistoryStore((s) => s.hydrate);
  const loadSample = useDbStore((s) => s.loadSample);
  const db = useDbStore((s) => s.db);
  const schemaMap = useDbStore((s) => s.schemaMap);
  const dbError = useDbStore((s) => s.error);
  const addHistory = useHistoryStore((s) => s.add);

  const t = messages[locale];

  const [code, setCode] = useState(STARTER_QUERY);
  const [tab, setTab] = useState<Tab>("result");
  const [run, setRun] = useState<RunState | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Hydrate stores on mount + load sample DB on first render.
  useEffect(() => {
    hydrateUi();
    hydrateHistory();
    // Pick up ?q= from URL (esercizi → workspace deep link)
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) setCode(q);
    }
  }, [hydrateUi, hydrateHistory]);

  useEffect(() => {
    if (!db) loadSample();
  }, [db, loadSample]);

  const onRun = useCallback(() => {
    if (!db) return;
    const result = compile(code, schemaMap);

    if (result.parseErrors.length > 0) {
      const e = result.parseErrors[0];
      const msg = e.loc?.startLine
        ? `riga ${e.loc.startLine}, col ${e.loc.startColumn ?? "?"}: ${e.message}`
        : e.message;
      const next: RunState = { ra: code, error: `${t.results.parseError}: ${msg}` };
      setRun(next);
      addHistory({ ra: code, status: "error", error: msg });
      setTab("result");
      return;
    }

    if (result.compiled.length === 0) {
      setRun({ ra: code, error: "nessuna query trovata" });
      return;
    }

    // Execute the *last* statement (matches radb behaviour: each ; is a query).
    const lastIdx = result.compiled.length - 1;
    const last = result.compiled[lastIdx];

    if (last.statement.kind === "Meta") {
      const cmd = last.statement.cmd;
      let metaMessage: string | undefined;
      let columns: string[] | undefined;
      let rows: unknown[][] | undefined;
      if (cmd === "list") {
        const tables = useDbStore.getState().schema.tables;
        columns = ["relation", "attributes", "tuples"];
        rows = tables.map((tb) => [tb.name, tb.columns.map((c) => c.name).join(", "), tb.rowCount]);
        metaMessage = t.meta.list;
      } else if (cmd === "clear") {
        setRun(null);
        return;
      } else if (cmd === "help") {
        metaMessage = t.meta.help;
      } else {
        metaMessage = t.meta.quit;
      }
      setRun({ ra: code, metaMessage, columns, rows });
      setTab("result");
      return;
    }

    if (last.error || !last.sql) {
      const msg = last.error ?? "errore di traduzione";
      setRun({ ra: code, error: msg });
      addHistory({ ra: code, status: "error", error: msg });
      setTab("result");
      return;
    }

    exec(db, last.sql)
      .then((q) => {
        setRun({
          ra: code,
          sql: last.sql,
          ast: (last.statement as any).expr,
          columns: q.columns,
          rows: q.rows,
          durationMs: q.durationMs,
        });
        addHistory({
          ra: code,
          sql: last.sql,
          status: "ok",
          rowCount: q.rows.length,
          durationMs: q.durationMs,
        });
        setTab("result");
      })
      .catch((err: any) => {
        const msg = err.message ?? String(err);
        setRun({ ra: code, sql: last.sql, error: `${t.results.runError}: ${msg}` });
        addHistory({ ra: code, sql: last.sql, status: "error", error: msg });
        setTab("result");
      });
  }, [db, code, schemaMap, addHistory, t]);

  const onInsert = useCallback((snippet: string) => {
    setCode((c) => (c.endsWith("\n") ? c + snippet : c + "\n" + snippet));
  }, []);

  const exportCsv = useCallback(() => {
    if (!run?.rows || !run.columns) return;
    const header = run.columns.join(",");
    const body = run.rows
      .map((r) =>
        r
          .map((v) => {
            if (v == null) return "";
            const s = String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ra-result.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [run]);

  const exportJson = useCallback(() => {
    if (!run?.rows || !run.columns) return;
    const data = run.rows.map((r) =>
      Object.fromEntries(run.columns!.map((c, i) => [c, r[i] ?? null])),
    );
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ra-result.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [run]);

  return (
    <div className="min-h-screen flex flex-col relative">
      <TopBar locale={locale} />

      <main className="flex-1 relative lg:grid min-h-0" style={{ gridTemplateColumns: "minmax(240px, 320px) 1fr" }}>
        {/* sidebar — absolute drawer on < lg (positioned within <main>), in-grid on lg+ */}
        <aside
          className={`absolute lg:static inset-y-0 left-0 z-20 w-[80vw] max-w-[340px] lg:w-auto lg:max-w-none border-r border-rule flex flex-col min-h-0 bg-paper transition-transform duration-200 ease-out shadow-xl lg:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
          aria-hidden={!sidebarOpen ? undefined : false}
        >
          <div className="flex-1 overflow-auto fade-up">
            <SchemaExplorer
              locale={locale}
              onInsert={(snippet) => {
                onInsert(snippet);
                if (typeof window !== "undefined" && window.innerWidth < 1024) setSidebarOpen(false);
              }}
            />
          </div>
          <DropZone locale={locale} />
        </aside>

        {/* Backdrop for the drawer on touch / narrow screens */}
        {sidebarOpen && (
          <div
            className="lg:hidden absolute inset-0 z-10"
            style={{ background: "rgba(15, 12, 10, 0.45)", backdropFilter: "blur(2px)" }}
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* main column */}
        <section className="flex flex-col min-h-0 fade-up delay-2">
          {/* Editor */}
          <div className="border-b border-rule flex flex-col min-h-[34vh]" style={{ flex: "1 1 40%" }}>
            <div className="section-header flex-wrap gap-y-2">
              <div className="flex items-baseline gap-3">
                <span className="smallcaps text-ink-muted">{t.editor.heading}</span>
                <span className="hidden sm:inline text-xs italic font-display text-ink-faint">
                  RA → SQL · live
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button type="button" className="btn-accent btn touch-target" onClick={onRun}>
                  <span aria-hidden>▷</span>
                  <span className="ml-1">{t.editor.run}</span>
                  <span className="kbd ml-2 hidden md:inline">{t.editor.runShortcut}</span>
                </button>
                <button
                  type="button"
                  className="btn touch-target"
                  onClick={() => {
                    setCode("");
                    setRun(null);
                  }}
                  aria-label={t.editor.clear}
                >
                  {t.editor.clear}
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <RAEditor value={code} onChange={setCode} onRun={onRun} />
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col min-h-0" style={{ flex: "1 1 60%" }}>
            <div className="section-header flex-wrap gap-y-2">
              <div className="flex items-end gap-0">
                {(
                  [
                    ["result", t.results.resultsTab],
                    ["sql", t.results.sqlTab],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="tab touch-target"
                    data-active={tab === key}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap">
                {run?.rows && run.columns && (
                  <span className="hidden sm:inline text-xs italic font-display text-ink-muted">
                    {t.results.rowCount(run.rows.length, run.durationMs ?? 0)}
                  </span>
                )}
                {run?.rows && (
                  <>
                    <button type="button" className="btn btn-ghost text-[0.65rem] touch-target" onClick={exportCsv} aria-label={t.results.exportCsv}>
                      <span aria-hidden>⬇</span>
                      <span className="ml-1">{t.results.exportCsv}</span>
                    </button>
                    <button type="button" className="btn btn-ghost text-[0.65rem] touch-target" onClick={exportJson} aria-label={t.results.exportJson}>
                      <span aria-hidden>⬇</span>
                      <span className="ml-1">{t.results.exportJson}</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-ghost text-[0.65rem] touch-target"
                  onClick={() => setShowHistory((s) => !s)}
                  aria-label={t.history.heading}
                >
                  <span aria-hidden>⌖</span>
                  <span className="ml-1 hidden sm:inline">{t.history.heading}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {dbError ? (
                <div className="p-6 text-signal-err font-mono text-sm">{dbError}</div>
              ) : !run ? (
                <div className="p-6 italic font-display text-ink-faint">{t.results.runIt}</div>
              ) : run.error ? (
                <div className="p-6 font-mono text-sm">
                  <div className="smallcaps text-signal-err mb-2">⚠ {run.error}</div>
                  <p className="text-ink-faint italic font-display text-xs">
                    Apri il cheat sheet dal menu se hai dubbi sulla sintassi.
                  </p>
                </div>
              ) : tab === "result" ? (
                run.metaMessage && !run.rows ? (
                  <div className="p-6 italic font-display text-ink">{run.metaMessage}</div>
                ) : run.columns && run.rows ? (
                  <ResultsTable columns={run.columns} rows={run.rows} />
                ) : (
                  <div className="p-6 italic text-ink-faint">{t.results.empty}</div>
                )
              ) : tab === "sql" ? (
                <SqlPreview sql={run.sql ?? "-- nessun SQL"} />
              ) : (
                <AstTree node={run.ast ?? null} />
              )}
            </div>
          </div>
        </section>
      </main>

      {showHistory && (
        <div className="fixed inset-x-0 bottom-0 max-h-[50vh] bg-paper border-t-2 border-ink z-20 fade-up">
          <div className="flex items-center justify-end px-3 py-1.5 border-b border-rule">
            <button
              type="button"
              className="btn btn-ghost text-[0.7rem]"
              onClick={() => setShowHistory(false)}
            >
              ✕ chiudi
            </button>
          </div>
          <div className="h-[calc(50vh-2.5rem)]">
            <HistoryPanel locale={locale} onReload={(ra) => { setCode(ra); setShowHistory(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}
