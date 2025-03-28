
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ApiStatusAlertsProps {
  apiError: string | null;
  isApiKeyValid: boolean;
  availableModels: Array<{
    name: string;
    displayName: string;
    description?: string;
  }>;
}

const ApiStatusAlerts: React.FC<ApiStatusAlertsProps> = ({ apiError, isApiKeyValid, availableModels }) => {
  return (
    <>
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
    </>
  );
};

export default ApiStatusAlerts;
