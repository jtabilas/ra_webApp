import type { CstNode, IToken } from "chevrotain";
import { parserInstance } from "./parser";
import type {
  RANode,
  Statement,
  BoolExpr,
  ValueExpr,
  CmpOp,
  AggCall,
  BinOp,
} from "./ast";

const BaseVisitor = parserInstance.getBaseCstVisitorConstructor();

const stripQuotes = (s: string) => s.slice(1, -1).replace(/''/g, "'");

type RenameItem =
  | { kind: "ident"; name: string }
  | { kind: "map"; from: string; to: string };

function itemsToSpec(
  items: RenameItem[],
): { attrs?: string[]; mappings?: { from: string; to: string }[] } {
  const positional = items.filter((i) => i.kind === "ident");
  const mapped = items.filter((i) => i.kind === "map");
  if (mapped.length > 0 && positional.length > 0) {
    throw new Error(
      "\\rename: non si possono mescolare nomi posizionali e mappature 'new ← old' nello stesso elenco.",
    );
  }
  if (mapped.length > 0) {
    return {
      mappings: mapped.map((i) => ({
        from: (i as { kind: "map"; from: string; to: string }).from,
        to: (i as { kind: "map"; from: string; to: string }).to,
      })),
    };
  }
  return {
    attrs: positional.map((i) => (i as { kind: "ident"; name: string }).name),
  };
}

