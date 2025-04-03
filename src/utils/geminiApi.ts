
/**
 * Utilities for interacting with the Gemini API through Google GenAI SDK
 */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

interface TerminologyPair {
  sourceTerm: string;
  targetTerm: string;
}

// Define the schema for terminology pairs
const TerminologyPairSchema = z.object({
  sourceTerm: z.string().describe('Term in the source language'),
  targetTerm: z.string().describe('Term in the target language'),
});

const TerminologyResponseSchema = z.object({
  terminologyPairs: z.array(TerminologyPairSchema),
});

/**
 * Call the Gemini API to extract terminology pairs with structured output
 */
export const callGeminiApi = async (
  apiKey: string, 
  modelNameInput: string, 
  prompt: string
): Promise<TerminologyPair[]> => {
  try {
    console.log("Initializing GoogleGenAI SDK with model:", modelNameInput);
    
    // Normalize model name by removing any "models/" prefix if present
    const modelName = modelNameInput.replace(/^models\//, '');
    console.log("Using normalized model name:", modelName);
    
    // Initialize the GenAI client
    const genAI = new GoogleGenAI(apiKey);
    
    // Create the model
    const model = genAI.getGenerativeModel(modelName);
    
    console.log("Sending request to Gemini API...");
    
    // Create system prompt and user prompt
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ 
          text: `You are a terminology extraction expert. Extract bilingual terminology pairs from the translation memory data provided.
                
                ${prompt}`
        }] }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        structuredOutputSchema: {
          type: "object",
          properties: {
            terminologyPairs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sourceTerm: {
                    type: "string",
                    description: 'Term in the source language',
                  },
                  targetTerm: {
                    type: "string",
                    description: 'Term in the target language',
                  },
                },
                required: ['sourceTerm', 'targetTerm'],
              },
            },
          },
          required: ['terminologyPairs'],
        }
      },
    });
    
    console.log("Received response from Gemini API");
    
    // Parse the JSON response
    try {
      const response = result.response;
      const textContent = response.text();
      console.log("Raw response content:", textContent);
      
      if (textContent) {
        try {
          const parsedData = JSON.parse(textContent);
          console.log("Parsed JSON data:", parsedData);
          
          if (parsedData.terminologyPairs && Array.isArray(parsedData.terminologyPairs)) {
            // Make sure all items conform to TerminologyPair interface
            const validTerms: TerminologyPair[] = parsedData.terminologyPairs
              .filter(item => 
                item && 
                typeof item === 'object' && 
                typeof item.sourceTerm === 'string' &&
                typeof item.targetTerm === 'string' &&
                item.sourceTerm.trim() !== '' &&
                item.targetTerm.trim() !== ''
              )
              .map(item => ({
                sourceTerm: item.sourceTerm,
                targetTerm: item.targetTerm
              }));
            
            console.log("Successfully extracted", validTerms.length, "valid terminology pairs");
            return validTerms;
          } else {
            console.warn("Response doesn't contain terminologyPairs array:", parsedData);
            
            // Try to extract terms from any structure if possible
            if (parsedData && typeof parsedData === 'object') {
              const extractedTerms: TerminologyPair[] = [];
              
              // Try to find arrays that might contain terminology pairs
              Object.values(parsedData).forEach(value => {
                if (Array.isArray(value)) {
                  value.forEach(item => {
                    if (item && typeof item === 'object' && 'sourceTerm' in item && 'targetTerm' in item) {
                      if (typeof item.sourceTerm === 'string' && typeof item.targetTerm === 'string') {
                        extractedTerms.push({
                          sourceTerm: item.sourceTerm,
                          targetTerm: item.targetTerm
                        });
                      }
                    }
                  });
                }
              });
              
              if (extractedTerms.length > 0) {
                console.log("Found", extractedTerms.length, "terminology pairs in alternative format");
                return extractedTerms;
              }
            }
          }
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
        }
      }
    } catch (responseError) {
      console.error("Error getting response text:", responseError);
    }
    
    // If we reached here, either the response format was unexpected or parsing failed
    console.warn("Response format unexpected or parsing failed, returning empty array");
    return [];
    
  } catch (error: any) {
    console.error('Gemini API call failed:', error);
    
    // More detailed error information
    if (error.response) {
      console.error('API error response:', error.response);
    }
    
    // Try to extract any useful information from the error
    if (error.message) {
      console.error('Error message:', error.message);
    }
    
    // Return empty array instead of throwing error to make the application more resilient
    console.warn('Returning empty array due to API error');
    return [];
  }
};
