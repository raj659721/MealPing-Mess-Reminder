import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Trash2, Bot, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { authFetch } from "@/lib/api-fetch";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2 items-end", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="h-6 w-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0 mb-0.5">
          <Bot className="h-3 w-3 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm border border-border"
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}

const SUGGESTED = [
  "आज मी किती जेवणे घेतली?",
  "या महिन्याचे बिल किती?",
  "जेवण कसे ट्रॅक करायचे?",
  "Reminder कसे लावायचे?",
];

export default function Chatbot() {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history on open
  useEffect(() => {
    if (!open || !isSignedIn || messages.length > 0) return;
    authFetch("/api/chat/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length) {
          setMessages(
            data.messages.map((m: { id: number; role: string; content: string }) => ({
              id: String(m.id),
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
          setConversationId(data.conversationId ?? null);
        }
      })
      .catch(() => {});
  }, [open, isSignedIn]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setUnread(0);
    }
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setStreaming(true);

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await authFetch("/api/chat/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, conversationId }),
          signal: abort.signal,
        });

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.conversationId && !conversationId) setConversationId(data.conversationId);
              if (data.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + data.content } : m
                  )
                );
              }
              if (data.done) break;
              if (data.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: "Sorry, something went wrong. Please try again." } : m
                  )
                );
              }
            } catch { /* skip malformed */ }
          }
        }
      } catch (e: unknown) {
        if ((e as Error)?.name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: "Connection error. Please try again." } : m
            )
          );
        }
      } finally {
        setStreaming(false);
        if (!open) setUnread((n) => n + 1);
      }
    },
    [streaming, conversationId, open]
  );

  const clearChat = async () => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    await authFetch("/api/chat/history", { method: "DELETE" }).catch(() => {});
  };

  // Show a welcome message if no messages
  const showWelcome = messages.length === 0 && !streaming;

  if (!isSignedIn) return null;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50",
          "h-14 w-14 rounded-2xl shadow-xl shadow-primary/25",
          "bg-primary text-primary-foreground",
          "flex items-center justify-center transition-all duration-200",
          "hover:scale-105 active:scale-95",
          open && "rotate-0"
        )}
        aria-label="Open chatbot"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className={cn(
          "fixed z-50 shadow-2xl",
          "bottom-36 right-4 sm:bottom-24 sm:right-6",
          "w-[calc(100vw-32px)] sm:w-[380px]",
          "max-h-[65vh] sm:max-h-[520px]",
          "rounded-3xl border border-border bg-background",
          "flex flex-col overflow-hidden",
          "animate-in slide-in-from-bottom-4 duration-200"
        )}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary rounded-t-3xl">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">MessBot</p>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
                  <span className="text-[10px] text-white/70">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="h-7 w-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scroll-smooth">
            {showWelcome ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-foreground text-sm">नमस्ते! मी MessBot आहे 👋</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mess Manager बद्दल कोणताही प्रश्न विचारा.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs px-2.5 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors leading-snug"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} />
                ))}
                {streaming && messages[messages.length - 1]?.content === "" && (
                  <div className="flex gap-2 items-end">
                    <div className="h-6 w-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm border border-border">
                      <TypingDots />
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-border bg-background">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="तुमचा प्रश्न लिहा…"
                className="flex-1 text-sm bg-muted/50 border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/60 transition-all"
                disabled={streaming}
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                  input.trim() && !streaming
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                    : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
