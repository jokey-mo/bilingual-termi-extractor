
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DatasetInfoCardProps {
  datasetInfo: string;
  setDatasetInfo: (info: string) => void;
}

const DatasetInfoCard: React.FC<DatasetInfoCardProps> = ({ datasetInfo, setDatasetInfo }) => {
  return (
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
  );
};

export default DatasetInfoCard;
