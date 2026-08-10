"use client";

import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Button, Card, Spinner } from "@/components/ui";
import { aiChat, aiConfirm, type AiProposal, type ChatMessage } from "@/lib/server/ai/chat";
import type { T } from "@/lib/i18n";

const STORAGE_KEY = "tiffin-ai-chat";

export function Chat({
  t,
  theme,
}: {
  t: T;
  lang: "en" | "hi";
  theme: "light" | "dark";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as ChatMessage[];
      return parsed.filter(
        (m) =>
          !m.text.includes("schema cache") &&
          !m.text.includes("database schema") &&
          !m.text.includes("technical issue with the database"),
      );
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [thinking, setThinking] = useState(false);
  const [needsConfig, setNeedsConfig] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || thinking) return;
    setInput("");
    setProposal(null);
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setThinking(true);
    void (async () => {
      const res = await aiChat(messages, userText);
      setThinking(false);
      setNeedsConfig(!!res.needsConfig);
      if (res.reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: res.reply! }]);
      }
      if (res.proposal) {
        setProposal(res.proposal);
      }
    })();
  };

  const confirmProposal = () => {
    if (!proposal) return;
    const userText = messages[messages.length - 1]?.text ?? "";
    setProposal(null);
    setThinking(true);
    void (async () => {
      const res = await aiConfirm(messages, userText, proposal);
      setThinking(false);
      if (res.reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: res.reply! }]);
      }
    })();
  };

  const clear = () => {
    setMessages([]);
    setProposal(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col">
      <TopBar t={t} title={t.aiTitle} theme={theme} />

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && !thinking && (
          <Card className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t.aiWelcome}
          </Card>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-orange-500 text-white rounded-br-md"
                  : "bg-[var(--card)] border border-[var(--line)] text-slate-700 dark:text-slate-200 rounded-bl-md shadow-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {proposal && (
          <Card className="border-2 border-amber-300 dark:border-amber-700">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.aiConfirmTitle}</p>
            <p className="mt-1 text-xs text-slate-400">{t.aiConfirmDesc}</p>
            <p className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              {proposal.summary}
            </p>
            <div className="mt-3 flex gap-3">
              <Button variant="secondary" onClick={() => setProposal(null)} className="flex-1">
                {t.aiReject}
              </Button>
              <Button onClick={confirmProposal} className="flex-1">
                {t.aiConfirm}
              </Button>
            </div>
          </Card>
        )}

        {thinking && (
          <div className="flex items-center gap-2 pl-1">
            <Spinner className="h-4 w-4" />
            <p className="text-xs text-slate-400">{t.aiThinking}</p>
          </div>
        )}

        {needsConfig && (
          <p className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-300">
            {t.aiNotConfigured}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="pt-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t.aiPlaceholder}
            rows={1}
            className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 text-base text-slate-900 dark:text-slate-100 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-shadow"
          />
          <button
            onClick={() => send()}
            disabled={thinking || !input.trim()}
            className="pressable flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white active:bg-orange-600 disabled:opacity-40 disabled:pointer-events-none"
            aria-label={t.aiTitle}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {messages.length > 0 && (
          <button onClick={clear} className="mt-2 text-xs font-medium text-slate-400 hover:text-red-500">
            {t.clearChat}
          </button>
        )}
      </div>
    </div>
  );
}
