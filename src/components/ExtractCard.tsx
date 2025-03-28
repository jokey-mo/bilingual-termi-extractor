
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import TerminologyExtractor from "./TerminologyExtractor";

interface ExtractCardProps {
  isProcessing: boolean;
  progress: number;
  apiKey: string;
  selectedModel: string;
  datasetInfo: string;
  tmxFile: File | null;
  onExtractTerminology: () => void;
  onProgress: (progress: number) => void;
  onComplete: (terms: Array<{sourceTerm: string, targetTerm: string}>) => void;
  onError: (error: string) => void;
}

const ExtractCard: React.FC<ExtractCardProps> = ({
  isProcessing,
  progress,
  apiKey,
  selectedModel,
  datasetInfo,
  tmxFile,
  onExtractTerminology,
  onProgress,
  onComplete,
  onError
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Extract Terminology</CardTitle>
        <CardDescription>Process the TMX file to extract terminology pairs</CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          className="w-full" 
          onClick={onExtractTerminology}
          disabled={isProcessing || !apiKey || !selectedModel || !datasetInfo || !tmxFile}
        >
          {isProcessing ? "Processing..." : "Extract Terminology"}
        </Button>
        
        {isProcessing && (
          <div className="mt-4 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-slate-600">
              Processing... {progress}%
            </p>
          </div>
        )}
        
        {/* Invisible component that handles the extraction logic */}
        {isProcessing && tmxFile && (
          <TerminologyExtractor
            apiKey={apiKey}
            modelName={selectedModel}
            datasetInfo={datasetInfo}
            tmxFile={tmxFile}
            onProgress={onProgress}
            onComplete={onComplete}
            onError={onError}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ExtractCard;
