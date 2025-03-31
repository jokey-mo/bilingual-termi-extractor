
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [maxTokensPerChunk, setMaxTokensPerChunk] = useState<number>(100000);

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setMaxTokensPerChunk(value);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Extract Terminology</CardTitle>
        <CardDescription>Process the TMX file to extract terminology pairs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="maxTokens">Maximum Tokens Per Chunk</Label>
            <Input 
              id="maxTokens"
              type="number" 
              value={maxTokensPerChunk}
              onChange={handleMaxTokensChange}
              disabled={isProcessing}
              placeholder="Maximum tokens per chunk"
              className="w-full"
            />
            <p className="text-xs text-slate-500">
              Larger files will be processed in chunks of this approximate token size.
              Gemini models support different context windows - recommended value is 100,000.
            </p>
          </div>

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
              maxTokensPerChunk={maxTokensPerChunk}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExtractCard;
