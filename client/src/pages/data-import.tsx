import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { parseCSV } from "@/lib/csv-parser";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import type { Service } from "@shared/schema";

type ImportType = "services" | "pricing" | "well-times";

export default function DataImport() {
  const [importType, setImportType] = useState<ImportType>("services");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importResults, setImportResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load existing services to resolve ID mappings for pricing schedules and well times
  const { data: servicesList = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const importMutation = useMutation({
    mutationFn: async ({ type, data }: { type: ImportType; data: any[] }) => {
      let endpoint = "/api/import/services";
      let payload: any = {};

      if (type === "services") {
        endpoint = "/api/import/services";
        payload = { services: data };
      } else if (type === "pricing") {
        endpoint = "/api/import/pricing-schedules";
        payload = { schedules: data };
      } else if (type === "well-times") {
        endpoint = "/api/import/well-times";
        payload = { wellTimes: data };
      }

      const res = await apiRequest("POST", endpoint, payload);
      return res.json();
    },
    onSuccess: (data: any, variables) => {
      setImportStatus('success');
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/well-times"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Import successful",
        description: `${data.count ?? 0} items imported successfully for ${variables.type}.`,
      });
    },
    onError: () => {
      setImportStatus('error');
      toast({
        title: "Import failed",
        description: "Failed to import items. Please check the file format.",
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

  const findServiceId = (row: any, services: Service[]): number | null => {
    const uniqueCode = (row['LINE ITEM UNIQUE CODE'] || row['line_item_unique_code'] || row['LINE ITEM UNIQUE CODE'] || '').trim();
    const serviceRequiredName = (row['SERVICES REQUIRED'] || row['services_required'] || row['SERVICES REQUIRED'] || '').trim();
    
    if (!uniqueCode && !serviceRequiredName) return null;

    // 1. Try exact name match
    let match = services.find(s => s.name.toLowerCase().trim() === serviceRequiredName.toLowerCase().trim());
    if (match) return match.id;

    // 2. Try prefix/substring match
    match = services.find(s => 
      serviceRequiredName.toLowerCase().includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(serviceRequiredName.toLowerCase())
    );
    if (match) return match.id;

    // 3. Try structural mapping (MV.1 -> Service 1, MD.1 -> Service 10, NUV.1 -> Service 40, ZV.1 -> Service 66)
    const matchCode = uniqueCode.match(/^([A-Z]+)\.(\d+)/);
    if (matchCode) {
      const prefix = matchCode[1]; // "MV", "MD", "NUV", "ZV"
      const index = parseInt(matchCode[2]);
      if (prefix === 'MV' && index >= 1 && index <= 9) {
        return index;
      } else if (prefix === 'MD' && index >= 1 && index <= 9) {
        return index + 9;
      } else if (prefix === 'NUV' && index >= 1 && index <= 9) {
        return index + 39;
      } else if (prefix === 'ZV' && index === 1) {
        return 66;
      }
    }

    return null;
  };

  const handleImport = async () => {
    if (!file) return;

    setImportStatus('processing');
    setUploadProgress(0);

    try {
      const text = await file.text();
      const parsedData = parseCSV(text);
      setUploadProgress(40);

      let payloadData: any[] = [];

      if (importType === "services") {
        payloadData = parsedData.map(row => ({
          name: row['Name of Service'] || row.name || row['SERVICES REQUIRED'] || '',
          segment: row['Segment'] || row.segment || 'Seg-General',
          pricingType: row['Lumpsum'] || row.pricingType || row['PAYMENT METHOD'] || 'Per Day',
          baseRate: String(parseFloat(row['base_rate'] || row['Base Rate'] || '0') || 0),
          isActive: true,
        })).filter(service => service.name);
      } else if (importType === "pricing") {
        payloadData = parsedData.map(row => {
          const serviceId = findServiceId(row, servicesList);
          const rawPrice = row['Rate with water base mud (USD)'] || row['Rate'] || row['unit_price'] || row['unitPrice'] || '0';
          const cleanedPrice = rawPrice.replace(/[^\d.]/g, ''); // strip ?, $, commas, spaces
          const unitPrice = parseFloat(cleanedPrice) || 0;
          const wellType = row['WELL CLASSIFICATION'] || row['well_classification'] || row['wellType'] || 'General';

          return {
            serviceId,
            wellType,
            duration: Math.round(parseFloat(row['APPLICABLE TOTAL TIME'] || '0')) || 0,
            unitPrice: String(unitPrice),
            currency: "USD"
          };
        }).filter(item => item.serviceId !== null);
      } else if (importType === "well-times") {
        payloadData = parsedData.map(row => {
          const serviceId = findServiceId(row, servicesList);
          const section = row['SERVICES REQUIRED'] || row['services_required'] || row['section'] || 'General Section';
          // Convert APPLICABLE TOTAL TIME (in days) to hours (multiplied by 24)
          const days = parseFloat(row['APPLICABLE TOTAL TIME'] || row['estimated_time'] || '0') || 0;
          const estimatedTime = Math.round(days * 24);

          return {
            serviceId,
            section,
            estimatedTime,
            contingencyTime: 0
          };
        }).filter(item => item.serviceId !== null);
      }

      setUploadProgress(70);
      
      if (payloadData.length === 0) {
        throw new Error("No valid rows parsed. Check file contents and headers.");
      }

      await importMutation.mutateAsync({ type: importType, data: payloadData });
      setUploadProgress(100);
      
    } catch (error: any) {
      setImportStatus('error');
      toast({
        title: "File processing failed",
        description: error.message || "Could not process CSV file. Ensure correct columns and header rows.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Data Import</h2>
        <p className="text-gray-600">Import service master data, pricing schedules, and well times from raw CSV files</p>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select Import Configuration</CardTitle>
          <CardDescription>
            Choose the type of CSV file you are importing. The layout parses the files using PapaParse and maps columns dynamically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="import-type">Data Import Type</Label>
            <Select 
              value={importType} 
              onValueChange={(val) => {
                setImportType(val as ImportType);
                setFile(null);
                setImportStatus('idle');
                setImportResults(null);
              }}
            >
              <SelectTrigger id="import-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="services">Service Master (e.g. servicemaster.csv)</SelectItem>
                <SelectItem value="pricing">Pricing Schedules (e.g. pricingschedule.csv / sampletender.csv)</SelectItem>
                <SelectItem value="well-times">Well Times (e.g. welltimespersection.csv)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid w-full max-w-sm items-center gap-1.5 pt-2">
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
            Import {importType === "services" ? "Services" : importType === "pricing" ? "Pricing Schedules" : "Well Times"}
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
                Successfully processed and imported <span className="font-medium">{importResults.count}</span> records.
              </p>
              <div className="text-xs text-gray-500">
                <p>All items have been verified and loaded into the backend storage layer.</p>
                <p>Calculations and catalogs will reflect the updated pricing tiers immediately.</p>
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
                The file could not be processed. Please check the file formatting, delimiters, or missing header cells.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Formatting Guidelines</CardTitle>
          <CardDescription>
            Reference columns required for each configuration mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importType === "services" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Service Master Schema columns:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`Name of Service,Segment,Lumpsum,Base Rate
Project Management,BL-IWC-PMG,Per Day,1200.00
SLR Rig Demob,BL-WCE-RIG,None,1500.00`}
                </pre>
              </div>
            </div>
          ) : importType === "pricing" ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pricing Schedules / Tender Rates columns:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`LINE ITEM UNIQUE CODE,SERVICES REQUIRED,Rate with water base mud (USD),WELL CLASSIFICATION
MV.1>Well Site Services (refer to note 1 below),Well Site Services (refer to note 1 below),585046.48,MISHRIF VERTICAL
MV.2>32" drilling phase (without fuel),32" drilling phase (without fuel),669.09,MISHRIF VERTICAL`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Well Times columns:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-xs text-gray-700 overflow-x-auto">
{`LINE ITEM UNIQUE CODE,SERVICES REQUIRED,APPLICABLE TOTAL TIME,WELL CLASSIFICATION
MV.1>Well Site Services (refer to note 1 below),Well Site Services (refer to note 1 below),24.32745,MISHRIF VERTICAL`}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
