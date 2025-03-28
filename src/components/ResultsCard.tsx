
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ResultsCardProps {
  extractedTerms: Array<{sourceTerm: string, targetTerm: string}> | null;
  onDownload: () => void;
}

const ResultsCard: React.FC<ResultsCardProps> = ({ extractedTerms, onDownload }) => {
  if (!extractedTerms) return null;
  
  return (
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
        <Button className="w-full" onClick={onDownload}>
          Download as CSV
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ResultsCard;
