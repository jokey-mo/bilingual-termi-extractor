
import { useEffect } from 'react';
import { parseTmxFile } from '@/utils/tmxParser';
import { generatePrompt } from '@/utils/promptGenerator';
import { callGeminiApi } from '@/utils/geminiApi';

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
}

const TerminologyExtractor = ({ 
  apiKey, 
  modelName, 
  datasetInfo, 
  tmxFile,
  onProgress,
  onComplete,
  onError
}: TerminologyExtractorProps) => {
  
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
      
      // Step 2: Prepare prompt for Gemini
      onProgress(30);
      console.log("Generating prompt...");
      const prompt = generatePrompt(tmxData, datasetInfo);
      
      // Step 3: Call Gemini API with Google's official SDK
      onProgress(50);
      console.log("Calling Gemini API with model:", modelName);
      const extractedTerms = await callGeminiApi(apiKey, modelName, prompt);
      console.log("Gemini API call complete, extracted terms:", extractedTerms.length);
      
      // Step 4: Process and return results
      onProgress(90);
      onComplete(extractedTerms);
      onProgress(100);
      
    } catch (error: any) {
      console.error("Error in terminology extraction:", error);
      onError(error.message || 'Failed to extract terminology');
    }
  };
  
  return null; // This component doesn't render anything
};

export default TerminologyExtractor;
