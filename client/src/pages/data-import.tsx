import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parseCSV } from "@/lib/csv-parser";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function DataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importResults, setImportResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (services: any[]) => {
      return apiRequest("POST", "/api/import/services", { services });
    },
    onSuccess: (data) => {
      setImportStatus('success');
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Import successful",
        description: `${data.count} services imported successfully.`,
      });
    },
    onError: () => {
      setImportStatus('error');
      toast({
        title: "Import failed",
        description: "Failed to import services. Please check the file format.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportStatus('idle');
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImportStatus('processing');
    setUploadProgress(0);

    try {
      const text = await file.text();
      const parsedData = parseCSV(text);
      
      // Simulate progress
      setUploadProgress(50);
      
      const services = parsedData.map(row => ({
        name: row['Name of Service'] || row.name,
        segment: row['Segment'] || row.segment,
        pricingType: row['Lumpsum'] || row.pricingType || 'Per Day',
        baseRate: row['base_rate'] || '0',
        isActive: true,
      })).filter(service => service.name && service.segment);

      setUploadProgress(75);
      
      await importMutation.mutateAsync(services);
      setUploadProgress(100);
      
    } catch (error) {
      setImportStatus('error');
      toast({
        title: "File processing failed",
        description: "Could not process the selected file. Please ensure it's a valid CSV file.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Data Import</h2>
        <p className="text-gray-600">Import service master data from CSV files</p>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Service Data</CardTitle>
          <CardDescription>
            Upload a CSV file containing service master data. The file should include columns for service name, segment, pricing type, and base rate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file">CSV File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>
          
          {file && (
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              <FileText className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}

          {importStatus === 'processing' && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-industry-primary"></div>
                <span className="text-sm text-gray-600">Processing file...</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!file || importStatus === 'processing'}
            className="industry-primary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Services
          </Button>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importStatus === 'success' && importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-industry-success" />
              Import Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Successfully imported <span className="font-medium">{importResults.count}</span> services.
              </p>
              <div className="text-xs text-gray-500">
                <p>All services have been added to the service master database.</p>
                <p>You can now use these services in your tender generation process.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {importStatus === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-industry-error" />
              Import Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                The file could not be processed. Please check the file format and try again.
              </p>
              <div className="text-xs text-gray-500">
                <p>Make sure your CSV file includes the following columns:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Name of Service or name</li>
                  <li>Segment</li>
                  <li>Pricing Type (optional)</li>
                  <li>Base Rate (optional)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Format */}
      <Card>
        <CardHeader>
          <CardTitle>Sample CSV Format</CardTitle>
          <CardDescription>
            Use this format as a reference for your CSV file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm text-gray-700 overflow-x-auto">
{`Name of Service,Segment,Pricing Type,Base Rate
Project Management,BL-IWC-PMG,Per Day,1200
1000 HP Drilling Rig,BL-WCE-RIG,Per Day,5500
Cementing Services,BL-WCF-CEM,Per Job,8750
MWD Services,BL-WCM-DM,Per Day,2800`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
