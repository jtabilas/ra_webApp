import { compile, parse } from "../lib/ra-parser";

const schema: Record<string, string[]> = {
  Bar: ["name", "address"],
  Beer: ["name", "manf"],
  Drinker: ["name", "address"],
  Frequents: ["drinker", "bar", "times_a_week"],
  Serves: ["bar", "beer", "price"],
  Likes: ["drinker", "beer"],
  GRADISCE: ["bevitore", "birra"],
};

interface Case {
  name: string;
  ra: string;
  expectError?: boolean;
}

const cases: Case[] = [
  { name: "atom: Bar", ra: "Bar;" },
  { name: "select+project Bar", ra: "\\project_{name} \\select_{address='Maple Street'} Bar;" },
  { name: "Q1 esercizi", ra: "Bar;" },
  { name: "Q2 esercizi", ra: "\\project_{beer} \\select_{drinker='Amy'} Likes;" },
  {
    name: "Q3 esercizi (and + numeric)",
    ra: "\\project_{bar} \\select_{drinker='Ben' and times_a_week > 2} Frequents;",
  },
  { name: "Q4 esercizi (aggr+group)", ra: "\\aggr_{bar: count(beer)} Serves;" },
  { name: "Q5 esercizi (aggr group)", ra: "\\aggr_{beer: count(1)} Serves;" },
  {
    name: "Q6 esercizi (diff + rename + join)",
    ra: `\\project_{beer} (
  ((\\project_{name} Drinker)
   \\diff
   (\\rename_{name} \\project_{drinker} \\select_{bar='James Joyce Pub'} Frequents))
  \\join_{name=drinker} Likes
);`,
  },
  {
    name: "Q7 esercizi (scalar subquery)",
    ra: "\\project_{bar, beer} \\select_{price = (\\aggr_{min(price)} Serves)} Serves;",
  },
  {
    name: "Q8 esercizi (theta join)",
    ra: "\\project_{name, address} \\select_{beer='Heineken'} (Drinker \\join_{name=drinker} Likes);",
  },
  { name: "Q9 esercizi (natural join)", ra: "\\project_{drinker, beer} (Frequents \\join Serves);" },
  { name: "Q10 esercizi", ra: "\\project_{name} \\select_{manf='Heineken'} Beer;" },
  {
    name: "Q11 esercizi (count > 1)",
    ra: "\\project_{drinker} \\select_{n > 1} \\aggr_{drinker: count(bar)} Frequents;",
  },
  { name: "Q12 esercizi", ra: "\\project_{beer} \\select_{price < 3.0} Serves;" },
  { name: "rename positional", ra: "\\rename_{n, a} Bar;" },
  { name: "rename arrow ←", ra: "\\rename_{n ← name, a ← address} Bar;" },
  { name: "rename arrow <-", ra: "\\rename_{n <- name} Bar;" },
  { name: "rename arrow ->", ra: "\\rename_{name -> n} Bar;" },
  { name: "rename relation alias", ra: "\\rename_{B: *} Bar;" },
  { name: "rename combined", ra: "\\rename_{B: n, a} Bar;" },
  { name: "cross product", ra: "Bar \\cross Beer;" },
  {
    name: "set ops chained",
    ra: "(\\project_{name} Bar) \\union (\\project_{name} Beer);",
  },
  {
    name: "intersect",
    ra: "(\\project_{drinker} Likes) \\intersect (\\project_{drinker} Frequents);",
  },
  { name: "or condition", ra: "\\select_{drinker='Amy' or drinker='Ben'} Likes;" },
  { name: "not condition", ra: "\\select_{not drinker='Amy'} Likes;" },
  { name: "paren bool", ra: "\\select_{(drinker='Amy' or drinker='Ben') and beer='Amstel'} Likes;" },
  { name: "like", ra: "\\select_{name like 'James%'} Bar;" },
  { name: "concat", ra: "\\select_{drinker || beer = 'AmyHeineken'} Likes;" },
  { name: "arithmetic", ra: "\\select_{price * 2 > 5} Serves;" },
  { name: "neg number", ra: "\\select_{times_a_week > -1} Frequents;" },
  { name: "meta list", ra: "\\list;" },
  { name: "meta clear", ra: "\\clear;" },
  { name: "agg without group", ra: "\\aggr_{count(*)} Bar;" },
  { name: "aggr global avg", ra: "\\aggr_{avg(price), max(price)} Serves;" },
  {
    name: "deeply nested",
    ra: "\\project_{name} \\select_{address='X'} \\rename_{name, address} (\\project_{drinker, address} (Drinker \\join_{name=drinker} Likes));",
  },
  {
    name: "starter from app",
    ra: `// Benvenuto! Eseguito su sample.db (Beers, Duke).
// Cmd/Ctrl+Enter per eseguire.

\\project_{name}
  \\select_{address='Maple Street'} Bar;`,
  },
  {
    name: "user query (italian, arrow rename, self-join)",
    ra: `\\project_{bevitore} (
  \\select_{birra='Amstel'} (GRADISCE)
  \\join_{bevitore=bevitore2}
  \\rename_{bevitore2 ← bevitore, birra2 ← birra} (\\select_{birra='Corona'} (GRADISCE))
);`,
  },
  {
    name: "Q11 fixed (count_bar)",
    ra: "\\project_{drinker} \\select_{count_bar > 1} \\aggr_{drinker: count(bar)} Frequents;",
  },
];

let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const c of cases) {
  const r = compile(c.ra, schema);
  const hasParseErr = r.parseErrors.length > 0;
  const compiledErrors = r.compiled.filter((cc) => cc.error);
  const ok = !hasParseErr && compiledErrors.length === 0;
  if (ok === !c.expectError) {
    pass++;
    process.stdout.write(`PASS  ${c.name}\n`);
    for (const cc of r.compiled) {
      if (cc.statement.kind !== "Meta" && cc.sql) {
        process.stdout.write(`      → ${cc.sql.slice(0, 120)}${cc.sql.length > 120 ? "…" : ""}\n`);
      }
    }
  } else {
    fail++;
    const msgs: string[] = [];
    if (hasParseErr) msgs.push(`PARSE: ${r.parseErrors[0].message}`);
    for (const cc of compiledErrors) if (cc.error) msgs.push(`TRANSL: ${cc.error}`);
    failures.push(`${c.name}\n  RA: ${c.ra}\n  ${msgs.join("\n  ")}`);
    process.stdout.write(`FAIL  ${c.name}\n      ${msgs.join("\n      ")}\n`);
  }
}

console.log(`\n— ${pass}/${pass + fail} passed —`);
if (fail > 0) {
  console.log(`\nFAILURES:\n${failures.join("\n\n")}`);
  process.exit(1);
}
