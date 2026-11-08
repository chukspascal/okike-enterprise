import { useEffect, useRef, useState } from "react";
import { Send, X, ArrowUpRight, User, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { askPublicAI } from "@/lib/public-ai.functions";
import okikeLogo from "@/assets/okike-logo.png";

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
        className="fixed bottom-6 right-6 z-50 bg-[#0E0E0E] dark:bg-[#E3EE32] text-[#E3EE32] dark:text-[#0E0E0E] p-3.5 rounded-full shadow-2xl border border-black/15 dark:border-white/20 hover:scale-105 transition-transform flex items-center justify-center"
        aria-label="Chat with Coach Ziri · OKIKE AI"
        title="Chat with Coach Ziri · OKIKE AI"
      >
        {isOpen ? (
          <X className="size-6" />
        ) : (
          <img
            src={okikeLogo}
            alt="OKIKE AI"
            className="size-7 object-contain invert dark:invert-0"
          />
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div data-lenis-prevent className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-surface rounded-2xl shadow-2xl ring-1 ring-ink/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-brand/5 border-b border-ink/10 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#0E0E0E] dark:bg-[#E3EE32] flex items-center justify-center p-2 shrink-0">
                <img
                  src={okikeLogo}
                  alt="OKIKE"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <div>
                <div className="font-semibold text-ink text-sm">Coach Ziri · OKIKE AI</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink/60">
                  Startups • Studio • Academy
                </div>
              </div>
            </div>
            <a
              href="https://coach-ziri.okikeenterprises.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-ink/[0.06] hover:bg-ink/[0.12] text-ink flex items-center gap-1 transition"
              title="Open Coach Ziri Command Center"
            >
              <span>Ziri App</span>
              <ArrowUpRight className="size-3" />
            </a>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[400px] space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user"
                      ? "bg-ink/10"
                      : "bg-[#0E0E0E] dark:bg-[#E3EE32] p-1.5"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="size-4 text-ink/70" />
                  ) : (
                    <img
                      src={okikeLogo}
                      alt="OKIKE"
                      className="w-full h-full object-contain invert dark:invert-0"
                    />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-brand text-brand-foreground"
                      : "bg-ink/[0.04] text-ink"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-[#0E0E0E] dark:bg-[#E3EE32] p-1.5 flex items-center justify-center shrink-0">
                  <img
                    src={okikeLogo}
                    alt="OKIKE"
                    className="w-full h-full object-contain invert dark:invert-0"
                  />
                </div>
                <div className="bg-ink/[0.04] rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-ink/60" />
                  <span className="text-sm text-ink/60">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick questions */}
          {messages.length === 1 && !busy && (
            <div className="px-4 pb-3 space-y-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full text-left text-sm px-4 py-2 rounded-xl bg-ink/[0.03] hover:bg-ink/[0.06] transition-colors text-ink/70"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="px-4 pb-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/enroll"
                className="text-center text-sm py-2 px-3 rounded-xl bg-brand text-brand-foreground font-medium hover:opacity-90 transition"
              >
                Join Academy
              </Link>
              <a
                href="https://studio.okikeenterprises.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-center text-sm py-2 px-3 rounded-xl bg-ink/[0.05] text-ink font-medium hover:bg-ink/[0.08] transition flex items-center justify-center gap-1"
              >
                OKIKE Studio <ArrowUpRight className="size-3" />
              </a>
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-ink/10 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask me anything..."
                maxLength={8000}
                className="flex-1 bg-ink/[0.03] border-0 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="bg-brand text-brand-foreground p-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