class RACstVisitor extends BaseVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  program(ctx: any): Statement[] {
    if (!ctx.statement) return [];
    return ctx.statement.map((s: CstNode) => this.visit(s));
  }

  statement(ctx: any): Statement {
    if (ctx.metaCommand) return this.visit(ctx.metaCommand[0]);
    const expr: RANode = this.visit(ctx.raExpr[0]);
    return { kind: "Query", expr, raw: "" };
  }

  metaCommand(ctx: any): Statement {
    const cmd = ctx.KList ? "list" : ctx.KHelp ? "help" : ctx.KClear ? "clear" : "quit";
    return { kind: "Meta", cmd };
  }

  raExpr(ctx: any): RANode {
    let node: RANode = this.visit(ctx.lhs[0]);
    if (ctx.rhs) {
      const ops: IToken[] = ctx.setOp || [];
      ctx.rhs.forEach((r: CstNode, i: number) => {
        const right: RANode = this.visit(r);
        const op = ops[i].tokenType.name;
        if (op === "KUnion") node = { kind: "Union", left: node, right };
        else if (op === "KDiff") node = { kind: "Diff", left: node, right };
        else node = { kind: "Intersect", left: node, right };
      });
    }
    return node;
  }

  joinExpr(ctx: any): RANode {
    let node: RANode = this.visit(ctx.lhs[0]);
    if (ctx.tail) {
      ctx.tail.forEach((tn: CstNode) => {
        const t: { isJoin: boolean; condition?: BoolExpr; right: RANode } = this.visit(tn);
        if (t.isJoin) node = { kind: "Join", left: node, right: t.right, condition: t.condition };
        else node = { kind: "Cross", left: node, right: t.right };
      });
    }
    return node;
  }

  joinTail(ctx: any): { isJoin: boolean; condition?: BoolExpr; right: RANode } {
    const isJoin = !!ctx.KJoin;
    let condition: BoolExpr | undefined;
    if (isJoin && ctx.boolExpr) condition = this.visit(ctx.boolExpr[0]);
    const right: RANode = this.visit(ctx.unaryExpr[0]);
    return { isJoin, condition, right };
  }

  unaryExpr(ctx: any): RANode {
    if (ctx.selectExpr) return this.visit(ctx.selectExpr[0]);
    if (ctx.projectExpr) return this.visit(ctx.projectExpr[0]);
    if (ctx.renameExpr) return this.visit(ctx.renameExpr[0]);
    if (ctx.aggrExpr) return this.visit(ctx.aggrExpr[0]);
    return this.visit(ctx.atom[0]);
  }

  selectExpr(ctx: any): RANode {
    const condition: BoolExpr = this.visit(ctx.boolExpr[0]);
    const child: RANode = this.visit(ctx.unaryExpr[0]);
    return { kind: "Select", condition, child };
  }

  projectExpr(ctx: any): RANode {
    const attrs: string[] = this.visit(ctx.identList[0]);
    const child: RANode = this.visit(ctx.unaryExpr[0]);
    return { kind: "Project", attrs, child };
  }

  renameExpr(ctx: any): RANode {
    const spec: {
      alias?: string;
      attrs?: string[];
      mappings?: { from: string; to: string }[];
    } = this.visit(ctx.renameSpec[0]);
    const child: RANode = this.visit(ctx.unaryExpr[0]);
    return {
      kind: "Rename",
      relAlias: spec.alias,
      attrs: spec.attrs,
      mappings: spec.mappings,
      child,
    };
  }

  renameSpec(ctx: any): {
    alias?: string;
    attrs?: string[];
    mappings?: { from: string; to: string }[];
  } {
    const alias = ctx.alias?.[0]?.image as string | undefined;
    if (alias) {
      if (ctx.Star) return { alias };
      const tail = ctx.tail?.[0] as CstNode | undefined;
      if (!tail) return { alias };
      const items = this.visit(tail);
      return { alias, ...itemsToSpec(items) };
    }
    const list = ctx.renameItemList?.[0] as CstNode | undefined;
    if (!list) return {};
    const items = this.visit(list);
    return itemsToSpec(items);
  }

  renameItemList(ctx: any): RenameItem[] {
    return ctx.renameItem.map((c: CstNode) => this.visit(c));
  }

  renameItem(ctx: any): RenameItem {
    const lhs = (ctx.lhs[0] as IToken).image;
    if (!ctx.arrow) return { kind: "ident", name: lhs };
    const rhs = (ctx.rhs[0] as IToken).image;
    const arrowTok = ctx.arrow[0] as IToken;
    // ← / <-  : new ← old   (lhs = new, rhs = old)
    // → / ->  : old → new   (lhs = old, rhs = new)
    if (arrowTok.tokenType.name === "LArrow") {
      return { kind: "map", to: lhs, from: rhs };
    }
    return { kind: "map", from: lhs, to: rhs };
  }

  aggrExpr(ctx: any): RANode {
    const spec: { group: string[]; aggs: AggCall[] } = this.visit(ctx.aggrSpec[0]);
    const child: RANode = this.visit(ctx.unaryExpr[0]);
    return { kind: "Aggr", group: spec.group, aggs: spec.aggs, child };
  }

  aggrSpec(ctx: any): { group: string[]; aggs: AggCall[] } {
    if (ctx.groupList) {
      const group: string[] = this.visit(ctx.groupList[0]);
      const aggs: AggCall[] = this.visit(ctx.aggList[0]);
      return { group, aggs };
    }
    const aggs: AggCall[] = this.visit(ctx.aggList[0]);
    return { group: [], aggs };
  }

  aggList(ctx: any): AggCall[] {
    return ctx.aggCall.map((c: CstNode) => this.visit(c));
  }

  aggCall(ctx: any): AggCall {
    const fn = (ctx.fn[0] as IToken).image.toLowerCase();
    let arg: ValueExpr;
    if (ctx.Star) arg = { kind: "Star" };
    else arg = this.visit(ctx.valueExpr[0]);
    return { fn, arg };
  }

  atom(ctx: any): RANode {
    if (ctx.raExpr) return this.visit(ctx.raExpr[0]);
    return { kind: "Relation", name: (ctx.Identifier[0] as IToken).image };
  }

  identList(ctx: any): string[] {
    return (ctx.Identifier as IToken[]).map((t) => t.image);
  }

  // ─── Boolean / value ────────────────────────────────────────────────────
  boolExpr(ctx: any): BoolExpr {
    return this.visit(ctx.orExpr[0]);
  }

  orExpr(ctx: any): BoolExpr {
    let node: BoolExpr = this.visit(ctx.lhs[0]);
    if (ctx.rhs) {
      ctx.rhs.forEach((r: CstNode) => {
        node = { kind: "Or", left: node, right: this.visit(r) };
      });
    }
    return node;
  }

  andExpr(ctx: any): BoolExpr {
    let node: BoolExpr = this.visit(ctx.lhs[0]);
    if (ctx.rhs) {
      ctx.rhs.forEach((r: CstNode) => {
        node = { kind: "And", left: node, right: this.visit(r) };
      });
    }
    return node;
  }

  notExpr(ctx: any): BoolExpr {
    if (ctx.notExpr) return { kind: "Not", expr: this.visit(ctx.notExpr[0]) };
    return this.visit(ctx.predicate[0]);
  }

  predicate(ctx: any): BoolExpr {
    if (ctx.boolExpr) return this.visit(ctx.boolExpr[0]);
    return this.visit(ctx.cmpExpr[0]);
  }

  cmpExpr(ctx: any): BoolExpr {
    const left: ValueExpr = this.visit(ctx.lhs[0]);
    if (!ctx.rhs) return { kind: "BoolValue", expr: left };
    const opTok = ctx.op[0] as IToken;
    const right: ValueExpr = this.visit(ctx.rhs[0]);
    const opMap: Record<string, CmpOp> = {
      Eq: "=",
      NotEq: "<>",
      Lt: "<",
      LtEq: "<=",
      Gt: ">",
      GtEq: ">=",
      KLike: "like",
    };
    const op = opMap[opTok.tokenType.name] || "=";
    return { kind: "Cmp", op, left, right };
  }

  valueExpr(ctx: any): ValueExpr {
    return this.visit(ctx.addExpr[0]);
  }

  addExpr(ctx: any): ValueExpr {
    let node: ValueExpr = this.visit(ctx.lhs[0]);
    if (ctx.rhs) {
      const ops: IToken[] = ctx.op || [];
      ctx.rhs.forEach((r: CstNode, i: number) => {
        const right: ValueExpr = this.visit(r);
        const opName = ops[i].tokenType.name;
        const op: BinOp = opName === "Plus" ? "+" : opName === "Minus" ? "-" : "||";
        node = { kind: "Bin", op, left: node, right };
      });
    }
    return node;
  }

  mulExpr(ctx: any): ValueExpr {
    let node: ValueExpr = this.visit(ctx.lhs[0]);
    if (ctx.rhs) {
      const ops: IToken[] = ctx.op || [];
      ctx.rhs.forEach((r: CstNode, i: number) => {
        const right: ValueExpr = this.visit(r);
        const op: BinOp = ops[i].tokenType.name === "Star" ? "*" : "/";
        node = { kind: "Bin", op, left: node, right };
      });
    }
    return node;
  }

  unaryValue(ctx: any): ValueExpr {
    if (ctx.unaryValue) return { kind: "Neg", expr: this.visit(ctx.unaryValue[0]) };
    return this.visit(ctx.primaryValue[0]);
  }

  primaryValue(ctx: any): ValueExpr {
    if (ctx.NumberLiteral) {
      return { kind: "Number", value: parseFloat((ctx.NumberLiteral[0] as IToken).image) };
    }
    if (ctx.StringLiteral) {
      return { kind: "String", value: stripQuotes((ctx.StringLiteral[0] as IToken).image) };
    }
    if (ctx.dateLiteral) return this.visit(ctx.dateLiteral[0]);
    if (ctx.KTrue) return { kind: "Bool", value: true };
    if (ctx.KFalse) return { kind: "Bool", value: false };
    if (ctx.KNull) return { kind: "Null" };
    if (ctx.funcOrColumn) return this.visit(ctx.funcOrColumn[0]);
    if (ctx.scalarRA) return { kind: "ScalarRA", expr: this.visit(ctx.scalarRA[0]) };
    if (ctx.parenVal) return this.visit(ctx.parenVal[0]);
    return { kind: "Null" };
  }

  funcOrColumn(ctx: any): ValueExpr {
    const name = (ctx.Identifier[0] as IToken).image;
    if (!ctx.LParen) return { kind: "Column", name };
    if (ctx.Star) return { kind: "FnCall", name, args: [{ kind: "Star" }] };
    const args: ValueExpr[] = ctx.valueExpr ? ctx.valueExpr.map((c: CstNode) => this.visit(c)) : [];
    return { kind: "FnCall", name, args };
  }

  dateLiteral(ctx: any): ValueExpr {
    return { kind: "Date", value: stripQuotes((ctx.StringLiteral[0] as IToken).image) };
  }
}

export const visitorInstance = new RACstVisitor();
