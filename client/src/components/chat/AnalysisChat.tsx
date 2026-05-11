import { useState, useEffect, useRef } from "react";
import { AnalysisResults as AnalysisResultsType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AnalysisChatProps {
  analysisResults: AnalysisResultsType | null;
  provider?: 'claude' | 'gemini';
}

type MessageType = "user" | "ai" | "system";

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
}

export default function AnalysisChat({ analysisResults, provider }: AnalysisChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate a welcome message when analysis results are provided
  useEffect(() => {
    if (analysisResults && messages.length === 0) {
      // Welcome message
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: "ai",
        content: "I've analyzed your player's swing. What would you like to know about the analysis?",
        timestamp: new Date()
      };
      
      // Add some conversation starters
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "system",
        content: "Try asking: \"What's the main weakness in the swing?\", \"What drills would help improve power?\", or \"Can you explain the follow-through analysis?\"",
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage, systemMessage]);
    }
  }, [analysisResults, messages.length]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || !analysisResults) return;
    
    // Create and add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsProcessing(true);
    
    try {
      // Format the prompt with the user's question and analysis results
      const prompt = `
Based on this baseball swing analysis data:
Score: ${analysisResults.score}/10
Strengths: ${analysisResults.strengths.join(", ")}
Areas for improvement: ${analysisResults.improvements.join(", ")}
Key frames: ${analysisResults.keyFrames.map((f: {time: number, description: string}) => f.time + "s: " + f.description.substring(0, 100) + "...").join("\n")}
Recommended drills: ${analysisResults.recommendedDrills.map((d: {title: string}) => d.title).join(", ")}

The user asked: "${inputValue}"

Please provide a helpful, concise answer to their question based on the analysis data.
`;

      // We can use the existing chat API with custom prompt
      const response = await apiRequest<{success: boolean, stats?: any, message?: string, response?: string}>(
        "POST",
        "/api/chat-stats",
        {
          message: prompt,
          provider,
        }
      );
      
      if (response.success) {
        // Create and add AI response
        const aiMessage: Message = {
          id: Date.now().toString(),
          type: "ai",
          // Use either message or response field from the API response
          content: response.message || response.response || "I've analyzed the swing data. Would you like me to explain any specific aspect in more detail?",
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.message || "Failed to get response");
      }
    } catch (error: any) {
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "system",
        content: `Sorry, I had trouble processing your question. ${error.message || "Please try again."}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!analysisResults) {
    return (
      <Card className="bg-white shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-8">
            <span className="material-icons text-slate-300 text-5xl mb-4">chat</span>
            <h3 className="text-lg font-medium text-slate-600">Chat about Analysis</h3>
            <p className="text-sm text-slate-500 text-center mt-1">
              Generate an analysis first to chat about the results
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-sans text-lg font-medium">Analysis Assistant</h3>
        </div>
        
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 h-80 overflow-y-auto mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-3 ${
                message.type === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.type === "user"
                    ? "bg-primary text-white"
                    : message.type === "system"
                    ? "bg-slate-200 text-slate-700 italic text-sm"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div
                  className={`text-xs mt-1 ${
                    message.type === "user" ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about the swing analysis..."
            disabled={isProcessing}
            className="flex-1"
          />
          <Button type="submit" disabled={isProcessing || !inputValue.trim()}>
            {isProcessing ? (
              <div className="flex items-center">
                <span className="material-icons animate-spin mr-1">sync</span>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="material-icons mr-1">send</span>
                <span>Ask</span>
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}