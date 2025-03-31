
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
    
    // Access the response data
    // text is a property, not a method
    let responseText = response.text;
    console.log("Structured response text length:", responseText?.length || 0);
    
    // Safely parse the JSON response with error handling
    let responseJson;
    try {
      // Check if responseText is valid before parsing
      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }
      
      // Fix common JSON parsing issues - add safety measures
      // Handle unclosed quotes that might cause JSON parse errors
      responseText = sanitizeJsonString(responseText);
      
      responseJson = JSON.parse(responseText);
      console.log("Successfully parsed response JSON");
    } catch (parseError: any) {
      console.error("JSON parsing error:", parseError.message);
      
      // Attempt to recover the response by extracting valid JSON
      try {
        responseJson = attemptJsonRecovery(responseText);
        if (!responseJson) {
          throw new Error(`Failed to parse JSON: ${parseError.message}`);
        }
      } catch (recoveryError) {
        console.error("Recovery attempt failed:", recoveryError);
        throw new Error(`Failed to parse Gemini API response: ${parseError.message}`);
      }
    }
    
    // Validate the response structure with more forgiving approach
    let terminologyPairs: TerminologyPair[] = [];
    
    if (responseJson.terminologyPairs && Array.isArray(responseJson.terminologyPairs)) {
      terminologyPairs = responseJson.terminologyPairs;
    } else {
      // Try to find terminology pairs in any possible format in the response
      console.warn("Standard terminologyPairs format not found, attempting to extract from alternative structure");
      terminologyPairs = extractTerminologyPairsFromAnyStructure(responseJson);
    }
    
    if (terminologyPairs.length === 0) {
      console.warn("No terminology pairs found in the response");
    }
    
    console.log(`Extracted ${terminologyPairs.length} terminology pairs`);
    return terminologyPairs;
    
  } catch (error: any) {
    console.error('Gemini API call failed:', error);
    
    // More detailed error information
    if (error.response) {
      console.error('API error response:', error.response);
    }
    
    // Return empty array instead of throwing error to make the application more resilient
    // Note: This will allow the application to continue processing other chunks even if one fails
    console.warn('Returning empty array due to API error');
    return [];
  }
};

/**
 * Sanitize JSON string to fix common issues that might cause parsing errors
 */
function sanitizeJsonString(jsonString: string): string {
  if (!jsonString) return "{}";
  
  // Replace common character escape issues
  let sanitized = jsonString
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/"\s+"/g, '","')
    .replace(/"\s*:\s*"/g, '":"');
  
  // Add closing quotes to unclosed string properties
  let inString = false;
  let result = "";
  let unclosedQuotePos = -1;
  
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    const prevChar = i > 0 ? sanitized[i - 1] : '';
    
    // Toggle string state (but only if the quote isn't escaped)
    if (char === '"' && prevChar !== '\\') {
      inString = !inString;
      if (inString) {
        unclosedQuotePos = i;
      } else {
        unclosedQuotePos = -1;
      }
    }
    
    // Check for end of object or array while still in a string
    if (inString && (i === sanitized.length - 1 || (char === '}' || char === ']'))) {
      // Add a closing quote before the closing brace/bracket
      result += '"' + char;
      inString = false;
    } else {
      result += char;
    }
  }
  
  // If we're still in a string at the end, add closing quote
  if (inString) {
    result += '"';
  }
  
  // Check if the string appears to have valid JSON structure
  if (!result.trim().startsWith('{') && !result.trim().startsWith('[')) {
    result = `{ "terminologyPairs": [] }`;
  }
  
  return result;
}

/**
 * Attempt to recover valid JSON from a malformed response
 */
function attemptJsonRecovery(jsonString: string): any {
  if (!jsonString) return { terminologyPairs: [] };
  
  // Default fallback
  const fallbackJson = { terminologyPairs: [] };
  
  try {
    // Try to find the start and end of a valid JSON object
    const startBrace = jsonString.indexOf('{');
    const endBrace = jsonString.lastIndexOf('}');
    
    if (startBrace >= 0 && endBrace > startBrace) {
      // Extract what seems to be a valid JSON object
      const extractedJson = jsonString.substring(startBrace, endBrace + 1);
      return JSON.parse(extractedJson);
    }
    
    // Alternative: try to extract just the terminology pairs array
    const arrayStart = jsonString.indexOf('[');
    const arrayEnd = jsonString.lastIndexOf(']');
    
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      // Extract what seems to be a valid JSON array
      const extractedArray = jsonString.substring(arrayStart, arrayEnd + 1);
      const arrayJson = JSON.parse(extractedArray);
      
      // Check if this looks like terminology pairs
      if (Array.isArray(arrayJson) && arrayJson.length > 0 && 
          (arrayJson[0].sourceTerm || arrayJson[0].source || arrayJson[0].term)) {
        return { terminologyPairs: arrayJson };
      }
    }
    
    return fallbackJson;
  } catch (error) {
    console.error("JSON recovery attempt failed:", error);
    return fallbackJson;
  }
}

/**
 * Extract terminology pairs from any possible structure in the response
 */
function extractTerminologyPairsFromAnyStructure(json: any): TerminologyPair[] {
  if (!json) return [];
  
  // Case 1: Check if there's an array directly in the response
  for (const key in json) {
    if (Array.isArray(json[key])) {
      // Check if this looks like an array of terminology pairs
      const array = json[key];
      if (array.length > 0 && (
          array[0].sourceTerm || 
          array[0].targetTerm || 
          array[0].source || 
          array[0].target || 
          array[0].term
      )) {
        return array.map((item: any) => {
          return {
            sourceTerm: item.sourceTerm || item.source || item.term || "",
            targetTerm: item.targetTerm || item.target || item.translation || ""
          };
        });
      }
    }
  }
  
  // Case 2: Check if the response itself is an array
  if (Array.isArray(json)) {
    if (json.length > 0 && (
        json[0].sourceTerm || 
        json[0].targetTerm || 
        json[0].source || 
        json[0].target || 
        json[0].term
    )) {
      return json.map((item: any) => {
        return {
          sourceTerm: item.sourceTerm || item.source || item.term || "",
          targetTerm: item.targetTerm || item.target || item.translation || ""
        };
      });
    }
  }
  
  // Case 3: Look for nested objects that might contain terminology pairs
  for (const key in json) {
    if (typeof json[key] === 'object' && json[key] !== null && !Array.isArray(json[key])) {
      const nestedResult = extractTerminologyPairsFromAnyStructure(json[key]);
      if (nestedResult.length > 0) {
        return nestedResult;
      }
    }
  }
  
  return [];
}
