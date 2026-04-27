import Papa from "papaparse";
import type { Database } from "sql.js";
import { dbFromBytes, newEmptyDb } from "./engine";

export type LoaderResult =
  | { ok: true; db: Database; sourceLabel: string }
  | { ok: false; error: string };

const sanitizeIdent = (s: string) =>
  s.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(\d)/, "_$1") || "tbl";

const Q = (n: string) => `"${n.replace(/"/g, '""')}"`;

const isBlank = (s: string) => s == null || s.trim() === "";

type InferType = "INTEGER" | "REAL" | "TEXT" | "DATE";

function inferColumnType(samples: string[]): InferType {
  let allInt = true;
  let allReal = true;
  let allDate = true;
  let seen = 0;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  for (const v of samples) {
    if (isBlank(v)) continue;
    seen++;
    const n = Number(v);
    if (!Number.isFinite(n)) {
      allInt = false;
      allReal = false;
    } else {
      if (!Number.isInteger(n) || /\./.test(v)) allInt = false;
    }
    if (!dateRe.test(v)) allDate = false;
  }
  if (seen === 0) return "TEXT";
  if (allInt) return "INTEGER";
  if (allReal) return "REAL";
  if (allDate) return "DATE";
  return "TEXT";
}

function coerce(v: string | null | undefined, type: InferType): string | number | null {
  if (v == null || v === "") return null;
  if (type === "INTEGER") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  if (type === "REAL") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return v;
}

export async function loadSqlite(file: File): Promise<LoaderResult> {
  try {
    const buf = await file.arrayBuffer();
    const db = await dbFromBytes(new Uint8Array(buf));
    return { ok: true, db, sourceLabel: file.name };
  } catch (e: any) {
    return { ok: false, error: `SQLite non valido: ${e.message ?? e}` };
  }
}

export async function loadSqlDump(file: File): Promise<LoaderResult> {
  try {
    const text = await file.text();
    const db = await newEmptyDb();
    db.exec(text);
    return { ok: true, db, sourceLabel: file.name };
  } catch (e: any) {
    return { ok: false, error: `SQL dump fallito: ${e.message ?? e}` };
  }
}

export async function loadCsv(files: File[]): Promise<LoaderResult> {
  try {
    const db = await newEmptyDb();
    for (const file of files) {
      const text = await file.text();
      const tableName = sanitizeIdent(file.name.replace(/\.[^.]+$/, ""));
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
      if (parsed.errors.length > 0 && !parsed.data.length) {
        throw new Error(`CSV malformato in ${file.name}`);
      }
      const rows = parsed.data;
      if (!rows.length) continue;
      const header = rows[0].map(sanitizeIdent);
      const data = rows.slice(1);
      const sampleSize = Math.min(100, data.length);
      const types: InferType[] = header.map((_, ci) =>
        inferColumnType(data.slice(0, sampleSize).map((r) => r[ci] ?? "")),
      );
      const ddl = `CREATE TABLE ${Q(tableName)} (${header
        .map((h, i) => `${Q(h)} ${types[i] === "DATE" ? "TEXT" : types[i]}`)
        .join(", ")})`;
      db.run(ddl);
      const insert = db.prepare(
        `INSERT INTO ${Q(tableName)} VALUES (${header.map(() => "?").join(", ")})`,
      );
      for (const row of data) {
        const vals = header.map((_, i) => coerce(row[i], types[i]));
        insert.run(vals as any);
      }
      insert.free();
    }
    return {
      ok: true,
      db,
      sourceLabel: files.length === 1 ? files[0].name : `${files.length} CSV`,
    };
  } catch (e: any) {
    return { ok: false, error: `CSV: ${e.message ?? e}` };
  }
}

export async function loadJson(file: File): Promise<LoaderResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const db = await newEmptyDb();
    const tables: Record<string, Record<string, unknown>[]> = Array.isArray(data)
      ? { [sanitizeIdent(file.name.replace(/\.[^.]+$/, ""))]: data }
      : data;
    for (const [rawName, rows] of Object.entries(tables)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const tableName = sanitizeIdent(rawName);
      const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
      const ddl = `CREATE TABLE ${Q(tableName)} (${cols.map((c) => `${Q(c)} TEXT`).join(", ")})`;
      db.run(ddl);
      const insert = db.prepare(
        `INSERT INTO ${Q(tableName)} VALUES (${cols.map(() => "?").join(", ")})`,
      );
      for (const r of rows) {
        const vals = cols.map((c) => {
          const v = (r as any)[c];
          if (v == null) return null;
          if (typeof v === "object") return JSON.stringify(v);
          return v;
        });
        insert.run(vals as any);
      }
      insert.free();
    }
    return { ok: true, db, sourceLabel: file.name };
  } catch (e: any) {
    return { ok: false, error: `JSON: ${e.message ?? e}` };
  }
}

export async function loadAuto(files: File[]): Promise<LoaderResult> {
  if (files.length === 0) return { ok: false, error: "Nessun file" };
  const first = files[0];
  const ext = first.name.toLowerCase().split(".").pop() ?? "";
  if (files.length === 1 && (ext === "db" || ext === "sqlite" || ext === "sqlite3")) {
    return loadSqlite(first);
  }
  if (files.length === 1 && ext === "sql") return loadSqlDump(first);
  if (files.length === 1 && ext === "json") return loadJson(first);
  if (files.every((f) => f.name.toLowerCase().endsWith(".csv"))) {
    return loadCsv(files);
  }
  return {
    ok: false,
    error: `Formato non riconosciuto: ${files.map((f) => f.name).join(", ")}`,
  };
}
