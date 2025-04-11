import { useState } from "react";
import { AnalysisOptions } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnalysisActionsProps {
  options: AnalysisOptions;
  onOptionsChange: (options: AnalysisOptions) => void;
  onGenerateAnalysis: () => void;
  isAnalyzing: boolean;
}

export default function AnalysisActions({
  options,
  onOptionsChange,
  onGenerateAnalysis,
  isAnalyzing
}: AnalysisActionsProps) {
  const handleOptionChange = (
    key: keyof AnalysisOptions,
    checked: boolean | string
  ) => {
    onOptionsChange({
      ...options,
      [key]: checked === "indeterminate" ? false : checked,
    });
  };

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-6">
        {/* Progress Steps */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center">
            <div className="bg-gray-200 text-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">1</div>
            <div className="h-1 w-12 bg-gray-200 mx-2"></div>
            <div className="bg-gray-200 text-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">2</div>
            <div className="h-1 w-12 bg-gray-200 mx-2"></div>
            <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">3</div>
          </div>
        </div>
        
        <h2 className="text-xl font-sans font-semibold text-center mb-1">
          🏆 Step 3: Analyze Your Player's Swing
        </h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          Select which aspects of your player's swing you'd like feedback on
        </p>

        {/* Analysis Options */}
        <div className="space-y-3 mb-4">
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="analyze-technique"
                      checked={options.analyzeTechnique}
                      onCheckedChange={(checked) =>
                        handleOptionChange("analyzeTechnique", checked)
                      }
                    />
                    <label
                      htmlFor="analyze-technique"
                      className="text-slate-700 cursor-pointer font-medium"
                    >
                      ✅ Swing Technique
                    </label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-60">We check timing, hand path, and follow-through during the swing.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="analyze-mechanics"
                      checked={options.analyzeMechanics}
                      onCheckedChange={(checked) =>
                        handleOptionChange("analyzeMechanics", checked)
                      }
                    />
                    <label
                      htmlFor="analyze-mechanics"
                      className="text-slate-700 cursor-pointer font-medium"
                    >
                      🧠 Mechanics Analysis
                    </label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-60">We break down hips, shoulders, and body alignment.</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="analyze-recommendations"
                      checked={options.analyzeRecommendations}
                      onCheckedChange={(checked) =>
                        handleOptionChange("analyzeRecommendations", checked)
                      }
                    />
                    <label
                      htmlFor="analyze-recommendations"
                      className="text-slate-700 cursor-pointer font-medium"
                    >
                      🚀 Improvement Recommendations
                    </label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-60">Get simple drills tailored to your player.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        <Button
          onClick={onGenerateAnalysis}
          disabled={isAnalyzing}
          className="bg-orange-500 hover:bg-orange-600 text-white flex items-center w-full justify-center py-6"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <span className="material-icons animate-spin mr-2">refresh</span>
              Analyzing Your Player's Swing...
            </>
          ) : (
            <>
              <span className="material-icons mr-2">auto_fix_high</span>
              🏆 Analyze My Player's Swing
            </>
          )}
        </Button>

        <div className="text-sm text-slate-500 mt-3 text-center">
          Analysis results will appear below when complete
        </div>
      </CardContent>
    </Card>
  );
}
