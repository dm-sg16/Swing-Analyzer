import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Swing } from "@shared/schema";
import { CalendarIcon, Clock, FileTextIcon, TrashIcon } from "lucide-react";

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
};

interface SwingWithScore extends Swing {
  analysisData?: AnalysisResultsExtended;
}

export default function MySwings() {
  const { toast } = useToast();
  const [swings, setSwings] = useState<SwingWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("recent");

  // Fetch user's saved swings
  useEffect(() => {
    const fetchSwings = async () => {
      try {
        setLoading(true);
        // Since we're using a demo version without auth, we'll use a generic endpoint
        const response = await apiRequest<{ success: boolean, swings: Swing[] }>(
          'GET',
          '/api/swings'
        );
        
        if (response.success) {
          // Parse analysis JSON to get scores
          const swingsWithScores = (response.swings || []).map(swing => {
            let analysisData: AnalysisResultsExtended | undefined;
            
            if (swing.analysis) {
              try {
                analysisData = typeof swing.analysis === 'string' 
                  ? JSON.parse(swing.analysis as string) 
                  : swing.analysis as unknown as AnalysisResultsExtended;
              } catch (e) {
                console.error("Error parsing analysis data:", e);
              }
            }
            
            return {
              ...swing,
              analysisData
            };
          });
          
          setSwings(swingsWithScores);
        }
      } catch (error) {
        console.error("Error fetching swings:", error);
        // Show sample data since the endpoint might not be fully implemented
        const mockDate1 = new Date();
        mockDate1.setDate(mockDate1.getDate() - 3);
        
        const mockDate2 = new Date();
        mockDate2.setDate(mockDate2.getDate() - 6);
        
        const mockDate3 = new Date();
        mockDate3.setDate(mockDate3.getDate() - 11);
        
        setSwings([
          {
            id: 1,
            userId: 1,
            title: "Practice swing - April 5",
            description: "Regular practice session, focusing on keeping my eye on the ball",
            videoUrl: "/uploads/videos-sample-1.mp4",
            imageUrls: [],
            createdAt: mockDate1,
            isPublic: false,
            stats: null,
            analysis: null,
            analysisData: {
              score: 7.5,
              strengths: ["Good balance", "Solid follow-through"],
              improvements: ["Keep head steady", "Improve hip rotation"],
              keyFrames: [],
              recommendedDrills: []
            }
          },
          {
            id: 2,
            userId: 1,
            title: "Batting cage session",
            description: "Working on my swing tempo and timing",
            videoUrl: "/uploads/videos-sample-2.mp4",
            imageUrls: [],
            createdAt: mockDate2,
            isPublic: false,
            stats: null,
            analysis: null,
            analysisData: {
              score: 8.2,
              strengths: ["Excellent bat speed", "Good timing"],
              improvements: ["Improve stance width"],
              keyFrames: [],
              recommendedDrills: []
            }
          },
          {
            id: 3,
            userId: 1,
            title: "Game day swing",
            description: "Recorded during the weekend game",
            videoUrl: "/uploads/videos-sample-3.mp4",
            imageUrls: [],
            createdAt: mockDate3,
            isPublic: false,
            stats: null,
            analysis: null,
            analysisData: {
              score: 6.8,
              strengths: ["Good power"],
              improvements: ["Work on consistency", "Improve follow through"],
              keyFrames: [],
              recommendedDrills: []
            }
          }
        ]);
        
        toast({
          title: "Unable to fetch swings",
          description: "Showing sample data for demonstration",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSwings();
  }, [toast]);
  
  // Delete a swing
  const handleDelete = async (id: number) => {
    try {
      if (confirm("Are you sure you want to delete this swing analysis?")) {
        // Call delete API
        await apiRequest('DELETE', `/api/swings/${id}`);
        
        // Update local state
        setSwings(swings.filter(swing => swing.id !== id));
        
        toast({
          title: "Swing deleted",
          description: "The swing analysis has been removed from your library",
        });
      }
    } catch (error) {
      console.error("Error deleting swing:", error);
      toast({
        title: "Error",
        description: "Failed to delete swing analysis",
        variant: "destructive"
      });
    }
  };
  
  // Filter swings based on active tab
  const filteredSwings = (() => {
    if (activeTab === "recent") {
      return [...swings].sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
    } else if (activeTab === "highest") {
      return [...swings].sort((a, b) => {
        const scoreA = a.analysisData?.overallScore || a.analysisData?.score || 0;
        const scoreB = b.analysisData?.overallScore || b.analysisData?.score || 0;
        return scoreB - scoreA;
      });
    } else {
      return swings;
    }
  })();
  
  // Format date
  const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
      // Convert string date to Date object
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">My Swing Library</h1>
        <Link href="/">
          <Button className="bg-primary hover:bg-blue-700 text-white">
            Upload New Swing
          </Button>
        </Link>
      </div>
      
      <Card className="bg-white shadow-md">
        <CardContent className="p-4">
          <Tabs defaultValue="recent" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="highest">Highest Rated</TabsTrigger>
              <TabsTrigger value="all">All Swings</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="space-y-4">
              {loading ? (
                // Loading skeleton
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredSwings.length > 0 ? (
                <div className="space-y-4">
                  {filteredSwings.map((swing) => (
                    <div key={swing.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">{swing.title}</h3>
                          <p className="text-slate-600 text-sm mb-2">{swing.description}</p>
                          <div className="flex space-x-4 text-xs text-slate-500">
                            <span className="flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              {formatDate(swing.createdAt)}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              10 seconds
                            </span>
                            {(swing.analysisData?.overallScore || swing.analysisData?.score) && (
                              <span className="flex items-center font-medium text-secondary">
                                Score: {(swing.analysisData?.overallScore || swing.analysisData?.score || 0).toFixed(1)}/10
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/swings/${swing.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-1">
                              <FileTextIcon className="h-3 w-3" />
                              View
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(swing.id)}
                          >
                            <TrashIcon className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="icon-placeholder rounded-full bg-slate-100 h-16 w-16 flex items-center justify-center mx-auto mb-4">
                    <span className="material-icons text-slate-400 text-2xl">sports_baseball</span>
                  </div>
                  <h3 className="text-slate-800 font-medium mb-2">No saved swings yet</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-6">
                    Upload your first swing video on the dashboard to get started with AI analysis.
                  </p>
                  <Link href="/">
                    <Button className="bg-primary hover:bg-blue-700 text-white">
                      Upload Your First Swing
                    </Button>
                  </Link>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}