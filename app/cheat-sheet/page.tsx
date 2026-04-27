import Link from "next/link";

export const metadata = {
  title: "Cheat sheet — RA",
};

interface Op {
  symbol: string;
  ra: string;
  sql: string;
  desc: string;
}

const OPS: Op[] = [
  {
    symbol: "σ",
    ra: "\\select_{cond} R",
    sql: "SELECT * FROM R WHERE cond",
    desc: "Selezione: filtra le tuple di R che soddisfano la condizione.",
  },
  {
    symbol: "π",
    ra: "\\project_{a, b} R",
    sql: "SELECT DISTINCT a, b FROM R",
    desc: "Proiezione: mantiene solo gli attributi indicati. Set semantics.",
  },
  {
    symbol: "ρ",
    ra: "\\rename_{x, y} R",
    sql: "SELECT a AS x, b AS y FROM R",
    desc: "Rinomina posizionale degli attributi della relazione.",
  },
  {
    symbol: "ρ",
    ra: "\\rename_{x ← a, y ← b} R",
    sql: "SELECT a AS x, b AS y FROM R",
    desc: "Rinomina per nome (notazione testuale): 'nuovo ← vecchio'. Anche con '<-' o 'old → new'.",
  },
  {
    symbol: "ρ",
    ra: "\\rename_{R2: *} R",
    sql: "SELECT * FROM R AS R2",
    desc: "Rinomina la sola relazione (utile in self-join).",
  },
  {
    symbol: "⨝",
    ra: "R \\join_{cond} S",
    sql: "R INNER JOIN S ON cond",
    desc: "Theta-join: prodotto cartesiano + selezione.",
  },
  {
    symbol: "⨝",
    ra: "R \\join S",
    sql: "R NATURAL JOIN S",
    desc: "Natural join: equi-join sugli attributi omonimi.",
  },
  {
    symbol: "×",
    ra: "R \\cross S",
    sql: "R CROSS JOIN S",
    desc: "Prodotto cartesiano.",
  },
  {
    symbol: "∪",
    ra: "R \\union S",
    sql: "R UNION S",
    desc: "Unione (set).",
  },
  {
    symbol: "−",
    ra: "R \\diff S",
    sql: "R EXCEPT S",
    desc: "Differenza insiemistica.",
  },
  {
    symbol: "∩",
    ra: "R \\intersect S",
    sql: "R INTERSECT S",
    desc: "Intersezione insiemistica.",
  },
  {
    symbol: "γ",
    ra: "\\aggr_{sum(p)} R",
    sql: "SELECT sum(p) FROM R",
    desc: "Aggregazione globale (no group-by).",
  },
  {
    symbol: "γ",
    ra: "\\aggr_{g: count(1)} R",
    sql: "SELECT g, count(1) FROM R GROUP BY g",
    desc: "Aggregazione con raggruppamento.",
  },
];

const SHORTCUTS = [
  { keys: "Ctrl/⌘ + ↵", desc: "esegui la query" },
  { keys: "Ctrl/⌘ + /", desc: "commenta la riga" },
  { keys: "Tab", desc: "auto-completamento" },
  { keys: "Ctrl/⌘ + Z", desc: "undo" },
];

export default function CheatSheetPage() {
  return (
    <div className="min-h-screen relative">
      <header className="border-b border-rule px-6 py-4 flex items-baseline gap-4 bg-paper">
        <Link href="/" className="font-display text-2xl tracking-tightest">
          <span className="italic text-accent">R</span>A
        </Link>
        <span className="smallcaps-serif text-ink-faint">— cheat sheet</span>
        <Link href="/" className="ml-auto btn btn-ghost text-xs">
          ← torna al workspace
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-12 gap-6 mb-12">
          <div className="col-span-12 md:col-span-8">
            <p className="smallcaps text-ink-faint mb-3">Vol. 1 · No. 1</p>
            <h1 className="font-display text-display-xl">
              Algebra
              <br />
              <span className="italic text-accent">relazionale</span>
            </h1>
            <hr className="my-6 border-0 h-px bg-ink" />
            <p className="font-display text-xl leading-snug max-w-2xl dropcap">
              Una pagina di riferimento. Ogni operatore è elencato con la sua sintassi
              <em> radb</em>, la traduzione SQL e una descrizione concisa. Tutti gli
              operatori in questa tabella sono supportati dall'interprete.
            </p>
          </div>
          <aside className="col-span-12 md:col-span-4 md:border-l md:border-rule md:pl-6 pt-2">
            <p className="smallcaps text-ink-muted mb-2">Scorciatoie</p>
            <ul className="text-sm space-y-1">
              {SHORTCUTS.map((s) => (
                <li key={s.keys} className="flex items-baseline gap-3">
                  <span className="kbd">{s.keys}</span>
                  <span className="font-display italic text-ink-muted">{s.desc}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <section>
          <h2 className="smallcaps text-ink-muted mb-4">Operatori</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {OPS.map((op, i) => (
              <article key={i} className="border-l-2 border-accent pl-4">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-display italic text-3xl text-accent leading-none">
                    {op.symbol}
                  </span>
                  <span className="footnote-num">№ {String(i + 1).padStart(2, "0")}</span>
                </div>
                <pre className="font-mono text-sm bg-paper-warm border border-rule px-3 py-2 mt-2 mb-1 overflow-x-auto">
                  {op.ra}
                </pre>
                <pre className="font-mono text-xs text-ink-faint px-3 mb-2 overflow-x-auto">
                  {op.sql}
                </pre>
                <p className="font-display text-sm italic text-ink-muted leading-snug">{op.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="smallcaps text-ink-muted mb-4">Condizioni e valori</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="smallcaps-serif text-ink-faint">comparazioni</p>
              <p className="font-mono">= &lt;&gt; &lt; &lt;= &gt; &gt;= like</p>
            </div>
            <div>
              <p className="smallcaps-serif text-ink-faint">connettivi</p>
              <p className="font-mono">and · or · not</p>
            </div>
            <div>
              <p className="smallcaps-serif text-ink-faint">letterali</p>
              <p className="font-mono">'apici' · 42 · 3.14 · DATE '2026-01-01'</p>
            </div>
            <div>
              <p className="smallcaps-serif text-ink-faint">aritmetica</p>
              <p className="font-mono">+ − × ÷</p>
            </div>
            <div>
              <p className="smallcaps-serif text-ink-faint">concatenazione</p>
              <p className="font-mono">||</p>
            </div>
            <div>
              <p className="smallcaps-serif text-ink-faint">comandi</p>
              <p className="font-mono">\list \help \clear</p>
            </div>
          </div>
        </section>

        <footer className="mt-20 pt-6 border-t border-rule text-xs italic font-display text-ink-faint">
          Adattato da <a className="editorial" href="https://users.cs.duke.edu/~junyang/radb/">radb 3.0.4</a> e
          dal corso CompSci 316 di Duke. Sintassi compatibile con esercizi e dispense esistenti.
        </footer>
      </main>
    </div>
  );
}
