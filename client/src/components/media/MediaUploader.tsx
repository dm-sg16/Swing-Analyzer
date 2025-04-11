import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useFileUpload from "@/hooks/use-file-upload";

interface MediaUploaderProps {
  onUpload: (files: { videos?: File[], images?: File[] }) => void;
}

export default function MediaUploader({ onUpload }: MediaUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ageGroup, setAgeGroup] = useState<string>("");
  const { uploadedFiles, handleFileChange, isValidFile } = useFileUpload({
    acceptedTypes: ["video/mp4", "video/quicktime", "image/jpeg", "image/png"],
    maxSizeInMB: 100,
    onError: (message) => {
      toast({
        title: "Upload Error",
        description: message,
        variant: "destructive",
      });
    }
  });

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(file => isValidFile(file));
      
      if (validFiles.length > 0) {
        const videoFiles = validFiles.filter(file => file.type.startsWith('video/'));
        const imageFiles = validFiles.filter(file => file.type.startsWith('image/'));
        
        if (videoFiles.length > 0 || imageFiles.length > 0) {
          onUpload({
            videos: videoFiles.length > 0 ? videoFiles : undefined,
            images: imageFiles.length > 0 ? imageFiles : undefined
          });
        }
      }
    }
  };

  const handleSubmit = () => {
    if (uploadedFiles.length > 0) {
      const videoFiles = uploadedFiles.filter(file => file.type.startsWith('video/'));
      const imageFiles = uploadedFiles.filter(file => file.type.startsWith('image/'));
      
      if (videoFiles.length === 0 && imageFiles.length === 0) {
        toast({
          title: "No Valid Files",
          description: "Please select at least one video or image file.",
          variant: "destructive",
        });
        return;
      }
      
      onUpload({
        videos: videoFiles.length > 0 ? videoFiles : undefined,
        images: imageFiles.length > 0 ? imageFiles : undefined
      });
    } else {
      toast({
        title: "No Files Selected",
        description: "Please select video or image files to upload.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-6">
        {/* Progress Steps */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center">
            <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">1</div>
            <div className="h-1 w-12 bg-primary mx-2"></div>
            <div className="bg-gray-200 text-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">2</div>
            <div className="h-1 w-12 bg-gray-200 mx-2"></div>
            <div className="bg-gray-200 text-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">3</div>
          </div>
        </div>
      
        <h2 className="text-xl font-sans font-semibold text-center mb-1">
          🎥 Step 1: Upload a Swing Video of Your Player
        </h2>
        <p className="text-sm text-slate-500 text-center mb-4">
          A simple phone recording works great! Make sure the full swing is visible.
        </p>
        
        <div
          className={`border-2 border-dashed ${
            isDragging ? "border-primary bg-primary/5" : "border-slate-300"
          } rounded-lg p-8 text-center transition-colors`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="mx-auto max-w-xl">
            <span className="material-icons text-5xl text-slate-400 mb-2 block">cloud_upload</span>
            <h3 className="text-lg font-sans font-medium mb-2">Drag and drop your video here</h3>
            <p className="text-slate-500 mb-4">
              Upload video of your player's baseball swing
            </p>
            
            <div className="flex justify-center">
              <Button 
                variant="default" 
                className="bg-primary hover:bg-blue-700"
                onClick={handleClick}
              >
                <span className="material-icons mr-1 text-sm">add</span>
                Select Video
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/mp4,video/quicktime,image/jpeg,image/png"
                multiple
                className="hidden"
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Selected Files</h4>
                <ul className="text-sm text-left max-h-40 overflow-y-auto">
                  {uploadedFiles.map((file, index) => (
                    <li key={index} className="py-1 px-2 bg-slate-50 rounded mb-1 flex justify-between">
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-slate-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant="default" 
                  className="mt-4 bg-primary hover:bg-blue-700"
                  onClick={handleSubmit}
                >
                  Upload Selected Files
                </Button>
              </div>
            )}
            
            <div className="mt-4 text-sm text-slate-500">
              <p>Supported formats: MP4, MOV, JPG, PNG (max 100MB)</p>
            </div>
          </div>
        </div>
        
        {/* Age Group Selector */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Player's Age Group (Optional)
          </label>
          <Select value={ageGroup} onValueChange={setAgeGroup}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select age group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6-8">6-8 years</SelectItem>
              <SelectItem value="9-12">9-12 years</SelectItem>
              <SelectItem value="13-15">13-15 years</SelectItem>
              <SelectItem value="high-school">High School</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            This helps tailor the analysis to age-appropriate mechanics
          </p>
        </div>
      </CardContent>
    </Card>
  );
}