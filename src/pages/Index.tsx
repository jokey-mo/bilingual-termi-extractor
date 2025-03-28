import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import FileUploader from "@/components/FileUploader";
import TerminologyExtractor from "@/components/TerminologyExtractor";
import Logo from "@/components/Logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

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
  const [logoUrl, setLogoUrl] = useState<string>("");
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

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    if (key === "") {
      setIsApiKeyValid(false);
      setAvailableModels([]);
      setApiError(null);
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

  // Toggle debug panel visibility
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Handle logo file upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoUrl(result);
        localStorage.setItem('termex-logo', result);
        toast({
          title: "Logo Updated",
          description: "Your logo has been updated successfully.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Load saved logo from localStorage on component mount
  useEffect(() => {
    const savedLogo = localStorage.getItem('termex-logo');
    if (savedLogo) {
      setLogoUrl(savedLogo);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <Logo src={logoUrl} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebugPanel(!showDebugPanel)}
            >
              {showDebugPanel ? "Hide Debug" : "Show Debug"}
            </Button>
            <div className="w-36">
              <label htmlFor="logo-upload" className="cursor-pointer">
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  type="button"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  {logoUrl ? "Change Logo" : "Add Logo"}
                </Button>
              </label>
            </div>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Bilingual Terminology Extractor</h1>
          <p className="text-slate-600 mt-2">Extract terminology pairs from TMX files using Google's Gemini API</p>
        </div>
        
        {/* Debug Panel */}
        {showDebugPanel && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>Real-time debugging information and logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 overflow-auto bg-slate-100 p-4 rounded-md text-xs font-mono">
                {debugMessages.length === 0 ? (
                  <p className="text-slate-500">No debug messages yet. Start the extraction process to see logs.</p>
                ) : (
                  debugMessages.map((msg, i) => (
                    <div key={i} className={`mb-1 ${msg.startsWith('ERROR') ? 'text-red-600' : 'text-slate-700'}`}>
                      {msg}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* API Error Alert */}
        {apiError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API Error</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}
        
        {/* API Success Alert */}
        {isApiKeyValid && !apiError && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">API Connected</AlertTitle>
            <AlertDescription className="text-green-700">Successfully connected to Gemini API with {availableModels.length} models available.</AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
          {/* API Key Input */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: API Key Configuration</CardTitle>
              <CardDescription>Enter your Google Gemini API key to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="apiKey">Gemini API Key</Label>
                  <Input 
                    id="apiKey" 
                    type="password" 
                    placeholder="Enter your API key" 
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    onBlur={() => apiKey && validateApiKey(apiKey)}
                  />
                  <p className="text-xs text-slate-500">Your API key will not be stored permanently</p>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="model">Gemini Model</Label>
                  <Select 
                    disabled={!isApiKeyValid || isLoadingModels} 
                    value={selectedModel} 
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger id="model">
                      <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select Gemini model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.name} value={model.name}>
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isApiKeyValid && (
                    <p className="text-xs text-slate-500">Enter a valid API key to see available models</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dataset Information */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Dataset Information</CardTitle>
              <CardDescription>Provide details about your dataset to improve terminology extraction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="datasetInfo">Dataset Information</Label>
                <Textarea 
                  id="datasetInfo" 
                  placeholder="Enter information about domain/industry, company, and any additional relevant details" 
                  className="resize-y min-h-[100px]"
                  value={datasetInfo}
                  onChange={(e) => setDatasetInfo(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* TMX File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Upload TMX File</CardTitle>
              <CardDescription>Upload your TMX translation memory file</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader onFileUpload={handleFileUpload} />
              {tmxFile && (
                <p className="text-sm text-green-600 mt-2">
                  Uploaded: {tmxFile.name} ({Math.round(tmxFile.size / 1024)} KB)
                </p>
              )}
            </CardContent>
          </Card>

          {/* Extract Terminology Button */}
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Extract Terminology</CardTitle>
              <CardDescription>Process the TMX file to extract terminology pairs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={handleExtractTerminology}
                disabled={isProcessing || !apiKey || !isApiKeyValid || !selectedModel || !datasetInfo || !tmxFile}
              >
                {isProcessing ? "Processing..." : "Extract Terminology"}
              </Button>
              
              {isProcessing && (
                <div className="mt-4 space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-center text-slate-600">
                    Processing... {progress}%
                  </p>
                </div>
              )}
              
              {/* Invisible component that handles the extraction logic */}
              {isProcessing && (
                <TerminologyExtractor
                  apiKey={apiKey}
                  modelName={selectedModel}
                  datasetInfo={datasetInfo}
                  tmxFile={tmxFile}
                  onProgress={handleExtractionProgress}
                  onComplete={handleExtractionComplete}
                  onError={handleExtractionError}
                />
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {extractedTerms && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Terminology</CardTitle>
                <CardDescription>
                  {extractedTerms.length} terminology pairs extracted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source Term
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Target Term
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {extractedTerms.map((term, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {term.sourceTerm}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {term.targetTerm}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={downloadTerms}>
                  Download as CSV
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
