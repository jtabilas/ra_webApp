import type {
  RANode,
  BoolExpr,
  ValueExpr,
  AggCall,
  CmpOp,
} from "./ast";

export type Schema = Record<string, string[]>;

export interface Translation {
  sql: string;
  columns: string[];
}

// Identifier scope resolver — given a column name, returns the SQL fragment
// to emit (possibly qualified, e.g. "_l"."name").
type Scope = (col: string) => string;

const Q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const SQ = (s: string) => `'${s.replace(/'/g, "''")}'`;

const defaultScope: Scope = (col) => Q(col);

export class TranslationError extends Error {}

export function translate(node: RANode, schema: Schema): Translation {
  switch (node.kind) {
    case "Relation": {
      const cols = schema[node.name];
      if (!cols) {
        throw new TranslationError(
          `Relazione "${node.name}" non trovata nel database. Controlla lo schema (case-sensitive).`,
        );
      }
      return { sql: `SELECT * FROM ${Q(node.name)}`, columns: [...cols] };
    }

    case "Select": {
      const inner = translate(node.child, schema);
      const innerScope: Scope = (col) => {
        if (!inner.columns.includes(col)) {
          throw new TranslationError(
            `Attributo "${col}" non disponibile nello schema della sotto-espressione (cols: ${inner.columns.join(", ")}).`,
          );
        }
        return Q(col);
      };
      const cond = translateBool(node.condition, innerScope, schema);
      return {
        sql: `SELECT * FROM (${inner.sql}) WHERE ${cond}`,
        columns: [...inner.columns],
      };
    }

    case "Project": {
      const inner = translate(node.child, schema);
      for (const a of node.attrs) {
        if (!inner.columns.includes(a)) {
          throw new TranslationError(
            `Attributo "${a}" non disponibile per \\project (cols: ${inner.columns.join(", ")}).`,
          );
        }
      }
      return {
        sql: `SELECT DISTINCT ${node.attrs.map(Q).join(", ")} FROM (${inner.sql})`,
        columns: [...node.attrs],
      };
    }

    case "Rename": {
      const inner = translate(node.child, schema);

      // Named mapping form: \rename_{new ← old, ...}
      if (node.mappings && node.mappings.length > 0) {
        const map = new Map(node.mappings.map((m) => [m.from, m.to]));
        for (const m of node.mappings) {
          if (!inner.columns.includes(m.from)) {
            throw new TranslationError(
              `\\rename: l'attributo "${m.from}" non esiste (cols: ${inner.columns.join(", ")}).`,
            );
          }
        }
        const newCols = inner.columns.map((c) => map.get(c) ?? c);
        const list = inner.columns
          .map((c, i) => `${Q(c)} AS ${Q(newCols[i])}`)
          .join(", ");
        return {
          sql: `SELECT ${list} FROM (${inner.sql})`,
          columns: newCols,
        };
      }

      // alias-only → just pass through (alias is informational; SQL scoping handled by subqueries)
      if (!node.attrs) {
        return { sql: inner.sql, columns: [...inner.columns] };
      }
      if (node.attrs.length !== inner.columns.length) {
        throw new TranslationError(
          `\\rename: numero di nuovi attributi (${node.attrs.length}) ≠ numero di attributi della relazione (${inner.columns.length}).`,
        );
      }
      const list = inner.columns
        .map((c, i) => `${Q(c)} AS ${Q(node.attrs![i])}`)
        .join(", ");
      return {
        sql: `SELECT ${list} FROM (${inner.sql})`,
        columns: [...node.attrs],
      };
    }

    case "Aggr": {
      const inner = translate(node.child, schema);
      const innerScope: Scope = (col) => {
        if (!inner.columns.includes(col)) {
          throw new TranslationError(
            `Attributo "${col}" non disponibile per \\aggr.`,
          );
        }
        return Q(col);
      };
      for (const g of node.group) {
        if (!inner.columns.includes(g)) {
          throw new TranslationError(
            `Attributo di group "${g}" non disponibile.`,
          );
        }
      }
      const groupSql = node.group.map(Q).join(", ");
      const aggSqls = node.aggs.map((a) => translateAgg(a, innerScope, schema));
      const selectList = [...node.group.map(Q), ...aggSqls.map((a) => a.sql)].join(", ");
      const groupBy = node.group.length > 0 ? ` GROUP BY ${groupSql}` : "";
      const outCols = [...node.group, ...aggSqls.map((a) => a.alias)];
      return {
        sql: `SELECT ${selectList} FROM (${inner.sql})${groupBy}`,
        columns: outCols,
      };
    }

    case "Join":
    case "Cross": {
      const L = translate(node.left, schema);
      const R = translate(node.right, schema);
      const isNatural = node.kind === "Join" && !node.condition;
      const isTheta = node.kind === "Join" && !!node.condition;

      // Build qualified scope for theta condition. Unambiguous names resolve
      // to whichever side has them; ambiguous default to left (with note).
      const leftSet = new Set(L.columns);
      const rightSet = new Set(R.columns);
      const dualScope: Scope = (col) => {
        if (leftSet.has(col) && rightSet.has(col)) return `_l.${Q(col)}`;
        if (leftSet.has(col)) return `_l.${Q(col)}`;
        if (rightSet.has(col)) return `_r.${Q(col)}`;
        throw new TranslationError(
          `Attributo "${col}" non presente in nessuno dei due operandi del join.`,
        );
      };

      if (isNatural) {
        const shared = L.columns.filter((c) => rightSet.has(c));
        const merged = [...shared, ...L.columns.filter((c) => !shared.includes(c)), ...R.columns.filter((c) => !leftSet.has(c))];
        return {
          sql: `SELECT * FROM (${L.sql}) AS _l NATURAL JOIN (${R.sql}) AS _r`,
          columns: merged,
        };
      }
      // theta or cross product
      const cond = isTheta ? translateBool(node.condition!, dualScope, schema) : null;
      const cols = [...L.columns, ...R.columns]; // may contain duplicates
      // Build select list qualified to preserve both sides
      const selectList = [
        ...L.columns.map((c) => `_l.${Q(c)} AS ${Q(c)}`),
        ...R.columns.map((c) => `_r.${Q(c)} AS ${Q(c)}`),
      ].join(", ");
      const join =
        node.kind === "Cross"
          ? `(${L.sql}) AS _l CROSS JOIN (${R.sql}) AS _r`
          : `(${L.sql}) AS _l INNER JOIN (${R.sql}) AS _r ON ${cond}`;
      return { sql: `SELECT ${selectList} FROM ${join}`, columns: cols };
    }

    case "Union":
    case "Diff":
    case "Intersect": {
      const L = translate(node.left, schema);
      const R = translate(node.right, schema);
      if (L.columns.length !== R.columns.length) {
        throw new TranslationError(
          `Set op: arità incompatibile (${L.columns.length} vs ${R.columns.length}).`,
        );
      }
      const op =
        node.kind === "Union" ? "UNION" : node.kind === "Diff" ? "EXCEPT" : "INTERSECT";
      return {
        sql: `(${L.sql}) ${op} (${R.sql})`,
        columns: [...L.columns],
      };
    }
  }
}

