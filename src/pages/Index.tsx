
import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import Header from "@/components/Header";
import ApiKeyCard from "@/components/ApiKeyCard";
import DatasetInfoCard from "@/components/DatasetInfoCard";
import FileUploadCard from "@/components/FileUploadCard";
import ExtractCard from "@/components/ExtractCard";
import ResultsCard from "@/components/ResultsCard";
import ApiStatusAlerts from "@/components/ApiStatusAlerts";
import DebugPanel from "@/components/DebugPanel";

interface GeminiModel {
  name: string;
  displayName: string;
  description?: string;
}

const Index = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [datasetInfo, setDatasetInfo] = useState("");
  const [tmxFile, setTmxFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedTerms, setExtractedTerms] = useState<null | Array<{sourceTerm: string, targetTerm: string}>>(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);

  // Override console.log to capture debug messages
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = (...args) => {
      originalConsoleLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setDebugMessages(prev => [...prev, `LOG: ${message}`]);
    };
    
    console.error = (...args) => {
      originalConsoleError(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      setDebugMessages(prev => [...prev, `ERROR: ${message}`]);
    };
    
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);

  const fetchAvailableModels = async (key: string) => {
    setIsLoadingModels(true);
    setApiError(null);
    
    try {
      console.log("Fetching available models...");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
      );
      
      // Log the response status for debugging
      console.log(`API Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Found ${data.models?.length || 0} models in response`);
      
      // Filter to include only Gemini models
      const geminiModels = data.models
        .filter((model: any) => model.name.includes("gemini"))
        .map((model: any) => ({
          name: model.name,
          displayName: model.displayName || formatModelName(model.name),
          description: model.description
        }));
      
      setAvailableModels(geminiModels);
      setIsApiKeyValid(true);
      
      toast({
        title: "API Key Valid",
        description: `Found ${geminiModels.length} available Gemini models.`,
      });
      
    } catch (error: any) {
      console.error("Error fetching models:", error);
      setIsApiKeyValid(false);
      setApiError(error.message || "Failed to fetch available models");
      
      toast({
        title: "API Key Invalid",
        description: error.message || "Could not fetch available models",
        variant: "destructive",
      });
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Format model name for display if no displayName is provided
  const formatModelName = (name: string): string => {
    const baseName = name.split('/').pop() || name;
    return baseName
      .replace('gemini-', 'Gemini ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const validateApiKey = (key: string) => {
    // Only proceed if key has reasonable length
    if (key && key.length >= 30) {
      fetchAvailableModels(key);
    } else {
      setIsApiKeyValid(false);
      if (key) {
        setApiError("API key is too short. Gemini API keys are typically longer than 30 characters.");
        toast({
          title: "Invalid API Key",
          description: "The API key seems to be incomplete or invalid.",
          variant: "destructive",
        });
      }
      setAvailableModels([]);
    }
  };

  const handleFileUpload = (file: File) => {
    setTmxFile(file);
    toast({
      title: "File Uploaded",
      description: `${file.name} has been uploaded successfully.`,
    });
  };

  const handleExtractTerminology = () => {
    if (!apiKey || !isApiKeyValid) {
      toast({
        title: "Missing API Key",
        description: "Please enter a valid Gemini API key.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedModel) {
      toast({
        title: "Model Not Selected",
        description: "Please select a Gemini model to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (!datasetInfo) {
      toast({
        title: "Missing Dataset Information",
        description: "Please provide some information about your dataset.",
        variant: "destructive",
      });
      return;
    }

    if (!tmxFile) {
      toast({
        title: "No TMX File",
        description: "Please upload a TMX file first.",
        variant: "destructive",
      });
      return;
    }

    // Clear previous debug messages, errors, and results
    setDebugMessages([]);
    setApiError(null);
    setExtractedTerms(null);
    
    setIsProcessing(true);
    setProgress(0);
    
    // The actual extraction will happen in the TerminologyExtractor component
  };

  const handleExtractionComplete = (terms: Array<{sourceTerm: string, targetTerm: string}>) => {
    setExtractedTerms(terms);
    setIsProcessing(false);
    setProgress(100);
    
    toast({
      title: "Extraction Complete",
      description: `Successfully extracted ${terms.length} terminology pairs.`,
    });
  };

  const handleExtractionProgress = (progressValue: number) => {
    setProgress(progressValue);
  };

  const handleExtractionError = (errorMessage: string) => {
    setIsProcessing(false);
    setProgress(0);
    setApiError(errorMessage);
    
    toast({
      title: "Extraction Failed",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const downloadTerms = () => {
    if (!extractedTerms) return;
    
    // Convert terms to CSV content
    const csvContent = [
      "Source Term,Target Term",
      ...extractedTerms.map(term => `"${term.sourceTerm}","${term.targetTerm}"`)
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'extracted_terminology.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4">
        <Header />
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Bilingual Terminology Extractor</h1>
          <p className="text-slate-600 mt-2">Extract terminology pairs from TMX files using Google's Gemini API</p>
        </div>
        
        <ApiStatusAlerts 
          apiError={apiError} 
          isApiKeyValid={isApiKeyValid} 
          availableModels={availableModels}
        />
        
        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
          <ApiKeyCard 
            apiKey={apiKey}
            setApiKey={setApiKey}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            isApiKeyValid={isApiKeyValid}
            isLoadingModels={isLoadingModels}
            availableModels={availableModels}
            validateApiKey={validateApiKey}
          />

          <DatasetInfoCard 
            datasetInfo={datasetInfo}
            setDatasetInfo={setDatasetInfo}
          />

          <FileUploadCard 
            tmxFile={tmxFile}
            onFileUpload={handleFileUpload}
          />

          <ExtractCard 
            isProcessing={isProcessing}
            progress={progress}
            apiKey={apiKey}
            selectedModel={selectedModel}
            datasetInfo={datasetInfo}
            tmxFile={tmxFile}
            onExtractTerminology={handleExtractTerminology}
            onProgress={handleExtractionProgress}
            onComplete={handleExtractionComplete}
            onError={handleExtractionError}
          />

          <ResultsCard 
            extractedTerms={extractedTerms}
            onDownload={downloadTerms}
          />
          
          <DebugPanel debugMessages={debugMessages} />
        </div>
      </div>
    </div>
  );
};

export default Index;
