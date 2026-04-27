# PRD — RA Web: Interprete di Algebra Relazionale (Next.js)

**Versione:** 1.0
**Data:** 27 aprile 2026
**Autore:** Patrick
**Stato:** Draft

---

## 1. Executive Summary

**RA Web** è una web app didattica costruita in **Next.js 14+** che replica e moderna l'interprete di algebra relazionale [RA 2.0](https://users.cs.duke.edu/~junyang/ra2/) e [radb](https://users.cs.duke.edu/~junyang/radb/) di Jun Yang (Duke University), eliminando la necessità di Java/Python locali.

Lo studente apre il browser, **carica il proprio database** (SQLite `.db`, dump `.sql`, oppure `.csv`/`.json`), e può eseguire query in **sintassi di algebra relazionale** (`\select_{...}`, `\project_{...}`, `\join`, `\diff`, `\aggr_{...}` ecc.) ricevendo i risultati in forma tabellare insieme alla **traduzione SQL** generata dal parser.

Il tutto gira **interamente client-side** grazie a `sql.js` (SQLite compilato in WebAssembly), quindi:

- nessun backend obbligatorio,
- nessun upload di dati su server (privacy by design),
- deploy statico su Vercel/Netlify a costo zero.

---

## 2. Contesto e Motivazione

### 2.1 Problema
Gli studenti di basi di dati (es. corsi di Fondamenti di Informatica / Basi di Dati nelle università italiane, o corsi come CompSci 316 di Duke) devono praticare l'algebra relazionale prima di passare a SQL. Gli strumenti esistenti hanno frizioni significative:

| Strumento | Problema |
|---|---|
| **RA 2.0 (Java)** | Richiede JDK + JDBC driver + properties file; Mac Intel/ARM hanno spesso problemi di compatibilità Java |
| **radb (Python)** | Richiede `pip install radb`, virtualenv, ambiente Python 3 funzionante |
| **Carta e penna** | Nessun feedback, nessuna verifica di correttezza |
| **Tool online esistenti** | Spesso non supportano upload del proprio DB; sintassi divergente da quella di Duke (lo standard de facto in molti corsi) |

### 2.2 Opportunità
Una web app moderna che:

1. **non richiede installazione** (solo browser),
2. **rispetta la sintassi `radb`** (compatibilità con esercizi e dispense esistenti),
3. **supporta l'upload di database arbitrari** dello studente,
4. **mostra in tempo reale la traduzione RA → SQL** (valore didattico aggiunto rispetto al tool originale).

### 2.3 Riferimenti studiati
- `https://users.cs.duke.edu/~junyang/ra2/` — interprete Java originale (RA 2.0)
- `https://github.com/junyang/RA` — sorgenti Java (grammatica ANTLR in `src/ra/ra.g`)
- `https://users.cs.duke.edu/~junyang/radb/` — versione Python attuale (radb 3.0.4)
- `https://github.com/junyang/radb` — sorgenti Python con grammatica e traduzione SQL

---

## 3. Obiettivi e Non-Obiettivi

### 3.1 Obiettivi (in scope)
1. Replicare la **sintassi RA di Duke** (operatori `\select`, `\project`, `\rename`, `\join`, `\cross`, `\union`, `\diff`, `\intersect`, `\aggr`).
2. Permettere il **caricamento di un database personalizzato** (SQLite, SQL dump, CSV multipli, JSON).
3. Esecuzione **client-side via WebAssembly** (sql.js).
4. Editor **Monaco** con syntax highlighting RA + autocomplete su nomi di relazioni/attributi.
5. **Traduzione RA → SQL visibile** per scopo didattico.
6. **Database di esempio "Beers"** (Bar, Beer, Drinker, Frequents, Serves, Likes) caricato di default — lo stesso usato da Duke e nei tutorial diffusi.
7. **Cronologia query** (history) salvata in `localStorage`.
8. UI **responsive** (desktop primario, tablet/mobile secondari).
9. Modalità **dark/light**.
10. **Internazionalizzazione**: italiano (default) + inglese.

