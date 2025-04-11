import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Annotation {
  type: 'line' | 'angle' | 'circle' | 'arrow' | 'text';
  points: number[];
  color?: string;
  text?: string;
  thickness?: number;
}

interface KeyFrame {
  time: number;
  description: string;
  imageUrl?: string;
  annotations?: Annotation[];
}

interface FrameAnalysisOverlayProps {
  keyFrames: KeyFrame[];
  currentTime: number;
  onSeek: (time: number) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export default function FrameAnalysisOverlay({
  keyFrames,
  currentTime,
  onSeek,
  isVisible,
  onToggleVisibility
}: FrameAnalysisOverlayProps) {
  const [activeFrame, setActiveFrame] = useState<KeyFrame | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  // Find the closest key frame to the current video time
  useEffect(() => {
    if (!keyFrames.length) {
      setActiveFrame(null);
      return;
    }

    // Sort frames by time
    const sortedFrames = [...keyFrames].sort((a, b) => a.time - b.time);
    
    // Find the closest frame to current time (within 0.5 seconds)
    const closestFrame = sortedFrames.find(
      frame => Math.abs(frame.time - currentTime) < 0.5
    );
    
    if (closestFrame) {
      setActiveFrame(closestFrame);
    } else {
      setActiveFrame(null);
    }
  }, [keyFrames, currentTime]);

  // No frames available or analysis is hidden
  if (!keyFrames.length || !isVisible) {
    return null;
  }

  return (
    <div className="absolute bottom-16 left-0 right-0 z-10 transition-opacity duration-300">
      {showOverlay && activeFrame && (
        <Card className="bg-black/80 text-white border-none shadow-lg mx-2 rounded-md overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-start space-x-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-secondary">
                    Frame at {activeFrame.time.toFixed(2)}s
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-white hover:bg-white/20"
                    onClick={() => setShowOverlay(false)}
                  >
                    <span className="material-icons text-sm">close</span>
                  </Button>
                </div>
                <p className="text-sm">{activeFrame.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frame navigation buttons */}
      <div className="flex justify-center mt-2">
        <div className="bg-black/60 rounded-full p-1 flex space-x-1">
          {keyFrames.map((frame, index) => (
            <Button
              key={index}
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-full ${
                activeFrame?.time === frame.time
                  ? 'bg-secondary text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              onClick={() => onSeek(frame.time)}
            >
              <span className="text-xs">{index + 1}</span>
            </Button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/20 text-white hover:bg-white/30"
            onClick={onToggleVisibility}
          >
            <span className="material-icons text-sm">
              {isVisible ? 'visibility_off' : 'visibility'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}