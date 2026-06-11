import React, { useState } from "react";
import { 
  Bot, 
  Send, 
  Mic, 
  MoreVertical, 
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  useGetFarmGptConversations, 
  useGetFarmGptMessages, 
  useSendFarmGptMessage,
  getGetFarmGptConversationsQueryKey,
  getGetFarmGptMessagesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const SUGGESTED_QUESTIONS = [
  "What should I plant this month?",
  "Why are my leaves turning yellow?",
  "How many goats should I keep?",
  "What fertilizer is best for maize?"
];

const LANGUAGES = ["English", "Hausa", "Yoruba", "Igbo", "Fulfulde"];

export default function FarmGpt() {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(1); // Mock default
  const [inputValue, setInputValue] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  const { data: conversations } = useGetFarmGptConversations({ query: { queryKey: getGetFarmGptConversationsQueryKey() } });
  
  // Conditionally fetch messages if we have an active conversation
  const { data: messages, isLoading: isMessagesLoading } = useGetFarmGptMessages(
    activeConversationId as number, 
    { query: { enabled: !!activeConversationId, queryKey: getGetFarmGptMessagesQueryKey(activeConversationId as number) } }
  );

  const sendMessage = useSendFarmGptMessage();

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !activeConversationId) return;

    sendMessage.mutate({ 
      id: activeConversationId, 
      data: { content: inputValue } 
    }, {
      onSuccess: () => {
        setInputValue("");
        queryClient.invalidateQueries({ queryKey: getGetFarmGptMessagesQueryKey(activeConversationId) });
      }
    });
  };

  const handleSuggestionClick = (question: string) => {
    setInputValue(question);
  };

  return (
    <div className="flex flex-col h-screen bg-muted/20 max-w-[480px] mx-auto pb-[72px]">
      <header className="p-3 bg-background border-b border-border/50 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80%] max-w-sm p-0">
              <div className="p-4 border-b border-border/50 bg-secondary text-secondary-foreground">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5" /> FarmGPT
                </h2>
              </div>
              <ScrollArea className="h-[calc(100vh-60px)] p-2">
                <div className="space-y-1">
                  {conversations?.map((conv) => (
                    <Button 
                      key={conv.id} 
                      variant={activeConversationId === conv.id ? "secondary" : "ghost"}
                      className="w-full justify-start text-left truncate"
                      onClick={() => setActiveConversationId(conv.id)}
                    >
                      {conv.title}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" /> FarmGPT
            </h1>
            <div className="flex items-center gap-2 mt-1 overflow-x-auto no-scrollbar w-[250px]">
              {LANGUAGES.map(lang => (
                <Badge 
                  key={lang} 
                  variant={selectedLanguage === lang ? "default" : "outline"}
                  className="cursor-pointer text-[10px] py-0 px-2 shrink-0"
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {lang}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>

      <ScrollArea className="flex-1 p-4">
        {(!messages || messages.length === 0) ? (
          <div className="flex flex-col justify-center h-[60vh]">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">How can I help your farm today?</h2>
              <p className="text-sm text-muted-foreground">Ask in your preferred language</p>
            </div>
            
            <div className="grid grid-cols-1 gap-2 mt-auto">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <Button 
                  key={i} 
                  variant="outline" 
                  className="justify-start text-left h-auto py-3 px-4 bg-background whitespace-normal border-primary/20 hover:bg-primary/5 hover:border-primary/50 text-sm"
                  onClick={() => handleSuggestionClick(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <Avatar className="w-8 h-8 shrink-0 bg-primary/10 border border-primary/20">
                    <AvatarFallback><Bot className="w-4 h-4 text-primary" /></AvatarFallback>
                  </Avatar>
                )}
                <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-card text-card-foreground border border-border/50 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sendMessage.isPending && (
              <div className="flex gap-3 max-w-[85%]">
                 <Avatar className="w-8 h-8 shrink-0 bg-primary/10 border border-primary/20">
                    <AvatarFallback><Bot className="w-4 h-4 text-primary" /></AvatarFallback>
                  </Avatar>
                  <div className="p-3 rounded-2xl bg-card border border-border/50 text-muted-foreground text-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 bg-background border-t border-border/50">
        <form onSubmit={handleSend} className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              placeholder="Message FarmGPT..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pr-10 rounded-full bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:border-primary"
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground hover:text-foreground"
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full shrink-0" 
            disabled={!inputValue.trim() || sendMessage.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
