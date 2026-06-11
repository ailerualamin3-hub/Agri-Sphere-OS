import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, Mic, Menu, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  useGetFarmGptConversations,
  useGetFarmGptMessages,
  useSendFarmGptMessage,
  getGetFarmGptConversationsQueryKey,
  getGetFarmGptMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  "What should I plant this month?",
  "Why are my leaves turning yellow?",
  "How many goats should I keep per hectare?",
  "Best fertilizer schedule for maize?",
  "How do I prevent armyworm infestation?",
  "What is the current maize market price?",
];

const LANGUAGES = ["English", "Hausa", "Yoruba", "Igbo", "Fulfulde"];

export default function FarmGpt() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<number>(1);
  const [inputValue, setInputValue] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useGetFarmGptConversations({ query: { queryKey: getGetFarmGptConversationsQueryKey() } });
  const { data: messages, isLoading: isMessagesLoading } = useGetFarmGptMessages(
    activeConversationId,
    { query: { enabled: !!activeConversationId, queryKey: getGetFarmGptMessagesQueryKey(activeConversationId) } }
  );
  const sendMessage = useSendFarmGptMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const msg = inputValue.trim();
    if (!msg || !activeConversationId) return;
    setInputValue("");
    sendMessage.mutate(
      { id: activeConversationId, data: { content: msg } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFarmGptMessagesQueryKey(activeConversationId) });
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(true)}
            className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center"
          >
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
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors",
                    selectedLanguage === lang
                      ? "bg-[#1E3A8A] text-white"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button className="w-9 h-9 rounded-xl bg-[#16A34A]/10 flex items-center justify-center">
          <Plus className="w-4 h-4 text-[#16A34A]" />
        </button>
      </div>

      {/* Sidebar Overlay */}
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
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConversationId(conv.id); setShowSidebar(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors",
                    activeConversationId === conv.id
                      ? "bg-[#16A34A]/10 text-[#16A34A] font-bold"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {conv.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isMessagesLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60%] text-center px-4">
            <div className="w-16 h-16 bg-[#1E3A8A]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-[#1E3A8A]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">How can I help?</h2>
            <p className="text-sm text-gray-500 mb-6">Ask me anything about farming in {selectedLanguage}</p>
            <div className="w-full space-y-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInputValue(q); }}
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
                <div
                  className={cn(
                    "max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                    msg.role === "user"
                      ? "bg-[#16A34A] text-white rounded-br-sm font-medium"
                      : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-8 h-8 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#1E3A8A]" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 bg-[#1E3A8A]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="bg-white border-t border-gray-100 px-3 py-3">
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <div className="flex-1 flex items-center bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden px-3">
            <Input
              placeholder="Ask FarmGPT..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-3 h-auto"
            />
            <button type="button" className="text-gray-400 hover:text-gray-600 p-1">
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || sendMessage.isPending}
            className="w-11 h-11 rounded-2xl bg-[#16A34A] hover:bg-[#15803d] disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
