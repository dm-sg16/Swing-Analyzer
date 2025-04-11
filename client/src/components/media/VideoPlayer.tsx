import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisResults } from "@shared/schema";
import FrameAnalysisOverlay from "@/components/analysis/FrameAnalysisOverlay";

interface VideoPlayerProps {
  videoUrl: string;
  onClose: () => void;
  analysisResults?: AnalysisResults | null;
  hideControls?: boolean;
}

export default function VideoPlayer({ 
  videoUrl, 
  onClose,
  analysisResults,
  hideControls = false
}: VideoPlayerProps) {
  // Debug log for analysisResults
  console.log("VideoPlayer received analysisResults:", analysisResults);
  
  // Track when analysis results change
  useEffect(() => {
    console.log("VideoPlayer analysisResults changed:", analysisResults);
    
    // In simple mode, automatically capture key frames when analysis results arrive
    if (hideControls && analysisResults && videoRef.current) {
      // Automatically capture key frames in simple mode
      const autoCaptureFrames = async () => {
        console.log("Auto-capturing frames in simple mode");
        const frames = await captureKeyFrames();
        if (frames) setCapturedFrames(frames);
      };
      
      autoCaptureFrames();
    }
  }, [analysisResults, hideControls]);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // In simple mode, we want to default to not showing the analysis overlay
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(!hideControls);
  

  
  // Update time display
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const updateTime = () => {
      setCurrentTime(video.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);
  
  // Format time display (mm:ss.ms)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };
  
  // Playback controls
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const previousFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Each frame is approximately 1/30 seconds in most videos
    const frameTime = 1/30;
    video.currentTime = Math.max(0, video.currentTime - frameTime);
  };
  
  const nextFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Each frame is approximately 1/30 seconds in most videos
    const frameTime = 1/30;
    video.currentTime = Math.min(video.duration, video.currentTime + frameTime);
  };
  
  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };
  
  const seekToTime = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = time;
    setCurrentTime(time);
  };
  
  const toggleSlowMotion = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isSlowMotion) {
      video.playbackRate = 1.0;
    } else {
      video.playbackRate = 0.25;
    }
    
    setIsSlowMotion(!isSlowMotion);
  };
  
  const toggleFullscreen = () => {
    const videoContainer = document.getElementById('video-container');
    if (!videoContainer) return;
    
    if (!isFullscreen) {
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    setIsFullscreen(!isFullscreen);
  };
  

  
  // Capture a screenshot of the current video frame and analyze it with Gemini AI
  const captureScreenshot = async () => {
    if (!videoRef.current) return;
    
    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current frame to the canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Create a timestamp for the filename
    const timestamp = formatTime(currentTime);
    
    // Determine the swing phase based on video timestamp
    const percentage = video.currentTime / video.duration;
    let phaseName = 'Frame';
    
    if (percentage < 0.1) {
      phaseName = 'Setup';
    } else if (percentage < 0.25) {
      phaseName = 'Takeaway';
    } else if (percentage < 0.4) {
      phaseName = 'Backswing';
    } else if (percentage < 0.55) {
      phaseName = 'Top';
    } else if (percentage < 0.7) {
      phaseName = 'Downswing';
    } else if (percentage < 0.85) {
      phaseName = 'Impact';
    } else {
      phaseName = 'Follow Through';
    }
    
    // Create a download link first (immediate feedback)
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `swing-${phaseName.toLowerCase()}-${timestamp}.jpg`;
    link.click();
    
    // Show a "loading" notification
    alert(`Screenshot saved. Analyzing ${phaseName} frame with Google AI...`);
    
    try {
      // Send to server for AI analysis
      const frameInfo = {
        name: phaseName,
        time: video.currentTime
      };
      
      const response = await fetch('/api/analyze-frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData: dataUrl,
          frameInfo
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze frame with Google AI');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Add to captured frames with AI analysis
        setCapturedFrames(prev => [
          ...prev, 
          { 
            name: `${phaseName} at ${timestamp}`, 
            time: video.currentTime,
            dataUrl,
            analysis: data.analysis
          }
        ]);
        
        // Show success notification
        alert(`AI Analysis of ${phaseName} frame complete!`);
      } else {
        throw new Error(data.message || 'Unknown error during analysis');
      }
    } catch (error) {
      console.error('Error analyzing frame:', error);
      
      // Fall back to basic analysis if AI fails
      const fallbackAnalysis = `This appears to be the ${phaseName} phase of your swing. For detailed expert analysis, please try again when the AI service is available.`;
      
      // Still add to captured frames with basic info
      setCapturedFrames(prev => [
        ...prev, 
        { 
          name: `${phaseName} at ${timestamp}`, 
          time: video.currentTime,
          dataUrl,
          analysis: fallbackAnalysis
        }
      ]);
      
      // Show error notification
      alert(`Could not analyze frame with Google AI. Basic analysis saved instead.`);
    }
    
    return dataUrl; // Return the data URL for potential future use
  };
  
  // Capture key swing frames automatically with Google AI analysis
  const captureKeyFrames = async () => {
    if (!videoRef.current) return;
    
    // Define key swing moments (in percentage of total duration)
    const keyMoments = [
      { 
        name: 'Setup', 
        position: 0.05,
      },
      { 
        name: 'Takeaway', 
        position: 0.15,
      },
      { 
        name: 'Backswing', 
        position: 0.30,
      },
      { 
        name: 'Top', 
        position: 0.45,
      },
      { 
        name: 'Downswing', 
        position: 0.60,
      },
      { 
        name: 'Impact', 
        position: 0.75,
      },
      { 
        name: 'Follow Through', 
        position: 0.90,
      }
    ];
    
    const video = videoRef.current;
    const totalDuration = video.duration;
    
    // Define the type for captured frames
    interface CapturedFrame {
      name: string;
      time: number;
      dataUrl: string;
      analysis: string;
    }
    
    const newCapturedFrames: CapturedFrame[] = [];
    
    // Pause video before capturing
    const wasPlaying = !video.paused;
    if (wasPlaying) video.pause();
    
    // Create a container to show frame capture progress
    const originalTime = video.currentTime;
    
    try {
      // Create canvas once for reuse
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Show processing message without blocking the UI
      console.log(`Capturing and analyzing ${keyMoments.length} key frames with Google AI...`);
      // Use a non-blocking notification instead of alert
      const processingDiv = document.createElement('div');
      processingDiv.id = 'processing-notification';
      processingDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 12px 20px; border-radius: 4px; z-index: 9999;';
      processingDiv.innerHTML = `<div>Analyzing swing frames with AI...</div><div style="margin-top: 5px; font-size: 12px;">0/${keyMoments.length} frames processed</div>`;
      document.body.appendChild(processingDiv);
      
      let processedCount = 0;
      for (const moment of keyMoments) {
        try {
          // Seek to the right position
          const targetTime = totalDuration * moment.position;
          video.currentTime = targetTime;
          
          // Need to wait for the video to update to the new time
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Draw frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          // Update the progress notification
          processedCount++;
          const notificationDiv = document.getElementById('processing-notification');
          if (notificationDiv) {
            notificationDiv.innerHTML = `
              <div>Analyzing swing frames with AI...</div>
              <div style="margin-top: 5px; font-size: 12px;">${processedCount}/${keyMoments.length} frames processed</div>
              <div style="margin-top: 5px; font-size: 11px;">Currently analyzing: ${moment.name}</div>
            `;
          }
          
          // Send to server for AI analysis
          console.log(`Sending ${moment.name} frame to Google AI for analysis...`);
          
          const frameInfo = {
            name: moment.name,
            time: targetTime
          };
          
          const response = await fetch('/api/analyze-frame', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              imageData: dataUrl,
              frameInfo
            })
          });
          
          let frameAnalysis = `Default analysis for ${moment.name} phase`;
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              frameAnalysis = data.analysis;
              console.log(`Successfully received AI analysis for ${moment.name} frame`);
            }
          }
          
          // Save the frame data with analysis
          newCapturedFrames.push({
            name: moment.name,
            time: targetTime,
            dataUrl: dataUrl,
            analysis: frameAnalysis
          });
          
          // Update the state with each new frame as we go along
          setCapturedFrames(prev => [...prev, {
            name: moment.name,
            time: targetTime,
            dataUrl: dataUrl,
            analysis: frameAnalysis
          }]);
          
          console.log(`Processed ${moment.name} frame at ${targetTime.toFixed(2)}s`);
        } catch (frameError) {
          console.error(`Error processing ${moment.name} frame:`, frameError);
          // Continue with the next frame even if one fails
        }
      }
      
      // Remove the notification
      const notificationDiv = document.getElementById('processing-notification');
      if (notificationDiv) {
        notificationDiv.remove();
      }
      
      // Restore original playback state and position
      video.currentTime = originalTime;
      if (wasPlaying) video.play();
      
      if (newCapturedFrames.length > 0) {
        // Show non-blocking success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(0,150,0,0.8); color: white; padding: 12px 20px; border-radius: 4px; z-index: 9999;';
        successDiv.innerHTML = `Successfully analyzed ${newCapturedFrames.length} swing frames with Google AI`;
        document.body.appendChild(successDiv);
        
        // Remove the success message after 5 seconds
        setTimeout(() => {
          if (successDiv && successDiv.parentNode) {
            successDiv.remove();
          }
        }, 5000);
        
        return newCapturedFrames;
      } else {
        throw new Error("No frames were successfully captured and analyzed");
      }
    } catch (error: any) {
      console.error("Error capturing and analyzing frames:", error);
      
      // Remove the notification if it exists
      const notificationDiv = document.getElementById('processing-notification');
      if (notificationDiv) {
        notificationDiv.remove();
      }
      
      // Restore original state
      video.currentTime = originalTime;
      if (wasPlaying) video.play();
      
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(200,0,0,0.8); color: white; padding: 12px 20px; border-radius: 4px; z-index: 9999;';
      errorDiv.innerHTML = `Failed to capture and analyze frames: ${error.message || 'Unknown error'}`;
      document.body.appendChild(errorDiv);
      
      // Remove the error message after 5 seconds
      setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
          errorDiv.remove();
        }
      }, 5000);
      
      return null;
    }
  };

  // Get current active key frame for seeking purposes
  const currentKeyFrame = analysisResults?.keyFrames?.find(
    frame => Math.abs(frame.time - currentTime) < 0.5
  );
  
  // State for captured frames
  const [capturedFrames, setCapturedFrames] = useState<Array<{
    name: string;
    time: number;
    dataUrl: string;
    analysis?: string;
  }>>([]);
  
  // Update analysis results when we have new captured frames
  useEffect(() => {
    // This effect merges captured frames with the analysis results
    // so they'll be included when generating a PDF
    if (analysisResults && capturedFrames.length > 0) {
      console.log("Merging captured frames with analysis results for PDF generation");
      
      // Create a copy of the keyFrames from the analysis results
      const existingKeyFrames = [...(analysisResults.keyFrames || [])];
      
      // For each captured frame, see if there's already a keyFrame at a similar time point
      capturedFrames.forEach(capturedFrame => {
        // Check if this frame is already represented in the key frames
        const existingFrameIndex = existingKeyFrames.findIndex(
          keyFrame => Math.abs(keyFrame.time - capturedFrame.time) < 0.3
        );
        
        if (existingFrameIndex >= 0) {
          // Update the existing keyFrame with the image URL
          existingKeyFrames[existingFrameIndex] = {
            ...existingKeyFrames[existingFrameIndex],
            imageUrl: capturedFrame.dataUrl,
            // Merge descriptions if the captured frame has analysis
            description: capturedFrame.analysis 
              ? `${existingKeyFrames[existingFrameIndex].description}\n\n${capturedFrame.analysis}`
              : existingKeyFrames[existingFrameIndex].description
          };
        } else {
          // Add a new keyFrame with the captured frame data
          existingKeyFrames.push({
            time: capturedFrame.time,
            description: capturedFrame.analysis || `Frame: ${capturedFrame.name}`,
            imageUrl: capturedFrame.dataUrl,
            annotations: []
          });
        }
      });
      
      // Sort keyFrames by time
      existingKeyFrames.sort((a, b) => a.time - b.time);
      
      // Update the analysis results with the merged key frames
      // Note: We're not using setAnalysisResults here as that would trigger a re-render
      // and potentially cause UI issues. Instead, we're updating the object in place.
      if (analysisResults.keyFrames) {
        analysisResults.keyFrames = existingKeyFrames;
      }
    }
  }, [capturedFrames, analysisResults]);

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-4">
        <div className="relative" id="video-container">
          {/* Video element */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-auto max-h-[500px] object-contain"
              src={videoUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            
            {/* AI analysis overlay - only show in advanced mode */}
            {analysisResults && showAnalysisOverlay && !hideControls && (
              <FrameAnalysisOverlay
                keyFrames={analysisResults?.keyFrames || [
                  { time: 1, description: "Setup position" },
                  { time: 2, description: "Start of backswing" },
                  { time: 3, description: "Top of backswing" },
                  { time: 4, description: "Start of downswing" },
                  { time: 5, description: "Impact position" },
                  { time: 6, description: "Follow through" },
                ]}
                currentTime={currentTime}
                onSeek={seekToTime}
                isVisible={showAnalysisOverlay}
                onToggleVisibility={() => setShowAnalysisOverlay(!showAnalysisOverlay)}
              />
            )}
            
            {/* Custom video controls - simplified in simple mode */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-2">
              <div className="flex items-center justify-between">
                {/* Simple mode only has play/pause controls */}
                {hideControls ? (
                  <div className="flex items-center justify-between w-full">
                    <button
                      className="text-white hover:text-secondary"
                      onClick={togglePlayPause}
                    >
                      <span className="material-icons">
                        {isPlaying ? "pause" : "play_arrow"}
                      </span>
                    </button>
                    
                    <div className="flex items-center space-x-2 flex-1 mx-4">
                      <Slider
                        value={[currentTime]}
                        min={0}
                        max={duration || 100}
                        step={0.01}
                        onValueChange={handleSeek}
                        className="w-full"
                      />
                    </div>
                  </div>
                ) : (
                  /* Advanced mode has full controls */
                  <>
                    <div className="flex space-x-2">
                      <button
                        className="text-white hover:text-secondary"
                        onClick={togglePlayPause}
                      >
                        <span className="material-icons">
                          {isPlaying ? "pause" : "play_arrow"}
                        </span>
                      </button>
                      <button
                        className="text-white hover:text-secondary"
                        onClick={previousFrame}
                      >
                        <span className="material-icons">skip_previous</span>
                      </button>
                      <button
                        className="text-white hover:text-secondary"
                        onClick={nextFrame}
                      >
                        <span className="material-icons">skip_next</span>
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-1 mx-4">
                      <span className="text-white text-sm font-mono">
                        {formatTime(currentTime)}
                      </span>
                      <Slider
                        value={[currentTime]}
                        min={0}
                        max={duration || 100}
                        step={0.01}
                        onValueChange={handleSeek}
                        className="w-full"
                      />
                      <span className="text-white text-sm font-mono">
                        {formatTime(duration)}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        className="text-white hover:text-secondary"
                        onClick={captureScreenshot}
                        title="Capture frame"
                      >
                        <span className="material-icons">photo_camera</span>
                      </button>
                      <button
                        className={`text-white hover:text-secondary ${isSlowMotion ? 'text-secondary' : ''}`}
                        onClick={toggleSlowMotion}
                        title="Slow motion"
                      >
                        <span className="material-icons">slow_motion_video</span>
                      </button>
                      <button
                        className="text-white hover:text-secondary"
                        onClick={toggleFullscreen}
                        title="Fullscreen"
                      >
                        <span className="material-icons">
                          {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Video Controls */}
          <div className="mt-4 bg-white p-4 border border-slate-200 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-sans text-lg font-medium">
                {hideControls ? 'Video Player' : 'Frame Analysis Tools'}
              </h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {!hideControls && (
                <Button
                  variant="outline"
                  className="bg-slate-200 hover:bg-slate-300 text-dark"
                  onClick={async () => {
                    const frames = await captureKeyFrames();
                    if (frames) setCapturedFrames(frames);
                  }}
                >
                  <span className="material-icons text-sm mr-1">collections</span>
                  Capture Key Frames
                </Button>
              )}
              
              {analysisResults && !hideControls && (
                <Button
                  variant="outline"
                  className="bg-slate-200 hover:bg-slate-300 text-dark"
                  onClick={() => setShowAnalysisOverlay(!showAnalysisOverlay)}
                >
                  <span className="material-icons text-sm mr-1">
                    {showAnalysisOverlay ? "visibility_off" : "visibility"}
                  </span>
                  {showAnalysisOverlay ? "Hide Analysis" : "Show Analysis"}
                </Button>
              )}
              
              <Button
                variant="outline"
                className="bg-slate-200 hover:bg-slate-300 text-dark ml-auto"
                onClick={onClose}
              >
                <span className="material-icons text-sm mr-1">close</span>
                Close
              </Button>
            </div>
            
            {analysisResults && showAnalysisOverlay && !hideControls && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2 mt-4">
                  {analysisResults.keyFrames.map((frame, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className={`${
                        Math.abs(currentTime - frame.time) < 0.5
                          ? 'bg-secondary text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-dark'
                      }`}
                      onClick={() => seekToTime(frame.time)}
                    >
                      <span className="material-icons text-sm mr-1">flag</span>
                      Key Point {index + 1}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Captured Frames Display - visible only in advanced mode */}
          {!hideControls && capturedFrames.length > 0 && (
            <div className="mt-4 p-4 border border-slate-200 rounded-lg">
              <h3 className="font-sans text-lg font-medium mb-4">Captured Key Frames</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {capturedFrames.map((frame, index) => (
                  <div 
                    key={index} 
                    className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div 
                      className="aspect-w-16 aspect-h-9 relative cursor-pointer"
                      onClick={() => seekToTime(frame.time)}
                    >
                      <img 
                        src={frame.dataUrl} 
                        alt={frame.name} 
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1">
                        <span className="text-white text-xs font-medium">{frame.name}</span>
                      </div>
                    </div>
                    
                    {frame.analysis && (
                      <div className="p-2">
                        <h4 className="text-sm font-medium mb-1">{frame.name} Analysis</h4>
                        {frame.analysis.includes("STRENGTHS:") ? (
                          <div className="text-xs">
                            <div className="mt-1">
                              <p className="font-medium text-emerald-600">Strengths:</p>
                              <ul className="list-disc pl-4 text-slate-600">
                                {frame.analysis
                                  .split("STRENGTHS:")[1]
                                  .split("WEAKNESSES:")[0]
                                  .split("-")
                                  .filter(item => item.trim().length > 0)
                                  .slice(0, 2) // Only show top 2 strengths
                                  .map((item, i) => (
                                    <li key={i} className="my-0.5">{item.trim()}</li>
                                  ))
                                }
                              </ul>
                            </div>
                            
                            <div className="mt-2">
                              <p className="font-medium text-red-600">Areas to Improve:</p>
                              <ul className="list-disc pl-4 text-slate-600">
                                {frame.analysis
                                  .split("WEAKNESSES:")[1]
                                  .split("STRENGTHS:")[0] // In case of duplicates
                                  .split("-")
                                  .filter(item => item.trim().length > 0)
                                  .slice(0, 2) // Only show top 2 weaknesses
                                  .map((item, i) => (
                                    <li key={i} className="my-0.5">{item.trim()}</li>
                                  ))
                                }
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600">{frame.analysis.substring(0, 120)}...</p>
                        )}
                      </div>
                    )}
                    
                    <div className="p-2 pt-0 flex justify-between items-center">
                      <span className="text-xs text-slate-500">{formatTime(frame.time)}</span>
                      <a 
                        href={frame.dataUrl} 
                        download={`swing-${frame.name.toLowerCase()}.jpg`}
                        className="text-xs text-primary hover:text-primary/80 flex items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="material-icons text-sm mr-1">download</span>
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  className="bg-slate-200 hover:bg-slate-300 text-dark"
                  onClick={() => setCapturedFrames([])}
                >
                  <span className="material-icons text-sm mr-1">delete</span>
                  Clear Frames
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
