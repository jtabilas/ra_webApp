// Monarch tokenizer + theme for the RA language used by Monaco.
// Designed to feel typographically intentional — not just a generic dark/light editor.

import type * as monaco from "monaco-editor";

export const RA_LANGUAGE_ID = "ra";

export function defineRALanguage(m: typeof monaco) {
  if (m.languages.getLanguages().some((l) => l.id === RA_LANGUAGE_ID)) return;

  m.languages.register({ id: RA_LANGUAGE_ID });

  m.languages.setLanguageConfiguration(RA_LANGUAGE_ID, {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [
      ["{", "}"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
    ],
  });

  m.languages.setMonarchTokensProvider(RA_LANGUAGE_ID, {
    defaultToken: "",
    tokenPostfix: ".ra",
    raKeywords: [
      "select", "project", "rename", "aggr",
      "join", "cross", "union", "diff", "intersect",
      "list", "help", "clear", "quit",
    ],
    keywords: ["and", "or", "not", "like", "true", "false", "null", "DATE"],
    aggFns: ["sum", "count", "avg", "min", "max"],
    operators: ["=", "<>", "<", "<=", ">", ">=", "+", "-", "*", "/", "||"],
    tokenizer: {
      root: [
        [/\/\/[^\n]*/, "comment"],
        [/\/\*/, "comment", "@blockComment"],

        // \keyword
        [
          /\\(select|project|rename|aggr|join|cross|union|diff|intersect|list|help|clear|quit)\b/,
          "keyword.ra",
        ],

        // string
        [/'/, { token: "string.quote", next: "@string" }],

        // dates
        [/\bDATE\b/, "keyword.date"],

        // numbers
        [/\d+\.\d+/, "number.float"],
        [/\d+/, "number"],

        // identifiers / reserved words
        [
          /[A-Za-z_][A-Za-z0-9_]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@aggFns": "type.identifier",
              "@default": "identifier",
            },
          },
        ],

        // structural
        [/[{}()]/, "@brackets"],
        [/[,;:_]/, "delimiter"],

        // arrows (for \rename_{new ← old})
        [/←|<-|→|->/, "operator.arrow"],

        // operators
        [/<>|<=|>=|=|<|>/, "operator.cmp"],
        [/\|\|/, "operator.concat"],
        [/[+\-*/]/, "operator"],

        [/\s+/, "white"],
      ],
      string: [
        [/[^']+/, "string"],
        [/''/, "string.escape"],
        [/'/, { token: "string.quote", next: "@pop" }],
      ],
      blockComment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  } as monaco.languages.IMonarchLanguage);

  m.editor.defineTheme("ra-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a7f72", fontStyle: "italic" },
      { token: "keyword.ra", foreground: "c2381a", fontStyle: "bold" },
      { token: "keyword", foreground: "882510" },
      { token: "keyword.date", foreground: "4b423a", fontStyle: "italic" },
      { token: "type.identifier", foreground: "5b3b18" },
      { token: "string", foreground: "2f5b3a" },
      { token: "string.quote", foreground: "2f5b3a" },
      { token: "string.escape", foreground: "2f5b3a" },
      { token: "number", foreground: "9a6a13" },
      { token: "number.float", foreground: "9a6a13" },
      { token: "operator", foreground: "1a1411" },
      { token: "operator.cmp", foreground: "c2381a" },
      { token: "operator.concat", foreground: "c2381a" },
      { token: "operator.arrow", foreground: "c2381a", fontStyle: "bold" },
      { token: "delimiter", foreground: "4b423a" },
      { token: "identifier", foreground: "1a1411" },
    ],
    colors: {
      "editor.background": "#f3eddf",
      "editor.foreground": "#1a1411",
      "editorLineNumber.foreground": "#8a7f72",
      "editorLineNumber.activeForeground": "#1a1411",
      "editorCursor.foreground": "#c2381a",
      "editor.selectionBackground": "#e6dcc4",
      "editor.lineHighlightBackground": "#efe7d3",
      "editorWhitespace.foreground": "#8a7f7244",
      "editor.findMatchBackground": "#c2381a55",
      "editorBracketMatch.background": "#c2381a22",
      "editorBracketMatch.border": "#c2381a",
      "editorIndentGuide.background1": "#e6dcc4",
      // popup / overlay surfaces — match the editor background so we never
      // see a stray white panel
      "editorWidget.background": "#efe7d3",
      "editorWidget.foreground": "#1a1411",
      "editorWidget.border": "#1a141144",
      "editorSuggestWidget.background": "#efe7d3",
      "editorSuggestWidget.foreground": "#1a1411",
      "editorSuggestWidget.selectedBackground": "#e6dcc4",
      "editorSuggestWidget.border": "#1a141144",
      "editorHoverWidget.background": "#efe7d3",
      "editorHoverWidget.border": "#1a141144",
      "editorOverviewRuler.border": "#1a141122",
    },
  });

  m.editor.defineTheme("ra-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6e665b", fontStyle: "italic" },
      { token: "keyword.ra", foreground: "e35a3a", fontStyle: "bold" },
      { token: "keyword", foreground: "d6917a" },
      { token: "keyword.date", foreground: "b9b0a0", fontStyle: "italic" },
      { token: "type.identifier", foreground: "d6c180" },
      { token: "string", foreground: "9bbf8a" },
      { token: "number", foreground: "d6b25a" },
      { token: "operator.cmp", foreground: "e35a3a" },
      { token: "operator.concat", foreground: "e35a3a" },
      { token: "operator.arrow", foreground: "e35a3a", fontStyle: "bold" },
      { token: "operator", foreground: "ece4d3" },
      { token: "identifier", foreground: "ece4d3" },
      { token: "delimiter", foreground: "b9b0a0" },
    ],
    colors: {
      "editor.background": "#131211",
      "editor.foreground": "#ece4d3",
      "editorLineNumber.foreground": "#6e665b",
      "editorLineNumber.activeForeground": "#ece4d3",
      "editorCursor.foreground": "#e35a3a",
      "editor.selectionBackground": "#221f1c",
      "editor.lineHighlightBackground": "#1a1816",
      "editorBracketMatch.border": "#e35a3a",
      "editorWidget.background": "#1a1816",
      "editorWidget.foreground": "#ece4d3",
      "editorWidget.border": "#ece4d322",
      "editorSuggestWidget.background": "#1a1816",
      "editorSuggestWidget.foreground": "#ece4d3",
      "editorSuggestWidget.selectedBackground": "#221f1c",
      "editorSuggestWidget.border": "#ece4d322",
      "editorHoverWidget.background": "#1a1816",
      "editorHoverWidget.border": "#ece4d322",
    },
  });
}

