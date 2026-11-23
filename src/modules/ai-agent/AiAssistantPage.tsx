import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dropdown, Modal, message as toast } from "antd";
import {
  BulbOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  LockOutlined,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import "@/modules/dashboard/styles/dashboard.scss";
import { StorageService } from "@/storage";
import Composer, { type PendingFile, readDocument } from "./Composer";
import MessageView from "./MessageView";
import SettingsDrawer from "./SettingsDrawer";
import {
  type AiAction,
  type AiChat,
  type AiMe,
  type AiMessage,
  apiError,
  decideAction,
  deleteChat,
  getChat,
  getMe,
  listChats,
  renameChat,
  sendDocument,
  sendMessage,
  whenText,
} from "./aiApi";
import "./ai.scss";

const stored = (key: string) => {
  try {
    return JSON.parse(new StorageService().getItem(key) || "{}") || {};
  } catch {
    return {};
  }
};
const THINKING = ["Thinking…", "Looking things up…", "Checking your records…", "Putting it together…"];
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** The AI Assistant: chats on the left, the conversation on the right, settings for admins. */
const AiAssistantPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const chatParam = Number(params.get("chat")) || null;
  const company = useMemo(() => stored(StorageService.STORAGE_KEYS.COMPANY_DETAILS)?.name || "Your company", []);
  const firstName = useMemo(() => {
    const u = stored(StorageService.STORAGE_KEYS.USER_DETAILS);
    return String(u?.firstName || u?.first_name || "").trim();
  }, []);

  const [me, setMe] = useState<AiMe | null>(null);
  const [meFailed, setMeFailed] = useState(false);
  const [chats, setChats] = useState<AiChat[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [actions, setActions] = useState<Map<number, AiAction>>(new Map());
  const [loadingChat, setLoadingChat] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState<PendingFile | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingDoc, setSendingDoc] = useState(false);
  const [deciding, setDeciding] = useState<Set<number>>(new Set());
  const [focusKey, setFocusKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [thinking, setThinking] = useState(0);
  const [editing, setEditing] = useState<{ id: number; title: string } | null>(null);
  const seq = useRef(0);
  const threadRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellHeight, setShellHeight] = useState<number | null>(null);

  // The chat fills the rest of the screen, whatever the header and hero take,
  // so the message box is always in view without scrolling the page.
  useLayoutEffect(() => {
    const fit = () => {
      const el = shellRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setShellHeight(Math.max(420, Math.min(1100, Math.round(window.innerHeight - top - 16))));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [me]);

  const loadMe = useCallback(async () => {
    setMeFailed(false);
    try {
      setMe(await getMe());
    } catch (e) {
      setMeFailed(true);
      toast.error(apiError(e, "Couldn't open the assistant"));
    }
  }, []);
  const loadChats = useCallback(() => listChats().then(setChats).catch(() => undefined), []);
  useEffect(() => {
    loadMe();
    loadChats();
  }, [loadMe, loadChats]);

  const loadChat = useCallback(async (id: number | null) => {
    const mine = ++seq.current;
    setActiveId(id);
    if (!id) {
      setMessages([]);
      setActions(new Map());
      setLoadingChat(false);
      return;
    }
    setLoadingChat(true);
    try {
      const d = await getChat(id);
      if (mine !== seq.current) return;
      setMessages(d.messages);
      setActions(new Map(d.actions.map((a) => [a.id, a])));
    } catch (e) {
      if (mine !== seq.current) return;
      toast.error(apiError(e, "Couldn't open that chat"));
      setActiveId(null);
      setMessages([]);
    } finally {
      if (mine === seq.current) setLoadingChat(false);
    }
  }, []);

  // The chat in the address (?chat=) — on first load and on back / forward.
  useEffect(() => {
    if (chatParam !== activeId) loadChat(chatParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatParam]);

  const openChat = (id: number | null) => {
    setListOpen(false);
    setEditing(null);
    const next = new URLSearchParams(params);
    if (id) next.set("chat", String(id));
    else next.delete("chat");
    setParams(next);
  };
  const newChat = () => {
    openChat(null);
    setText("");
    setFile(null);
    setFocusKey((k) => k + 1);
  };

  // Keep the newest message in view — inside the chat only, so the page itself never jumps.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 1 ? "smooth" : "auto" });
  }, [messages.length, sending, actions]);
  useEffect(() => {
    if (!sending) return;
    setThinking(0);
    const t = setInterval(() => setThinking((i) => (i + 1) % THINKING.length), 2400);
    return () => clearInterval(t);
  }, [sending]);

  const send = async (override?: string) => {
    const body = (override ?? text).trim();
    const f = override !== undefined ? null : file;
    if (sending || (!body && !f)) return;
    const tempId = -Date.now();
    const conv = activeId;
    setMessages((m) => [...m, { id: tempId, role: "user", content: body, meta: f ? { document: { name: f.name } } : {}, created_at: new Date().toISOString(), pending: true }]);
    if (override === undefined) {
      setText("");
      setFile(null);
    }
    setSending(true);
    setSendingDoc(!!f);
    try {
      const r = f ? await sendDocument(f, body, conv) : await sendMessage(body, conv);
      setMessages((m) => [...m.filter((x) => x.id !== tempId), r.user_message, r.reply]);
      setActions((prev) => {
        const n = new Map(prev);
        r.actions.forEach((a) => n.set(a.id, a));
        return n;
      });
      setMe((prev) => (prev ? { ...prev, usage: r.usage } : prev));
      setChats((list) => {
        const cur = list.find((c) => c.id === r.conversation.id);
        return [
          { id: r.conversation.id, title: r.conversation.title, updated_at: r.reply.created_at, messages: (cur?.messages || 0) + 2 },
          ...list.filter((c) => c.id !== r.conversation.id),
        ];
      });
      if (r.conversation.id !== conv) {
        seq.current += 1; // the chat is already on screen — don't reload it
        setActiveId(r.conversation.id);
        const next = new URLSearchParams(params);
        next.set("chat", String(r.conversation.id));
        setParams(next, { replace: true });
      }
    } catch (e: any) {
      // Nothing was answered: take the message back so it can be sent again.
      setMessages((m) => m.filter((x) => x.id !== tempId));
      if (override === undefined) {
        setText(body);
        setFile(f);
      }
      const code = e?.response?.data?.code;
      if (code === "DAILY_LIMIT") setMe((prev) => (prev ? { ...prev, usage: { ...prev.usage, sent: prev.usage.limit, left: 0, blocked: true } } : prev));
      toast.error(apiError(e, "Couldn't send that. Try again."));
    } finally {
      setSending(false);
      setSendingDoc(false);
      setFocusKey((k) => k + 1);
    }
  };

  const decide = async (a: AiAction, d: "confirm" | "cancel") => {
    setDeciding((s) => new Set(s).add(a.id));
    try {
      const r = await decideAction(a.id, d);
      setActions((prev) => new Map(prev).set(r.action.id, r.action));
      if (r.message) setMessages((m) => [...m, r.message!]);
      if (d === "confirm") {
        if (r.action.status === "DONE") toast.success(r.action.result || "Done");
        else toast.error(r.action.result || "That didn't work");
      }
    } catch (e: any) {
      toast.error(apiError(e, d === "confirm" ? "Couldn't do it" : "Couldn't cancel it"));
      if (activeId && e?.response?.status === 409) loadChat(activeId);
    } finally {
      setDeciding((s) => {
        const n = new Set(s);
        n.delete(a.id);
        return n;
      });
    }
  };

  const saveTitle = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) return setEditing(null);
    try {
      await renameChat(editing.id, title);
      setChats((list) => list.map((c) => (c.id === editing.id ? { ...c, title } : c)));
    } catch (e) {
      toast.error(apiError(e, "Couldn't rename the chat"));
    }
    setEditing(null);
  };
  const removeChat = (c: AiChat) =>
    Modal.confirm({
      title: `Delete “${c.title}”?`,
      content: "The chat and its messages are deleted. Changes the assistant already made stay, and so does the activity log.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteChat(c.id);
          setChats((list) => list.filter((x) => x.id !== c.id));
          if (activeId === c.id) openChat(null);
          toast.success("Chat deleted");
        } catch (e) {
          toast.error(apiError(e, "Couldn't delete the chat"));
        }
      },
    });

  const pick = (s: { prompt: string }) => {
    if (s.prompt.endsWith(" ")) {
      setText(s.prompt);
      setFocusKey((k) => k + 1);
    } else send(s.prompt);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && me?.can.use) setFile(await readDocument(f));
  };

  if (!me) {
    return (
      <div className="db-root ai-root">
        <div className="db-hero skeleton ai-hero-sk">
          {meFailed && (
            <div className="ai-failed">
              Couldn't open the assistant.
              <button type="button" className="db-btn white" onClick={loadMe}>
                <ReloadOutlined /> Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const allowed = me.abilities.flatMap((g) => g.items.filter((i) => i.allowed));
  const blockedCount = me.abilities.reduce((s, g) => s + g.items.filter((i) => !i.allowed).length, 0);
  const lookUpOnly = !me.settings.allow_changes;
  const blocked = !me.ready
    ? "The assistant isn't set up on this server yet — an AI provider key is missing."
    : !me.can.use
      ? 'You can read your chats, but talking to the assistant needs the "Use AI Assistant" permission. Ask your admin.'
      : me.usage.blocked
        ? `You've used all ${me.usage.limit} messages for today. It starts again at midnight.`
        : null;
  const usedShare = me.usage.limit ? Math.min(100, (me.usage.sent / me.usage.limit) * 100) : 0;
  const active = chats.find((c) => c.id === activeId);
  const lastBot = [...messages].reverse().find((m) => m.role === "assistant");
  const lastUser = [...messages].reverse().find((m) => m.role === "user" && !m.pending);

  return (
    <div className="db-root ai-root">
      {/* ── Hero ── */}
      <div className="db-hero ai-hero">
        <div className="db-hero-orb a" />
        <div className="db-hero-orb b" />
        <div className="db-hero-grid" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              AI Assistant
              <span className="db-hero-company">{company}</span>
            </div>
            <div className="db-hero-title">
              <span className="db-hero-icon">
                <RobotOutlined />
              </span>
              Ask SameBook
              <span className={`ai-usage-chip${me.usage.blocked ? " out" : ""}`} title="Your messages today">
                {me.usage.sent}/{me.usage.limit} today
              </span>
            </div>
            <div className="db-hero-sub">
              Ask about customers, stock, quotations, challans and invoices — or let it do the work. It only does what your role allows, and asks before anything risky.
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-meter">
              <div className="db-hero-meter-top">
                <span className="db-hero-meter-label">Your messages today</span>
                <b>
                  {me.usage.sent} / {me.usage.limit}
                </b>
              </div>
              <div className="db-hero-track" role="img" aria-label={`${me.usage.sent} of ${me.usage.limit} messages used today`}>
                <span style={{ width: `${usedShare}%` }} />
              </div>
              <div className="db-hero-meter-foot">
                <span>{me.usage.blocked ? "Used up — starts again at midnight" : `${me.usage.left} left today`}</span>
              </div>
            </div>
            <div className="db-hero-btns">
              {me.can.configure && (
                <button type="button" className="db-btn glass" onClick={() => setSettingsOpen(true)}>
                  <SettingOutlined /> Settings
                </button>
              )}
              <button type="button" className="db-btn white" onClick={newChat}>
                <PlusOutlined /> New chat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="ai-shell" ref={shellRef} style={shellHeight ? { height: shellHeight } : undefined}>
        {/* ── Chats ── */}
        {listOpen && <div className="ai-scrim" onClick={() => setListOpen(false)} aria-hidden />}
        <aside className={`ai-chats${listOpen ? " open" : ""}`} aria-label="Your chats">
          <div className="ai-chats-head">
            <b>Your chats</b>
            <button type="button" className="ai-btn primary sm" onClick={newChat}>
              <PlusOutlined /> New
            </button>
          </div>
          <ul className="ai-chat-list">
            {chats.map((c) => (
              <li key={c.id} className={c.id === activeId ? "active" : undefined}>
                {editing?.id === c.id ? (
                  <form
                    className="ai-rename"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveTitle();
                    }}
                  >
                    <input
                      autoFocus
                      value={editing.title}
                      maxLength={120}
                      onChange={(e) => setEditing({ id: c.id, title: e.target.value })}
                      onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                      aria-label="Chat name"
                    />
                    <button type="submit" className="ai-icon-btn" aria-label="Save name">
                      <CheckOutlined />
                    </button>
                    <button type="button" className="ai-icon-btn" aria-label="Cancel" onClick={() => setEditing(null)}>
                      <CloseOutlined />
                    </button>
                  </form>
                ) : (
                  <>
                    <button type="button" className="ai-chat-item" onClick={() => openChat(c.id)} aria-current={c.id === activeId ? "true" : undefined}>
                      <MessageOutlined />
                      <span className="ai-chat-title">{c.title}</span>
                      <em>{whenText(c.updated_at)}</em>
                    </button>
                    <Dropdown
                      trigger={["click"]}
                      menu={{
                        items: [
                          { key: "rename", icon: <EditOutlined />, label: "Rename", onClick: () => setEditing({ id: c.id, title: c.title }) },
                          { key: "delete", icon: <DeleteOutlined />, label: "Delete", danger: true, onClick: () => removeChat(c) },
                        ],
                      }}
                    >
                      <button type="button" className="ai-icon-btn ai-chat-more" aria-label={`More for ${c.title}`}>
                        <EllipsisOutlined />
                      </button>
                    </Dropdown>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!chats.length && <p className="ai-chats-empty">Your chats will show up here.</p>}
        </aside>

        {/* ── Conversation ── */}
        <section
          className={`ai-panel${dragging ? " dragging" : ""}`}
          onDragOver={(e) => {
            if (!me.can.use || !e.dataTransfer?.types?.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDragging(false);
          }}
          onDrop={onDrop}
          aria-label="Conversation"
        >
          <div className="ai-panel-head">
            <button type="button" className="ai-icon-btn ai-list-toggle" aria-label="Show your chats" onClick={() => setListOpen(true)}>
              <UnorderedListOutlined />
            </button>
            <b className="ai-panel-title">{active?.title || "New chat"}</b>
            {lookUpOnly && (
              <span className="ai-badge" title="Your admin has set the assistant to look things up only">
                <LockOutlined /> Look-up only
              </span>
            )}
          </div>

          <div className="ai-thread" aria-live="polite" ref={threadRef}>
            {loadingChat ? (
              <div className="ai-thread-loading">
                <span className="ai-dots">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ) : messages.length ? (
              messages.map((m) => (
                <React.Fragment key={m.id}>
                  <MessageView message={m} actions={actions} canDecide={me.can.use} deciding={deciding} onDecide={decide} />
                  {m.meta?.error && m === lastBot && lastUser && !sending && !blocked && (
                    <div className="ai-retry">
                      <button type="button" className="ai-btn ghost sm" onClick={() => send(lastUser.content)} disabled={!lastUser.content}>
                        <ReloadOutlined /> Try again
                      </button>
                    </div>
                  )}
                </React.Fragment>
              ))
            ) : (
              <div className="ai-empty">
                <div className="ai-empty-icon">
                  <RobotOutlined />
                </div>
                <h2>
                  {greeting()}
                  {firstName ? `, ${firstName}` : ""}
                </h2>
                <p>Ask a question or tell me what to do — in English, Hindi or Marathi.</p>
                {me.suggestions.length > 0 && !blocked && (
                  <div className="ai-suggest">
                    {me.suggestions.map((s) => (
                      <button key={s.title} type="button" className="ai-suggest-card" onClick={() => pick(s)}>
                        <BulbOutlined />
                        <b>{s.title}</b>
                        <span>{s.prompt.trim()}…</span>
                      </button>
                    ))}
                  </div>
                )}
                <details className="ai-can">
                  <summary>
                    What I can do for you ({allowed.length}){blockedCount ? ` · ${blockedCount} need permissions you don't have` : ""}
                  </summary>
                  <div className="ai-can-groups">
                    {me.abilities.map((g) => (
                      <div key={g.group} className="ai-can-group">
                        <b>{g.group}</b>
                        <ul>
                          {g.items.map((i) => (
                            <li key={i.name} className={i.allowed ? "yes" : "no"} title={i.why}>
                              {i.allowed ? <CheckOutlined /> : <LockOutlined />} {i.label}
                              {i.allowed && i.kind === "confirm" && <em>asks first</em>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
            {sending && (
              <div className="ai-msg bot typing">
                <span className="ai-avatar bot" aria-hidden>
                  <RobotOutlined />
                </span>
                <div className="ai-typing">
                  <span className="ai-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  {sendingDoc ? "Reading the document…" : THINKING[thinking]}
                </div>
              </div>
            )}
          </div>

          <Composer text={text} onText={setText} file={file} onFile={setFile} busy={sending} blocked={blocked} focusKey={focusKey} onSend={() => send()} />
          {dragging && <div className="ai-drop">Drop a photo or PDF to make a quotation from it</div>}
        </section>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={() => loadMe()} />
    </div>
  );
};

export default AiAssistantPage;
