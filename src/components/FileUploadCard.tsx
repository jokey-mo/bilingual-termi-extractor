
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FileUploader from "./FileUploader";

interface FileUploadCardProps {
  tmxFile: File | null;
  onFileUpload: (file: File) => void;
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({ tmxFile, onFileUpload }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Upload TMX File</CardTitle>
        <CardDescription>Upload your TMX translation memory file</CardDescription>
      </CardHeader>
      <CardContent>
        <FileUploader onFileUpload={onFileUpload} />
        {tmxFile && (
          <p className="text-sm text-green-600 mt-2">
            Uploaded: {tmxFile.name} ({Math.round(tmxFile.size / 1024)} KB)
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUploadCard;
