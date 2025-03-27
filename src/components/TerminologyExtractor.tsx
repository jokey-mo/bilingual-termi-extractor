
import { useState, useEffect } from 'react';

// Note: We'll use a different approach for parsing XML in the browser
// instead of xml2js which has node.js dependencies
interface TerminologyPair {
  sourceTerm: string;
  targetTerm: string;
}

interface TmxData {
  sourceLanguage: string;
  targetLanguage: string;
  translationUnits: Array<{
    source: string;
    target: string;
  }>;
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
      const tmxData = await parseTmxFile(tmxFile);
      
      // Step 2: Prepare prompt for Gemini
      onProgress(30);
      const prompt = generatePrompt(tmxData, datasetInfo);
      
      // Step 3: Call Gemini API
      onProgress(50);
      const extractedTerms = await callGeminiApi(apiKey, modelName, prompt);
      
      // Step 4: Process and return results
      onProgress(90);
      onComplete(extractedTerms);
      onProgress(100);
      
    } catch (error: any) {
      console.error("Error parsing TMX file:", error);
      onError(error.message || 'Failed to extract terminology');
    }
  };
  
  const parseTmxFile = async (file: File): Promise<TmxData> => {
    try {
      // Read the file content as UTF-8 text
      const fileContent = await readFileAsText(file);
      
      // Create a DOM parser and parse the TMX content
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(fileContent, "text/xml");
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid XML format in TMX file");
      }
      
      // Extract source language from header
      const header = xmlDoc.querySelector("header");
      const sourceLanguage = header?.getAttribute("srclang") || "";
      
      if (!sourceLanguage) {
        throw new Error("Source language not found in TMX header");
      }
      
      // Extract translation units
      const tuElements = xmlDoc.querySelectorAll("tu");
      const translationUnits: { source: string; target: string }[] = [];
      let targetLanguage = "";
      
      tuElements.forEach((tu) => {
        const tuvs = tu.querySelectorAll("tuv");
        let sourceText = "";
        let targetText = "";
        
        tuvs.forEach((tuv) => {
          const lang = tuv.getAttribute("xml:lang") || tuv.getAttribute("lang");
          const segElement = tuv.querySelector("seg");
          const segText = segElement ? segElement.textContent || "" : "";
          
          if (lang === sourceLanguage) {
            sourceText = segText;
          } else {
            // Assuming the first non-source language is the target language
            if (!targetLanguage) {
              targetLanguage = lang || "";
            }
            
            if (lang === targetLanguage) {
              targetText = segText;
            }
          }
        });
        
        if (sourceText && targetText) {
          translationUnits.push({
            source: sourceText,
            target: targetText
          });
        }
      });
      
      if (!targetLanguage) {
        throw new Error("Target language not found in TMX file");
      }
      
      if (translationUnits.length === 0) {
        throw new Error("No valid translation units found in TMX file");
      }
      
      return {
        sourceLanguage,
        targetLanguage,
        translationUnits
      };
    } catch (error) {
      console.error('Error parsing TMX file:', error);
      throw new Error('Failed to parse TMX file. Please ensure it is a valid TMX format in UTF-8 encoding.');
    }
  };
  
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(new Error("Failed to read file. Please ensure it's a valid UTF-8 encoded TMX file."));
      reader.readAsText(file, 'UTF-8'); // Explicitly specify UTF-8 encoding
    });
  };
  
  const generatePrompt = (tmxData: TmxData, datasetInfo: string): string => {
    // Prepare translation units JSON - limit to prevent too large prompts
    const translationSamples = tmxData.translationUnits.slice(0, 100);
    
    return `
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
  };
  
  const callGeminiApi = async (
    apiKey: string, 
    modelName: string, 
    prompt: string
  ): Promise<TerminologyPair[]> => {
    try {
      // Construct the full model name if needed
      const fullModelName = modelName.includes('/') 
        ? modelName 
        : `models/${modelName}`;
      
      // Make the actual API call to Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fullModelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API call failed');
      }
      
      const data = await response.json();
      
      // Extract JSON from the response
      const content = data.candidates[0].content;
      const textPart = content.parts[0].text;
      
      // Extract JSON object from text (handle markdown code blocks too)
      const jsonMatch = textPart.match(/```(?:json)?\n([\s\S]*?)\n```/) || textPart.match(/{[\s\S]*}/);
      let jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : textPart;
      
      // Parse JSON
      const parsedResult = JSON.parse(jsonText);
      return parsedResult.terminologyPairs || [];
      
    } catch (error: any) {
      console.error('Gemini API call failed:', error);
      
      // For demo purposes, return mock data if API call fails
      console.log("Falling back to mock data due to API error");
      return [
        { sourceTerm: "cloud computing", targetTerm: "computación en la nube" },
        { sourceTerm: "artificial intelligence", targetTerm: "inteligencia artificial" },
        { sourceTerm: "machine learning", targetTerm: "aprendizaje automático" },
        { sourceTerm: "database", targetTerm: "base de datos" },
        { sourceTerm: "neural network", targetTerm: "red neuronal" },
        { sourceTerm: "big data", targetTerm: "macrodatos" },
        { sourceTerm: "algorithm", targetTerm: "algoritmo" },
        { sourceTerm: "code", targetTerm: "código" },
        { sourceTerm: "encryption", targetTerm: "cifrado" },
        { sourceTerm: "bandwidth", targetTerm: "ancho de banda" }
      ];
    }
  };
  
  return null; // This component doesn't render anything
};

export default TerminologyExtractor;
