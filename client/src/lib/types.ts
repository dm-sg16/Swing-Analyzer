import { SwingStats, AnalysisOptions, AnalysisResults } from "@shared/schema";

// API Response types
export interface UploadResponse {
  success: boolean;
  video?: string | null;
  images?: string[];
  message?: string;
}

export interface StatsResponse {
  success: boolean;
  stats?: SwingStats;
  message?: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysis?: AnalysisResults;
  message?: string;
}

// Frame information for video analysis
export interface FrameInfo {
  time: number;
  url: string;
}

// Video player state
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isSlowMotion: boolean;
}

// Drawing tool options
export interface DrawingToolOptions {
  isDrawing: boolean;
  showGrid: boolean;
  tool: 'path' | 'angle' | 'velocity' | 'none';
}
