"use client";
import { useMemo, useState } from "react";
import { format as sqlFormat } from "sql-formatter";

interface Props {
  sql: string;
}

export function SqlPreview({ sql }: Props) {
  const [copied, setCopied] = useState(false);
  const formatted = useMemo(() => {
    try {
      return sqlFormat(sql, { language: "sqlite", keywordCase: "upper" });
    } catch {
      return sql;
    }
  }, [sql]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-rule flex items-center bg-paper-warm">
        <span className="smallcaps text-ink-muted">SQL · SQLite dialect</span>
        <button
          type="button"
          className="ml-auto btn btn-ghost text-[0.65rem]"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(formatted);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? "✓ copiato" : "copia"}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="sql-pre">{formatted}</pre>
      </div>
    </div>
  );
}
