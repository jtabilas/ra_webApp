import { RALexer } from "./lexer";
import { parserInstance } from "./parser";
import { visitorInstance } from "./visitor";
import { translate, type Schema, TranslationError, type Translation } from "./translator";
import type { Statement, ParseError, ParseResult } from "./ast";

export type { Statement, Schema, Translation, ParseError, ParseResult };

export interface CompiledStatement {
  statement: Statement;
  sql?: string;
  columns?: string[];
  error?: string;
}

export interface CompileResult {
  compiled: CompiledStatement[];
  parseErrors: ParseError[];
  lexErrors: ParseError[];
}

export function parse(source: string): ParseResult {
  const lexResult = RALexer.tokenize(source);
  parserInstance.input = lexResult.tokens;
  const cst = (parserInstance as any).program();
  const lexErrors: ParseError[] = lexResult.errors.map((e: any) => ({
    message: e.message,
    loc: { startLine: e.line, startColumn: e.column },
  }));
  const parseErrors: ParseError[] = parserInstance.errors.map((e: any) => ({
    message: e.message,
    loc: {
      startLine: e.token?.startLine,
      startColumn: e.token?.startColumn,
      endLine: e.token?.endLine,
      endColumn: e.token?.endColumn,
    },
  }));
  let statements: Statement[] = [];
  if (parseErrors.length === 0 && lexErrors.length === 0 && cst) {
    try {
      statements = visitorInstance.visit(cst) || [];
    } catch (err: any) {
      parseErrors.push({ message: err.message, loc: {} });
    }
  }
  return { statements, errors: [...lexErrors, ...parseErrors] };
}

export function compile(source: string, schema: Schema): CompileResult {
  const { statements, errors } = parse(source);
  const compiled: CompiledStatement[] = statements.map((statement) => {
    if (statement.kind === "Meta") return { statement };
    try {
      const t = translate(statement.expr, schema);
      return { statement, sql: t.sql, columns: t.columns };
    } catch (err: any) {
      return {
        statement,
        error:
          err instanceof TranslationError ? err.message : `Errore di traduzione: ${err.message}`,
      };
    }
  });
  return {
    compiled,
    parseErrors: errors.filter((e) => e.message),
    lexErrors: [],
  };
}

export { TranslationError };
