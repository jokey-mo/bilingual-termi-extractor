
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface ApiKeyCardProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isApiKeyValid: boolean;
  isLoadingModels: boolean;
  availableModels: Array<{
    name: string;
    displayName: string;
    description?: string;
  }>;
  validateApiKey: (key: string) => void;
}

const ApiKeyCard: React.FC<ApiKeyCardProps> = ({
  apiKey,
  setApiKey,
  selectedModel,
  setSelectedModel,
  isApiKeyValid,
  isLoadingModels,
  availableModels,
  validateApiKey
}) => {
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: API Key Configuration</CardTitle>
        <CardDescription>Enter your Google Gemini API key to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey">Gemini API Key</Label>
            <div className="flex gap-2">
              <Input 
                id="apiKey" 
                type="password" 
                placeholder="Enter your API key" 
                value={apiKey}
                onChange={handleApiKeyChange}
                className="flex-1"
              />
              <Button 
                onClick={() => apiKey && validateApiKey(apiKey)}
                disabled={!apiKey || apiKey.length < 30}
              >
                Validate
              </Button>
            </div>
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
  );
};

export default ApiKeyCard;
