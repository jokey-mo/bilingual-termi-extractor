
import { useState } from 'react';
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

  const validateApiKey = (key: string) => {
    // Simple validation - check if key is not empty and has at least 30 characters
    if (key && key.length >= 30) {
      setIsApiKeyValid(true);
      toast({
        title: "API Key Validated",
        description: "Your API key format is valid. You can now select a model.",
      });
    } else {
      setIsApiKeyValid(false);
      if (key) {
        toast({
          title: "Invalid API Key",
          description: "The API key seems to be incomplete or invalid.",
          variant: "destructive",
        });
      }
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    if (key === "") {
      setIsApiKeyValid(false);
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

    setIsProcessing(true);
    setProgress(0);
    
    // Simulate the extraction process
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 300);

    // Use the TerminologyExtractor component to handle the actual extraction
    // For now, we'll simulate the process and generate mock data
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      
      // Mock extracted terminology
      const mockTerms = [
        { sourceTerm: "cloud computing", targetTerm: "computación en la nube" },
        { sourceTerm: "artificial intelligence", targetTerm: "inteligencia artificial" },
        { sourceTerm: "machine learning", targetTerm: "aprendizaje automático" },
        { sourceTerm: "database", targetTerm: "base de datos" },
        { sourceTerm: "neural network", targetTerm: "red neuronal" }
      ];
      
      setExtractedTerms(mockTerms);
      setIsProcessing(false);
      
      toast({
        title: "Extraction Complete",
        description: "Terminology extraction has been completed successfully.",
      });
    }, 5000);
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Bilingual Terminology Extractor</h1>
          <p className="text-slate-600 mt-2">Extract terminology pairs from TMX files using Google's Gemini API</p>
        </div>
        
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
                    disabled={!isApiKeyValid} 
                    value={selectedModel} 
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select Gemini model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                      <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                    </SelectContent>
                  </Select>
                  {!isApiKeyValid && (
                    <p className="text-xs text-slate-500">Enter a valid API key to select a model</p>
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
                      {extractedTerms.slice(0, 5).map((term, index) => (
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
