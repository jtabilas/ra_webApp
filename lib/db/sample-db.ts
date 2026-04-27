// Replica del sample.db di Duke (corso CompSci 316 / radb).
// Schema + dataset identici a `sample.ra` originale.

import { newEmptyDb } from "./engine";
import type { Database } from "sql.js";

export const SAMPLE_DDL = `
CREATE TABLE Bar(name TEXT PRIMARY KEY, address TEXT);
CREATE TABLE Beer(name TEXT PRIMARY KEY, manf TEXT);
CREATE TABLE Drinker(name TEXT PRIMARY KEY, address TEXT);
CREATE TABLE Frequents(drinker TEXT, bar TEXT, times_a_week INTEGER,
  PRIMARY KEY(drinker, bar));
CREATE TABLE Serves(bar TEXT, beer TEXT, price REAL,
  PRIMARY KEY(bar, beer));
CREATE TABLE Likes(drinker TEXT, beer TEXT,
  PRIMARY KEY(drinker, beer));
`.trim();

const SAMPLE_DATA: { table: string; rows: (string | number)[][]; cols: string[] }[] = [
  {
    table: "Bar",
    cols: ["name", "address"],
    rows: [
      ["James Joyce Pub", "Dublin"],
      ["Joe's Bar", "Maple Street"],
      ["Talk of the Town", "Durham"],
    ],
  },
  {
    table: "Beer",
    cols: ["name", "manf"],
    rows: [
      ["Amstel", "Heineken"],
      ["Budweiser", "Anheuser-Busch"],
      ["Bud Lite", "Anheuser-Busch"],
      ["Coors", "Coors"],
      ["Erdinger", "Erdinger"],
      ["Heineken", "Heineken"],
    ],
  },
  {
    table: "Drinker",
    cols: ["name", "address"],
    rows: [
      ["Amy", "100 Main St"],
      ["Ben", "200 Main St"],
      ["Coral", "300 Main St"],
      ["Dan", "400 Main St"],
      ["Emma", "500 Main St"],
    ],
  },
  {
    table: "Frequents",
    cols: ["drinker", "bar", "times_a_week"],
    rows: [
      ["Amy", "Joe's Bar", 3],
      ["Amy", "James Joyce Pub", 1],
      ["Ben", "Joe's Bar", 5],
      ["Ben", "Talk of the Town", 1],
      ["Coral", "Joe's Bar", 2],
      ["Dan", "Talk of the Town", 4],
      ["Emma", "James Joyce Pub", 2],
    ],
  },
  {
    table: "Serves",
    cols: ["bar", "beer", "price"],
    rows: [
      ["Joe's Bar", "Budweiser", 2.5],
      ["Joe's Bar", "Bud Lite", 2.0],
      ["Joe's Bar", "Coors", 2.75],
      ["James Joyce Pub", "Heineken", 5.0],
      ["James Joyce Pub", "Amstel", 5.5],
      ["James Joyce Pub", "Erdinger", 6.5],
      ["Talk of the Town", "Budweiser", 3.0],
      ["Talk of the Town", "Heineken", 4.5],
    ],
  },
  {
    table: "Likes",
    cols: ["drinker", "beer"],
    rows: [
      ["Amy", "Heineken"],
      ["Amy", "Amstel"],
      ["Amy", "Erdinger"],
      ["Ben", "Budweiser"],
      ["Ben", "Bud Lite"],
      ["Coral", "Coors"],
      ["Coral", "Erdinger"],
      ["Dan", "Heineken"],
      ["Emma", "Amstel"],
      ["Emma", "Erdinger"],
    ],
  },
];

export async function buildSampleDb(): Promise<Database> {
  const db = await newEmptyDb();
  db.run(SAMPLE_DDL);
  for (const t of SAMPLE_DATA) {
    const placeholders = t.cols.map(() => "?").join(", ");
    const stmt = db.prepare(
      `INSERT INTO "${t.table}" (${t.cols.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`,
    );
    for (const row of t.rows) stmt.run(row as any);
    stmt.free();
  }
  return db;
}
