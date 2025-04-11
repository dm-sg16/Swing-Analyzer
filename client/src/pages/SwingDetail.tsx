import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swing, SwingStats } from "@shared/schema";
import { ArrowLeft, Download, Calendar, Award, Clock } from "lucide-react";

// Extended interface for analysis results since the schema definition might be different from the actual data
interface AnalysisResultsExtended {
  overallScore?: number;
  score?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  keyFrames?: Array<{
    time: number;
    description: string;
    imageUrl?: string;
    annotations?: Array<any>;
  }>;
  drills?: Array<{
    title: string;
    description: string;
    difficulty: string;
  }>;
  recommendedDrills?: any[];
  advancedMetrics?: Record<string, number>;
}

interface SwingWithAnalysis extends Swing {
  analysisData?: AnalysisResultsExtended;
}

export default function SwingDetail() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [swing, setSwing] = useState<SwingWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchSwingDetails = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiRequest<{ success: boolean, swing: Swing }>(
          'GET',
          `/api/swings/${id}`
        );

        if (response.success && response.swing) {
          // Parse analysis data
          let analysisData: AnalysisResultsExtended | undefined;
          
          if (response.swing.analysis) {
            try {
              analysisData = typeof response.swing.analysis === 'string' 
                ? JSON.parse(response.swing.analysis as string)
                : response.swing.analysis as unknown as AnalysisResultsExtended;
            } catch (e) {
              console.error("Error parsing analysis data:", e);
            }
          }

          setSwing({
            ...response.swing,
            analysisData
          });
        } else {
          toast({
            title: "Error",
            description: "Could not find swing details",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching swing details:", error);
        toast({
          title: "Error",
          description: "Failed to load swing details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSwingDetails();
  }, [id, toast]);

  // Format date
  const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
      // Convert string date to Date object
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Handle download PDF
  const handleDownloadPDF = async () => {
    if (!swing || !swing.analysisData) {
      toast({
        title: "No Analysis",
        description: "No analysis data available to generate PDF",
        variant: "destructive"
      });
      return;
    }
    
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate your PDF...",
      });
      
      // Create a player name from the title
      const playerName = swing.title.includes('-') 
        ? swing.title.split('-')[0].trim() 
        : swing.title.trim();
      
      const response = await apiRequest(
        'POST',
        `/api/generate-pdf`,
        {
          analysis: swing.analysisData,
          playerName: playerName
        }
      );
      
      if (response.success && response.pdfUrl) {
        // Create temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = response.pdfUrl;
        link.download = `${swing.title.replace(/\s+/g, '_')}_analysis.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Success",
          description: "PDF analysis report downloaded successfully",
        });
      } else {
        throw new Error(response.message || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download PDF",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/swings" className="mr-4">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Swings
            </Button>
          </Link>
          <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse"></div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="bg-white shadow-md animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="bg-white shadow-md animate-pulse h-64">
              <CardHeader>
                <div className="h-6 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!swing) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Link href="/swings" className="inline-block mb-6">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Swings
          </Button>
        </Link>
        
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Swing Not Found</h2>
        <p className="text-slate-600 mb-4">
          The swing you're looking for couldn't be found or may have been deleted.
        </p>
        <Link href="/">
          <Button>Upload New Swing</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href="/swings" className="mr-4">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Swings
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{swing.title}</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-1"
          onClick={handleDownloadPDF}
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="bg-white shadow-md">
            <CardHeader className="pb-0">
              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(swing.createdAt)}
                </div>
                {(swing.analysisData?.overallScore || swing.analysisData?.score) && (
                  <div className="flex items-center">
                    <Award className="h-4 w-4 mr-1" />
                    Score: {(swing.analysisData?.overallScore || swing.analysisData?.score || 0).toFixed(1)}/10
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  10 seconds
                </div>
              </div>
              <p className="text-slate-600">{swing.description}</p>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Analysis Details</TabsTrigger>
                  <TabsTrigger value="drills">Recommended Drills</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  {swing.videoUrl && (
                    <div className="aspect-video bg-slate-100 relative overflow-hidden rounded-md">
                      <video
                        src={swing.videoUrl}
                        className="w-full h-full object-contain"
                        controls
                      ></video>
                    </div>
                  )}
                  
                  {swing.analysisData?.summary && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Summary</h3>
                      <p className="text-slate-700">{swing.analysisData.summary}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {swing.analysisData?.strengths && swing.analysisData.strengths.length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-base text-green-600">Strengths</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {swing.analysisData.strengths.map((strength, index) => (
                              <li key={index}>{strength}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Display weaknesses from weaknesses property if available, or from improvements */}
                    {((swing.analysisData?.weaknesses && swing.analysisData.weaknesses.length > 0) || 
                      (swing.analysisData?.improvements && swing.analysisData.improvements.length > 0)) && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-base text-red-600">
                            {swing.analysisData?.weaknesses ? 'Weaknesses' : 'Areas for Improvement'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {swing.analysisData?.weaknesses && swing.analysisData.weaknesses.length > 0 ? 
                              swing.analysisData.weaknesses.map((weakness, index) => (
                                <li key={index}>{weakness}</li>
                              )) :
                              swing.analysisData?.improvements && swing.analysisData.improvements.map((improvement, index) => (
                                <li key={index}>{improvement}</li>
                              ))
                            }
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="space-y-4">
                  {swing.analysisData?.improvements && swing.analysisData.improvements.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Areas for Improvement</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {swing.analysisData.improvements.map((improvement, index) => (
                          <li key={index}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {swing.analysisData?.keyFrames && swing.analysisData.keyFrames.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Key Frames Analysis</h3>
                      <div className="space-y-4">
                        {swing.analysisData.keyFrames.map((frame, index) => (
                          <Card key={index}>
                            <CardHeader className="py-3">
                              <CardTitle className="text-base">
                                Frame at {frame.time.toFixed(2)}s
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              {frame.imageUrl && (
                                <div className="aspect-video bg-slate-100 relative overflow-hidden rounded-md mb-2">
                                  <img
                                    src={frame.imageUrl}
                                    alt={`Frame at ${frame.time}s`}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              <p className="text-sm text-slate-700">{frame.description}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {swing.analysisData?.advancedMetrics && Object.keys(swing.analysisData.advancedMetrics).length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Advanced Metrics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(swing.analysisData.advancedMetrics).map(([key, value], index) => (
                          <Card key={index}>
                            <CardContent className="p-4 text-center">
                              <p className="text-sm text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className="text-xl font-bold">{typeof value === 'number' ? value.toFixed(1) : value}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="drills" className="space-y-4">
                  {((swing.analysisData?.drills && swing.analysisData.drills.length > 0) || 
                    (swing.analysisData?.recommendedDrills && swing.analysisData.recommendedDrills.length > 0)) ? (
                    <div className="grid grid-cols-1 gap-4">
                      {/* Display drills from drills property if available */}
                      {swing.analysisData?.drills?.map((drill, index) => (
                        <Card key={`drill-${index}`}>
                          <CardHeader className="py-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">{drill.title}</CardTitle>
                              {drill.difficulty && (
                                <span className={`
                                  px-2 py-1 rounded-full text-xs
                                  ${drill.difficulty === 'beginner' ? 'bg-green-100 text-green-800' : 
                                    drill.difficulty === 'intermediate' ? 'bg-blue-100 text-blue-800' : 
                                    'bg-orange-100 text-orange-800'}
                                `}>
                                  {drill.difficulty.charAt(0).toUpperCase() + drill.difficulty.slice(1)}
                                </span>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-slate-700">{drill.description}</p>
                          </CardContent>
                        </Card>
                      ))}

                      {/* Display drills from recommendedDrills property if available */}
                      {swing.analysisData?.recommendedDrills?.map((drill, index) => (
                        <Card key={`rec-drill-${index}`}>
                          <CardHeader className="py-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">{drill.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-slate-700">{drill.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-500">
                        No specific drills recommended for this swing.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Player Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {swing.stats || swing.analysisData?.advancedMetrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Display stats from swing.stats if available */}
                    {swing.stats && (
                      <>
                        {(swing.stats as SwingStats).batSpeed !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Bat Speed</p>
                            <p className="font-medium">{(swing.stats as SwingStats).batSpeed} mph</p>
                          </div>
                        )}
                        {(swing.stats as SwingStats).handSpeed !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Hand Speed</p>
                            <p className="font-medium">{(swing.stats as SwingStats).handSpeed} mph</p>
                          </div>
                        )}
                        {(swing.stats as SwingStats).timeToContact !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Time to Contact</p>
                            <p className="font-medium">{(swing.stats as SwingStats).timeToContact?.toFixed(2)} s</p>
                          </div>
                        )}
                        {(swing.stats as SwingStats).attackAngle !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Attack Angle</p>
                            <p className="font-medium">{(swing.stats as SwingStats).attackAngle}°</p>
                          </div>
                        )}
                        {(swing.stats as SwingStats).planeEfficiency !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Plane Efficiency</p>
                            <p className="font-medium">{(swing.stats as SwingStats).planeEfficiency}%</p>
                          </div>
                        )}
                        {(swing.stats as SwingStats).rotationAngle !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Rotation Angle</p>
                            <p className="font-medium">{(swing.stats as SwingStats).rotationAngle}°</p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Display metrics from swing.analysisData if available */}
                    {swing.analysisData?.advancedMetrics && (
                      <>
                        {swing.analysisData.advancedMetrics['batSpeed'] !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Bat Speed</p>
                            <p className="font-medium">{swing.analysisData.advancedMetrics['batSpeed']} mph</p>
                          </div>
                        )}
                        {swing.analysisData.advancedMetrics['handSpeed'] !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Hand Speed</p>
                            <p className="font-medium">{swing.analysisData.advancedMetrics['handSpeed']} mph</p>
                          </div>
                        )}
                        {swing.analysisData.advancedMetrics['timeToContact'] !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Time to Contact</p>
                            <p className="font-medium">{swing.analysisData.advancedMetrics['timeToContact'].toFixed(2)} s</p>
                          </div>
                        )}
                        {swing.analysisData.advancedMetrics['attackAngle'] !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Attack Angle</p>
                            <p className="font-medium">{swing.analysisData.advancedMetrics['attackAngle']}°</p>
                          </div>
                        )}
                        {swing.analysisData.advancedMetrics['planeEfficiency'] !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Plane Efficiency</p>
                            <p className="font-medium">{swing.analysisData.advancedMetrics['planeEfficiency']}%</p>
                          </div>
                        )}
                        {swing.analysisData.advancedMetrics['rotationAngle'] !== undefined && (
                          <div className="p-3 bg-slate-50 rounded">
                            <p className="text-sm text-slate-500">Rotation Angle</p>
                            <p className="font-medium">{swing.analysisData.advancedMetrics['rotationAngle']}°</p>
                          </div>
                        )}
                        
                        {/* Display other metrics as generic stats */}
                        {Object.entries(swing.analysisData.advancedMetrics)
                          .filter(([key]) => !['batSpeed', 'handSpeed', 'timeToContact', 'attackAngle', 'planeEfficiency', 'rotationAngle'].includes(key))
                          .map(([key, value], index) => (
                            <div key={index} className="p-3 bg-slate-50 rounded">
                              <p className="text-sm text-slate-500">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className="font-medium">{typeof value === 'number' ? value.toFixed(1) : value}</p>
                            </div>
                          ))
                        }
                      </>
                    )}
                  </div>
                  
                  {/* Display additional context if available */}
                  {swing.stats && (swing.stats as SwingStats).additionalContext !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Additional Notes</h4>
                      <p className="text-sm text-slate-700">{(swing.stats as SwingStats).additionalContext}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">
                  No stats available for this swing
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}