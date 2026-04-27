"use client";
import { useState } from "react";
import { useDbStore } from "@/lib/store/db-store";
import type { Locale } from "@/lib/i18n/messages";
import { messages } from "@/lib/i18n/messages";

interface Props {
  locale: Locale;
  onInsert: (snippet: string) => void;
}

export function SchemaExplorer({ locale, onInsert }: Props) {
  const schema = useDbStore((s) => s.schema);
  const sourceLabel = useDbStore((s) => s.sourceLabel);
  const t = messages[locale];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (schema.tables.length === 0) {
    return (
      <div className="p-4 text-sm text-ink-faint italic font-display">
        {t.schema.empty}
      </div>
    );
  }

  return (
    <nav aria-label={t.schema.heading} className="text-ink">
      <div className="px-4 py-3 border-b border-rule">
        <div className="smallcaps text-ink-faint">{t.schema.heading}</div>
        <div className="font-display italic text-base mt-1 text-ink-muted truncate">
          {sourceLabel}
        </div>
      </div>
      <ul className="px-2 py-2">
        {schema.tables.map((table) => {
          const open = expanded[table.name] ?? true;
          return (
            <li key={table.name} className="mb-0.5">
              <div
                className="tree-row"
                role="button"
                tabIndex={0}
                onClick={() => setExpanded((e) => ({ ...e, [table.name]: !open }))}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setExpanded((s) => ({ ...s, [table.name]: !open }))
                }
              >
                <span className="marker">{open ? "▾" : "▸"}</span>
                <span
                  className="text-ink hover:text-accent transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInsert(`${table.name};`);
                  }}
                  title={t.schema.clickToInsert}
                >
                  {table.name}
                </span>
                <span className="badge">
                  {table.rowCount} <span className="text-ink-faint">·</span>{" "}
                  {table.columns.length}
                </span>
              </div>
              {open && (
                <ul className="ml-4 border-l border-rule pl-3 my-1">
                  {table.columns.map((col) => (
                    <li key={col.name} className="tree-row" style={{ cursor: "default" }}>
                      <span className="col-name">{col.name}</span>
                      <span className="col-type">: {col.type || "TEXT"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
