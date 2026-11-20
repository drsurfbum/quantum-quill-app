import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  MAX_SOURCES,
  SOURCE_CHARS,
  sourceLabels,
  isProse,
  type PickerKind,
  type Snapshot,
  type SourceRef,
  type Workspace,
} from "@shared/workspace-assistant";
import { request } from "./api";

export type WritingSource = { kind: "chapter" | "scene"; id: number; title: string; editor: Editor | null };
export function SourceCard({ source, number }: { source: Snapshot; number?: number }) {
  return (
    <details className="qq-source">
      <summary>
        {number && `[${number}] `}
        {source.title}
        <small>
          {source.version.startsWith("Editor selection") ? "Selected passage" : sourceLabels[source.kind]} ·{" "}
          {source.version} · {source.digest.slice(0, 8)}
        </small>
      </summary>
      <p>{source.text || "(Empty source)"}</p>
    </details>
  );
}
export function Sources({
  base,
  account,
  project,
  workspace,
  writing,
  selected,
  setSelected,
  consent,
  setConsent,
  passage,
  setPassage,
  busy,
}: {
  base: string;
  account: number;
  project: number;
  workspace: Workspace;
  writing?: WritingSource;
  selected: Snapshot[];
  setSelected: (s: Snapshot[]) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
  passage: boolean;
  setPassage: (v: boolean) => void;
  busy: boolean;
}) {
  const [kind, setKind] = useState<PickerKind>(
    workspace === "Storyboard" ? "plot" : workspace === "Story Bible" ? "bible" : "plan",
  );
  const [search, setSearch] = useState(""),
    [titles, setTitles] = useState<{ id: number; title: string }[]>([]);
  const [id, setId] = useState(0),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<SourceRef | null>(null);
  const count = selected.length + Number(passage);
  useEffect(() => {
    const controller = new AbortController();
    setTitles([]);
    setId(0);
    setError("");
    setLoading(true);
    const timer = setTimeout(() => {
      void request(base, account, "/titles?" + new URLSearchParams({ kind, search }), controller.signal)
        .then((r) => r.json())
        .then((rows) => {
          if (!controller.signal.aborted) {
            setTitles(rows);
            setId(rows[0]?.id || 0);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setError("Could not load source titles.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [base, account, kind, search]);
  useEffect(() => {
    if (!pending) return;
    const controller = new AbortController();
    void request(base, account, "/preview", controller.signal, { source: pending, manuscript: consent })
      .then((r) => r.json())
      .then((s) => {
        if (!controller.signal.aborted) setSelected([...selected, s]);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not read this source. Try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(null);
      });
    return () => controller.abort();
  }, [pending, base, account, consent, selected, setSelected]);
  function add(ref: SourceRef) {
    if (count >= MAX_SOURCES || selected.some((s) => s.kind === ref.kind && s.id === ref.id)) return;
    setError("");
    setPending(ref);
  }
  const added = (ref: SourceRef) => selected.some((s) => s.kind === ref.kind && s.id === ref.id);
  return (
    <fieldset disabled={busy || !!pending} className="qq-sources">
      <legend>
        Sources for this question{" "}
        <span>
          {count}/{MAX_SOURCES}
        </span>
      </legend>
      {selected.map((s) => (
        <div className="qq-card-row" key={s.kind + s.id}>
          <SourceCard source={s} />
          <button
            aria-label={"Remove " + s.title}
            onClick={() => setSelected(selected.filter((item) => item !== s))}
          >
            ×
          </button>
        </div>
      ))}
      <div className="qq-source-actions">
        <button
          disabled={count >= MAX_SOURCES || added({ kind: "brief", id: project })}
          onClick={() => add({ kind: "brief", id: project })}
        >
          + Project brief
        </button>
        {writing?.kind === "scene" && (
          <button
            disabled={count >= MAX_SOURCES || added({ kind: "plan", id: writing.id })}
            onClick={() => add({ kind: "plan", id: writing.id })}
          >
            + Current scene plan
          </button>
        )}
      </div>
      <label>
        Look up a source
        <select value={kind} onChange={(e) => setKind(e.target.value as PickerKind)}>
          {(["plan", "plot", "bible", "outline"] as const).map((k) => (
            <option key={k} value={k}>
              {sourceLabels[k]}
            </option>
          ))}
        </select>
      </label>
      <input
        aria-label="Filter source titles"
        maxLength={100}
        placeholder="Filter titles…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="qq-picker">
        <select aria-label="Source title" value={id} onChange={(e) => setId(Number(e.target.value))}>
          {!titles.length && <option value={0}>{loading ? "Loading…" : "No matching titles"}</option>}
          {titles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <button
          disabled={!id || count >= MAX_SOURCES || added({ kind, id })}
          onClick={() => add({ kind, id })}
        >
          Add
        </button>
      </div>
      {writing && (
        <div className="qq-manuscript">
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (!e.target.checked) {
                  setPassage(false);
                  setSelected(selected.filter((s) => !isProse(s.kind)));
                }
              }}
            />{" "}
            Include manuscript text
          </label>
          {consent && (
            <>
              <small>{writing.title}</small>
              <button
                disabled={count >= MAX_SOURCES || added(writing)}
                onClick={() => add({ kind: writing.kind, id: writing.id })}
              >
                + Saved prose excerpt
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={passage}
                  disabled={!passage && count >= MAX_SOURCES}
                  onChange={(e) => setPassage(e.target.checked)}
                />{" "}
                Selected passage at Send
              </label>
              <small>
                Editor text may be unsaved. Select up to {SOURCE_CHARS.toLocaleString()} characters.
              </small>
            </>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
