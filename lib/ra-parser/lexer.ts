import { createToken, Lexer } from "chevrotain";

// ─── Whitespace & comments ──────────────────────────────────────────────────
export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});
export const LineComment = createToken({
  name: "LineComment",
  pattern: /\/\/[^\n]*/,
  group: Lexer.SKIPPED,
});
export const BlockComment = createToken({
  name: "BlockComment",
  pattern: /\/\*[\s\S]*?\*\//,
  group: Lexer.SKIPPED,
});

// ─── RA keywords (backslash-prefixed) ───────────────────────────────────────
// Note: no negative lookahead on `_` because `\select_{...}` is the canonical
// form — the underscore is a separator token consumed right after the keyword.
const k = (name: string, src: string) =>
  createToken({ name, pattern: new RegExp("\\\\" + src + "(?![A-Za-z])") });

export const KSelect = k("KSelect", "select");
export const KProject = k("KProject", "project");
export const KRename = k("KRename", "rename");
export const KAggr = k("KAggr", "aggr");
export const KJoin = k("KJoin", "join");
export const KCross = k("KCross", "cross");
export const KUnion = k("KUnion", "union");
export const KDiff = k("KDiff", "diff");
export const KIntersect = k("KIntersect", "intersect");

// ─── Meta commands ──────────────────────────────────────────────────────────
export const KList = k("KList", "list");
export const KHelp = k("KHelp", "help");
export const KClear = k("KClear", "clear");
export const KQuit = k("KQuit", "quit");

// ─── Identifiers (and reserved words via longer_alt) ────────────────────────
export const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_][A-Za-z0-9_]*/,
});

const reserved = (name: string, src: string) =>
  createToken({ name, pattern: new RegExp(src, "i"), longer_alt: Identifier });

export const KAnd = reserved("KAnd", "and");
export const KOr = reserved("KOr", "or");
export const KNot = reserved("KNot", "not");
export const KLike = reserved("KLike", "like");
export const KDate = reserved("KDate", "DATE");
export const KTrue = reserved("KTrue", "true");
export const KFalse = reserved("KFalse", "false");
export const KNull = reserved("KNull", "null");

// ─── Punctuation & operators ────────────────────────────────────────────────
export const LCurly = createToken({ name: "LCurly", pattern: /\{/ });
export const RCurly = createToken({ name: "RCurly", pattern: /\}/ });
export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const SemiColon = createToken({ name: "SemiColon", pattern: /;/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
// Underscore is used only as a separator in `\op_{ ... }` constructs.
// Lookahead for `{` so it never collides with identifiers like `_foo`.
export const Underscore = createToken({ name: "Underscore", pattern: /_(?=\{)/ });

// Comparison (longer first). Note: arrows must precede `<` / `-` etc.
export const LArrow = createToken({ name: "LArrow", pattern: /←|<-/ });
export const RArrow = createToken({ name: "RArrow", pattern: /→|->/ });
export const NotEq = createToken({ name: "NotEq", pattern: /<>|!=/ });
export const LtEq = createToken({ name: "LtEq", pattern: /<=/ });
export const GtEq = createToken({ name: "GtEq", pattern: />=/ });
export const Lt = createToken({ name: "Lt", pattern: /</ });
export const Gt = createToken({ name: "Gt", pattern: />/ });
export const Eq = createToken({ name: "Eq", pattern: /=/ });

// Arithmetic & concat
export const Concat = createToken({ name: "Concat", pattern: /\|\|/ });
export const Plus = createToken({ name: "Plus", pattern: /\+/ });
export const Minus = createToken({ name: "Minus", pattern: /-/ });
export const Star = createToken({ name: "Star", pattern: /\*/ });
export const Slash = createToken({ name: "Slash", pattern: /\// });

// ─── Literals ───────────────────────────────────────────────────────────────
export const StringLiteral = createToken({
  name: "StringLiteral",
  // single-quoted with '' as escaped quote
  pattern: /'(?:[^']|'')*'/,
});
export const NumberLiteral = createToken({
  name: "NumberLiteral",
  pattern: /\d+(?:\.\d+)?/,
});

// ─── Token order matters: longer / more specific first ──────────────────────
export const allTokens = [
  WhiteSpace,
  LineComment,
  BlockComment,
  // RA keywords (must come before generic identifier; also use word-boundary)
  KSelect, KProject, KRename, KAggr,
  KJoin, KCross, KUnion, KDiff, KIntersect,
  KList, KHelp, KClear, KQuit,
  // Underscore-before-{ marker (must precede Identifier to win against `_`).
  Underscore,
  // Reserved words (longer_alt -> Identifier)
  KAnd, KOr, KNot, KLike, KDate, KTrue, KFalse, KNull,
  Identifier,
  // Punctuation
  LCurly, RCurly, LParen, RParen, Comma, SemiColon, Colon,
  // Arrows (must come before Lt/Gt/Minus to win against `<`, `>`, `-`)
  LArrow, RArrow,
  // Comparison (longer first)
  NotEq, LtEq, GtEq, Lt, Gt, Eq,
  // Arithmetic
  Concat, Plus, Minus, Star, Slash,
  // Literals
  StringLiteral, NumberLiteral,
];

export const RALexer = new Lexer(allTokens, { positionTracking: "full" });
