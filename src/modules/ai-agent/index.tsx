import React, { useState, useRef, useEffect } from "react";
import { Spin } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { sendAiMessage, resetAiChat } from "./redux/aiAgentActions";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const AiAgentChat: React.FC = () => {
  const dispatch = useDispatch();
  const aiState = useSelector((state: any) => state.aiAgent);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI assistant. Ask me anything about your customers — I can search, create, update, or delete them for you.",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiState.loading]);

  useEffect(() => {
    if (aiState.lastReply?.reply) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiState.lastReply.reply,
          timestamp: new Date(),
        },
      ]);
    }
  }, [aiState.lastReply]);

  useEffect(() => {
    if (aiState.error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ ${aiState.error ?? "Something went wrong. Please try again."}`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [aiState.error]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || aiState.loading) return;

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const history = updatedMessages
      .slice(1)
      .slice(0, -1)
      .map((msg) => ({ role: msg.role, content: msg.content }));

    dispatch(sendAiMessage({ message: trimmed, session_id: "user-session", history }));
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClear = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared! How can I help you?",
        timestamp: new Date(),
      },
    ]);
    dispatch(resetAiChat());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 110) + "px";
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.aiAvatar}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <line x1="8" y1="16" x2="8" y2="16" />
              <line x1="16" y1="16" x2="16" y2="16" />
            </svg>
          </div>
          <div>
            <div style={styles.headerName}>AI Assistant</div>
            <div style={styles.headerStatus}>
              <span style={styles.onlineDot} />
              Online
            </div>
          </div>
        </div>
        <button style={styles.clearBtn} onClick={handleClear}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Clear
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={styles.messages}>
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div key={i} style={{ ...styles.msgRow, ...(isUser ? styles.msgRowUser : {}) }}>
              {!isUser && (
                <div style={{ ...styles.msgAvatar, background: "#1677ff" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4" />
                  </svg>
                </div>
              )}
              <div style={{ ...styles.bubbleWrap, ...(isUser ? styles.bubbleWrapUser : {}) }}>
                <div
                  style={{
                    ...styles.bubble,
                    ...(isUser ? styles.bubbleUser : styles.bubbleAi),
                  }}
                >
                  {msg.content}
                </div>
                <div style={{ ...styles.msgTime, ...(isUser ? { textAlign: "right" } : {}) }}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
              {isUser && (
                <div style={{ ...styles.msgAvatar, background: "#22c55e" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {aiState.loading && (
          <div style={styles.msgRow}>
            <div style={{ ...styles.msgAvatar, background: "#1677ff" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <circle cx="12" cy="5" r="2" />
                <path d="M12 7v4" />
              </svg>
            </div>
            <div style={styles.typingBubble}>
              <span style={{ ...styles.dot, animationDelay: "0s" }} />
              <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
              <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div style={styles.inputArea}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResize(e.target);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask me about your customers…"
          disabled={aiState.loading}
          rows={1}
          style={styles.textarea}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || aiState.loading}
          style={{
            ...styles.sendBtn,
            ...((!input.trim() || aiState.loading) ? styles.sendBtnDisabled : {}),
          }}
        >
          {aiState.loading ? (
            <Spin size="small" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
      <div style={styles.hint}>Enter to send · Shift+Enter for new line</div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        textarea:focus { outline: none; border-color: #1677ff !important; }
        textarea::placeholder { color: #9ca3af; }
        textarea::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    maxHeight: 680,
    background: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.08)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    background: "#fff",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#1677ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },
  headerName: {
    fontSize: 15,
    fontWeight: 600,
    color: "#111",
    lineHeight: "1.2",
  },
  headerStatus: {
    fontSize: 12,
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#22c55e",
    display: "inline-block",
  },
  clearBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "none",
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    color: "#6b7280",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "#f8f9fa",
    scrollBehavior: "smooth",
  },
  msgRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
  },
  msgRowUser: {
    flexDirection: "row-reverse",
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleWrap: {
    maxWidth: "78%",
    display: "flex",
    flexDirection: "column",
  },
  bubbleWrapUser: {
    alignItems: "flex-end",
  },
  bubble: {
    padding: "10px 14px",
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  bubbleAi: {
    background: "#fff",
    color: "#111",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: "16px 16px 16px 4px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  bubbleUser: {
    background: "#1677ff",
    color: "#fff",
    borderRadius: "16px 16px 4px 16px",
  },
  msgTime: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    paddingLeft: 2,
  },
  typingBubble: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: "16px 16px 16px 4px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: 5,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#1677ff",
    display: "inline-block",
    animation: "bounce 1.2s infinite",
  },
  inputArea: {
    padding: "12px 14px",
    borderTop: "1px solid rgba(0,0,0,0.06)",
    background: "#fff",
    flexShrink: 0,
    display: "flex",
    alignItems: "flex-end",
    gap: 8,
  },
  textarea: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    resize: "none",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 22,
    padding: "10px 16px",
    fontSize: 14,
    fontFamily: "inherit",
    lineHeight: 1.5,
    background: "#f8f9fa",
    color: "#111",
    overflowY: "auto",
    transition: "border-color 0.15s",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "none",
    background: "#1677ff",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.15s, transform 0.1s",
  },
  sendBtnDisabled: {
    background: "#e5e7eb",
    color: "#9ca3af",
    cursor: "default",
  },
  hint: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center" as const,
    padding: "4px 0 8px",
    background: "#fff",
  },
};

export default AiAgentChat;