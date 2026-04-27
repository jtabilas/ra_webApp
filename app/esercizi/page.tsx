import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";

export const metadata = { title: "Esercizi — RA" };

interface Exercise {
  id: number;
  prompt: string;
  hint?: string;
  ra: string;
}

const EX: Exercise[] = [
  {
    id: 1,
    prompt: "Tutti i bar.",
    ra: `Bar;`,
  },
  {
    id: 2,
    prompt: "Birre amate da Amy.",
    ra: `\\project_{beer} \\select_{drinker='Amy'} Likes;`,
  },
  {
    id: 3,
    prompt: "Bar che Ben frequenta più di 2 volte a settimana.",
    ra: `\\project_{bar} \\select_{drinker='Ben' and times_a_week > 2} Frequents;`,
  },
  {
    id: 4,
    prompt: "Quante birre serve ciascun bar?",
    hint: "Usa \\aggr con group-by.",
    ra: `\\aggr_{bar: count(beer)} Serves;`,
  },
  {
    id: 5,
    prompt: "Numero di bar che servono ciascuna birra.",
    ra: `\\aggr_{beer: count(1)} Serves;`,
  },
  {
    id: 6,
    prompt: "Birre amate da chi NON frequenta James Joyce Pub.",
    hint: "Differenza poi join sulle relazioni Drinker / Frequents / Likes.",
    ra: `\\project_{beer} (
  ((\\project_{name} Drinker)
   \\diff
   (\\rename_{name} \\project_{drinker} \\select_{bar='James Joyce Pub'} Frequents))
  \\join_{name=drinker} Likes
);`,
  },
  {
    id: 7,
    prompt: "Birra più economica e bar che la serve.",
    ra: `\\project_{bar, beer}
  \\select_{price = (\\aggr_{min(price)} Serves)} Serves;`,
  },
  {
    id: 8,
    prompt: "Indirizzi dei bevitori che bevono Heineken (almeno una volta).",
    ra: `\\project_{name, address} \\select_{beer='Heineken'} (Drinker \\join_{name=drinker} Likes);`,
  },
  {
    id: 9,
    prompt: "Coppie (bevitore, birra) tali che il bevitore frequenta un bar che la serve.",
    ra: `\\project_{drinker, beer} (Frequents \\join Serves);`,
  },
  {
    id: 10,
    prompt: "Birre prodotte da Heineken.",
    ra: `\\project_{name} \\select_{manf='Heineken'} Beer;`,
  },
  {
    id: 11,
    prompt: "Bevitori che frequentano almeno due bar diversi.",
    hint: "Aggregazione con conteggio. L'alias automatico è count_bar.",
    ra: `\\project_{drinker} \\select_{count_bar > 1} \\aggr_{drinker: count(bar)} Frequents;`,
  },
  {
    id: 12,
    prompt: "Tutte le birre che almeno un bar serve a meno di 3.00.",
    ra: `\\project_{beer} \\select_{price < 3.0} Serves;`,
  },
];

function encodeRA(ra: string): string {
  return encodeURIComponent(ra);
}

export default function EsercziPage() {
  return (
    <div className="min-h-screen relative">
      <header className="border-b border-rule px-6 py-4 flex items-baseline gap-4 bg-paper">
        <Link href="/" className="font-display text-2xl tracking-tightest">
          <span className="italic text-accent">R</span>A
        </Link>
        <span className="smallcaps-serif text-ink-faint">— esercizi</span>
        <Link href="/" className="ml-auto btn btn-ghost text-xs">
          ← workspace
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <p className="smallcaps text-ink-faint mb-3">Vol. 1 · No. 2</p>
          <h1 className="font-display text-display-lg">
            Dodici esercizi
            <span className="italic text-accent"> sul DB Beers</span>
          </h1>
          <hr className="my-5 border-0 h-px bg-ink" />
          <p className="font-display text-lg italic text-ink-muted leading-snug max-w-2xl">
            Le query sono tratte dal lab CompSci 316 (Duke) e dai tutorial radb. Click
            su una soluzione per copiarla negli appunti.
          </p>
        </div>

        <ol className="space-y-10">
          {EX.map((e) => (
            <li key={e.id} className="grid grid-cols-12 gap-6 group">
              <div className="col-span-1 hidden md:block">
                <span className="font-display italic text-5xl text-accent leading-none">
                  {String(e.id).padStart(2, "0")}
                </span>
              </div>
              <article className="col-span-12 md:col-span-11">
                <h2 className="font-display text-xl mb-1 text-ink">
                  <span className="md:hidden footnote-num mr-2">{e.id}.</span>
                  {e.prompt}
                </h2>
                {e.hint && (
                  <p className="text-xs italic font-display text-ink-faint mb-2">
                    suggerimento: {e.hint}
                  </p>
                )}
                <pre className="font-mono text-sm bg-paper-warm border border-rule px-4 py-3 overflow-x-auto whitespace-pre-wrap">
                  {e.ra}
                </pre>
                <div className="mt-2 flex items-center gap-3">
                  <CopyButton text={e.ra} />
                  <a className="text-xs italic font-display text-ink-faint hover:text-accent" href={`/?q=${encodeRA(e.ra)}`}>
                    apri nel workspace →
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