### 3.2 Non-Obiettivi (out of scope per v1)
- ❌ Modifica del DB (`INSERT`/`UPDATE`/`DELETE` lato studente). Solo operazioni di **lettura**.
- ❌ Connessione a DB remoti (PostgreSQL, MySQL via JDBC). Solo SQLite locale.
- ❌ Account utente / collaborazione multi-utente.
- ❌ Autocorrezione automatica delle query (no AI tutor in v1, eventualmente in v2).
- ❌ Esportazione di risultati in formati ricchi (PDF, XLSX) — solo CSV/JSON.

---

## 4. Utenti Target e User Stories

### 4.1 Personas

**Persona A — "Lo studente di triennale" (primario)**
Studente italiano del 2°/3° anno di Informatica / Matematica e AI. Sta studiando basi di dati, ha la dispensa con esercizi di algebra relazionale, vuole esercitarsi senza dover configurare Java o Python sul Mac.

**Persona B — "Il docente / tutor"**
Vuole assegnare esercizi su un DB specifico (es. quello del corso) e mostrare a lezione l'esecuzione live con la traduzione SQL.

### 4.2 User Stories

| ID | Come... | Voglio... | Per... |
|---|---|---|---|
| US-01 | Studente | aprire la web app e vedere già un DB di esempio caricato | iniziare a esercitarmi senza setup |
| US-02 | Studente | caricare il file `sample.db` (SQLite) di Duke trascinandolo nella pagina | usare il dataset ufficiale del corso |
| US-03 | Studente | vedere la lista delle relazioni e dei loro attributi nel DB caricato | sapere su cosa posso fare query |
| US-04 | Studente | scrivere `\project_{name} \select_{bar='Joe''s Bar'} Frequents;` ed eseguirla | praticare l'algebra relazionale |
| US-05 | Studente | vedere la query SQL equivalente generata automaticamente | capire come RA si traduce in SQL |
| US-06 | Studente | ricevere un messaggio di errore comprensibile se sbaglio sintassi | imparare dall'errore |
| US-07 | Studente | rivedere le query precedenti dalla cronologia | riusare e modificare query passate |
| US-08 | Docente | caricare un DB custom con tabelle del mio corso | usare la app a lezione |
| US-09 | Studente | esportare il risultato di una query in CSV | inserirla in una relazione di laboratorio |
| US-10 | Studente | usare la app offline dopo la prima visita (PWA) | studiare in treno/aereo |

---

## 5. Requisiti Funzionali

### 5.1 Modulo "Editor RA" (FR-EDITOR)

