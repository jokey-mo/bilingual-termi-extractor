
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Bug } from "lucide-react";

interface DebugPanelProps {
  debugMessages: string[];
}

const DebugPanel: React.FC<DebugPanelProps> = ({ debugMessages }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (debugMessages.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="py-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            <CardTitle className="text-sm">Debug Console ({debugMessages.length} messages)</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
          <div className="bg-black text-green-400 p-3 rounded-md font-mono text-xs overflow-auto max-h-[400px]">
            {debugMessages.map((message, index) => (
              <div key={index} className="whitespace-pre-wrap mb-1">
                {message}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default DebugPanel;
