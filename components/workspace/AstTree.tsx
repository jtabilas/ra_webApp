"use client";
import type { RANode, BoolExpr, ValueExpr } from "@/lib/ra-parser/ast";

interface Props {
  node: RANode | null;
}

const RA_SYMBOL: Record<RANode["kind"], string> = {
  Relation: "R",
  Select: "σ",
  Project: "π",
  Rename: "ρ",
  Aggr: "γ",
  Join: "⨝",
  Cross: "×",
  Union: "∪",
  Diff: "−",
  Intersect: "∩",
};

function describe(n: RANode): string {
  switch (n.kind) {
    case "Relation":
      return n.name;
    case "Select":
      return `σ_{${describeBool(n.condition)}}`;
    case "Project":
      return `π_{${n.attrs.join(", ")}}`;
    case "Rename": {
      const parts: string[] = [];
      let body: string;
      if (n.mappings && n.mappings.length > 0) {
        body = n.mappings.map((m) => `${m.to} ← ${m.from}`).join(", ");
      } else if (n.attrs) {
        body = n.attrs.join(", ");
      } else {
        body = "*";
      }
      if (n.relAlias) parts.push(`${n.relAlias}: ${body}`);
      else parts.push(body);
      return `ρ_{${parts.join(" ")}}`;
    }
    case "Aggr": {
      const aggs = n.aggs.map((a) => `${a.fn}(${describeValue(a.arg)})`).join(", ");
      const head = n.group.length ? `${n.group.join(", ")}: ${aggs}` : aggs;
      return `γ_{${head}}`;
    }
    case "Join":
      return n.condition ? `⨝_{${describeBool(n.condition)}}` : "⨝";
    case "Cross":
      return "×";
    case "Union":
      return "∪";
    case "Diff":
      return "−";
    case "Intersect":
      return "∩";
  }
}

function describeBool(b: BoolExpr): string {
  switch (b.kind) {
    case "And":
      return `${describeBool(b.left)} ∧ ${describeBool(b.right)}`;
    case "Or":
      return `${describeBool(b.left)} ∨ ${describeBool(b.right)}`;
    case "Not":
      return `¬${describeBool(b.expr)}`;
    case "Cmp":
      return `${describeValue(b.left)} ${b.op} ${describeValue(b.right)}`;
    case "BoolValue":
      return describeValue(b.expr);
  }
}

function describeValue(v: ValueExpr): string {
  switch (v.kind) {
    case "Column":
      return v.name;
    case "Number":
      return String(v.value);
    case "String":
      return `'${v.value}'`;
    case "Date":
      return `DATE '${v.value}'`;
    case "Bool":
      return v.value ? "true" : "false";
    case "Null":
      return "null";
    case "Star":
      return "*";
    case "Bin":
      return `(${describeValue(v.left)} ${v.op} ${describeValue(v.right)})`;
    case "Neg":
      return `-${describeValue(v.expr)}`;
    case "FnCall":
      return `${v.name}(${v.args.map(describeValue).join(", ")})`;
    case "ScalarRA":
      return "(…RA…)";
  }
}

function children(n: RANode): RANode[] {
  switch (n.kind) {
    case "Relation":
      return [];
    case "Select":
    case "Project":
    case "Rename":
    case "Aggr":
      return [n.child];
    case "Join":
    case "Cross":
    case "Union":
    case "Diff":
    case "Intersect":
      return [n.left, n.right];
  }
}

function Node({ n, depth }: { n: RANode; depth: number }) {
  const kids = children(n);
  return (
    <div className="ra-ast-node">
      <div className="flex items-baseline gap-2 py-0.5">
        <span
          className="font-display italic text-accent"
          style={{ fontSize: `${1.1 + (depth === 0 ? 0.3 : 0)}rem` }}
        >
          {RA_SYMBOL[n.kind]}
        </span>
        <span className="font-mono text-sm">{describe(n)}</span>
      </div>
      {kids.length > 0 && (
        <div className="ml-4 border-l border-rule pl-3">
          {kids.map((k, i) => (
            <Node key={i} n={k} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AstTree({ node }: Props) {
  if (!node)
    return (
      <div className="p-6 italic font-display text-ink-faint">
        Esegui una query per visualizzare l'albero della sintassi astratta.
      </div>
    );
  return (
    <div className="p-4 overflow-auto h-full">
      <Node n={node} depth={0} />
    </div>
  );
}
