"use client";
import { useCallback, useRef, useState } from "react";
import { loadAuto } from "@/lib/db/loaders";
import { useDbStore } from "@/lib/store/db-store";
import { messages, type Locale } from "@/lib/i18n/messages";

interface Props {
  locale: Locale;
}

export function DropZone({ locale }: Props) {
  const t = messages[locale];
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const setDb = useDbStore((s) => s.setDb);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setBusy(true);
      setErr(null);
      const res = await loadAuto(files);
      setBusy(false);
      if (!res.ok) setErr(res.error);
      else setDb(res.db, res.sourceLabel);
    },
    [setDb],
  );

  return (
    <div className="px-4 py-3 border-t border-rule">
      <div
        className="dropzone p-4 text-center cursor-pointer"
        data-active={active}
        onDragOver={(e) => {
          e.preventDefault();
          setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setActive(false);
          handleFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      >
        <div className="smallcaps text-ink-muted mb-1">
          {busy ? t.upload.loading : t.upload.drop}
        </div>
        <div className="text-xs text-ink-faint italic font-display">
          {t.upload.or}{" "}
          <span className="not-italic underline decoration-accent underline-offset-4">
            {t.upload.pick}
          </span>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".db,.sqlite,.sqlite3,.sql,.csv,.json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      {err && <p className="mt-2 text-xs text-signal-err font-mono">{err}</p>}
      <p className="mt-2 text-[0.65rem] text-ink-faint italic font-display leading-snug">
        {t.upload.privacy}
      </p>
    </div>
  );
}
