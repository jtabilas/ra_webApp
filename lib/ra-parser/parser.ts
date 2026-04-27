import { CstParser, type CstNode, type IToken } from "chevrotain";
import * as T from "./lexer";
import { allTokens } from "./lexer";

class RAParserImpl extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: "full",
    });
    this.performSelfAnalysis();
  }

  public program = this.RULE("program", () => {
    this.MANY(() => this.SUBRULE(this.statement));
  });

  public statement = this.RULE("statement", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.metaCommand) },
      { ALT: () => this.SUBRULE(this.raExpr) },
    ]);
    this.CONSUME(T.SemiColon);
  });

  public metaCommand = this.RULE("metaCommand", () => {
    this.OR([
      { ALT: () => this.CONSUME(T.KList) },
      { ALT: () => this.CONSUME(T.KHelp) },
      { ALT: () => this.CONSUME(T.KClear) },
      { ALT: () => this.CONSUME(T.KQuit) },
    ]);
  });

  // Set ops have lowest precedence among binaries
  public raExpr = this.RULE("raExpr", () => {
    this.SUBRULE(this.joinExpr, { LABEL: "lhs" });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(T.KUnion, { LABEL: "setOp" }) },
        { ALT: () => this.CONSUME(T.KDiff, { LABEL: "setOp" }) },
        { ALT: () => this.CONSUME(T.KIntersect, { LABEL: "setOp" }) },
      ]);
      this.SUBRULE2(this.joinExpr, { LABEL: "rhs" });
    });
  });

  // joinExpr: each iteration is either '\join' optional cond OR '\cross', then unary.
  public joinExpr = this.RULE("joinExpr", () => {
    this.SUBRULE(this.unaryExpr, { LABEL: "lhs" });
    this.MANY(() => this.SUBRULE(this.joinTail, { LABEL: "tail" }));
  });

  public joinTail = this.RULE("joinTail", () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(T.KJoin);
          this.OPTION(() => {
            this.CONSUME(T.Underscore);
            this.CONSUME(T.LCurly);
            this.SUBRULE(this.boolExpr);
            this.CONSUME(T.RCurly);
          });
        },
      },
      { ALT: () => this.CONSUME(T.KCross) },
    ]);
    this.SUBRULE(this.unaryExpr);
  });

  public unaryExpr = this.RULE("unaryExpr", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.selectExpr) },
      { ALT: () => this.SUBRULE(this.projectExpr) },
      { ALT: () => this.SUBRULE(this.renameExpr) },
      { ALT: () => this.SUBRULE(this.aggrExpr) },
      { ALT: () => this.SUBRULE(this.atom) },
    ]);
  });

  public selectExpr = this.RULE("selectExpr", () => {
    this.CONSUME(T.KSelect);
    this.CONSUME(T.Underscore);
    this.CONSUME(T.LCurly);
    this.SUBRULE(this.boolExpr);
    this.CONSUME(T.RCurly);
    this.SUBRULE(this.unaryExpr);
  });

  public projectExpr = this.RULE("projectExpr", () => {
    this.CONSUME(T.KProject);
    this.CONSUME(T.Underscore);
    this.CONSUME(T.LCurly);
    this.SUBRULE(this.identList);
    this.CONSUME(T.RCurly);
    this.SUBRULE(this.unaryExpr);
  });

  public renameExpr = this.RULE("renameExpr", () => {
    this.CONSUME(T.KRename);
    this.CONSUME(T.Underscore);
    this.CONSUME(T.LCurly);
    this.SUBRULE(this.renameSpec);
    this.CONSUME(T.RCurly);
    this.SUBRULE(this.unaryExpr);
  });

  public renameSpec = this.RULE("renameSpec", () => {
    this.OR([
      {
        GATE: () => {
          const a = this.LA(1);
          const b = this.LA(2);
          return a.tokenType === T.Identifier && b.tokenType === T.Colon;
        },
        ALT: () => {
          this.CONSUME(T.Identifier, { LABEL: "alias" });
          this.CONSUME(T.Colon);
          this.OR2([
            { ALT: () => this.CONSUME(T.Star) },
            { ALT: () => this.SUBRULE(this.renameItemList, { LABEL: "tail" }) },
          ]);
        },
      },
      { ALT: () => this.SUBRULE2(this.renameItemList) },
    ]);
  });

  // Either `a, b, c` (positional) or `new <- old, ...` / `old -> new, ...`
  // (named). Mixing the two within one list is rejected at visit time.
  public renameItemList = this.RULE("renameItemList", () => {
    this.SUBRULE(this.renameItem);
    this.MANY(() => {
      this.CONSUME(T.Comma);
      this.SUBRULE2(this.renameItem);
    });
  });

  public renameItem = this.RULE("renameItem", () => {
    this.CONSUME(T.Identifier, { LABEL: "lhs" });
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(T.LArrow, { LABEL: "arrow" }) },
        { ALT: () => this.CONSUME(T.RArrow, { LABEL: "arrow" }) },
      ]);
      this.CONSUME2(T.Identifier, { LABEL: "rhs" });
    });
  });

  public aggrExpr = this.RULE("aggrExpr", () => {
    this.CONSUME(T.KAggr);
    this.CONSUME(T.Underscore);
    this.CONSUME(T.LCurly);
    this.SUBRULE(this.aggrSpec);
    this.CONSUME(T.RCurly);
    this.SUBRULE(this.unaryExpr);
  });

  public aggrSpec = this.RULE("aggrSpec", () => {
    this.OR([
      {
        GATE: () => this.hasGroupColon(),
        ALT: () => {
          this.SUBRULE(this.identList, { LABEL: "groupList" });
          this.CONSUME(T.Colon);
          this.SUBRULE(this.aggList);
        },
      },
      { ALT: () => this.SUBRULE2(this.aggList) },
    ]);
  });

  private hasGroupColon(): boolean {
    let depth = 0;
    for (let i = 1; i < 200; i++) {
      const tok = this.LA(i);
      if (!tok || tok.tokenType === undefined) return false;
      if (tok.tokenType === T.LCurly || tok.tokenType === T.LParen) depth++;
      else if (tok.tokenType === T.RCurly || tok.tokenType === T.RParen) {
        if (depth === 0) return false;
        depth--;
      } else if (tok.tokenType === T.Colon && depth === 0) return true;
    }
    return false;
  }

  public aggList = this.RULE("aggList", () => {
    this.SUBRULE(this.aggCall);
    this.MANY(() => {
      this.CONSUME(T.Comma);
      this.SUBRULE2(this.aggCall);
    });
  });

  public aggCall = this.RULE("aggCall", () => {
    this.CONSUME(T.Identifier, { LABEL: "fn" });
    this.CONSUME(T.LParen);
    this.OR([
      { ALT: () => this.CONSUME(T.Star) },
      { ALT: () => this.SUBRULE(this.valueExpr) },
    ]);
    this.CONSUME(T.RParen);
  });

  public atom = this.RULE("atom", () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(T.LParen);
          this.SUBRULE(this.raExpr);
          this.CONSUME(T.RParen);
        },
      },
      { ALT: () => this.CONSUME(T.Identifier) },
    ]);
  });

  public identList = this.RULE("identList", () => {
    this.CONSUME(T.Identifier);
    this.MANY(() => {
      this.CONSUME(T.Comma);
      this.CONSUME2(T.Identifier);
    });
  });

  // ─── Boolean / value expressions ──────────────────────────────────────────
  public boolExpr = this.RULE("boolExpr", () => {
    this.SUBRULE(this.orExpr);
  });

  public orExpr = this.RULE("orExpr", () => {
    this.SUBRULE(this.andExpr, { LABEL: "lhs" });
    this.MANY(() => {
      this.CONSUME(T.KOr);
      this.SUBRULE2(this.andExpr, { LABEL: "rhs" });
    });
  });

  public andExpr = this.RULE("andExpr", () => {
    this.SUBRULE(this.notExpr, { LABEL: "lhs" });
    this.MANY(() => {
      this.CONSUME(T.KAnd);
      this.SUBRULE2(this.notExpr, { LABEL: "rhs" });
    });
  });

  public notExpr = this.RULE("notExpr", () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(T.KNot);
          this.SUBRULE(this.notExpr);
        },
      },
      { ALT: () => this.SUBRULE(this.predicate) },
    ]);
  });

  // predicate: either a parenthesized boolean expression, or a value-
  // comparison (with optional rhs). We disambiguate `(` between bool-paren
  // and value-paren by lookahead: if the parens contains and/or/not at depth 0
  // before its closing paren, treat as bool.
  public predicate = this.RULE("predicate", () => {
    this.OR([
      {
        GATE: () => this.parenContainsBoolOp(),
        ALT: () => {
          this.CONSUME(T.LParen);
          this.SUBRULE(this.boolExpr);
          this.CONSUME(T.RParen);
        },
      },
      { ALT: () => this.SUBRULE(this.cmpExpr) },
    ]);
  });

  private parenContainsBoolOp(): boolean {
    if (this.LA(1).tokenType !== T.LParen) return false;
    let depth = 1;
    for (let i = 2; i < 400; i++) {
      const t = this.LA(i);
      if (!t || t.tokenType === undefined) return false;
      if (t.tokenType === T.LParen) depth++;
      else if (t.tokenType === T.RParen) {
        depth--;
        if (depth === 0) return false;
      } else if (depth === 1) {
        if (t.tokenType === T.KAnd || t.tokenType === T.KOr || t.tokenType === T.KNot) {
          return true;
        }
      }
    }
    return false;
  }

  public cmpExpr = this.RULE("cmpExpr", () => {
    this.SUBRULE(this.valueExpr, { LABEL: "lhs" });
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(T.Eq, { LABEL: "op" }) },
        { ALT: () => this.CONSUME(T.NotEq, { LABEL: "op" }) },
        { ALT: () => this.CONSUME(T.LtEq, { LABEL: "op" }) },
        { ALT: () => this.CONSUME(T.GtEq, { LABEL: "op" }) },
        { ALT: () => this.CONSUME(T.Lt, { LABEL: "op" }) },
        { ALT: () => this.CONSUME(T.Gt, { LABEL: "op" }) },
        { ALT: () => this.CONSUME(T.KLike, { LABEL: "op" }) },
      ]);
      this.SUBRULE2(this.valueExpr, { LABEL: "rhs" });
    });
  });

  public valueExpr = this.RULE("valueExpr", () => {
    this.SUBRULE(this.addExpr);
  });

  public addExpr = this.RULE("addExpr", () => {
    this.SUBRULE(this.mulExpr, { LABEL: "lhs" });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(T.Plus, { LABEL: "op" }) },
        { ALT: () => this.CONSUME(T.Minus, { LABEL: "op" }) },
        { ALT: () => this.CONSUME(T.Concat, { LABEL: "op" }) },
      ]);
      this.SUBRULE2(this.mulExpr, { LABEL: "rhs" });
    });
  });

  public mulExpr = this.RULE("mulExpr", () => {
    this.SUBRULE(this.unaryValue, { LABEL: "lhs" });
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(T.Star, { LABEL: "op" }) },
        { ALT: () => this.CONSUME(T.Slash, { LABEL: "op" }) },
      ]);
      this.SUBRULE2(this.unaryValue, { LABEL: "rhs" });
    });
  });

  public unaryValue = this.RULE("unaryValue", () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(T.Minus);
          this.SUBRULE(this.unaryValue);
        },
      },
      { ALT: () => this.SUBRULE(this.primaryValue) },
    ]);
  });

  public primaryValue = this.RULE("primaryValue", () => {
    this.OR([
      { ALT: () => this.CONSUME(T.NumberLiteral) },
      { ALT: () => this.CONSUME(T.StringLiteral) },
      { ALT: () => this.SUBRULE(this.dateLiteral) },
      { ALT: () => this.CONSUME(T.KTrue) },
      { ALT: () => this.CONSUME(T.KFalse) },
      { ALT: () => this.CONSUME(T.KNull) },
      { ALT: () => this.SUBRULE(this.funcOrColumn) },
      {
        ALT: () => {
          this.CONSUME(T.LParen);
          this.OR2([
            {
              GATE: () => this.startsRAExpr(),
              ALT: () => this.SUBRULE(this.raExpr, { LABEL: "scalarRA" }),
            },
            { ALT: () => this.SUBRULE(this.valueExpr, { LABEL: "parenVal" }) },
          ]);
          this.CONSUME(T.RParen);
        },
      },
    ]);
  });

  private startsRAExpr(): boolean {
    const t = this.LA(1);
    if (!t) return false;
    const tt = t.tokenType;
    return tt === T.KSelect || tt === T.KProject || tt === T.KRename || tt === T.KAggr;
  }

  public funcOrColumn = this.RULE("funcOrColumn", () => {
    this.CONSUME(T.Identifier);
    this.OPTION(() => {
      this.CONSUME(T.LParen);
      this.OPTION2(() => {
        this.OR([
          { ALT: () => this.CONSUME(T.Star) },
          {
            ALT: () => {
              this.SUBRULE(this.valueExpr);
              this.MANY(() => {
                this.CONSUME(T.Comma);
                this.SUBRULE2(this.valueExpr);
              });
            },
          },
        ]);
      });
      this.CONSUME(T.RParen);
    });
  });

  public dateLiteral = this.RULE("dateLiteral", () => {
    this.CONSUME(T.KDate);
    this.CONSUME(T.StringLiteral);
  });
}

export const parserInstance = new RAParserImpl();
export type RACst = CstNode;
export { RAParserImpl };
export type { IToken };
