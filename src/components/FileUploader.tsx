
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
}

const FileUploader = ({ onFileUpload }: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
  };
  
  const validateAndUpload = (file: File) => {
    // Check file extension (simple validation)
    if (!file.name.toLowerCase().endsWith('.tmx')) {
      alert('Please upload a valid TMX file.');
      return;
    }
    
    // Pass the valid file to parent component
    onFileUpload(file);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
  };
  
  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-md p-6 text-center",
        isDragging ? "border-primary bg-primary/5" : "border-gray-300",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".tmx"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center justify-center gap-2">
        <Upload className="h-10 w-10 text-gray-400" />
        <div className="text-sm text-gray-600">
          <span className="font-medium">Click to upload</span> or drag and drop
        </div>
        <p className="text-xs text-gray-500">
          TMX files only (.tmx)
        </p>
        <Button 
          variant="outline" 
          onClick={() => fileInputRef.current?.click()}
          className="mt-2"
        >
          Select File
        </Button>
      </div>
    </div>
  );
};

export default FileUploader;
