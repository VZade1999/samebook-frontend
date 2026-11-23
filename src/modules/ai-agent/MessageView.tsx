import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRightOutlined, FileTextOutlined, RobotOutlined, ThunderboltOutlined, UserOutlined, WarningOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import ActionCard from "./ActionCard";
import { type AiAction, type AiMessage, RECORD_WORD, recordLink, timeText } from "./aiApi";

/** Links inside answers: app pages open in place, anything else in a new tab. */
const MarkdownLink: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href, children }) => {
  const navigate = useNavigate();
  const internal = !!href && href.startsWith("/app/");
  if (internal) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          navigate(href!);
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  );
};

const components = {
  a: MarkdownLink,
  table: ({ children }: any) => (
    <div className="ai-md-table">
      <table>{children}</table>
    </div>
  ),
};

const MessageView: React.FC<{
  message: AiMessage;
  actions: Map<number, AiAction>;
  canDecide: boolean;
  deciding: Set<number>;
  onDecide: (a: AiAction, d: "confirm" | "cancel") => void;
}> = ({ message: m, actions, canDecide, deciding, onDecide }) => {
  const navigate = useNavigate();

  // How a confirmed / cancelled action ended: a quiet line, not a bubble.
  if (m.meta?.outcome) {
    const bad = m.content.startsWith("✗");
    return (
      <div className={`ai-outcome${bad ? " bad" : ""}`} role="status">
        <span>{m.content}</span>
        <time>{timeText(m.created_at)}</time>
      </div>
    );
  }

  if (m.role === "user") {
    return (
      <div className={`ai-msg user${m.pending ? " pending" : ""}`}>
        <div className="ai-bubble-wrap">
          {m.meta?.document && (
            <div className="ai-doc-chip">
              <FileTextOutlined /> {m.meta.document.name}
            </div>
          )}
          {m.content && <div className="ai-bubble">{m.content}</div>}
          <time className="ai-time">{m.pending ? "Sending…" : timeText(m.created_at)}</time>
        </div>
        <span className="ai-avatar me" aria-hidden>
          <UserOutlined />
        </span>
      </div>
    );
  }

  const cards = (m.meta?.actions || []).map((id) => actions.get(id)).filter((a): a is AiAction => !!a);
  const cardRecords = new Set(cards.map((a) => (a.record ? `${a.record.type}:${a.record.id}` : "")));
  const records = (m.meta?.records || []).filter((r) => !cardRecords.has(`${r.type}:${r.id}`));
  return (
    <div className={`ai-msg bot${m.meta?.error ? " error" : ""}`}>
      <span className="ai-avatar bot" aria-hidden>
        {m.meta?.error ? <WarningOutlined /> : <RobotOutlined />}
      </span>
      <div className="ai-bubble-wrap">
        <div className="ai-bubble md">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components as any}>
            {m.content}
          </ReactMarkdown>
        </div>
        {cards.length > 0 && (
          <div className="ai-cards">
            {cards.map((a) => (
              <ActionCard key={a.id} action={a} canDecide={canDecide} busy={deciding.has(a.id)} onDecide={onDecide} />
            ))}
          </div>
        )}
        {(records.length > 0 || (m.meta?.steps?.length ?? 0) > 0) && (
          <div className="ai-meta-row">
            {records.map((r) => (
              <button key={`${r.type}:${r.id}`} type="button" className="ai-record" onClick={() => navigate(recordLink(r))}>
                {RECORD_WORD[r.type]} {r.label} <ArrowRightOutlined />
              </button>
            ))}
            {!!m.meta?.steps?.length && (
              <span className="ai-steps" title={m.meta.steps.join(" · ")}>
                <ThunderboltOutlined /> {m.meta.steps.length === 1 ? m.meta.steps[0] : `${m.meta.steps.length} steps: ${m.meta.steps.join(" · ")}`}
              </span>
            )}
          </div>
        )}
        <time className="ai-time">{timeText(m.created_at)}</time>
      </div>
    </div>
  );
};

export default MessageView;
