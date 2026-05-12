import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SwingStats } from "@shared/schema";

interface StatsChatProps {
  onStatsChange?: (stats: SwingStats) => void;
  provider?: 'claude' | 'gemini';
}

type MessageType = "user" | "ai" | "system";

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
}

export default function StatsChatSimple({ onStatsChange, provider }: StatsChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "system",
      content: "Welcome! I'm your Youth Swing Coach. If you have some stats like bat speed or exit velocity, tell me about them. If not, just click the 'I don't have stats' button below and we'll analyze the video directly.",
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
        message: userMessage.content,
        provider,
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
        {/* Progress Steps */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center">
            <div className="bg-gray-200 text-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">1</div>
            <div className="h-1 w-12 bg-gray-200 mx-2"></div>
            <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">2</div>
            <div className="h-1 w-12 bg-primary mx-2"></div>
            <div className="bg-gray-200 text-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">3</div>
          </div>
        </div>
        
        <div className="mb-4">
          <h2 className="text-xl font-sans font-semibold text-center">
            💬 Step 2: Tell Us About Your Player's Swing
          </h2>
          <p className="text-sm text-gray-500 text-center">
            Chat with our Youth Swing Coach to describe stats or swing style
          </p>
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
        
        {/* Quick Stat Buttons */}
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setInputValue(prev => prev + " Bat speed is around 65-70 mph")}
              className="text-xs"
            >
              🏃 Bat Speed
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setInputValue(prev => prev + " Exit velocity is about 75-80 mph")}
              className="text-xs"
            >
              🔥 Exit Velocity
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setInputValue(prev => prev + " Launch angle is about 15 degrees")}
              className="text-xs"
            >
              📐 Launch Angle
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setInputValue("I don't have any stats, but can you help analyze the video?")}
              className="text-xs"
            >
              ❓ I don't have stats
            </Button>
          </div>
          <div className="text-xs text-slate-500 text-center">
            Try asking about your stats, like "My bat speed is 75 mph and exit velocity is 90 mph"
          </div>
        </div>
      </CardContent>
    </Card>
  );
}