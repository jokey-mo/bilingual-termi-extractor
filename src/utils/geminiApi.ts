
/**
 * Utilities for interacting with the Gemini API through OpenAI compatibility layer
 */
import OpenAI from "openai";
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
    console.log("Initializing OpenAI SDK with model:", modelNameInput);
    
    // Normalize model name by removing any "models/" prefix if present
    const modelName = modelNameInput.replace(/^models\//, '');
    console.log("Using normalized model name:", modelName);
    
    // Ensure the baseURL has the trailing slash
    const baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
    
    // Initialize the OpenAI client for Gemini's compatibility layer
    const openai = new OpenAI({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: true
    });
    
    console.log("Sending request to Gemini API...");
    
    // Call the API using the simpler models.list approach first to verify connection
    try {
      // Simple test request to make sure the API is accessible
      const modelList = await openai.models.list();
      console.log("API connection verified - models available");
    } catch (connectionError) {
      console.error("Could not connect to API:", connectionError);
      throw new Error(`API connection failed: ${connectionError instanceof Error ? connectionError.message : 'Unknown error'}`);
    }
    
    // Now that we know the connection works, proceed with the actual request
    console.log("Making chat completion request...");
    
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: "You are a terminology extraction expert. Extract bilingual terminology pairs from the translation memory data provided." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      top_p: 0.95,
      max_tokens: 4096,
    });
    
    console.log("Received response from Gemini API");
    
    // Parse the JSON content from the response
    if (completion.choices && completion.choices[0]?.message?.content) {
      try {
        const content = completion.choices[0].message.content;
        console.log("Raw response content:", content);
        
        const parsedData = JSON.parse(content);
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
