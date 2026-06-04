import React, { useState, useRef, useEffect } from "react";
import { Input, Button, Card, Spin, Avatar } from "antd";
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ClearOutlined,
} from "@ant-design/icons";
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
      content: "Hi! I'm your AI assistant. Ask me anything about your customers — I can search, create, update, or delete them for you.",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // =========================
  // AUTO SCROLL
  // =========================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiState.loading]);

  // =========================
  // HANDLE AI REPLY
  // =========================

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

  // =========================
  // HANDLE ERROR
  // =========================

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

  // =========================
  // SEND MESSAGE
  // =========================

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || aiState.loading) return;

    // Add user message to UI
    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    // Build history for API (exclude the welcome message)
    const history = updatedMessages
      .slice(1)                          // skip welcome message
      .slice(0, -1)                      // skip the message we just added
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // Dispatch to saga
    dispatch(
      sendAiMessage({
        message: trimmed,
        session_id: "user-session",
        history,
      })
    );

    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // =========================
  // CLEAR CHAT
  // =========================

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

  // =========================
  // ENTER KEY
  // =========================

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // =========================
  // FORMAT TIME
  // =========================

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ padding: 10 }}>
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RobotOutlined style={{ color: "#1677ff", fontSize: 18 }} />
            <span>AI Assistant</span>
          </div>
        }
        extra={
          <Button
            icon={<ClearOutlined />}
            size="small"
            onClick={handleClear}
          >
            Clear
          </Button>
        }
        styles={{ body: { padding: 0 } }}
      >
        {/* ── Message List ── */}
        <div
          style={{
            height: 480,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            backgroundColor: "#f9fafb",
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              {/* AI Avatar */}
              {msg.role === "assistant" && (
                <Avatar
                  icon={<RobotOutlined />}
                  style={{ backgroundColor: "#1677ff", flexShrink: 0 }}
                />
              )}

              {/* Bubble */}
              <div style={{ maxWidth: "70%" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    backgroundColor:
                      msg.role === "user" ? "#1677ff" : "#ffffff",
                    color: msg.role === "user" ? "#fff" : "#000",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    fontSize: 14,
                  }}
                >
                  {msg.content}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#999",
                    marginTop: 4,
                    textAlign: msg.role === "user" ? "right" : "left",
                    paddingLeft: msg.role === "assistant" ? 4 : 0,
                    paddingRight: msg.role === "user" ? 4 : 0,
                  }}
                >
                  {formatTime(msg.timestamp)}
                </div>
              </div>

              {/* User Avatar */}
              {msg.role === "user" && (
                <Avatar
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#52c41a", flexShrink: 0 }}
                />
              )}
            </div>
          ))}

          {/* Loading bubble */}
          {aiState.loading && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <Avatar
                icon={<RobotOutlined />}
                style={{ backgroundColor: "#1677ff", flexShrink: 0 }}
              />
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: "18px 18px 18px 4px",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                <Spin size="small" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Box ── */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            gap: 8,
            backgroundColor: "#fff",
          }}
        >
          <Input.TextArea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me about your customers... (Enter to send)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={aiState.loading}
            style={{ borderRadius: 20, resize: "none", paddingTop: 8 }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={aiState.loading}
            disabled={!input.trim()}
            style={{ width: 40, height: 40, flexShrink: 0 }}
          />
        </div>
      </Card>
    </div>
  );
};

export default AiAgentChat;