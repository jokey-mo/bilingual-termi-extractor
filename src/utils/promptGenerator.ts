
/**
 * Utilities for generating prompts for the Gemini API
 */
import { TmxData } from './tmxParser';

/**
 * Generate a prompt for the Gemini API based on the TMX data and dataset info
 */
export const generatePrompt = (tmxData: TmxData, datasetInfo: string): string => {
  // Prepare translation units JSON - limit to prevent too large prompts
  const translationSamples = tmxData.translationUnits.slice(0, 100);
  
  const prompt = `
You are a terminology extraction expert. Extract bilingual terminology pairs from the following translation memory data.

Dataset Information:
${datasetInfo}

Language Pair:
Source Language: ${tmxData.sourceLanguage}
Target Language: ${tmxData.targetLanguage}

Translation Memory Data (sample of ${translationSamples.length} translation units):
${JSON.stringify(translationSamples, null, 2)}

Please analyze these translation units and extract bilingual terminology pairs. 
Focus on specialized terms, technical concepts, and domain-specific vocabulary.
Return your answer in the following JSON format only:
{
  "terminologyPairs": [
    {
      "sourceTerm": "term in source language",
      "targetTerm": "equivalent term in target language"
    },
    ...
  ]
}
`;
  console.log("Generated prompt length:", prompt.length);
  return prompt;
};
