"use client";
import { useHistoryStore } from "@/lib/store/history-store";
import { messages, type Locale } from "@/lib/i18n/messages";

interface Props {
  locale: Locale;
  onReload: (ra: string) => void;
}

export function HistoryPanel({ locale, onReload }: Props) {
  const t = messages[locale];
  const entries = useHistoryStore((s) => s.entries);
  const toggleStar = useHistoryStore((s) => s.toggleStar);
  const clear = useHistoryStore((s) => s.clear);

  return (
    <section className="flex flex-col h-full">
      <div className="section-header">
        <div className="flex items-baseline gap-3">
          <span className="smallcaps text-ink-muted">{t.history.heading}</span>
          <span className="text-xs italic font-display text-ink-faint">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {entries.length > 0 && (
          <button type="button" className="btn btn-ghost text-[0.65rem]" onClick={clear}>
            {t.history.clear}
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <div className="p-4 italic text-ink-faint font-display text-sm">
          {t.history.empty}
        </div>
      ) : (
        <ul className="flex-1 overflow-auto divide-y divide-[color:var(--rule)]">
          {entries.map((e, i) => (
            <li key={e.id} className="px-4 py-2 group hover:bg-paper-warm">
              <div className="flex items-start gap-3">
                <span className="footnote-num pt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <code
                    className="block font-mono text-xs text-ink truncate cursor-pointer hover:text-accent"
                    onClick={() => onReload(e.ra)}
                    title={t.history.reload}
                  >
                    {e.ra.replace(/\s+/g, " ").trim()}
                  </code>
                  <div className="flex items-center gap-3 mt-0.5 text-[0.65rem] font-display italic text-ink-faint">
                    <span>{new Date(e.ts).toLocaleTimeString()}</span>
                    {e.status === "ok" ? (
                      <>
                        <span>{e.rowCount} t</span>
                        <span>{e.durationMs?.toFixed(0)} ms</span>
                      </>
                    ) : (
                      <span className="text-signal-err not-italic">errore</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className={`text-sm transition-opacity ${
                    e.starred ? "text-accent opacity-100" : "opacity-0 group-hover:opacity-60"
                  }`}
                  onClick={() => toggleStar(e.id)}
                  aria-label={t.history.star}
                >
                  {e.starred ? "★" : "☆"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
