
/**
 * Utilities for interacting with the Gemini API
 */
import { GoogleGenerativeAI, Type } from '@google/generative-ai';

interface TerminologyPair {
  sourceTerm: string;
  targetTerm: string;
}

/**
 * Call the Gemini API to extract terminology pairs with structured output
 */
export const callGeminiApi = async (
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
    
    console.log("Sending request to Gemini API with structured output schema...");
    
    // Configure the structured response schema for terminology pairs
    const response = await model.generateContent({
      contents: [{ 
        role: 'user',
        parts: [{ text: prompt }] 
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          terminologyPairs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceTerm: {
                  type: Type.STRING,
                  description: 'Term in the source language',
                },
                targetTerm: {
                  type: Type.STRING,
                  description: 'Equivalent term in the target language',
                }
              },
              required: ['sourceTerm', 'targetTerm']
            }
          }
        },
        required: ['terminologyPairs']
      }
    });
    
    console.log("Received structured response from Gemini API");
    
    // Parse the JSON response directly
    const responseText = response.text();
    console.log("Raw response:", responseText);
    
    try {
      // Parse the JSON response
      const parsedResult = JSON.parse(responseText);
      console.log("JSON parsed successfully", parsedResult);
      
      // Validate the response structure
      if (!parsedResult.terminologyPairs || !Array.isArray(parsedResult.terminologyPairs)) {
        console.error("Invalid response format - missing terminologyPairs array");
        throw new Error("Invalid response format from Gemini API");
      }
      
      return parsedResult.terminologyPairs;
      
    } catch (jsonError) {
      console.error("JSON parse error:", jsonError);
      console.log("Problematic JSON text:", responseText);
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
