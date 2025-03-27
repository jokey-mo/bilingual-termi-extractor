
import { useState } from 'react';
import { parseStringPromise } from 'xml2js';

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
      onError(error.message || 'Failed to extract terminology');
    }
  };
  
  const parseTmxFile = async (file: File): Promise<TmxData> => {
    try {
      // Read the file content
      const fileContent = await readFileAsText(file);
      
      // Parse XML string
      const parsedXml = await parseStringPromise(fileContent, { 
        explicitArray: false,
        mergeAttrs: true
      });
      
      // Extract source and target languages
      const header = parsedXml.tmx.header;
      const sourceLanguage = header.srcLang || '';
      
      // Extract translation units
      const body = parsedXml.tmx.body;
      const tuNodes = Array.isArray(body.tu) ? body.tu : [body.tu];
      
      // Process translation units
      const translationUnits: { source: string; target: string }[] = [];
      let targetLanguage = '';
      
      tuNodes.forEach((tu: any) => {
        const tuvs = Array.isArray(tu.tuv) ? tu.tuv : [tu.tuv];
        let sourceText = '';
        let targetText = '';
        
        tuvs.forEach((tuv: any) => {
          const lang = tuv.xml_lang || tuv.lang;
          const segText = typeof tuv.seg === 'string' ? tuv.seg : tuv.seg?._text || '';
          
          if (lang === sourceLanguage) {
            sourceText = segText;
          } else {
            // Assuming the first non-source language is the target language
            if (!targetLanguage) {
              targetLanguage = lang;
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
      
      return {
        sourceLanguage,
        targetLanguage,
        translationUnits
      };
    } catch (error) {
      console.error('Error parsing TMX file:', error);
      throw new Error('Failed to parse TMX file. Please ensure it is a valid TMX format.');
    }
  };
  
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };
  
  const generatePrompt = (tmxData: TmxData, datasetInfo: string): string => {
    // Prepare translation units JSON
    const translationSamples = tmxData.translationUnits.slice(0, 100); // Limit to prevent too large prompts
    
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
      // This would be the actual API call in a real implementation
      // For this demo, we'll return mock data
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock response
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
      
      /* 
      // Real implementation would look like this:
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
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
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'API call failed');
      }
      
      // Extract JSON from the response
      const content = data.candidates[0].content;
      const textPart = content.parts[0].text;
      
      // Extract JSON object from text
      const jsonMatch = textPart.match(/```json\n([\s\S]*?)\n```/) || textPart.match(/{[\s\S]*}/);
      let jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : textPart;
      
      // Parse JSON
      const parsedResult = JSON.parse(jsonText);
      return parsedResult.terminologyPairs || [];
      */
    } catch (error: any) {
      console.error('Gemini API call failed:', error);
      throw new Error(`Failed to extract terminology: ${error.message}`);
    }
  };
  
  return null; // This component doesn't render anything
};

export default TerminologyExtractor;
