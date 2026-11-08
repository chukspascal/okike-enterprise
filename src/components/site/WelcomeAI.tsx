import { useEffect, useRef, useState } from "react";
import { Send, X, ArrowUpRight, User, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { askPublicAI } from "@/lib/public-ai.functions";
import okikeSymbol from "@/assets/okike-symbol.png";

type ChatMsg = { role: "user" | "assistant"; content: string };

export function WelcomeAI() {
  const askAI = useServerFn(askPublicAI);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Welcome to OKIKE Enterprises! 👋 I'm Coach Ziri, your OKIKE Ecosystem AI. We build startups (OKIKE Ventures & AI Labs), grow businesses (OKIKE Studio), and train engineers (OKIKE Academy). How can I direct you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;

    const next: ChatMsg[] = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const history = next.slice(-20);
      const result = await askAI({ data: { messages: history } });
      if (result.ok) {
        setMessages([...next, { role: "assistant", content: result.text }]);
      } else {
        setMessages([
          ...next,
          {
            role: "assistant",
            content: "Sorry, I couldn't process that request. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that request. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const quickQuestions = [
    "How does OKIKE help startups & businesses?",
    "Tell me about OKIKE Studio & Coach Ziri",
    "How do I join OKIKE Academy?",
    "Tell me about the Computing Synergy Summit",
  ];

  return (
    <>
      {/* Floating button with OKIKE Logo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 right-4 sm:right-6 z-50 bg-[#0E0E0E] dark:bg-[#E3EE32] text-[#E3EE32] dark:text-[#0E0E0E] p-3 sm:p-3.5 rounded-full shadow-2xl border border-black/15 dark:border-white/20 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer touch-manipulation"
        aria-label={isOpen ? "Close AI assistant" : "Chat with Coach Ziri · OKIKE AI"}
        title={isOpen ? "Close AI assistant" : "Chat with Coach Ziri · OKIKE AI"}
      >
        {isOpen ? (
          <X className="size-5 sm:size-6" />
        ) : (
          <img
            src={okikeSymbol}
            alt="OKIKE AI"
            className="size-6 sm:size-7 object-contain invert dark:invert-0"
          />
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          data-lenis-prevent
          className="fixed z-50 inset-x-3 sm:inset-x-auto sm:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-24 w-auto sm:w-[390px] h-[min(560px,calc(100dvh-5.5rem))] sm:h-[min(580px,calc(100dvh-7.5rem))] max-h-[calc(100dvh-5rem)] bg-surface rounded-2xl shadow-2xl ring-1 ring-ink/10 flex flex-col overflow-hidden backdrop-blur-md"
        >
          {/* Header */}
          <div className="bg-brand/5 border-b border-ink/10 p-3 sm:p-3.5 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 sm:size-10 rounded-full bg-[#0E0E0E] dark:bg-[#E3EE32] flex items-center justify-center p-1.5 shrink-0 shadow-sm">
                <img
                  src={okikeSymbol}
                  alt="OKIKE"
                  className="size-full object-contain invert dark:invert-0"
                />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-ink text-xs sm:text-sm truncate">Coach Ziri · OKIKE AI</div>
                <div className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-ink/60 truncate">
                  Startups • Studio • Academy
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <a
                href="https://coach-ziri.okikeenterprises.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider px-2 sm:px-2.5 py-1 rounded-full bg-ink/[0.06] hover:bg-ink/[0.12] text-ink flex items-center gap-1 transition"
                title="Open Coach Ziri Command Center"
              >
                <span>Ziri App</span>
                <ArrowUpRight className="size-3" />
              </a>
              <button
                onClick={() => setIsOpen(false)}
                className="size-7 sm:size-8 rounded-full flex items-center justify-center text-ink/60 hover:text-ink hover:bg-ink/[0.08] transition active:scale-95"
                aria-label="Close chat"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-3.5 overscroll-contain">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 sm:gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`size-7 sm:size-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user"
                      ? "bg-ink/10"
                      : "bg-[#0E0E0E] dark:bg-[#E3EE32] p-1 shadow-sm"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="size-3.5 sm:size-4 text-ink/70" />
                  ) : (
                    <img
                      src={okikeSymbol}
                      alt="OKIKE"
                      className="size-full object-contain invert dark:invert-0"
                    />
                  )}
                </div>
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 ${
                    msg.role === "user"
                      ? "bg-brand text-brand-foreground"
                      : "bg-ink/[0.04] text-ink"
                  }`}
                >
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-2 sm:gap-3">
                <div className="size-7 sm:size-8 rounded-full bg-[#0E0E0E] dark:bg-[#E3EE32] p-1 flex items-center justify-center shrink-0 shadow-sm">
                  <img
                    src={okikeSymbol}
                    alt="OKIKE"
                    className="size-full object-contain invert dark:invert-0 animate-pulse"
                  />
                </div>
                <div className="bg-ink/[0.04] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2">
                  <Loader2 className="size-3.5 sm:size-4 animate-spin text-ink/60" />
                  <span className="text-xs sm:text-sm text-ink/60">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick questions (only shown on initial greeting) */}
          {messages.length === 1 && !busy && (
            <div className="px-3 sm:px-4 pb-2 space-y-1.5 shrink-0">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full text-left text-xs px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-ink/[0.03] hover:bg-ink/[0.06] transition-colors text-ink/75 leading-snug line-clamp-2"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Footer CTAs & Input */}
          <div className="shrink-0 border-t border-ink/10 bg-surface/75 backdrop-blur-md">
            <div className="px-3 pt-2 pb-1 grid grid-cols-2 gap-1.5">
              <Link
                to="/enroll"
                className="text-center text-xs py-1.5 px-2 rounded-lg bg-brand text-brand-foreground font-medium hover:opacity-90 active:scale-98 transition flex items-center justify-center"
              >
                Join Academy
              </Link>
              <a
                href="https://studio.okikeenterprises.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-xs py-1.5 px-2 rounded-lg bg-ink/[0.05] text-ink font-medium hover:bg-ink/[0.08] active:scale-98 transition flex items-center justify-center gap-1"
              >
                <span>OKIKE Studio</span>
                <ArrowUpRight className="size-3" />
              </a>
            </div>

            {/* Input */}
            <div className="p-2.5 sm:p-3 pt-1 sm:pt-1.5">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask me anything..."
                  maxLength={8000}
                  className="flex-1 bg-ink/[0.03] border-0 rounded-xl px-3.5 sm:px-4 py-2 sm:py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-ink/40"
                />
                <button
                  onClick={() => send()}
                  disabled={busy || !input.trim()}
                  className="bg-brand text-brand-foreground p-2 sm:p-2.5 rounded-xl hover:opacity-90 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