function translateAgg(
  a: AggCall,
  scope: Scope,
  schema: Schema,
): { sql: string; alias: string } {
  const argSql =
    a.arg.kind === "Star" ? "*" : translateValue(a.arg, scope, schema);
  const argLabel =
    a.arg.kind === "Star"
      ? "all"
      : a.arg.kind === "Column"
      ? a.arg.name
      : "expr";
  const alias = a.alias ?? `${a.fn}_${argLabel}`;
  return { sql: `${a.fn}(${argSql}) AS ${Q(alias)}`, alias };
}

function translateBool(b: BoolExpr, scope: Scope, schema: Schema): string {
  switch (b.kind) {
    case "And":
      return `(${translateBool(b.left, scope, schema)} AND ${translateBool(b.right, scope, schema)})`;
    case "Or":
      return `(${translateBool(b.left, scope, schema)} OR ${translateBool(b.right, scope, schema)})`;
    case "Not":
      return `(NOT ${translateBool(b.expr, scope, schema)})`;
    case "Cmp": {
      const lhs = translateValue(b.left, scope, schema);
      const rhs = translateValue(b.right, scope, schema);
      const op = cmpOpToSql(b.op);
      return `${lhs} ${op} ${rhs}`;
    }
    case "BoolValue":
      return translateValue(b.expr, scope, schema);
  }
}

function cmpOpToSql(op: CmpOp): string {
  return op === "like" ? "LIKE" : op;
}

function translateValue(v: ValueExpr, scope: Scope, schema: Schema): string {
  switch (v.kind) {
    case "Column":
      return scope(v.name);
    case "Number":
      return String(v.value);
    case "String":
      return SQ(v.value);
    case "Date":
      return `DATE(${SQ(v.value)})`;
    case "Bool":
      return v.value ? "1" : "0";
    case "Null":
      return "NULL";
    case "Star":
      return "*";
    case "Bin":
      return `(${translateValue(v.left, scope, schema)} ${v.op} ${translateValue(v.right, scope, schema)})`;
    case "Neg":
      return `(-${translateValue(v.expr, scope, schema)})`;
    case "FnCall": {
      const args = v.args.map((a) => translateValue(a, scope, schema)).join(", ");
      return `${v.name}(${args})`;
    }
    case "ScalarRA": {
      const inner = translate(v.expr, schema);
      return `(${inner.sql})`;
    }
  }
}