- **FR-EDITOR-01** — Editor basato su **Monaco** (lo stesso di VS Code) con tema scuro/chiaro.
- **FR-EDITOR-02** — Syntax highlighting custom per la grammatica RA: keyword `\select`, `\project`, `\rename`, `\join`, `\cross`, `\union`, `\diff`, `\intersect`, `\aggr`, `and`, `or`, `not`, `like`; commenti `//` e `/* ... */`; stringhe con apici singoli; numeri.
- **FR-EDITOR-03** — Autocomplete su:
  - operatori RA (es. digitando `\` mostra il menu),
  - nomi delle relazioni del DB caricato,
  - nomi degli attributi (contestuale alla relazione precedente nel testo, best-effort).
- **FR-EDITOR-04** — Esecuzione query con `Ctrl/Cmd + Enter` o pulsante "Esegui".
- **FR-EDITOR-05** — Pulsante "Formatta" (pretty-printer della query RA con indentazione coerente).
- **FR-EDITOR-06** — Supporto query multilinea; ogni query termina con `;`.
- **FR-EDITOR-07** — Pannello laterale con **cheat sheet** degli operatori (collassabile).

### 5.2 Modulo "Parser & Translator" (FR-PARSER)

- **FR-PARSER-01** — Parser per la grammatica RA implementato con **Chevrotain** (JS) o **PEG.js / peggy**, derivato dalla grammatica ANTLR `ra.g` di Duke.
- **FR-PARSER-02** — Costruzione di un **AST** (RAXNode-equivalente) per la query.
- **FR-PARSER-03** — Traduzione AST → SQL via ricorsione strutturale (una vista SQL per nodo, esattamente come in `RAXNode.java` originale).
- **FR-PARSER-04** — Operatori supportati in v1:

| Operatore RA | Sintassi | Traduzione SQL |
|---|---|---|
| Selezione | `\select_{cond} R` | `SELECT * FROM R WHERE cond` |
| Proiezione | `\project_{a, b} R` | `SELECT DISTINCT a, b FROM R` |
| Rinomina attributi | `\rename_{x, y} R` | `SELECT a AS x, b AS y FROM R` |
| Rinomina relazione | `\rename_{R2: *} R` | `SELECT * FROM R AS R2` |
| Theta-join | `R \join_{cond} S` | `R INNER JOIN S ON cond` |
| Natural join | `R \join S` | `R NATURAL JOIN S` |
| Cross product | `R \cross S` | `R CROSS JOIN S` |
| Unione | `R \union S` | `R UNION S` |
| Differenza | `R \diff S` | `R EXCEPT S` |
| Intersezione | `R \intersect S` | `R INTERSECT S` |
| Aggregazione | `\aggr_{sum(p)} R` | `SELECT sum(p) FROM R` |
| Group-by | `\aggr_{g: count(1)} R` | `SELECT g, count(1) FROM R GROUP BY g` |

- **FR-PARSER-05** — Supporto a:
  - condizioni con `=`, `<>`, `<`, `<=`, `>`, `>=`, `like`,
  - connettivi `and`, `or`, `not`,
  - letterali stringa (apici singoli), numeri, date `DATE 'YYYY-MM-DD'`,
  - operatore di concatenazione `||`,
  - aritmetica `+ - * /`.
- **FR-PARSER-06** — Errori di sintassi con **riga, colonna e suggerimento** (es. *"riga 3, col 12: atteso `}` dopo lista attributi"*).
- **FR-PARSER-07** — Validazione semantica: l'attributo nella `\select` deve esistere nello schema; messaggio chiaro altrimenti.

### 5.3 Modulo "Database" (FR-DB) ⭐ FUNZIONALITÀ CHIAVE

- **FR-DB-01** — **Esecuzione client-side** del SQL generato tramite `sql.js` (SQLite WASM). Nessun dato lascia il browser.
- **FR-DB-02** — **DB di default** caricato all'avvio: replica del `sample.db` di Duke (Bar, Beer, Drinker, Frequents, Serves, Likes) con dataset identico a quello di `sample.ra`.
- **FR-DB-03** — **Caricamento DB personalizzato** tramite area drag-and-drop + file picker. Formati supportati:

  | Formato | Estensione | Comportamento |
  |---|---|---|
  | SQLite binary | `.db`, `.sqlite`, `.sqlite3` | Caricato direttamente in sql.js |
  | SQL dump | `.sql` | Eseguito statement-by-statement su un DB sql.js vuoto |
  | CSV singolo | `.csv` | Crea tabella con nome = nome file (sanitizzato); inferenza tipi (INTEGER/REAL/TEXT/DATE) sulle prime 100 righe |
  | CSV multipli | più `.csv` insieme | Una tabella per file |
  | JSON | `.json` (array di oggetti, o `{table: [...]}` ) | Una tabella per chiave |
  | ZIP | `.zip` contenente i sopra | Estratto e processato in batch |

- **FR-DB-04** — **Limite dimensione** in v1: 50 MB per file (warning a 25 MB). Configurabile.
- **FR-DB-05** — Pannello **"Schema Explorer"** (sidebar sinistra) che mostra ad albero:
  - Database
    - Relazione (es. *Beer*)
      - Attributi con tipo (es. *name : TEXT*, *manf : TEXT*)
      - Numero di tuple (badge)
- **FR-DB-06** — Click su una relazione → inserisce `RelName;` nell'editor (per anteprima rapida).
- **FR-DB-07** — Comandi meta in stile radb:
  - `\list;` → elenca le relazioni (output testuale identico a radb),
  - `\help;` → apre il pannello cheat sheet,
  - `\clear;` → svuota l'output.
- **FR-DB-08** — **Persistenza opzionale**: checkbox "Mantieni questo DB" → salva il blob in **IndexedDB** del browser; al ricaricamento della pagina viene riproposto.
- **FR-DB-09** — Pulsante **"Reset"** per tornare al DB di esempio.
- **FR-DB-10** — Pulsante **"Scarica DB attuale"** (esporta come `.sqlite`).

### 5.4 Modulo "Risultati" (FR-RESULTS)

- **FR-RESULTS-01** — Tabella risultati paginata (default 100 righe/pagina) con:
  - intestazione di colonna = nome attributo + tipo,
  - ordinamento per colonna,
  - filtro testuale rapido sopra la tabella,
  - conteggio totale tuple (es. *"42 tuple in 18 ms"*).
- **FR-RESULTS-02** — **Tab "SQL generato"** mostra il SQL tradotto, leggibile e formattato (con `sql-formatter`).
- **FR-RESULTS-03** — **Tab "Albero AST"** opzionale (modalità avanzata) che visualizza l'AST della query come albero — utile a lezione.
- **FR-RESULTS-04** — Esportazione risultato in **CSV** e **JSON**.
- **FR-RESULTS-05** — Copia risultato negli appunti come tabella Markdown / LaTeX (utile per relazioni accademiche).

### 5.5 Modulo "Cronologia" (FR-HISTORY)

- **FR-HISTORY-01** — Cronologia query salvata in `localStorage` (max 200 entry).
- **FR-HISTORY-02** — Ogni entry ha: query RA, SQL generato, timestamp, durata, numero tuple, esito (ok/errore).
- **FR-HISTORY-03** — Click su una entry → ricarica la query nell'editor.
- **FR-HISTORY-04** — Possibilità di "stellare" query come preferite.
- **FR-HISTORY-05** — Esportazione cronologia in `.json` e import sulla stessa o altra macchina.

### 5.6 Modulo "Onboarding & Aiuto" (FR-HELP)

- **FR-HELP-01** — Tour interattivo al primo accesso (libreria tipo `driver.js`) di 6-8 step.
- **FR-HELP-02** — Pagina `/cheat-sheet` con tutti gli operatori, esempi e shortcut da tastiera.
- **FR-HELP-03** — Pagina `/esercizi` con 12 query di esempio (le stesse del lab CSC365 e di Duke 316), ognuna con bottone "Provala".

---

## 6. Requisiti Non Funzionali

| Categoria | Requisito |
|---|---|
| **Performance** | TTI < 2 s su connessione 4G. Esecuzione query su `sample.db` < 100 ms. |
| **Sicurezza** | Nessun upload server-side. CSP stretta. Sandbox WASM. Sanitizzazione nomi tabella da CSV. |
| **Privacy** | Zero tracking di default. Nessun cookie analitico senza consenso esplicito. Banner cookie minimo (Plausible/Umami self-hosted opzionali). |
| **Accessibilità** | WCAG 2.1 AA. Tutto navigabile da tastiera. Contrasto AA su entrambi i temi. ARIA su tabella risultati. |
| **Compatibilità browser** | Ultime 2 versioni di Chrome, Firefox, Safari, Edge. Safari su MacBook Air Intel deve funzionare. |
| **i18n** | i18next con bundle `it.json` (default) e `en.json`. |
| **Offline** | PWA (service worker via `next-pwa`) con cache di app shell + sample.db. |
| **Bundle size** | < 500 KB JS iniziale (escluso WASM di sql.js, lazy-loaded). |
| **SEO** | Meta tag corretti, sitemap, OG image. Pagine `/cheat-sheet` ed `/esercizi` SSG. |
| **Logging errori** | Sentry opzionale, off di default. |

---

## 7. Architettura Tecnica

### 7.1 Stack
- **Framework:** Next.js 14+ (App Router) + React 18 + TypeScript strict.
- **Styling:** TailwindCSS + shadcn/ui.
- **Editor:** `@monaco-editor/react`.
- **DB engine:** `sql.js` (SQLite ↔ WASM, ~1 MB).
- **Parser RA:** `chevrotain` (parser combinator JS, ottime performance, error recovery built-in).
- **State:** Zustand (semplice, no boilerplate).
- **Persistenza locale:** `idb` (wrapper IndexedDB) per blob DB; `localStorage` per cronologia.
- **CSV parsing:** `papaparse`.
- **SQL formatter:** `sql-formatter`.
- **i18n:** `next-intl`.
- **PWA:** `next-pwa` o Serwist.
- **Test:** Vitest (unit), Playwright (e2e).
- **Lint/format:** ESLint + Prettier + Husky.

### 7.2 Struttura cartelle (proposta)

```
ra-web/
├── app/
│   ├── (main)/
│   │   ├── page.tsx              // workspace principale
│   │   ├── cheat-sheet/page.tsx
│   │   └── esercizi/page.tsx
│   ├── layout.tsx
│   └── api/                      // (vuota in v1, riservata per v2)
├── components/
│   ├── editor/RAEditor.tsx
│   ├── editor/raMonarchTokens.ts // syntax highlighting
│   ├── schema/SchemaExplorer.tsx
│   ├── results/ResultsTable.tsx
│   ├── results/SqlPreview.tsx
│   ├── results/AstTree.tsx
│   ├── upload/DropZone.tsx
│   └── history/HistoryPanel.tsx
├── lib/
│   ├── ra-parser/
│   │   ├── lexer.ts              // chevrotain tokens
│   │   ├── parser.ts             // grammar
│   │   ├── ast.ts                // node types
│   │   └── translator.ts         // AST -> SQL
│   ├── db/
│   │   ├── engine.ts             // wrapper sql.js
│   │   ├── loaders.ts            // sqlite/sql/csv/json loaders
│   │   └── sample-db.ts          // bootstrap del sample.db
│   └── store/                    // Zustand stores
├── public/
│   ├── sql-wasm.wasm
│   └── sample.db
├── tests/
└── package.json
```

### 7.3 Diagramma di flusso runtime

```
[Utente scrive query RA]
        │
        ▼
