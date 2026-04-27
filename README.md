<div align="center">

# RA — Algebra Relazionale

### *Interprete didattico di algebra relazionale, in un browser.*

Replica moderna, **client-side**, dei tool [RA 2.0](https://users.cs.duke.edu/~junyang/ra2/)
e [radb](https://users.cs.duke.edu/~junyang/radb/) di Jun Yang (Duke University).

**Niente Java. Niente Python. Niente upload. Solo un browser.**

[Cosa fa](#-cosa-fa) ·
[Sintassi](#-sintassi) ·
[Avvio rapido](#-avvio-rapido) ·
[Architettura](#-architettura) ·
[Roadmap](#-roadmap) ·
[Licenza](#-licenza)

---

</div>

## ✦ Cosa fa

Apri il browser, **carichi il tuo database** (`.db` SQLite, dump `.sql`, `.csv` multipli, `.json`),
e **scrivi query in algebra relazionale** con la sintassi di radb (Duke):

```ra
\project_{name} \select_{address='Maple Street'} Bar;
```

L'interprete:

1. fa il **lex + parsing** della query (Chevrotain),
2. costruisce un **AST**,
3. lo traduce in **SQL** ricorsivamente,
4. esegue lo SQL su **SQLite compilato in WebAssembly** (`sql.js`),
5. mostra **risultato + SQL generato + cronologia**.

Tutto succede nel tuo browser. Nessun byte lascia il client.

---

## ✦ Funzionalità

| Modulo | Cosa fa |
|---|---|
| **Editor RA** | Monaco con syntax highlighting RA dedicato, completion contestuale su relazioni e attributi del DB caricato, snippet per gli operatori, `Ctrl/⌘ + ↵` per eseguire |
| **Parser** | Grammatica Chevrotain con error recovery; supporta tutti gli operatori radb più la notazione testuale `nuovo ← vecchio` per `\rename` |
| **Translator** | RA → SQL via subquery annidate, validazione semantica degli attributi |
| **Engine SQL** | `sql.js` (SQLite + WASM, ~660 KB lazy-loaded), nessuna race condition cross-origin |
| **Schema Explorer** | Albero collassabile con tipi e conteggi tuple; click per inserire una relazione nell'editor |
| **Caricamento DB** | Drag-and-drop di `.db`, `.sqlite`, `.sqlite3`, `.sql`, `.csv` (multipli), `.json`. Inferenza tipi sui CSV (INTEGER/REAL/TEXT/DATE) |
| **Risultati** | Tabella paginata, sort per colonna, filtro testuale, export CSV / JSON |
| **Cronologia** | Persistente in `localStorage` (max 200), star sui preferiti, ricarica al click |
| **i18n** | IT (default) + EN, persistito |
| **Tema** | Light editoriale-scientifico / Dark profondo, persistito |
| **Mobile / iPad** | Sidebar a drawer con backdrop, touch target ≥44px, font editor 16px su touch (no zoom iOS), tabs e header sezione che wrappano |
| **Cheat sheet** | Pagina `/cheat-sheet` con tutti gli operatori, sintassi, traduzione SQL, scorciatoie |
| **Esercizi** | Pagina `/esercizi` con 12 query del lab CompSci 316 (Duke), copia-e-prova in un click |

---

## ✦ Sintassi

Compatibile con **radb 3.0.4** + estensione "freccia" per il rename.

```ra
// Operatori unari
\select_{cond} R                       // selezione σ
\project_{a, b} R                      // proiezione π
\rename_{x, y} R                       // rinomina posizionale
\rename_{x ← a, y ← b} R               // rinomina per nome (anche <- e ->)
\rename_{R2: *} R                      // rinomina solo la relazione
\rename_{R2: a, b} R                   // entrambi
\aggr_{sum(p), avg(p)} R               // aggregazione globale
\aggr_{g: count(1), max(p)} R          // aggregazione + group-by

// Operatori binari
R \join_{cond} S                       // theta-join
R \join S                              // natural join
R \cross S                             // prodotto cartesiano
R \union S
R \diff S                              // differenza (EXCEPT)
R \intersect S

// Condizioni
=  <>  <  <=  >  >=  like
and  or  not
'apici singoli'  42  3.14  DATE '2026-01-01'
||  +  -  *  /

// Comandi meta (in stile radb)
\list;     // elenca le relazioni
\help;     // apre il cheat sheet
\clear;    // svuota l'output
```

### Esempi sul DB di esempio (Beers)

```ra
-- Birre amate da Amy
\project_{beer} \select_{drinker='Amy'} Likes;

-- Bar che Ben frequenta più di 2 volte a settimana
\project_{bar} \select_{drinker='Ben' and times_a_week > 2} Frequents;

-- Birra più economica e bar che la serve (subquery scalare)
\project_{bar, beer}
  \select_{price = (\aggr_{min(price)} Serves)} Serves;
```

---

## ✦ Avvio rapido

Richiede **Node 18+** (testato su 22).

```bash
git clone https://github.com/<utente>/ra_webApp.git
cd ra_webApp
npm install         # postinstall copia automaticamente sql-wasm.wasm in /public
npm run dev         # → http://localhost:3000
```

**Build di produzione:**

```bash
npm run build
npm start
```

**Deploy su Vercel:** push del repo, importa in Vercel, fatto.
La app è interamente statica (`output: static`-friendly), nessuna server function richiesta.

---

## ✦ Architettura

```
[Editor RA] ─► [Lexer] ─► [Parser CST] ─► [Visitor → AST]
                                              │
                                              ▼
                              [Translator AST → SQL]
                                              │
                                              ├──► tab "SQL"
                                              ▼
                                        [sql.js / WASM]
                                              │
                                              ▼
                                  [tabella risultati + cronologia]
```

### Stack

| Cosa | Libreria | Motivo |
|---|---|---|
| Framework | **Next.js 14** App Router + React 18 | SSG + dynamic imports |
| Linguaggio | **TypeScript** strict | Sicurezza dei tipi sul parser/AST |
| Styling | **TailwindCSS** + design system custom | Token-driven, dark mode |
| Editor | **@monaco-editor/react** | Syntax highlighting + completion |
| Parser | **Chevrotain** | Performance, error recovery, CST |
| DB | **sql.js** (SQLite + WASM) | Esecuzione client-side |
| State | **Zustand** | Niente boilerplate, hydratable |
| CSV | **papaparse** | Inferenza tipi affidabile |
| SQL formatter | **sql-formatter** | Pretty-print del SQL generato |

### Struttura

```
ra_webApp/
├── app/
│   ├── page.tsx              # Workspace (editor + risultati)
│   ├── cheat-sheet/page.tsx  # SSG: tutti gli operatori
│   ├── esercizi/page.tsx     # SSG: 12 esercizi del lab Duke
│   ├── layout.tsx            # Tipografia + pre-paint tema
│   └── globals.css           # Design tokens + Monaco overrides
├── components/
│   ├── workspace/
│   │   ├── Workspace.tsx     # Orchestratore client-side
│   │   ├── TopBar.tsx
│   │   ├── SchemaExplorer.tsx
│   │   ├── RAEditor.tsx      # Monaco wrapper
│   │   ├── raMonarch.ts      # Tokenizer + temi RA
│   │   ├── DropZone.tsx
│   │   ├── ResultsTable.tsx
│   │   ├── SqlPreview.tsx
│   │   ├── AstTree.tsx
│   │   └── HistoryPanel.tsx
│   └── CopyButton.tsx
├── lib/
│   ├── ra-parser/
│   │   ├── lexer.ts          # Token Chevrotain
│   │   ├── parser.ts         # Grammatica RA
│   │   ├── visitor.ts        # CST → AST
│   │   ├── ast.ts            # Tipi AST
│   │   ├── translator.ts     # AST → SQL
│   │   └── index.ts
│   ├── db/
│   │   ├── engine.ts         # Wrapper sql.js
│   │   ├── loaders.ts        # .db / .sql / .csv / .json
│   │   └── sample-db.ts      # Bootstrap del DB Beers di Duke
│   ├── store/                # Zustand: db, history, ui
│   └── i18n/messages.ts      # IT + EN
├── public/
│   └── sql-wasm.wasm         # copiato da postinstall
├── scripts/
│   ├── copy-wasm.mjs         # postinstall hook
│   └── smoke-runner.ts       # 38 query reali → parser+translator
├── LICENSE                   # MIT
└── PRD-RA-WebApp.md          # Product Requirements Document
```

### Performance

Misure dopo `npm run build`:

| Route | Bundle | First Load JS |
|---|---:|---:|
| `/` (workspace) | 135 kB | 231 kB |
| `/cheat-sheet` | 175 B | 96 kB |
| `/esercizi` | 440 B | 96 kB |

Monaco e sql.js sono **lazy-loaded** (dynamic import) e non concorrono al First Load
del workspace.

---

## ✦ Privacy

> **Tutto resta nel tuo browser.**
>
> Nessun byte del tuo database viene mai inviato a un server. Lo schema, le tuple,
> le query: tutto vive nella tab del browser, in memoria, finché non la chiudi.
> Se attivi "Mantieni questo DB", il blob viene salvato in **IndexedDB** locale,
> sempre sul tuo dispositivo.

---

## ✦ Roadmap

- [x] v1.0 — MVP completo (operatori radb, sample.db, upload, cronologia, i18n)
- [x] v1.1 — Notazione `←` / `->` per `\rename` per nome
- [x] v1.2 — Responsive iPad / touch
- [ ] v1.3 — PWA (offline + service worker)
- [ ] v1.4 — Tour interattivo al primo accesso (driver.js)
- [ ] v1.5 — Tab "AST" come grafo SVG zoomabile
- [ ] v2.0 — Modalità "verifica" (confronto risultato atteso)

---

## ✦ Test

```bash
# parser end-to-end smoke (38 query reali)
npx tsc -p scripts/tsconfig.smoke.json
node .smoke/scripts/smoke-runner.js
```

Il runner copre tutti gli esercizi del PRD + edge case (rename annidati, sub-query
scalari, set ops chained, condizioni con paren, aggregazioni globali e group-by).

---

## ✦ Crediti

- **[Jun Yang](https://users.cs.duke.edu/~junyang/)** (Duke University) — autore di
  RA 2.0 e radb. La grammatica e la convenzione di sintassi sono derivate dal suo
  lavoro originale.
- **[sql.js](https://sql.js.org/)** — SQLite per WebAssembly.
- **[Chevrotain](https://chevrotain.io/)** — parser combinator JS.
- **[Fraunces](https://github.com/undercase/Fraunces)** — il typeface da display.

---

## ✦ Licenza

[MIT](./LICENSE) © 2026 Patrick Tabilas.

I tool originali di Duke (RA 2.0 e radb) restano sotto le rispettive licenze
dei loro autori; questa app è una **riscrittura indipendente** in TypeScript /
WebAssembly, ispirata alla loro sintassi e ai loro materiali didattici.

---

<div align="center">
<sub>Costruito per studenti di basi di dati ✦</sub>
</div>