// Build a completion provider over RA keywords + relation/attribute names.
export function makeRACompletions(
  schema: Record<string, string[]>,
): (m: typeof monaco) => monaco.IDisposable {
  return (m) =>
    m.languages.registerCompletionItemProvider(RA_LANGUAGE_ID, {
      triggerCharacters: ["\\", "{", " ", ","],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const lineContent = model.getLineContent(position.lineNumber);
        // Columns are 1-indexed in Monaco; word.startColumn is the column of
        // the first letter of the typed word. Look at the char *just before* it.
        const charBefore = lineContent.charAt(word.startColumn - 2);
        const hasLeadingBackslash = charBefore === "\\";

        // Range for plain (non-keyword) suggestions — replaces just the word.
        const wordRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        // Range for `\keyword` suggestions — also swallows the leading `\` if
        // the user typed one, so we don't end up with `\\select`.
        const kwRange = hasLeadingBackslash
          ? { ...wordRange, startColumn: word.startColumn - 1 }
          : wordRange;

        const kind = m.languages.CompletionItemKind;
        const opSnippets: monaco.languages.CompletionItem[] = [
          { label: "\\select", kind: kind.Keyword, range: kwRange, insertText: "\\select_{${1:cond}} ${2:R}", insertTextRules: 4, documentation: "Selezione σ" },
          { label: "\\project", kind: kind.Keyword, range: kwRange, insertText: "\\project_{${1:a, b}} ${2:R}", insertTextRules: 4, documentation: "Proiezione π" },
          { label: "\\rename", kind: kind.Keyword, range: kwRange, insertText: "\\rename_{${1:R2:*}} ${2:R}", insertTextRules: 4 },
          { label: "\\aggr", kind: kind.Keyword, range: kwRange, insertText: "\\aggr_{${1:g}: ${2:count(1)}} ${3:R}", insertTextRules: 4 },
          { label: "\\join", kind: kind.Keyword, range: kwRange, insertText: "\\join_{${1:cond}}", insertTextRules: 4 },
          { label: "\\cross", kind: kind.Keyword, range: kwRange, insertText: "\\cross" },
          { label: "\\union", kind: kind.Keyword, range: kwRange, insertText: "\\union" },
          { label: "\\diff", kind: kind.Keyword, range: kwRange, insertText: "\\diff" },
          { label: "\\intersect", kind: kind.Keyword, range: kwRange, insertText: "\\intersect" },
          { label: "\\list", kind: kind.Keyword, range: kwRange, insertText: "\\list" },
          { label: "\\help", kind: kind.Keyword, range: kwRange, insertText: "\\help" },
          { label: "\\clear", kind: kind.Keyword, range: kwRange, insertText: "\\clear" },
        ];

        const relSugs: monaco.languages.CompletionItem[] = Object.keys(schema).map((name) => ({
          label: name,
          kind: kind.Class,
          range: wordRange,
          insertText: name,
          documentation: `Relazione: ${schema[name].join(", ")}`,
        }));

        const attrSet = new Set<string>();
        for (const cols of Object.values(schema)) cols.forEach((c) => attrSet.add(c));
        const attrSugs: monaco.languages.CompletionItem[] = Array.from(attrSet).map((name) => ({
          label: name,
          kind: kind.Field,
          range: wordRange,
          insertText: name,
        }));

        return { suggestions: [...opSnippets, ...relSugs, ...attrSugs] };
      },
    });
}
