
import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Interface definitions for our terminology data
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
      const extractedTerms = await callGeminiApiWithSdk(apiKey, modelName, prompt);
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
  
  const parseTmxFile = async (file: File): Promise<TmxData> => {
    try {
      // Read the file content as UTF-8 text
      const fileContent = await readFileAsText(file);
      console.log("TMX file content loaded, size:", fileContent.length);
      
      // Create a DOM parser and parse the TMX content
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(fileContent, "text/xml");
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        console.error("XML parse error:", parserError.textContent);
        throw new Error("Invalid XML format in TMX file");
      }
      
      // Extract source language from header
      const header = xmlDoc.querySelector("header");
      const sourceLanguage = header?.getAttribute("srclang") || "";
      console.log("Source language from TMX:", sourceLanguage);
      
      if (!sourceLanguage) {
        throw new Error("Source language not found in TMX header");
      }
      
      // Extract translation units
      const tuElements = xmlDoc.querySelectorAll("tu");
      console.log("Number of translation units found:", tuElements.length);
      
      const translationUnits: { source: string; target: string }[] = [];
      let targetLanguage = "";
      
      tuElements.forEach((tu, index) => {
        if (index < 5) console.log(`Processing TU #${index + 1}`);
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
              console.log("Target language detected:", targetLanguage);
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
      
      console.log("TMX parsing completed successfully:", {
        sourceLanguage,
        targetLanguage,
        translationUnits: translationUnits.length
      });
      
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
      reader.onload = (event) => {
        const result = event.target?.result as string;
        console.log("File read complete, size:", result.length);
        resolve(result);
      };
      reader.onerror = (error) => {
        console.error("File read error:", error);
        reject(new Error("Failed to read file. Please ensure it's a valid UTF-8 encoded TMX file."));
      };
      reader.readAsText(file, 'UTF-8'); // Explicitly specify UTF-8 encoding
    });
  };
  
  const generatePrompt = (tmxData: TmxData, datasetInfo: string): string => {
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
  
  const callGeminiApiWithSdk = async (
    apiKey: string, 
    modelNameInput: string, 
    prompt: string
  ): Promise<TerminologyPair[]> => {
    try {
      console.log("Initializing Gemini SDK with model:", modelNameInput);
      
      // Initialize the Gemini SDK
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Normalize model name by removing any "models/" prefix if present
      const modelName = modelNameInput.replace(/^models\//, '');
      console.log("Using normalized model name:", modelName);
      
      // Get the model
      const model = genAI.getGenerativeModel({ model: modelName });
      
      console.log("Sending request to Gemini API...");
      // Configure the generation parameters
      const generationConfig = {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      };
      
      // Create content with proper role structure
      // This fixes the type error by providing the required 'role' property
      const result = await model.generateContent({
        contents: [{ 
          role: 'user',
          parts: [{ text: prompt }] 
        }],
        generationConfig
      });
      
      console.log("Received response from Gemini API");
      
      // Log the raw response for debugging
      const responseText = result.response.text();
      console.log("Raw response:", responseText);
      
      // Extract JSON from the response - handle both clean JSON and markdown-wrapped JSON
      let jsonText = responseText;
      
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || responseText.match(/{[\s\S]*}/);
      if (jsonMatch) {
        jsonText = jsonMatch[1] || jsonMatch[0];
        console.log("Extracted JSON from markdown");
      }
      
      try {
        // Parse the JSON response
        const parsedResult = JSON.parse(jsonText);
        console.log("JSON parsed successfully", parsedResult);
        
        // Validate the response structure
        if (!parsedResult.terminologyPairs || !Array.isArray(parsedResult.terminologyPairs)) {
          console.error("Invalid response format - missing terminologyPairs array");
          throw new Error("Invalid response format from Gemini API");
        }
        
        return parsedResult.terminologyPairs;
        
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        console.log("Problematic JSON text:", jsonText);
        throw new Error("Failed to parse Gemini API response as JSON");
      }
      
    } catch (error: any) {
      console.error('Gemini API call failed:', error);
      
      // More detailed error information
      if (error.response) {
        console.error('API error response:', error.response);
      }
      
      throw new Error(`Gemini API error: ${error.message}`);
    }
  };
  
  return null; // This component doesn't render anything
};

export default TerminologyExtractor;
