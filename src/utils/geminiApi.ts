
/**
 * Utilities for interacting with the Gemini API
 */
import { GoogleGenAI, Type } from "@google/genai";

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
    const genAI = new GoogleGenAI({ apiKey });
    
    // Normalize model name by removing any "models/" prefix if present
    const modelName = modelNameInput.replace(/^models\//, '');
    console.log("Using normalized model name:", modelName);
    
    console.log("Sending request to Gemini API with structured output schema...");
    
    // Call the Gemini API with structured output schema
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
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
        },
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
    
    console.log("Received structured response from Gemini API");
    
    // Access the response data - fix the method to access the structured content
    // In @google/genai library, text is a property, not a method
    const responseText = response.text;
    console.log("Structured response text:", responseText);
    
    // Parse the JSON response
    const responseJson = JSON.parse(responseText);
    console.log("Structured response:", responseJson);
    
    // Validate the response structure
    if (!responseJson.terminologyPairs || !Array.isArray(responseJson.terminologyPairs)) {
      console.error("Invalid response format - missing terminologyPairs array");
      throw new Error("Invalid response format from Gemini API");
    }
    
    return responseJson.terminologyPairs;
    
  } catch (error: any) {
    console.error('Gemini API call failed:', error);
    
    // More detailed error information
    if (error.response) {
      console.error('API error response:', error.response);
    }
    
    throw new Error(`Gemini API error: ${error.message}`);
  }
};
