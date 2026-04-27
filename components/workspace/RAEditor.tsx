"use client";
import { Editor, type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { defineRALanguage, makeRACompletions, RA_LANGUAGE_ID } from "./raMonarch";
import { useUiStore } from "@/lib/store/ui-store";
import { useDbStore } from "@/lib/store/db-store";
import type { editor } from "monaco-editor";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  onFormat?: () => void;
}

export function RAEditor({ value, onChange, onRun, onFormat }: Props) {
  const theme = useUiStore((s) => s.theme);
  const schemaMap = useDbStore((s) => s.schemaMap);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const completionDisposeRef = useRef<{ dispose: () => void } | null>(null);
  const [mounted, setMounted] = useState(false);
  // Bigger font on touch devices (iPad, phones) for readability + tap accuracy.
  const [fontSize, setFontSize] = useState(14);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setFontSize(mq.matches ? 16 : 14);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  // Register the language & themes BEFORE the editor mounts. Otherwise the
  // first frames render with the default vs-dark theme (wrong colours)
  // until our `ra-dark` / `ra-light` theme is defined in onMount.
  const handleBeforeMount: BeforeMount = useCallback((monacoInstance) => {
    defineRALanguage(monacoInstance);
    monacoRef.current = monacoInstance;
  }, []);

  const handleMount: OnMount = useCallback((ed, monacoInstance) => {
    editorRef.current = ed;
    monacoRef.current = monacoInstance;
    setMounted(true);

    ed.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
      () => onRunRef.current?.(),
    );
  }, []);

  // Stable run callback
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  // Re-register completion provider when schema changes
  useEffect(() => {
    if (!mounted || !monacoRef.current) return;
    completionDisposeRef.current?.dispose();
    completionDisposeRef.current = makeRACompletions(schemaMap)(monacoRef.current);
    return () => completionDisposeRef.current?.dispose();
  }, [schemaMap, mounted]);

  const monacoTheme = theme === "dark" ? "ra-dark" : "ra-light";

  return (
    <div className="monaco-host h-full flex flex-col">
      <Editor
        defaultLanguage={RA_LANGUAGE_ID}
        language={RA_LANGUAGE_ID}
        value={value}
        theme={monacoTheme}
        onChange={(v) => onChange(v ?? "")}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        loading={
          <div className="p-6 font-mono text-sm text-ink-faint">
            <span className="text-accent">{">"}</span> caricamento editor…
          </div>
        }
        options={{
          fontFamily: "var(--font-mono)",
          fontSize: fontSize,
          lineHeight: 1.55,
          fontLigatures: false,
          minimap: { enabled: false },
          renderLineHighlight: "line",
          renderWhitespace: "selection",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          wordWrap: "on",
          padding: { top: 18, bottom: 18 },
          automaticLayout: true,
          stickyScroll: { enabled: false },
          guides: { indentation: false, bracketPairs: false },
          suggest: { preview: true },
          renderLineHighlightOnlyWhenFocus: true,
        }}
      />
    </div>
  );
}

export type RaEditorHandle = {
  setValue: (v: string) => void;
};
