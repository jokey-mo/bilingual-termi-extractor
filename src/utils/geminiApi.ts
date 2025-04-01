
/**
 * Utilities for interacting with the Gemini API through OpenAI compatibility layer
 */
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
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
    
    // Initialize the OpenAI client for Gemini's compatibility layer
    const openai = new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai"
    });
    
    console.log("Sending request to Gemini API with structured output schema...");
    
    // Call the API with structured output schema using OpenAI's SDK
    const completion = await openai.beta.chat.completions.parse({
      model: modelName,
      messages: [
        { role: "system", content: "You are a terminology extraction expert. Extract bilingual terminology pairs from the translation memory data provided." },
        { role: "user", content: prompt }
      ],
      response_format: zodResponseFormat(TerminologyResponseSchema),
      temperature: 0.2,
      top_p: 0.95,
      max_tokens: 8192,
    });
    
    console.log("Received structured response from Gemini API");
    
    // Access the parsed response data
    const parsedResponse = completion.choices[0].message.parsed;
    console.log("Successfully parsed structured response with", parsedResponse.terminologyPairs.length, "terms");
    
    return parsedResponse.terminologyPairs;
    
  } catch (error: any) {
    console.error('Gemini API call failed:', error);
    
    // More detailed error information
    if (error.response) {
      console.error('API error response:', error.response);
    }
    
    // Implement fallback logic for JSON parsing errors
    if (error.message && error.message.includes("Failed to parse JSON")) {
      console.warn("JSON parsing error detected, attempting recovery...");
      try {
        // If we have raw content in the error, try to extract terminology pairs
        if (error.rawContent) {
          return extractTermsFromRawContent(error.rawContent);
        }
      } catch (recoveryError) {
        console.error("Recovery attempt failed:", recoveryError);
      }
    }
    
    // Return empty array instead of throwing error to make the application more resilient
    console.warn('Returning empty array due to API error');
    return [];
  }
};

/**
 * Attempt to extract terminology pairs from raw content when structured parsing fails
 */
function extractTermsFromRawContent(rawContent: string): TerminologyPair[] {
  try {
    // Try to parse as JSON first
    let content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    
    // Find JSON objects in the text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    const parsed = JSON.parse(content);
    
    // Look for the terminology pairs in various possible formats
    if (parsed.terminologyPairs && Array.isArray(parsed.terminologyPairs)) {
      return parsed.terminologyPairs;
    }
    
    // If we have an array directly
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        sourceTerm: item.sourceTerm || item.source || "",
        targetTerm: item.targetTerm || item.target || ""
      }));
    }
    
    // If we have some other structure, try to extract pairs
    for (const key in parsed) {
      if (Array.isArray(parsed[key])) {
        return parsed[key].map(item => ({
          sourceTerm: item.sourceTerm || item.source || "",
          targetTerm: item.targetTerm || item.target || ""
        }));
      }
    }
  } catch (e) {
    console.error("Failed to extract terms from raw content:", e);
  }
  
  return [];
}
