"use client";
import { useMemo, useState } from "react";

interface Props {
  columns: string[];
  rows: unknown[][];
  pageSize?: number;
}

export function ResultsTable({ columns, rows, pageSize = 100 }: Props) {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [sortIdx, setSortIdx] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    if (!filter) return rows;
    const f = filter.toLowerCase();
    return rows.filter((r) => r.some((v) => String(v ?? "").toLowerCase().includes(f)));
  }, [rows, filter]);

  const sorted = useMemo(() => {
    if (sortIdx === null) return filtered;
    const i = sortIdx;
    return [...filtered].sort((a, b) => {
      const va = a[i];
      const vb = b[i];
      if (va == null && vb == null) return 0;
      if (va == null) return -1;
      if (vb == null) return 1;
      const na = Number(va);
      const nb = Number(vb);
      if (Number.isFinite(na) && Number.isFinite(nb)) return sortDir === "asc" ? na - nb : nb - na;
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filtered, sortIdx, sortDir]);

  const total = sorted.length;
  const start = page * pageSize;
  const slice = sorted.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setSort = (i: number) => {
    if (sortIdx === i) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortIdx(i);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-2 border-b border-rule flex items-center gap-3 bg-paper-warm">
        <input
          type="text"
          placeholder="filter…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="font-mono text-sm bg-transparent outline-none border-b border-rule focus:border-accent transition-colors px-1 py-0.5 w-40"
        />
        <span className="text-xs text-ink-faint font-display italic">
          {total} {total === 1 ? "tupla" : "tuple"}
          {filter && rows.length !== total ? (
            <> · su {rows.length}</>
          ) : null}
        </span>
        <div className="ml-auto flex items-center gap-1 text-xs">
          <button
            type="button"
            className="btn-ghost btn"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="precedente"
          >
            ←
          </button>
          <span className="font-mono">
            {page + 1}/{totalPages}
          </span>
          <button
            type="button"
            className="btn-ghost btn"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="successivo"
          >
            →
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="ra-results">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={`${c}-${i}`}
                  scope="col"
                  onClick={() => setSort(i)}
                  className="cursor-pointer select-none"
                  title="ordina"
                >
                  <span>{c}</span>
                  {sortIdx === i && (
                    <span className="text-accent ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1} className="text-center italic text-ink-faint py-8">
                  ø
                </td>
              </tr>
            ) : (
              slice.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const isNum = typeof cell === "number";
                    return (
                      <td key={ci} className={isNum ? "col-num" : ""}>
                        {cell == null ? (
                          <span className="text-ink-faint italic">∅</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
