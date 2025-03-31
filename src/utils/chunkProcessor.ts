
import { TmxData } from './tmxParser';
import { generatePrompt } from './promptGenerator';
import { callGeminiApi } from './geminiApi';

export interface ChunkProcessorOptions {
  tmxData: TmxData;
  datasetInfo: string;
  apiKey: string;
  modelName: string;
  chunkSize?: number;
  maxTokensPerChunk?: number;
  onChunkProgress: (progress: number) => void;
}

// Estimate tokens in a string - 1 token is roughly 4 characters in English
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

// Deduplicate terminology pairs based on source terms
const deduplicateTerms = (terms: Array<{sourceTerm: string, targetTerm: string}>): Array<{sourceTerm: string, targetTerm: string}> => {
  const uniqueTerms = new Map<string, string>();
  
  terms.forEach(term => {
    // Only add if source term doesn't exist, or if it does but this target is longer/more complete
    const existingTerm = uniqueTerms.get(term.sourceTerm.toLowerCase());
    if (!existingTerm || (existingTerm.length < term.targetTerm.length)) {
      uniqueTerms.set(term.sourceTerm.toLowerCase(), term.targetTerm);
    }
  });
  
  return Array.from(uniqueTerms.entries()).map(([sourceLower, target]) => {
    // Find the original source term with proper casing
    const originalTerm = terms.find(t => t.sourceTerm.toLowerCase() === sourceLower);
    return {
      sourceTerm: originalTerm?.sourceTerm || sourceLower,
      targetTerm: target
    };
  });
};

export const processTmxInChunks = async (options: ChunkProcessorOptions): Promise<Array<{sourceTerm: string, targetTerm: string}>> => {
  const { 
    tmxData, 
    datasetInfo, 
    apiKey, 
    modelName, 
    onChunkProgress,
    maxTokensPerChunk = 100000 // Default max tokens per chunk
  } = options;
  
  const allTranslationUnits = tmxData.translationUnits;
  const totalUnits = allTranslationUnits.length;
  let processedUnits = 0;
  let allTerms: Array<{sourceTerm: string, targetTerm: string}> = [];
  
  console.log(`Processing ${totalUnits} translation units in chunks of ~${maxTokensPerChunk} tokens`);
  
  // Create chunks based on token estimation
  const chunks: Array<typeof tmxData.translationUnits> = [];
  let currentChunk: typeof tmxData.translationUnits = [];
  let currentChunkTokens = 0;
  
  for (const unit of allTranslationUnits) {
    const unitTokens = estimateTokens(unit.source + unit.target);
    
    // If adding this unit would exceed our token limit, start a new chunk
    if (currentChunkTokens + unitTokens > maxTokensPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChunkTokens = 0;
    }
    
    // Add the unit to the current chunk
    currentChunk.push(unit);
    currentChunkTokens += unitTokens;
  }
  
  // Add the last chunk if it has any units
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  console.log(`Split data into ${chunks.length} chunks`);
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i+1}/${chunks.length} with ${chunk.length} units`);
    
    // Create a temporary tmxData object with just this chunk
    const chunkTmxData = {
      ...tmxData,
      translationUnits: chunk
    };
    
    // Generate prompt for this chunk
    const prompt = generatePrompt(chunkTmxData, datasetInfo);
    
    // Call API with the chunk
    const chunkTerms = await callGeminiApi(apiKey, modelName, prompt);
    console.log(`Chunk ${i+1} extracted ${chunkTerms.length} terms`);
    
    // Add these terms to our collection
    allTerms = [...allTerms, ...chunkTerms];
    
    // Update progress
    processedUnits += chunk.length;
    const progress = Math.min(100, Math.floor((processedUnits / totalUnits) * 100));
    onChunkProgress(progress);
  }
  
  // Deduplicate terms
  console.log(`Total terms before deduplication: ${allTerms.length}`);
  const uniqueTerms = deduplicateTerms(allTerms);
  console.log(`Total terms after deduplication: ${uniqueTerms.length}`);
  
  return uniqueTerms;
};
