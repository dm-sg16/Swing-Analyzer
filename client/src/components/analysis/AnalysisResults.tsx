import { useState } from "react";
import { AnalysisResults as AnalysisResultsType } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { generateAnalysisPDF } from "@/lib/pdfGenerator";
import { DownloadIcon, Share2Icon, FileJson, FileTextIcon } from "lucide-react";

interface AnalysisResultsProps {
  results: AnalysisResultsType | null;
}

export default function AnalysisResults({ results }: AnalysisResultsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("summary");
  
  if (!results) {
    return (
      <Card className="bg-white shadow-md">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-sans text-lg font-medium text-center">Your Results Will Appear Here</h3>
          <div className="py-6 text-center text-slate-600">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="material-icons text-4xl text-gray-400">analytics</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 flex bg-gray-50">
                <div className="w-16 h-16 bg-gray-200 rounded mr-3"></div>
                <div className="flex-1">
                  <div className="h-3 w-3/4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-2 w-1/2 bg-gray-200 rounded mb-1"></div>
                  <div className="h-2 w-5/6 bg-gray-200 rounded"></div>
                </div>
              </div>
              
              <p className="text-sm">
                After clicking "Analyze My Player's Swing," you'll see:
              </p>
              
              <ul className="text-sm text-left space-y-2">
                <li className="flex items-start">
                  <span className="material-icons text-green-500 text-sm mr-2 mt-0.5">check_circle</span>
                  <span>Video playback with key frame analysis</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons text-green-500 text-sm mr-2 mt-0.5">check_circle</span>
                  <span>Swing technique evaluation with scores</span>
                </li>
                <li className="flex items-start">
                  <span className="material-icons text-green-500 text-sm mr-2 mt-0.5">check_circle</span>
                  <span>Personalized drills and improvement tips</span>
                </li>
              </ul>
              
              <p className="text-sm italic text-gray-500">
                Results typically ready in 15-30 seconds
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Handler for sharing analysis
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Baseball Swing Analysis',
          text: `Overall Score: ${results.score}/10. Check out my swing analysis!`,
        });
      } else {
        // Fallback for browsers that don't support navigator.share
        navigator.clipboard.writeText(`My Baseball Swing Analysis - Score: ${results.score}/10`);
        toast({
          title: "Link Copied",
          description: "Analysis link copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };
  
  // Handler for downloading analysis as JSON
  const handleDownloadJSON = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(results, null, 2)
    )}`;
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'swing-analysis.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  
  // Handler for downloading analysis as PDF
  const handleDownloadPDF = async () => {
    try {
      toast({
        title: "Generating PDF",
        description: "Preparing your swing analysis report...",
      });
      
      const pdfUrl = await generateAnalysisPDF(results);
      
      // Create a link to download the PDF
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', pdfUrl);
      downloadAnchorNode.setAttribute('download', 'swing-analysis-report.pdf');
      // No need for target="_blank" when using download attribute
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      
      // Also open the PDF in a new window for preview
      window.open(pdfUrl, '_blank');
      
      toast({
        title: "PDF Generated",
        description: "Your swing analysis report has been downloaded",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-sans text-lg font-medium">Analysis Results</h3>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={handleDownloadPDF} className="flex items-center gap-1">
              <FileTextIcon className="h-4 w-4" />
              <span>PDF</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2Icon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="technique">Technique</TabsTrigger>
            <TabsTrigger value="drills">Drills</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="space-y-4">
            {/* Overall Score */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-slate-700">Overall Swing Score</h4>
                  <p className="text-sm text-slate-500">Based on mechanics and effectiveness</p>
                </div>
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-secondary text-white text-2xl font-bold">
                  {results.score.toFixed(1)}
                </div>
              </div>
            </div>
            
            {/* Key Frame Preview */}
            {results.keyFrames && results.keyFrames.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-slate-700 flex items-center mb-2">
                  <span className="material-icons text-slate-600 mr-1">movie</span>
                  Swing Key Frames
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {results.keyFrames.map((frame, index) => (
                    <div key={index} className="relative rounded-md overflow-hidden border border-slate-200 hover:border-primary transition-colors">
                      {frame.imageUrl ? (
                        <img 
                          src={frame.imageUrl} 
                          alt={`Frame ${index + 1}`} 
                          className="w-full h-auto aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full h-0 pt-[100%] bg-slate-100 flex items-center justify-center">
                          <span className="material-icons text-slate-400 absolute inset-0 flex items-center justify-center">photo</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                        <p className="text-white text-xs font-medium truncate">
                          {frame.time.toFixed(1)}s
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right mt-1">
                  <button 
                    onClick={() => setActiveTab('technique')} 
                    className="text-xs text-primary hover:underline"
                  >
                    See detailed analysis →
                  </button>
                </div>
              </div>
            )}
            
            {/* Strengths */}
            <div>
              <h4 className="font-medium text-slate-700 flex items-center">
                <span className="material-icons text-accent mr-1">check_circle</span>
                Strengths
              </h4>
              <ul className="mt-2 space-y-2 text-sm">
                {results.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <span className="material-icons text-accent text-sm mr-1 mt-0.5">arrow_right</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Areas for Improvement */}
            <div>
              <h4 className="font-medium text-slate-700 flex items-center">
                <span className="material-icons text-secondary mr-1">priority_high</span>
                Areas for Improvement
              </h4>
              <ul className="mt-2 space-y-2 text-sm">
                {results.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start">
                    <span className="material-icons text-secondary text-sm mr-1 mt-0.5">arrow_right</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="technique" className="space-y-4">
            {/* Key Frame Analysis */}
            <div>
              <h4 className="font-medium text-slate-700">Key Frame Analysis</h4>
              {results.keyFrames.length > 0 ? (
                <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
                  {results.keyFrames.map((frame, index) => (
                    <div key={index} className="flex border-b border-slate-200 last:border-0">
                      {frame.imageUrl && (
                        <div className="w-1/3 p-2">
                          <img src={frame.imageUrl} alt={`Frame ${frame.time}s`} className="w-full h-auto rounded" />
                        </div>
                      )}
                      <div className={frame.imageUrl ? "w-2/3 p-2" : "w-full p-2"}>
                        <div className="text-xs text-slate-500">
                          Frame {frame.time.toFixed(2)}s
                        </div>
                        {frame.description.includes("STRENGTHS:") ? (
                          <div className="text-xs mt-1">
                            <h5 className="text-sm font-medium">Key Points:</h5>
                            <div className="mt-1">
                              <p className="font-medium text-emerald-600">Strengths:</p>
                              <ul className="list-disc pl-4 text-slate-600">
                                {frame.description
                                  .split("STRENGTHS:")[1]
                                  .split("WEAKNESSES:")[0]
                                  .split("-")
                                  .filter(item => item.trim().length > 0)
                                  .slice(0, 3) // Only show first 3 strengths
                                  .map((item, i) => (
                                    <li key={i} className="my-0.5">{item.trim()}</li>
                                  ))
                                }
                              </ul>
                            </div>
                            
                            <div className="mt-2">
                              <p className="font-medium text-red-600">Areas to Improve:</p>
                              <ul className="list-disc pl-4 text-slate-600">
                                {frame.description
                                  .split("WEAKNESSES:")[1]
                                  .split("STRENGTHS:")[0] // In case there are duplicate sections
                                  .split("-")
                                  .filter(item => item.trim().length > 0)
                                  .slice(0, 3) // Only show first 3 weaknesses
                                  .map((item, i) => (
                                    <li key={i} className="my-0.5">{item.trim()}</li>
                                  ))
                                }
                              </ul>
                            </div>
                          </div>
                        ) : (
                          // If no STRENGTHS/WEAKNESSES format, show first 120 characters
                          <p className="text-sm">{frame.description.substring(0, 120)}...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-2">No key frame analysis available.</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="drills" className="space-y-4">
            {/* Recommended Drills */}
            <div>
              <h4 className="font-medium text-slate-700">Recommended Drills</h4>
              {results.recommendedDrills.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {results.recommendedDrills.map((drill, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-3">
                      <h5 className="font-medium">{drill.title}</h5>
                      <p className="text-sm text-slate-600 mt-1">{drill.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-2">No recommended drills available.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Save and Share */}
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
            <DownloadIcon className="h-4 w-4" />
            Save to Library
          </Button>
          <Button className="bg-primary hover:bg-blue-700 text-white flex items-center gap-2" onClick={handleShare}>
            <Share2Icon className="h-4 w-4" />
            Share Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