[Lexer Chevrotain] ──errori lessicali──► UI
        │
        ▼
[Parser → AST]    ──errori sintattici──► UI
        │
        ▼
[Validatore semantico (schema check)] ──errori semantici──► UI
        │
        ▼
[Translator AST → SQL]
        │
        ├──► UI tab "SQL generato"
        │
        ▼
[sql.js (WASM) esegue su DB in memoria]
        │
        ▼
[Formatter risultati] ──► UI tabella + cronologia
```

### 7.4 Flusso di caricamento DB

```
File trascinato/selezionato
        │
        ▼
   Mime/extension check
        │
   ┌────┼─────┬─────┬──────┐
   ▼    ▼     ▼     ▼      ▼
.sqlite .sql .csv .json  .zip
   │    │     │     │      │
   │    │     │     │   unzip + ricorsione
   │    │     │     │
   │    │  papaparse + tipo-inferenza
   │    │     │
   │    │  sql.js: CREATE TABLE + INSERT batch
   │    │
   │  sql.js: db.run(text)
   │
sql.js: new Database(uint8array)
        │
        ▼
   Schema Explorer aggiornato + autocomplete refresh
        │
        ▼
   (opz.) salvataggio in IndexedDB
```

---

## 8. UX / UI

### 8.1 Layout principale (desktop)

```
┌──────────────────────────────────────────────────────────────┐
│ Topbar: logo │ DB attivo: sample.db ▾ │ tema │ lingua │ help │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│   Schema     │                Editor RA                      │
│   Explorer   │  ┌──────────────────────────────────────────┐ │
│              │  │ \project_{name}                          │ │
│ ▾ sample.db  │  │   \select_{bar='Joe''s Bar'} Frequents;  │ │
│   ▾ Bar (3)  │  └──────────────────────────────────────────┘ │
│   ▾ Beer (5) │  [Esegui Ctrl+↵]  [Formatta]  [Pulisci]       │
│   ▾ Drinker  ├───────────────────────────────────────────────┤
│   ▾ Frequents│  Tabs: [ Risultati | SQL generato | AST ]     │
│              │  ┌──────────────────────────────────────────┐ │
│ + Carica DB  │  │  name                                    │ │
│              │  │  ────                                    │ │
│              │  │  Amy                                     │ │
│              │  │  Ben                                     │ │
│              │  └──────────────────────────────────────────┘ │
│              │  3 tuple · 12 ms · [⬇ CSV] [⬇ JSON]           │
├──────────────┴───────────────────────────────────────────────┤
│ Cronologia (collapse) ▾                                      │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 Mobile (≤768px)
- Schema explorer in drawer laterale (icona hamburger).
- Editor full-width, risultati in tab sotto.
- Cronologia in fondo, sempre collassata di default.

