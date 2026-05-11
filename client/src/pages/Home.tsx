import { useState, useEffect } from "react";
import MediaUploader from "@/components/media/MediaUploader";
import VideoPlayer from "@/components/media/VideoPlayer";
import AnalysisActions from "@/components/analysis/AnalysisActions";
import AnalysisResults from "@/components/analysis/AnalysisResults";
import StatsChatSimple from "@/components/chat/StatsChatSimple";
import { SwingStats, AnalysisOptions, AnalysisResults as AnalysisResultsType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// We're using a dynamic import for AnalysisChat to work around the module not found error
const AnalysisChat = (props: any) => {
  const [Component, setComponent] = useState<any>(null);
  
  useEffect(() => {
    import("@/components/chat/AnalysisChat").then(mod => {
      setComponent(() => mod.default);
    });
  }, []);
  
  return Component ? <Component {...props} /> : null;
};

export default function Home() {
  const { toast } = useToast();
  
  // State for tabs
  const [activeTab, setActiveTab] = useState("simple");
  
  // State for uploaded media
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  // State for swing stats and analysis options
  const [stats, setStats] = useState<SwingStats | null>(null);
  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions>({
    analyzeTechnique: true,
    analyzeMechanics: true,
    analyzeRecommendations: true
  });
  
  // State for analysis results
  const [analysisResults, setAnalysisResults] = useState<AnalysisResultsType | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI provider selection (server-side default is also 'claude' if AI_PROVIDER unset)
  const [provider, setProvider] = useState<'claude' | 'gemini'>('claude');
  
  // Auto-generate analysis when video is uploaded (for Simple mode)
  useEffect(() => {
    if (activeTab === "simple" && videoUrl && !analysisResults && !isAnalyzing) {
      // Add a slight delay to allow the video to load
      const timer = setTimeout(() => {
        handleGenerateAnalysis();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [videoUrl, analysisResults, activeTab, isAnalyzing]);
  
  // Handle media upload
  const handleMediaUpload = async (files: { videos?: File[], images?: File[] }) => {
    if (files.videos && files.videos.length > 0) {
      // Only use the first video
      setVideoFiles([files.videos[0]]);
      
      // Create temporary URL for preview
      const url = URL.createObjectURL(files.videos[0]);
      setVideoUrl(url);
    }
    
    if (files.images && files.images.length > 0) {
      setImageFiles(files.images);
      
      // Create temporary URLs for previews
      const urls = files.images.map(file => URL.createObjectURL(file));
      setImageUrls(urls);
    }
    
    // Upload files to server
    try {
      const formData = new FormData();
      
      if (files.videos && files.videos.length > 0) {
        // Only upload the first video
        formData.append("videos", files.videos[0]);
      }
      
      if (files.images && files.images.length > 0) {
        files.images.forEach(image => {
          formData.append("images", image);
        });
      }
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update with server URLs
        if (data.videos && data.videos.length > 0) {
          setVideoUrl(data.videos[0]);
        }
        if (data.images && data.images.length > 0) {
          setImageUrls(data.images);
        }
        
        toast({
          title: "Upload Successful",
          description: "Your media has been uploaded successfully.",
          variant: "default",
        });
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "There was an error uploading your files.",
        variant: "destructive",
      });
    }
  };
  
  // Handle stats change from form or chat
  const handleStatsChange = (newStats: SwingStats) => {
    setStats(newStats);
    toast({
      title: "Stats Updated",
      description: "Your swing stats have been updated and will be used for analysis.",
      variant: "default",
    });
  };
  
  // Handle analysis generation
  const handleGenerateAnalysis = async () => {
    // Check if we have videos or images to analyze
    if (!videoUrl && imageUrls.length === 0) {
      toast({
        title: "Missing Media",
        description: "Please upload a video or images for analysis.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Generating analysis with:", {
      hasVideo: !!videoUrl,
      imageUrlsCount: imageUrls.length,
      hasStats: !!stats,
      options: analysisOptions
    });
    
    setIsAnalyzing(true);
    
    try {
      console.log("Sending analysis request to server...");
      
      interface AnalysisResponse {
        success: boolean;
        analysis: AnalysisResultsType;
        message?: string;
        provider?: 'claude' | 'gemini';
      }

      const response = await apiRequest<AnalysisResponse>("POST", "/api/analyze", {
        videoUrls: videoUrl ? [videoUrl] : [],
        imageUrls,
        stats,
        options: analysisOptions,
        provider,
      });
      
      console.log("Received analysis response:", response);
      
      if (!response.analysis) {
        console.error("Missing analysis data in response", response);
        throw new Error("Invalid response from server - missing analysis data");
      }
      
      setAnalysisResults(response.analysis);
      
      console.log("Analysis results set successfully:", response.analysis);
      
      toast({
        title: "Analysis Complete",
        description: "Your swing analysis has been generated.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "There was an error generating your analysis.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Handle closing the video player
  const handleCloseVideo = () => {
    // Revoke blob URL if needed
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    
    // Reset state
    setVideoUrl(null);
    setVideoFiles([]);
    setAnalysisResults(null);
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-sans font-bold text-dark">Baseball Swing Analysis</h1>
        <p className="text-slate-600">Upload, analyze, and improve your player's swing with AI-powered feedback.</p>
      </div>
      
      {/* Mode selection tabs */}
      <Tabs defaultValue="simple" className="w-full mb-6" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="simple">Simple Mode</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
        </TabsList>
        
        <TabsContent value="simple" className="mt-4">
          <div className="rounded-lg border p-4 mb-4 bg-blue-50 shadow-sm">
            <h2 className="text-lg font-medium text-blue-700 mb-2">👨‍👧‍👦 Parent-Friendly Mode</h2>
            <p className="text-slate-600 text-sm mb-2">
              Simply upload a video of your player's swing. Our AI will automatically identify key moments, 
              analyze mechanics, and generate a complete report. No technical knowledge required!
            </p>
            <ol className="text-sm text-slate-700 ml-5 list-decimal">
              <li className="mb-1">Upload a baseball swing video</li>
              <li className="mb-1">Wait for automatic analysis (about 30 seconds)</li>
              <li className="mb-1">Review the report and download as PDF</li>
            </ol>
          </div>
        </TabsContent>
        
        <TabsContent value="advanced" className="mt-4">
          <div className="rounded-lg border p-4 mb-4 bg-purple-50 shadow-sm">
            <h2 className="text-lg font-medium text-purple-700 mb-2">⚾ Coach's Advanced Mode</h2>
            <p className="text-slate-600 text-sm">
              This mode provides fine-grained control over the analysis process. 
              Manually select key moments, input detailed stats, customize analysis options, 
              and chat with AI for specific insights.
            </p>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left panel: Upload and Video/Image Display */}
        <div className="w-full lg:w-2/3 space-y-6">
          {/* Media uploader or video player */}
          {videoUrl ? (
            <VideoPlayer
              videoUrl={videoUrl}
              analysisResults={analysisResults}
              onClose={handleCloseVideo}
              // In simple mode, hide manual frame capture controls
              hideControls={activeTab === "simple"}
              provider={provider}
            />
          ) : (
            <MediaUploader onUpload={handleMediaUpload} />
          )}
        </div>
        
        {/* Right panel: Changes based on mode */}
        <div className="w-full lg:w-1/3 space-y-6">
          {activeTab === "simple" ? (
            /* Simple Mode */
            <>
              {isAnalyzing && (
                <div className="bg-white rounded-md border p-4 flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-t-2 border-blue-500 rounded-full"></div>
                  <p>Analyzing swing... Please wait</p>
                </div>
              )}
              
              {/* Simple mode just shows results */}
              {analysisResults && !isAnalyzing && (
                <>
                  <AnalysisResults results={analysisResults} />
                  {/* Analysis Chat for simple questions */}
                  {analysisResults && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-2">🤔 Questions About Analysis?</h3>
                      <AnalysisChat analysisResults={analysisResults} provider={provider} />
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            /* Advanced Mode */
            <>
              {/* Stats Chat */}
              <StatsChatSimple onStatsChange={handleStatsChange} provider={provider} />
              
              {/* Analysis actions with all options */}
              <AnalysisActions
                options={analysisOptions}
                onOptionsChange={setAnalysisOptions}
                onGenerateAnalysis={handleGenerateAnalysis}
                isAnalyzing={isAnalyzing}
                provider={provider}
                onProviderChange={setProvider}
              />
              
              {/* Analysis results */}
              <AnalysisResults results={analysisResults} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}