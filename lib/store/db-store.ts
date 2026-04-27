"use client";
import { create } from "zustand";
import type { Database } from "sql.js";
import { readSchema, schemaAsRecord, type SchemaInfo } from "../db/engine";
import { buildSampleDb } from "../db/sample-db";

interface DbState {
  db: Database | null;
  schema: SchemaInfo;
  schemaMap: Record<string, string[]>;
  sourceLabel: string;
  loading: boolean;
  error: string | null;
  setDb: (db: Database, label: string) => void;
  loadSample: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useDbStore = create<DbState>((set) => ({
  db: null,
  schema: { tables: [] },
  schemaMap: {},
  sourceLabel: "",
  loading: false,
  error: null,

  setDb: (db, label) => {
    const schema = readSchema(db);
    set({
      db,
      schema,
      schemaMap: schemaAsRecord(schema),
      sourceLabel: label,
      error: null,
    });
  },

  loadSample: async () => {
    set({ loading: true, error: null });
    try {
      const db = await buildSampleDb();
      const schema = readSchema(db);
      set({
        db,
        schema,
        schemaMap: schemaAsRecord(schema),
        sourceLabel: "sample.db (Beers, Duke)",
        loading: false,
      });
    } catch (e: any) {
      set({ loading: false, error: `Caricamento sample fallito: ${e.message ?? e}` });
    }
  },

  reset: async () => {
    set({ loading: true, error: null });
    const db = await buildSampleDb();
    const schema = readSchema(db);
    set({
      db,
      schema,
      schemaMap: schemaAsRecord(schema),
      sourceLabel: "sample.db (Beers, Duke)",
      loading: false,
    });
  },
}));