### 8.3 Stati chiave da disegnare in Figma
1. Stato vuoto (DB di default appena caricato).
2. Drag-over di un file.
3. Caricamento DB in corso (skeleton).
4. Errore di parsing con sottolineatura rossa nell'editor.
5. Errore di esecuzione SQL.
6. Risultato vuoto (0 tuple).
7. Risultato troncato (>10k tuple).

---

## 9. Roadmap e Milestone

### Sprint 1 — Fondamenta (1 settimana)
- Setup Next.js + TS + Tailwind + shadcn.
- Integrazione sql.js, caricamento `sample.db`.
- Schema Explorer base.

### Sprint 2 — Parser RA (2 settimane) 🔥 punto critico
- Grammatica Chevrotain per `\select`, `\project`, `\join`, `\cross`, `\union`, `\diff`, `\intersect`, `\rename`.
- Translator → SQL.
- Test unitari sui 12 esercizi del lab CSC365.

### Sprint 3 — Editor & Risultati (1 settimana)
- Monaco + syntax highlighting + autocomplete.
- Tabella risultati + tab SQL.
- Cronologia.

### Sprint 4 — Upload DB (1 settimana) ⭐ requisito chiave
- Drop-zone, loader SQLite/SQL/CSV/JSON.
- Persistenza IndexedDB.

