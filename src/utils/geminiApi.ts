
/**
 * Utilities for interacting with the Gemini API
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

interface TerminologyPair {
  sourceTerm: string;
  targetTerm: string;
}

/**
 * Call the Gemini API to extract terminology pairs
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
