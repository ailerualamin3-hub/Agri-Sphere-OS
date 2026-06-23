import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Mic, MicOff, Menu, Plus, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useGetFarmGptConversations,
  useGetFarmGptMessages,
  getGetFarmGptConversationsQueryKey,
  getGetFarmGptMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const LANGUAGES = [
  { label: "English", code: "en-NG" },
  { label: "Hausa", code: "ha" },
  { label: "Yoruba", code: "yo-NG" },
  { label: "Igbo", code: "ig" },
  { label: "Fulfulde", code: "ff" },
];

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  English: [
    "What should I plant this month?",
    "Why are my leaves turning yellow?",
    "How many goats should I keep per hectare?",
    "Best fertilizer schedule for maize?",
    "How do I prevent armyworm infestation?",
    "What is the best time to sell maize?",
  ],
  Hausa: [
    "Menene ya kamata in shuka wannan watan?",
    "Me yasa ganyen nawa ya zama rawaya?",
    "Nawa na awaki ya kamata in ajiye a kowace hekta?",
    "Jadawalin takin zamani mafi kyau na masara?",
    "Yaushe shine lokaci mafi kyau na siyar da masara?",
    "Yadda ake gujewa armyworm?",
  ],
  Yoruba: [
    "Kini mo yẹ ki n gbin ni oṣu yii?",
    "Kini idi ti awọn ewe mi fi n di ofeefee?",
    "Melo ni ewurẹ ti Mo yẹ ki n pa fun hekita kọọkan?",
    "Akoko ajile ti o dara julọ fun agbado?",
    "Igba wo ni o dara julọ lati ta agbado?",
    "Bawo ni mo ṣe le dena armyworm?",
  ],
  Igbo: [
    "Gịnị ka m kwesịrị ịkụ n'ọnwa a?",
    "Gịnị mere ọchịchọ m ji aghọ ọchịchọ ọ?",
    "Ewu ole ka m kwesịrị ijide n'otu hekta?",
    "Usoro mmejuputa nke ọma maka ọka?",
    "Kedu oge kachasị mma ire ọka?",
    "Olee otú m ga-esi gbochie armyworm?",
  ],
  Fulfulde: [
    "Ko mbinndi e lewru nguu?",
    "Ko waɗi heddooji am nanngooji?",
    "Noy mbabba-mawnde na mbiiɗa e hekta fuu?",
    "Ko laawol fetel ngal nafata dow geɗal daande?",
    "Hol sahaa nafata dow geɗal binndi geɗal?",
    "No mbanngu armyworm?",
  ],
};

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const TOKEN_KEY = "frege_auth_token";

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...options, headers: { ...headers, ...(options?.headers as Record<string, string>) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function FarmGpt() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: conversations, refetch: refetchConversations } = useGetFarmGptConversations({ query: { queryKey: getGetFarmGptConversationsQueryKey() } });
  const { data: messages, isLoading: isMessagesLoading } = useGetFarmGptMessages(
    activeConversationId ?? 0,
    { query: { enabled: !!activeConversationId, queryKey: getGetFarmGptMessagesQueryKey(activeConversationId ?? 0) } }
  );

  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, streamingText]);

  const streamMessage = useCallback(async (convId: number, content: string, lang: string) => {
    setIsStreaming(true);
    setStreamingText("");

    const token = localStorage.getItem(TOKEN_KEY);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/farmgpt/conversations/${convId}/messages/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, language: lang }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "chunk") {
              setStreamingText((prev) => prev + data.text);
            } else if (data.type === "done") {
              setIsStreaming(false);
              setStreamingText("");
              queryClient.invalidateQueries({ queryKey: getGetFarmGptMessagesQueryKey(convId) });
              queryClient.invalidateQueries({ queryKey: getGetFarmGptConversationsQueryKey() });
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "Could not reach FarmGPT", description: "Please check your connection and try again.", variant: "destructive" });
      }
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  }, [queryClient, toast]);

  const handleSend = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const msg = inputValue.trim();
    if (!msg || !activeConversationId || isStreaming) return;
    setInputValue("");
    streamMessage(activeConversationId, msg, selectedLang.label);
  }, [inputValue, activeConversationId, isStreaming, selectedLang, streamMessage]);

  const handleNewConversation = async () => {
    try {
      const convo = await apiFetch("/farmgpt/conversations", {
        method: "POST",
        body: JSON.stringify({ title: `${selectedLang.label} Chat`, language: selectedLang.label }),
      });
      await refetchConversations();
      setActiveConversationId(convo.id);
      setShowSidebar(false);
    } catch {
      toast({ title: "Could not create conversation", variant: "destructive" });
    }
  };

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({ title: "Voice input not supported", description: "Your browser doesn't support voice input. Try Chrome or Edge.", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = selectedLang.code;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error !== "no-speech" && e.error !== "aborted") {
        toast({ title: "Voice input error", description: `Could not capture audio: ${e.error}`, variant: "destructive" });
      }
    };
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join("");
      setInputValue(transcript);
      if (e.results[0].isFinal) {
        setIsListening(false);
        recognition.stop();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, selectedLang, toast]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      abortRef.current?.abort();
    };
  }, []);

  const suggested = SUGGESTED_QUESTIONS[selectedLang.label] ?? SUGGESTED_QUESTIONS.English;

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSidebar(true)} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
            <Menu className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900">FarmGPT</h1>
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Online</span>
            </div>
            <div className="flex gap-1.5 mt-0.5 overflow-x-auto no-scrollbar">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.label}
                  onClick={() => setSelectedLang(lang)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors flex items-center gap-0.5",
                    selectedLang.label === lang.label ? "bg-[#1E3A8A] text-white" : "bg-gray-100 text-gray-500"
                  )}
                >
                  {selectedLang.label === lang.label && <Globe className="w-2.5 h-2.5" />}
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleNewConversation} className="w-9 h-9 rounded-xl bg-[#16A34A]/10 flex items-center justify-center">
          <Plus className="w-4 h-4 text-[#16A34A]" />
        </button>
      </div>

      {showSidebar && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebar(false)} />
          <div className="relative w-72 bg-white h-full shadow-xl flex flex-col">
            <div className="p-4 bg-[#1E3A8A] flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Bot className="w-5 h-5" />
                <span className="font-bold">Conversations</span>
              </div>
              <button onClick={() => setShowSidebar(false)}>
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <button
                onClick={handleNewConversation}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl mb-2 text-sm font-medium text-[#16A34A] bg-green-50 border border-green-100"
              >
                <Plus className="w-4 h-4" /> New Conversation
              </button>
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConversationId(conv.id); setShowSidebar(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors",
                    activeConversationId === conv.id ? "bg-[#16A34A]/10 text-[#16A34A] font-bold" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <p className="truncate">{conv.title}</p>
                  {conv.language && conv.language !== "English" && (
                    <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Globe className="w-2.5 h-2.5" />{conv.language}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isMessagesLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="flex gap-1">{[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60%] text-center px-4">
            <div className="w-16 h-16 bg-[#1E3A8A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-[#1E3A8A]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">How can I help?</h2>
            <p className="text-sm text-gray-500 mb-1">Ask me anything about farming</p>
            <p className="text-xs text-[#1E3A8A] font-semibold mb-5 flex items-center gap-1">
              <Globe className="w-3 h-3" /> Responding in {selectedLang.label}
            </p>
            <div className="w-full space-y-2">
              {suggested.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInputValue(q)}
                  className="w-full text-left px-4 py-3 bg-white rounded-xl text-sm font-medium text-gray-700 border border-gray-100 hover:border-[#16A34A]/30 hover:bg-green-50/50 transition-colors shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[#1E3A8A]" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-line",
                  msg.role === "user" ? "bg-[#16A34A] text-white rounded-br-sm font-medium" : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isStreaming && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#1E3A8A]" />
                </div>
                <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed shadow-sm bg-white border border-gray-100 text-gray-800">
                  {streamingText ? (
                    <span className="whitespace-pre-line">
                      {streamingText}
                      <span className="inline-block w-0.5 h-4 bg-[#1E3A8A] ml-0.5 align-middle animate-pulse" />
                    </span>
                  ) : (
                    <div className="flex gap-1">{[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 bg-[#1E3A8A]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-100 px-3 py-3">
        {isListening && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-red-50 rounded-xl border border-red-100">
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-0.5 bg-red-500 rounded-full animate-pulse" style={{ height: `${8 + (i % 2) * 8}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <span className="text-xs font-medium text-red-600">Listening in {selectedLang.label}...</span>
            <span className="text-[10px] text-red-400 ml-auto">Tap mic to stop</span>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <div className="flex-1 flex items-center bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden px-3">
            <Input
              placeholder={`Ask in ${selectedLang.label}...`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-3 h-auto"
            />
            <button
              type="button"
              onClick={startListening}
              className={cn("p-1.5 rounded-xl transition-colors", isListening ? "text-red-500 bg-red-50" : "text-gray-400 hover:text-[#16A34A] hover:bg-green-50")}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || isStreaming}
            className="w-11 h-11 rounded-2xl bg-[#16A34A] hover:bg-[#15803d] disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