### Sprint 5 — Aggregazioni & rifiniture (1 settimana)
- `\aggr` con e senza group-by.
- Pagina cheat sheet, esercizi, tour.
- i18n IT/EN.

### Sprint 6 — Polish & deploy (3-5 giorni)
- PWA, dark mode finale, accessibilità, e2e Playwright.
- Deploy Vercel + dominio.

**Totale:** ~6-7 settimane part-time per uno sviluppatore singolo.

---

## 10. Metriche di Successo

| KPI | Target v1 |
|---|---|
| Tempo da apertura pagina a prima query eseguita | < 30 s |
| Tasso query con errore di parsing al primo tentativo (autovalutazione) | < 25% |
| Esercizi del lab Duke completabili con la app | 12/12 |
| Compatibilità browser top 4 | 100% |
| Punteggio Lighthouse (Performance/Accessibility/Best Practices) | ≥ 90 |
| Bug critici post-rilascio nei primi 30 gg | < 3 |

---

## 11. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| Parser RA complesso, edge case sui `\rename` annidati | Alta | Alto | Suite di test estesa basata su esercizi reali; partire dalla grammatica ANTLR di Duke come riferimento |
| `sql.js` lento su DB grandi (>10MB) | Media | Medio | Limite UI 50MB; warning utente; lazy-load WASM; web worker per non bloccare UI |
| Differenze tra dialetto SQL di SQLite e SQL standard usato dal translator | Media | Medio | Test di compatibilità; eventuale strato di traduzione per `EXCEPT`/`INTERSECT` (SQLite li supporta) |
| CSV malformati causano crash | Alta | Basso | Validazione papaparse; messaggio chiaro all'utente |
| Memoria browser saturata da DB caricato + risultati | Bassa | Alto | Streaming results, paginazione lato JS, `Database.close()` esplicito |
| Studente carica file con info sensibili pensando ci sia un upload server | Bassa | Alto | Banner ben visibile *"Tutto rimane sul tuo browser"* + link a documentazione tecnica |

