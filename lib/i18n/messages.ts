// Lightweight i18n. Two locales: it (default) + en. No external deps.

export const locales = ["it", "en"] as const;
export type Locale = (typeof locales)[number];

const it = {
  app: {
    title: "RA — Algebra Relazionale",
    tagline: "Interprete didattico • client-side • nessun upload",
  },
  topbar: {
    activeDb: "Database attivo",
    upload: "Carica DB",
    reset: "Reset",
    download: "Scarica DB",
    theme: "Tema",
    language: "Lingua",
    help: "Aiuto",
    cheatSheet: "Cheat sheet",
    exercises: "Esercizi",
  },
  schema: {
    heading: "Schema",
    relations: "Relazioni",
    attributes: "attributi",
    tuples: "tuple",
    empty: "Nessuna relazione caricata.",
    clickToInsert: "Click per inserire nell'editor",
  },
  editor: {
    heading: "Editor",
    placeholder: "Scrivi qui la tua espressione di algebra relazionale…",
    run: "Esegui",
    runShortcut: "Ctrl/⌘+↵",
    format: "Formatta",
    clear: "Pulisci",
  },
  results: {
    heading: "Risultato",
    sqlTab: "SQL generato",
    astTab: "AST",
    resultsTab: "Risultato",
    empty: "0 tuple",
    rowCount: (n: number, ms: number) =>
      `${n} ${n === 1 ? "tupla" : "tuple"} · ${ms.toFixed(0)} ms`,
    exportCsv: "CSV",
    exportJson: "JSON",
    copyMd: "Copia MD",
    parseError: "Errore di sintassi",
    runError: "Errore di esecuzione",
    runIt: "Esegui una query per vedere il risultato.",
  },
  history: {
    heading: "Cronologia",
    empty: "Nessuna query ancora.",
    star: "Preferito",
    reload: "Ricarica nell'editor",
    clear: "Svuota",
  },
  upload: {
    drop: "Trascina qui un file .db, .sql, .csv o .json",
    or: "oppure",
    pick: "scegli un file",
    loading: "Carico…",
    privacy: "Tutto resta nel tuo browser. Nessun upload server.",
  },
  meta: {
    list: "Comando \\list — relazioni nel database",
    cleared: "Output svuotato.",
    quit: "Comando \\quit — questa è una web app, basta chiudere la scheda 🙂",
    help: "Apri il cheat sheet dal menu in alto.",
  },
  cheat: {
    title: "Cheat sheet RA",
    subtitle: "Tutti gli operatori, in una pagina.",
  },
  exercises: {
    title: "Esercizi",
    subtitle: "Dodici query del lab Duke 316. Click per provarle.",
    tryIt: "Provala",
  },
};

const en: typeof it = {
  app: {
    title: "RA — Relational Algebra",
    tagline: "Educational interpreter • client-side • no upload",
  },
  topbar: {
    activeDb: "Active database",
    upload: "Load DB",
    reset: "Reset",
    download: "Download DB",
    theme: "Theme",
    language: "Language",
    help: "Help",
    cheatSheet: "Cheat sheet",
    exercises: "Exercises",
  },
  schema: {
    heading: "Schema",
    relations: "Relations",
    attributes: "attributes",
    tuples: "tuples",
    empty: "No relations loaded.",
    clickToInsert: "Click to insert into editor",
  },
  editor: {
    heading: "Editor",
    placeholder: "Write your relational algebra expression here…",
    run: "Run",
    runShortcut: "Ctrl/⌘+↵",
    format: "Format",
    clear: "Clear",
  },
  results: {
    heading: "Result",
    sqlTab: "Generated SQL",
    astTab: "AST",
    resultsTab: "Result",
    empty: "0 tuples",
    rowCount: (n: number, ms: number) => `${n} ${n === 1 ? "tuple" : "tuples"} · ${ms.toFixed(0)} ms`,
    exportCsv: "CSV",
    exportJson: "JSON",
    copyMd: "Copy MD",
    parseError: "Syntax error",
    runError: "Execution error",
    runIt: "Run a query to see results.",
  },
  history: {
    heading: "History",
    empty: "No queries yet.",
    star: "Star",
    reload: "Reload in editor",
    clear: "Clear",
  },
  upload: {
    drop: "Drop a .db, .sql, .csv or .json file here",
    or: "or",
    pick: "pick a file",
    loading: "Loading…",
    privacy: "Everything stays in your browser. No server upload.",
  },
  meta: {
    list: "\\list — relations in this database",
    cleared: "Output cleared.",
    quit: "\\quit — this is a web app, just close the tab 🙂",
    help: "Open the cheat sheet from the top menu.",
  },
  cheat: {
    title: "RA Cheat sheet",
    subtitle: "All operators, on one page.",
  },
  exercises: {
    title: "Exercises",
    subtitle: "Twelve queries from the Duke 316 lab. Click to try them.",
    tryIt: "Try it",
  },
};

export const messages = { it, en };
export type Messages = typeof it;
