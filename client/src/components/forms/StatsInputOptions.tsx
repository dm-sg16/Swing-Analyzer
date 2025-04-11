import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import StatsInputForm from "./StatsInputForm";
import StatsChat from "../chat/StatsChat";
import { SwingStats } from "@shared/schema";

interface StatsInputOptionsProps {
  onStatsChange: (stats: SwingStats) => void;
}

export default function StatsInputOptions({ onStatsChange }: StatsInputOptionsProps) {
  const [inputMode, setInputMode] = useState<"form" | "chat">("chat");

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-4">
        <Tabs 
          value={inputMode} 
          onValueChange={(value) => setInputMode(value as "form" | "chat")}
          className="w-full mb-4"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-sans font-medium">Swing Stats Input</h3>
            <TabsList>
              <TabsTrigger value="chat">AI Chat</TabsTrigger>
              <TabsTrigger value="form">Form</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="mt-0 p-0">
            <p className="text-sm text-slate-600 mb-2">
              Chat with our AI assistant to help enter and analyze your swing stats.
            </p>
            <StatsChat onStatsChange={onStatsChange} />
          </TabsContent>
          
          <TabsContent value="form" className="mt-0 p-0">
            <p className="text-sm text-slate-600 mb-2">
              Manually enter your swing stats using the form below.
            </p>
            <StatsInputForm onSubmit={onStatsChange} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}