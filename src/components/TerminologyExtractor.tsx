
import { useEffect, useState } from 'react';
import { parseTmxFile } from '@/utils/tmxParser';
import { generatePrompt } from '@/utils/promptGenerator';
import { callGeminiApi } from '@/utils/geminiApi';
import { processTmxInChunks } from '@/utils/chunkProcessor';
import { toast } from "@/components/ui/use-toast";

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
      
      let tmxData;
      try {
        tmxData = await parseTmxFile(tmxFile);
        console.log("TMX parsing complete:", {
          sourceLanguage: tmxData.sourceLanguage,
          targetLanguage: tmxData.targetLanguage,
          unitCount: tmxData.translationUnits.length
        });
      } catch (parseError: any) {
        console.error("TMX parsing error:", parseError);
        toast({
          title: "File parsing error",
          description: "Could not parse the TMX file. Please check the file format.",
          variant: "destructive",
        });
        throw new Error(`Failed to parse TMX file: ${parseError.message}`);
      }
      
      // Verify we have translation units
      if (!tmxData.translationUnits || tmxData.translationUnits.length === 0) {
        console.error("No translation units found in TMX file");
        toast({
          title: "Empty TMX file",
          description: "No translation units found in the TMX file.",
          variant: "destructive",
        });
        throw new Error("No translation units found in TMX file");
      }
      
      // Step 2: Process TMX in chunks and extract terminology
      onProgress(20);
      console.log("Starting chunk processing with model:", modelName);
      
      try {
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
        
        // Check if we got at least some terms
        if (result.length === 0) {
          toast({
            title: "No terms extracted",
            description: "The process completed, but no terminology was extracted. Try adjusting the dataset info or using a different model.",
          });
        }
        
        // Step 4: Process and return results
        onProgress(90);
        onComplete(result);
        onProgress(100);
      } catch (processingError: any) {
        console.error("Error in terminology extraction processing:", processingError);
        toast({
          title: "Processing error",
          description: "An error occurred while processing the terminology.",
          variant: "destructive",
        });
        throw new Error(`Processing error: ${processingError.message}`);
      }
      
    } catch (error: any) {
      console.error("Error in terminology extraction:", error);
      // Show a more user-friendly error message
      onError(error.message || 'Failed to extract terminology');
      // Still provide any partial results if available
      if (allTerms.length > 0) {
        console.log("Returning partial results despite error:", allTerms.length, "terms");
        toast({
          title: "Partial results available",
          description: `We encountered an error, but ${allTerms.length} terms were successfully extracted.`,
        });
        onComplete(allTerms);
      }
    }
  };
  
  return null; // This component doesn't render anything
};

export default TerminologyExtractor;
