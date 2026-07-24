"use client";
/** AI Chat Assistant — RAG-grounded answers about the user's own protections. */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, SendHorizonal, BookOpenText } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, cx } from "@/components/ui";

const SUGGESTIONS = [
  "What benefits do I have?",
  "When does my MacBook coverage expire?",
  "Can I claim this purchase?",
  "What documents are missing?",
  "Explain purchase protection",
];

interface Msg { role: "user" | "assistant"; content: string; sources?: string[] }

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ messages: any[] }>("/api/assistant/history").then(d => setMessages(d.messages)).catch(() => setMessages([]));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setMessages(m => [...(m ?? []), { role: "user", content: msg }]);
    setBusy(true);
    try {
      const res = await api<{ content: string; sources: string[] }>("/api/assistant/chat", { method: "POST", body: JSON.stringify({ message: msg }) });
      setMessages(m => [...(m ?? []), { role: "assistant", content: res.content, sources: res.sources }]);
    } catch (e: any) {
      setMessages(m => [...(m ?? []), { role: "assistant", content: `Something went wrong: ${e.message}` }]);
    } finally { setBusy(false); }
  };

  const renderMd = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") ? <b key={i} className="font-semibold text-text">{part.slice(2, -2)}</b> : <span key={i}>{part}</span>);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <div className="mb-4">
        <p className="mono text-[11px] font-semibold uppercase tracking-widest text-primary">AI Assistant</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">Ask about your benefits</h1>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-[16px] border border-border bg-surface/40 p-5">
        {messages === null ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-[14px]" />)}</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/12 text-primary"><Sparkles size={22} /></div>
            <p className="text-[15px] font-medium">Grounded in your live protection data</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted">Answers come from your Benefit Wallet and the policy library — with sources cited.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="cursor-pointer rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12.5px] text-muted transition-colors hover:border-primary/40 hover:text-text">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cx("max-w-[85%] rounded-[16px] px-4 py-3 text-[13.5px] leading-relaxed",
                  m.role === "user" ? "bg-primary text-[#0e0e10] font-medium" : "border border-border bg-surface text-text/90")}>
                  <div className="whitespace-pre-wrap">{renderMd(m.content)}</div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border pt-2">
                      {m.sources.map(s => (
                        <span key={s} className="mono flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          <BookOpenText size={9} /> {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-[16px] border border-border bg-surface px-4 py-3.5">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); send(); }} className="mt-4 flex gap-2.5">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={`Ask anything, ${user?.name.split(" ")[0]}…`}
          className="h-11 flex-1 rounded-[12px] border border-border bg-surface px-4 text-sm outline-none transition-colors focus:border-primary/60" />
        <Button type="submit" disabled={busy || !input.trim()} className="!h-11 !rounded-[12px]"><SendHorizonal size={16} /></Button>
      </form>
    </div>
  );
}
