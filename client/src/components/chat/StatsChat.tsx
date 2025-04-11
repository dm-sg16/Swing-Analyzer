import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SwingStats } from "@shared/schema";

interface StatsChatProps {
  onStatsChange?: (stats: SwingStats) => void;
}

type MessageType = "user" | "ai" | "system";

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
}

export default function StatsChat({ onStatsChange }: StatsChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "system",
      content: "Welcome to the Baseball Stats Chat! Tell me about your swing stats, and I'll help analyze them. You can share information like bat speed, exit velocity, launch angle, etc.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Send message to API for AI analysis
      const response = await apiRequest("POST", "/api/chat-stats", {
        message: userMessage.content
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to get AI response");
      }

      // Add AI response to messages
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: response.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // If stats were extracted, pass them up
      if (response.stats && onStatsChange) {
        onStatsChange(response.stats);
        
        const confirmMessage: Message = {
          id: Date.now().toString() + "-confirm",
          type: "system",
          content: "✅ Stats have been saved and will be used for swing analysis",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, confirmMessage]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process your message",
        variant: "destructive"
      });

      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "system",
        content: "Sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-sans text-lg font-medium">Stats Assistant Chat</h3>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto mb-4 p-3 border rounded-md bg-slate-50">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`mb-3 ${
                message.type === "user" 
                  ? "ml-auto bg-primary text-white" 
                  : message.type === "ai"
                    ? "mr-auto bg-slate-200 text-slate-800"
                    : "mx-auto bg-slate-100 text-slate-600 italic"
              } rounded-lg p-3 max-w-[85%]`}
            >
              <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.type !== "system" && 
                  message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                }
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            placeholder="Tell me about your swing stats..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="bg-primary hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <span className="material-icons animate-spin text-sm">refresh</span>
            ) : (
              <span className="material-icons text-sm">send</span>
            )}
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-slate-500">
          Try asking about your stats, like "My bat speed is 75 mph and exit velocity is 90 mph"
        </div>
      </CardContent>
    </Card>
  );
}