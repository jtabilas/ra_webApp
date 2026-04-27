// Wrapper around sql.js. Lazily loads the WASM and exposes a tiny API.
// All operations stay client-side; nothing is uploaded.

import type { Database, SqlJsStatic } from "sql.js";

let sqlPromise: Promise<SqlJsStatic> | null = null;

export async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    // Dynamic import keeps WASM lazy-loaded (`bundle-dynamic-imports`).
    sqlPromise = (async () => {
      const initSqlJs = (await import("sql.js")).default;
      // Pre-fetch the wasm ourselves and feed it to Emscripten via `wasmBinary`.
      // This bypasses sql.js's locateFile + instantiateStreaming path, which can
      // fail in dev (MIME mismatch, COOP/COEP, etc.) producing the opaque
      // "both async and sync fetching of the wasm failed" error.
      const wasmUrl = "/sql-wasm.wasm";
      const resp = await fetch(wasmUrl);
      if (!resp.ok) {
        throw new Error(
          `Impossibile scaricare ${wasmUrl} (HTTP ${resp.status}). ` +
            `Esegui "npm install" per copiare sql-wasm.wasm in /public, oppure ` +
            `copia node_modules/sql.js/dist/sql-wasm.wasm in public/.`,
        );
      }
      const wasmBinary = await resp.arrayBuffer();
      return initSqlJs({ wasmBinary } as any);
    })();
  }
  return sqlPromise;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  durationMs: number;
}

export async function exec(db: Database, sql: string): Promise<QueryResult> {
  const start = performance.now();
  const res = db.exec(sql);
  const durationMs = performance.now() - start;
  if (!res || res.length === 0) {
    return { columns: [], rows: [], durationMs };
  }
  const last = res[res.length - 1];
  return {
    columns: last.columns,
    rows: last.values,
    durationMs,
  };
}

export interface SchemaInfo {
  tables: { name: string; columns: { name: string; type: string }[]; rowCount: number }[];
}

export function readSchema(db: Database): SchemaInfo {
  const tables = db.exec(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  const tableNames: string[] = tables[0]?.values.map((r) => r[0] as string) ?? [];
  const out: SchemaInfo["tables"] = [];
  for (const name of tableNames) {
    const colInfo = db.exec(`PRAGMA table_info(${quoteIdent(name)})`);
    const columns =
      colInfo[0]?.values.map((r) => ({ name: r[1] as string, type: (r[2] as string) || "" })) ?? [];
    const cnt = db.exec(`SELECT count(*) FROM ${quoteIdent(name)}`);
    const rowCount = (cnt[0]?.values[0]?.[0] as number) ?? 0;
    out.push({ name, columns, rowCount });
  }
  return { tables: out };
}

export function schemaAsRecord(s: SchemaInfo): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const t of s.tables) out[t.name] = t.columns.map((c) => c.name);
  return out;
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function newEmptyDb(): Promise<Database> {
  const SQL = await getSqlJs();
  return new SQL.Database();
}

export async function dbFromBytes(bytes: Uint8Array): Promise<Database> {
  const SQL = await getSqlJs();
  return new SQL.Database(bytes);
}

export function exportDb(db: Database): Uint8Array {
  return db.export();
}