---

## 12. Open Questions

1. **Supportare SQL puro come fallback** (tab "SQL libero")? Utile per docenti, ma allarga lo scope.
2. **Modalità "verifica"**: l'app confronta il risultato dello studente con quello atteso di un esercizio. v2?
3. **Condivisione query via URL** (query encoded in querystring)? Utile per i tutor.
4. **Integrazione GitHub Pages** come alternativa a Vercel per studenti senza carta di credito.
5. Quale licenza? **MIT** suggerita (RA originale è open source).

---

## 13. Appendice A — Cheat Sheet RA (riferimento per implementazione)

```
\select_{cond} R          // selezione σ
\project_{a, b, ...} R    // proiezione π
\rename_{a, b, ...} R     // rinomina attributi
\rename_{R2:*} R          // rinomina relazione
\rename_{R2: a, b} R      // entrambi
R \join_{cond} S          // theta-join
R \join S                 // natural join
R \cross S                // prodotto cartesiano
R \union S                // unione ∪
R \diff S                 // differenza –
R \intersect S            // intersezione ∩
\aggr_{sum(p), avg(p)} R                  // aggregazione globale
\aggr_{group: count(1), avg(p)} R         // group-by

// Condizioni: =, <>, <, <=, >, >=, like
// Connettivi: and, or, not
// Stringhe: 'apici singoli'
// Concat: ||
// Comandi: \list;  \help;  \clear;  \quit;
// Commenti: //  e  /* ... */
```

---

## 14. Appendice B — Schema `sample.db` di Duke (DB di default)

```sql
CREATE TABLE Bar(name TEXT PRIMARY KEY, address TEXT);
CREATE TABLE Beer(name TEXT PRIMARY KEY, manf TEXT);
CREATE TABLE Drinker(name TEXT PRIMARY KEY, address TEXT);
CREATE TABLE Frequents(drinker TEXT, bar TEXT, times_a_week INT,
  PRIMARY KEY(drinker, bar));
CREATE TABLE Serves(bar TEXT, beer TEXT, price REAL,
  PRIMARY KEY(bar, beer));
CREATE TABLE Likes(drinker TEXT, beer TEXT,
  PRIMARY KEY(drinker, beer));
```

---

## 15. Appendice C — Esempi di query da supportare (test acceptance)

```ra
-- Q1: Tutti i bar
Bar;

-- Q2: Birre amate da Amy
\project_{beer} \select_{drinker='Amy'} Likes;

-- Q3: Bar che Ben frequenta più di 2 volte a settimana
\project_{bar} \select_{drinker='Ben' and times_a_week > 2} Frequents;

-- Q4: Birre amate da chi NON frequenta James Joyce Pub (esempio Duke)
\project_{beer} (
  ((\project_{name} Drinker)
   \diff
   (\rename_{name} \project_{drinker} \select_{bar='James Joyce Pub'} Frequents))
  \join_{name=drinker} Likes
);

-- Q5: Numero di bar che servono ogni birra
\aggr_{beer: count(1)} Serves;

-- Q6: Birra più economica e bar che la serve
\project_{bar, beer}
  \select_{price = (\aggr_{min(price)} Serves)} Serves;
```

---

**Fine PRD v1.0**
