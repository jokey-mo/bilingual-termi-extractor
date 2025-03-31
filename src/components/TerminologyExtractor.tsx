
import { useEffect, useState } from 'react';
import { parseTmxFile } from '@/utils/tmxParser';
import { generatePrompt } from '@/utils/promptGenerator';
import { callGeminiApi } from '@/utils/geminiApi';
import { processTmxInChunks } from '@/utils/chunkProcessor';

// Interface definitions for our terminology data
interface TerminologyPair {
  sourceTerm: string;
  targetTerm: string;
}

interface TerminologyExtractorProps {
  apiKey: string;
  modelName: string;
  datasetInfo: string;
  tmxFile: File;
  onProgress: (progress: number) => void;
  onComplete: (terms: TerminologyPair[]) => void;
  onError: (error: string) => void;
  maxTokensPerChunk?: number;
}

const TerminologyExtractor = ({ 
  apiKey, 
  modelName, 
  datasetInfo, 
  tmxFile,
  onProgress,
  onComplete,
  onError,
  maxTokensPerChunk = 100000
}: TerminologyExtractorProps) => {
  const [allTerms, setAllTerms] = useState<TerminologyPair[]>([]);
  
  useEffect(() => {
    extractTerminology();
  }, []);
  
  const extractTerminology = async () => {
    try {
      // Step 1: Parse TMX file
      onProgress(10);
      console.log("Starting TMX parsing...");
      const tmxData = await parseTmxFile(tmxFile);
      console.log("TMX parsing complete:", {
        sourceLanguage: tmxData.sourceLanguage,
        targetLanguage: tmxData.targetLanguage,
        unitCount: tmxData.translationUnits.length
      });
      
      // Step 2: Process TMX in chunks and extract terminology
      onProgress(20);
      console.log("Starting chunk processing with model:", modelName);
      
      const result = await processTmxInChunks({
        tmxData,
        datasetInfo,
        apiKey, 
        modelName,
        maxTokensPerChunk,
        onChunkProgress: (chunkProgress) => {
          // Map chunk progress (0-100) to overall progress (20-90)
          const overallProgress = 20 + Math.floor(chunkProgress * 0.7);
          onProgress(overallProgress);
        }
      });
      
      console.log("Chunk processing complete, extracted unique terms:", result.length);
      
      // Step 4: Process and return results
      onProgress(90);
      onComplete(result);
      onProgress(100);
      
    } catch (error: any) {
      console.error("Error in terminology extraction:", error);
      onError(error.message || 'Failed to extract terminology');
    }
  };
  
  return null; // This component doesn't render anything
};

export default TerminologyExtractor;
