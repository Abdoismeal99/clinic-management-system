import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Bot, User, Sparkles, RotateCcw, Lightbulb } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_QUESTIONS = [
  "كام مريض جالنا آخر 3 أيام؟",
  "كام زيارة آخر أسبوع؟",
  "كام موعد عندنا النهارده؟",
  "إجمالي المرضى المسجلين كام؟",
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}>
      <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-emerald-100 text-emerald-700"}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-card border border-border text-card-foreground rounded-tl-sm"
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
        <AvatarFallback className="bg-emerald-100 text-emerald-700">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.aiAssistant.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: (e) => {
      toast.error("حدث خطأ: " + e.message);
      setMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى." }]);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  const sendMessage = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || chatMutation.isPending) return;

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");

    chatMutation.mutate({ messages: newMessages });
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">المساعد الذكي</h1>
            <p className="text-xs text-muted-foreground">يعرف بيانات عيادتك ويجاوبك بالعربي</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearChat}>
            <RotateCcw className="w-3.5 h-3.5" /> محادثة جديدة
          </Button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-muted/20">
        <ScrollArea className="h-full p-4" ref={scrollRef as any}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-6 py-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Bot className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">أهلاً! أنا مساعد العيادة</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  اسألني عن أي شيء في العيادة — إحصائيات، بيانات مرضى، مواعيد، أو أي معلومة تحتاجها.
                </p>
              </div>
              <div className="w-full max-w-md">
                <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>أسئلة مقترحة</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-right text-sm px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
              {chatMutation.isPending && <TypingIndicator />}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب سؤالك هنا... (مثلاً: طلعلي رقم محمد أحمد)"
            className="resize-none min-h-[48px] max-h-[120px] pl-3 pr-4 py-3 rounded-xl text-sm"
            rows={1}
            disabled={chatMutation.isPending}
          />
        </div>
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || chatMutation.isPending}
          size="icon"
          className="h-12 w-12 rounded-xl flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick suggestions after first message */}
      {messages.length > 0 && !chatMutation.isPending && (
        <div className="flex-shrink-0 flex gap-2 flex-wrap">
          {QUICK_QUESTIONS.slice(0, 3).map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
