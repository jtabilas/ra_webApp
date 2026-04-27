// AST types for RA queries.
// Every RA expression evaluates to a relation.
// Conditions are scalar boolean expressions; values are scalar expressions.

export type RANode =
  | { kind: "Relation"; name: string }
  | { kind: "Select"; condition: BoolExpr; child: RANode }
  | { kind: "Project"; attrs: string[]; child: RANode }
  | {
      kind: "Rename";
      relAlias?: string;
      attrs?: string[]; // positional rename — list of new attribute names
      mappings?: { from: string; to: string }[]; // named rename via ← / ->
      child: RANode;
    }
  | { kind: "Aggr"; group: string[]; aggs: AggCall[]; child: RANode }
  | { kind: "Join"; left: RANode; right: RANode; condition?: BoolExpr } // natural join when condition undefined
  | { kind: "Cross"; left: RANode; right: RANode }
  | { kind: "Union"; left: RANode; right: RANode }
  | { kind: "Diff"; left: RANode; right: RANode }
  | { kind: "Intersect"; left: RANode; right: RANode };

export interface AggCall {
  fn: string; // sum | count | avg | min | max
  arg: ValueExpr; // for count(*) we use Star sentinel
  alias?: string; // optional output name
}

export type BoolExpr =
  | { kind: "And"; left: BoolExpr; right: BoolExpr }
  | { kind: "Or"; left: BoolExpr; right: BoolExpr }
  | { kind: "Not"; expr: BoolExpr }
  | { kind: "Cmp"; op: CmpOp; left: ValueExpr; right: ValueExpr }
  | { kind: "BoolValue"; expr: ValueExpr }; // bare value used as predicate

export type CmpOp = "=" | "<>" | "<" | "<=" | ">" | ">=" | "like";

export type ValueExpr =
  | { kind: "Column"; name: string }
  | { kind: "Number"; value: number }
  | { kind: "String"; value: string }
  | { kind: "Date"; value: string }
  | { kind: "Bool"; value: boolean }
  | { kind: "Null" }
  | { kind: "Star" }
  | { kind: "Bin"; op: BinOp; left: ValueExpr; right: ValueExpr }
  | { kind: "Neg"; expr: ValueExpr }
  | { kind: "FnCall"; name: string; args: ValueExpr[] }
  | { kind: "ScalarRA"; expr: RANode }; // scalar subquery

export type BinOp = "+" | "-" | "*" | "/" | "||";

// Top-level statement returned by parse()
export type Statement =
  | { kind: "Query"; expr: RANode; raw: string }
  | { kind: "Meta"; cmd: "list" | "help" | "clear" | "quit" };

// For source mapping in error messages
export interface SourceLoc {
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export interface ParseError {
  message: string;
  loc: SourceLoc;
}

export interface ParseResult {
  statements: Statement[];
  errors: ParseError[];
}
