import { useState } from "react";

interface UseFileUploadProps {
  acceptedTypes: string[];
  maxSizeInMB: number;
  onError: (message: string) => void;
}

export default function useFileUpload({
  acceptedTypes,
  maxSizeInMB,
  onError,
}: UseFileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const isValidFile = (file: File): boolean => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      onError(
        `Invalid file type: ${file.type}. Accepted types are: ${acceptedTypes.join(", ")}`
      );
      return false;
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      onError(
        `File too large: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum size is ${maxSizeInMB}MB.`
      );
      return false;
    }

    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(isValidFile);
      
      if (validFiles.length > 0) {
        setUploadedFiles(validFiles);
      }
    }
  };

  const clearFiles = () => {
    setUploadedFiles([]);
  };

  return {
    uploadedFiles,
    handleFileChange,
    isValidFile,
    clearFiles,
  };
}
