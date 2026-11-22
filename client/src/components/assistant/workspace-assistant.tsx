import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Feather, X, ArrowUp, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { currentAccount } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  QUESTION_CHARS,
  SOURCE_CHARS,
  type Workspace,
  type Snapshot,
  type Question,
} from "@shared/workspace-assistant";
import { Sources, SourceCard, type WritingSource } from "./sources";
import { readAnswer, request } from "./api";

const suggestions: Record<Workspace, [string, string]> = {
  Write: ["What could raise the tension here?", "Help me find a fresh sensory detail."],
  Outline: ["Where could this scene turn?", "What choice could connect these beats?"],
  Storyboard: ["What might this turning point cost?", "Brainstorm a different path into the next act."],
  "Story Bible": ["What questions would deepen this entry?", "Check these details for contradictions."],
  Overview: ["What promise does this premise make?", "What should I explore in my next writing session?"],
};
type Props = {
  project: number;
  workspace: Workspace;
  writing?: WritingSource;
  slot?: HTMLElement | null;
  referenceVisit?: number;
};
export default function WorkspaceAssistant(props: Props) {
  const { data: user } = useQuery<{ id: number } | null>({ queryKey: ["/api/user"], enabled: false });
  return (
    user && (
      <Assistant
        key={[user.id, props.project, props.workspace, props.writing?.kind, props.writing?.id].join("-")}
        {...props}
        account={user.id}
      />
    )
  );
}
function Drawer({ children, close }: { children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const viewport = window.visualViewport;
    const fit = () => {
      dialog.style.height = (viewport?.height || window.innerHeight) + "px";
      dialog.style.top = (viewport?.offsetTop || 0) + "px";
    };
    fit();
    viewport?.addEventListener("resize", fit);
    viewport?.addEventListener("scroll", fit);
    return () => {
      viewport?.removeEventListener("resize", fit);
      viewport?.removeEventListener("scroll", fit);
      dialog.close();
    };
  }, []);
  return (
    <dialog className="qq-assistant-drawer" ref={ref} aria-label="Workspace assistant" onCancel={close}>
      {children}
    </dialog>
  );
}
type Turn = {
  id: string;
  query: Question;
  answer: string;
  sources: Snapshot[];
  status: "running" | "done" | "failed";
  error?: string;
};
function CitedAnswer({ turn }: { turn: Turn }) {
  const cards = useRef<HTMLDivElement>(null);
  const parts = turn.answer.split(/(\[\d{1,6}\])/g);
  return (
    <>
      <p>
        {parts.map((part, index) => {
          if (!/^\[\d+\]$/.test(part)) return part;
          const number = Number(part.slice(1, -1)),
            source = turn.sources[number - 1];
          if (!source)
            return (
              <span key={index} title="The provider supplied no matching source">
                [source unavailable]
              </span>
            );
          return (
            <button
              key={index}
              className="qq-citation"
              aria-label={`Open source ${number}, ${source.title}`}
              onClick={() => {
                const card = cards.current?.querySelectorAll("details")[number - 1];
                if (card) card.open = true;
              }}
            >
              {part}
            </button>
          );
        })}
      </p>
      <div ref={cards}>
        {turn.sources.map((s, i) => (
          <SourceCard key={i} source={s} number={i + 1} />
        ))}
      </div>
    </>
  );
}
function Assistant({
  account,
  project,
  workspace,
  writing,
  slot,
  referenceVisit,
}: Props & { account: number }) {
  const base = `/api/projects/${project}/assistant`;
  const [open, setOpen] = useState(false),
    [wide, setWide] = useState(() => window.matchMedia?.("(min-width:1200px)").matches ?? false);
  const [provider, setProvider] = useState<string | null | undefined>(),
    [connectionError, setConnectionError] = useState(false);
  const [section, setSection] = useState<"chat" | "sources">("chat"),
    [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Snapshot[]>([]),
    [consent, setConsent] = useState(false),
    [passage, setPassage] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]),
    [error, setError] = useState("");
  const active = useRef<AbortController | null>(null),
    composer = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const readingLatest = useRef(true);
  useLayoutEffect(() => {
    const view = transcript.current;
    if (view && section === "chat" && readingLatest.current) view.scrollTop = view.scrollHeight;
  }, [turns, section]);
  const busy = turns.some((t) => t.status === "running");
  useLayoutEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  useEffect(() => {
    setOpen(false);
  }, [referenceVisit]);
  useEffect(() => {
    const m = window.matchMedia?.("(min-width:1200px)");
    if (!m?.addEventListener) return;
    const changed = () => setWide(m.matches);
    m.addEventListener("change", changed);
    return () => m.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!open) return;
    const c = new AbortController();
    setConnectionError(false);
    void request(base, account, "", c.signal)
      .then((r) => r.json())
      .then((data) => {
        if (!c.signal.aborted) setProvider(data.provider);
      })
      .catch(() => {
        if (!c.signal.aborted) {
          setProvider(null);
          setConnectionError(true);
        }
      });
    return () => c.abort();
  }, [open, base, account]);
  function clearChat() {
    active.current?.abort();
    active.current = null;
    setTurns([]);
    setSelected([]);
    setConsent(false);
    setPassage(false);
    setDraft("");
    setError("");
    setSection("chat");
  }
  function patch(id: string, change: (t: Turn) => Turn) {
    setTurns((ts) => ts.map((t) => (t.id === id ? change(t) : t)));
  }
  function retryAllowed(t: Turn) {
    return (
      (!t.query.manuscript || consent) &&
      (!t.query.passage || passage) &&
      t.query.sources.every((s) => selected.some((chosen) => chosen.digest === s.digest))
    );
  }
  async function send(retry?: Turn) {
    if (active.current || !provider || (retry && !retryAllowed(retry))) return;
    let query = retry?.query;
    if (!query) {
      if (!draft.trim()) return;
      query = {
        workspace,
        question: draft.trim(),
        manuscript: consent,
        sources: selected.map(({ kind, id, digest }) => ({ kind, id, digest })),
      };
      if (passage && writing?.editor && !writing.editor.isDestroyed) {
        const { from, to } = writing.editor.state.selection;
        if (from === to || to - from > SOURCE_CHARS) {
          setError("Select a passage of up to 2,400 characters in the editor, or remove it from Sources.");
          return;
        }
        const text = writing.editor.state.doc.textBetween(from, to, "\n").trim();
        if (!text) {
          setError("The selection has no text.");
          return;
        }
        query.passage = { kind: writing.kind, id: writing.id, text };
      } else if (passage) {
        setError("The editor selection is unavailable.");
        return;
      }
    }
    const id = retry?.id ?? crypto.randomUUID(),
      c = new AbortController();
    active.current = c;
    readingLatest.current = true;
    setError("");
    setSection("chat");
    const turn: Turn = { id, query, answer: "", sources: [], status: "running" };
    setTurns((ts) => (retry ? ts.map((t) => (t.id === id ? turn : t)) : [...ts.slice(-11), turn]));
    if (!retry) setDraft("");
    try {
      const response = await request(base, account, "/ask", c.signal, query);
      await readAnswer(response, (event) => {
        if (c.signal.aborted || active.current !== c || currentAccount() !== account) return;
        patch(id, (t) =>
          event.type === "sources"
            ? { ...t, sources: event.sources }
            : event.type === "text"
              ? { ...t, answer: t.answer + event.text }
              : event.type === "done"
                ? { ...t, status: "done" }
                : t,
        );
      });
    } catch (reason) {
      if (active.current === c && currentAccount() === account)
        patch(id, (t) => ({
          ...t,
          status: "failed",
          error: c.signal.aborted
            ? "Stopped."
            : reason instanceof Error
              ? reason.message
              : "Response interrupted.",
        }));
    } finally {
      if (active.current === c) active.current = null;
    }
  }
  const panel = (
    <section
      onMouseDownCapture={(event) => {
        if (wide && slot && writing?.editor?.isFocused && (event.target as Element).closest("button"))
          event.preventDefault();
      }}
      className="qq-assistant"
      aria-label={workspace + " assistant"}
    >
      <header>
        <div>
          <small>QUANTUM QUILL · {workspace.toUpperCase()}</small>
          <h2>
            <Feather size={18} /> Writing assistant
          </h2>
        </div>
        <button aria-label="Close assistant" onClick={() => setOpen(false)}>
          <X size={18} />
        </button>
      </header>
      <div className="qq-assistant-tabs">
        <button aria-pressed={section === "chat"} onClick={() => setSection("chat")}>
          Chat
        </button>
        <button aria-pressed={section === "sources"} onClick={() => setSection("sources")}>
          <BookOpen size={14} /> Sources ({selected.length + Number(passage)})
        </button>
        <button
          className="qq-new-chat"
          aria-label="Clear conversation and start a new chat"
          onClick={clearChat}
        >
          New chat
        </button>
      </div>
      <div
        ref={transcript}
        className="qq-assistant-scroll"
        onScroll={(e) => {
          const view = e.currentTarget;
          if (section === "chat")
            readingLatest.current = view.scrollHeight - view.clientHeight - view.scrollTop < 32;
        }}
      >
        {section === "sources" ? (
          <Sources
            {...{
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
            }}
          />
        ) : (
          <>
            {!turns.length && (
              <div className="qq-welcome">
                <h3>
                  {workspace === "Write"
                    ? "Think through this scene"
                    : "Think through your " + workspace.toLowerCase()}
                </h3>
                <p>Ask a writing question or choose project sources to discuss.</p>
                {suggestions[workspace].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setDraft(s);
                      composer.current?.focus();
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {turns.map((t) => (
              <article key={t.id}>
                <h3>You</h3>
                <p>{t.query.question}</p>
                <h3>Assistant · suggestions</h3>
                <CitedAnswer turn={t} />
                {t.status === "done" && !draft && (
                  <button
                    className="qq-followup"
                    onClick={() => {
                      const excerpt = t.answer.length > 600 ? t.answer.slice(0, 599) + "…" : t.answer;
                      setDraft(`About your suggestion “${excerpt}”\n\n`);
                      composer.current?.focus({ preventScroll: true });
                    }}
                  >
                    Quote reply in a follow-up
                  </button>
                )}
                {t.status === "failed" && (
                  <div role="status">
                    {t.error}{" "}
                    <button
                      disabled={busy || !provider || !retryAllowed(t)}
                      title="Retry with the original question and sources"
                      onClick={() => void send(t)}
                    >
                      Retry question
                    </button>
                  </div>
                )}
              </article>
            ))}
          </>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          composer.current?.focus({ preventScroll: true });
          void send();
        }}
        className="qq-composer"
      >
        <small role="status">
          {provider === undefined
            ? "Checking availability…"
            : provider === null
              ? connectionError
                ? "Connection unavailable. Reopen to retry."
                : "Assistant unavailable. Provider setup required."
              : busy
                ? "Receiving response…"
                : `Each Send shares only this question and its selected sources with ${provider}.`}
        </small>
        {(selected.length > 0 || passage) && (
          <button className="qq-summary" type="button" onClick={() => setSection("sources")}>
            {[...selected.map((s) => s.title), ...(passage ? ["Editor selection"] : [])].join(" · ")}
          </button>
        )}
        <label className="sr-only" htmlFor="qq-assistant-question">
          Ask the assistant
        </label>
        <textarea
          ref={composer}
          id="qq-assistant-question"
          rows={2}
          maxLength={QUESTION_CHARS}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask the assistant…"
        />
        {error && <small role="alert">{error}</small>}
        <div className="qq-send-row">
          <span>Read-only</span>
          {busy ? (
            <button type="button" onClick={() => active.current?.abort()}>
              Stop response
            </button>
          ) : (
            <button className="qq-send" type="submit" disabled={!draft.trim() || !provider}>
              <ArrowUp size={14} /> Send
            </button>
          )}
        </div>
      </form>
    </section>
  );
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Workspace assistant"
        title="Workspace assistant"
        aria-expanded={open}
        className="shrink-0 px-2"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        <Feather className="w-4 h-4" />
        <span className="hidden lg:inline ml-1">Assistant</span>
      </Button>
      {open &&
        (wide && slot ? (
          createPortal(panel, slot)
        ) : wide && workspace !== "Write" ? (
          <aside className="qq-assistant-dock">{panel}</aside>
        ) : (
          <Drawer close={() => setOpen(false)}>{panel}</Drawer>
        ))}
    </>
  );
}
