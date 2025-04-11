import { useEffect } from "react";

export interface Annotation {
  type: 'line' | 'angle' | 'circle' | 'arrow' | 'text';
  points: number[];
  color?: string;
  text?: string;
  thickness?: number;
}

interface FrameAnnotationProps {
  canvasRef: HTMLCanvasElement | null;
  annotations: Annotation[];
  canvasWidth: number;
  canvasHeight: number;
  visible: boolean;
}

export default function FrameAnnotation({
  canvasRef,
  annotations,
  canvasWidth,
  canvasHeight,
  visible
}: FrameAnnotationProps) {
  // Draw annotations using native canvas API
  useEffect(() => {
    if (!canvasRef || !visible) return;
    
    // Get canvas context
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    
    // Make sure canvas dimensions are set correctly
    canvasRef.width = canvasWidth;
    canvasRef.height = canvasHeight;
    
    console.log("Drawing annotations:", annotations.length, "on canvas size:", canvasWidth, "x", canvasHeight);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // TEST CODE - Add a debug rectangle around the canvas edge
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
    
    if (annotations.length === 0) {
      // TEST CODE - If no annotations, draw a sample circle in the middle just for testing
      console.log("No annotations, drawing test circle");
      ctx.beginPath();
      ctx.arc(canvasWidth / 2, canvasHeight / 2, 30, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.fill();
      ctx.stroke();
      return;
    }
    
    // Helper function to convert percentage to pixels
    const scaleX = (x: number) => (x / 100) * canvasWidth;
    const scaleY = (y: number) => (y / 100) * canvasHeight;
    
    // Draw each annotation
    annotations.forEach(annotation => {
      const { type, points, color = '#FF0000', text = '', thickness = 3 } = annotation;
      
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = thickness;
      ctx.font = '14px Arial';
      
      switch (type) {
        case 'line': {
          if (points.length >= 4) {
            const [x1, y1, x2, y2] = points;
            ctx.beginPath();
            ctx.moveTo(scaleX(x1), scaleY(y1));
            ctx.lineTo(scaleX(x2), scaleY(y2));
            ctx.stroke();
          }
          break;
        }
        
        case 'arrow': {
          if (points.length >= 4) {
            const [x1, y1, x2, y2] = points;
            const arrowSize = thickness * 3;
            
            // Draw the line
            ctx.beginPath();
            ctx.moveTo(scaleX(x1), scaleY(y1));
            ctx.lineTo(scaleX(x2), scaleY(y2));
            ctx.stroke();
            
            // Draw the arrowhead
            const angle = Math.atan2(scaleY(y2) - scaleY(y1), scaleX(x2) - scaleX(x1));
            ctx.beginPath();
            ctx.moveTo(scaleX(x2), scaleY(y2));
            ctx.lineTo(
              scaleX(x2) - arrowSize * Math.cos(angle - Math.PI / 6),
              scaleY(y2) - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              scaleX(x2) - arrowSize * Math.cos(angle + Math.PI / 6),
              scaleY(y2) - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
          break;
        }
        
        case 'circle': {
          if (points.length >= 3) {
            const [x, y, radius] = points;
            ctx.beginPath();
            ctx.arc(scaleX(x), scaleY(y), scaleX(radius), 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }
        
        case 'angle': {
          if (points.length >= 6) {
            const [vx, vy, p1x, p1y, p2x, p2y] = points;
            
            // Draw first line
            ctx.beginPath();
            ctx.moveTo(scaleX(vx), scaleY(vy));
            ctx.lineTo(scaleX(p1x), scaleY(p1y));
            ctx.stroke();
            
            // Draw second line
            ctx.beginPath();
            ctx.moveTo(scaleX(vx), scaleY(vy));
            ctx.lineTo(scaleX(p2x), scaleY(p2y));
            ctx.stroke();
            
            // Calculate angle and display it
            const angle1 = Math.atan2(scaleY(p1y) - scaleY(vy), scaleX(p1x) - scaleX(vx));
            const angle2 = Math.atan2(scaleY(p2y) - scaleY(vy), scaleX(p2x) - scaleX(vx));
            const angleDiff = Math.abs(((angle2 - angle1) * 180) / Math.PI).toFixed(0);
            
            ctx.fillText(`${angleDiff}°`, scaleX(vx) + 10, scaleY(vy) - 5);
          }
          break;
        }
        
        case 'text': {
          if (points.length >= 2 && text) {
            const [x, y] = points;
            
            // Add a background for better readability
            const textWidth = ctx.measureText(text).width;
            const padding = 4;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(
              scaleX(x) - padding, 
              scaleY(y) - 16, 
              textWidth + (padding * 2), 
              20
            );
            
            ctx.fillStyle = color;
            ctx.fillText(text, scaleX(x), scaleY(y));
          }
          break;
        }
      }
    });
    
  }, [canvasRef, annotations, canvasWidth, canvasHeight, visible]);
  
  return null; // Component doesn't render anything directly
}