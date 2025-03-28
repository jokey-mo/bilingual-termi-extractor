
/**
 * Utility functions for parsing TMX files
 */

export interface TmxData {
  sourceLanguage: string;
  targetLanguage: string;
  translationUnits: Array<{
    source: string;
    target: string;
  }>;
}

/**
 * Parse a TMX file into a structured format
 */
export const parseTmxFile = async (file: File): Promise<TmxData> => {
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

/**
 * Read a file as text using FileReader
 */
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
