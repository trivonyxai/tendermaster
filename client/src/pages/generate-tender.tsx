import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ServiceSelection from "@/components/tender/service-selection";
import PricingSummary from "@/components/tender/pricing-summary";
import TenderPreview from "@/components/tender/tender-preview";
import { Save, Eye, FileText } from "lucide-react";
import type { Service, PricingSchedule, WellTime } from "@shared/schema";

interface SelectedService {
  service: Service;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isUnpriced?: boolean;
}

interface ProjectConfig {
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectLocation: string;
  duration: number;
  startDate: string;
  currency: string;
  taxRate: number;
  contingencyRate: number;
  wellType: string;
}

export default function GenerateTender() {
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    projectName: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    projectLocation: "",
    duration: 30,
    startDate: "",
    currency: "USD",
    taxRate: 8.5,
    contingencyRate: 10,
    wellType: "MISHRIF VERTICAL",
  });
  const [showPreview, setShowPreview] = useState(false);

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: pricingSchedules = [], isLoading: pricingLoading } = useQuery<PricingSchedule[]>({
    queryKey: ["/api/pricing-schedules"],
  });

  const { data: wellTimes = [], isLoading: wellTimesLoading } = useQuery<WellTime[]>({
    queryKey: ["/api/well-times"],
  });

  const handleServiceToggle = (service: Service, isSelected: boolean) => {
    if (isSelected) {
      const pricing = pricingSchedules.find(ps => ps.serviceId === service.id && ps.wellType === projectConfig.wellType);
      const wellTime = wellTimes.find(wt => wt.serviceId === service.id);
      
      const isUnpriced = !pricing || parseFloat(pricing.unitPrice ?? "0") === 0;
      const unitPrice = pricing ? parseFloat(pricing.unitPrice ?? "0") : parseFloat(service.baseRate ?? "0");
      
      let quantity = 1;
      if (service.pricingType === "Per Day") {
        if (wellTime && wellTime.estimatedTime) {
          quantity = parseFloat((wellTime.estimatedTime / 24).toFixed(2));
        } else {
          quantity = projectConfig.duration;
        }
      } else if (pricing && pricing.duration && pricing.duration > 0) {
        quantity = pricing.duration;
      }

      const newSelectedService: SelectedService = {
        service,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
        isUnpriced,
      };
      setSelectedServices([...selectedServices, newSelectedService]);
    } else {
      setSelectedServices(selectedServices.filter(s => s.service.id !== service.id));
    }
  };

  const handleQuantityChange = (serviceId: number, quantity: number) => {
    setSelectedServices(selectedServices.map(s => 
      s.service.id === serviceId 
        ? { ...s, quantity, totalPrice: s.unitPrice * quantity }
        : s
    ));
  };

  const handleUnitPriceChange = (serviceId: number, unitPrice: number) => {
    setSelectedServices(selectedServices.map(s => 
      s.service.id === serviceId 
        ? { ...s, unitPrice, totalPrice: unitPrice * s.quantity }
        : s
    ));
  };

  const handleRemoveService = (serviceId: number) => {
    setSelectedServices(selectedServices.filter(s => s.service.id !== serviceId));
  };

  const calculateTotals = () => {
    const subtotal = selectedServices.reduce((sum, s) => sum + s.totalPrice, 0);
    const tax = subtotal * (projectConfig.taxRate / 100);
    const contingency = subtotal * (projectConfig.contingencyRate / 100);
    const total = subtotal + tax + contingency;
    
    return { subtotal, tax, contingency, total };
  };

  const isLoading = servicesLoading || pricingLoading || wellTimesLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-xl"></div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Generate New Tender</h2>
          <p className="text-gray-600">Select services and configure pricing to generate a professional tender document</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tender Preview</DialogTitle>
              </DialogHeader>
              <TenderPreview 
                projectConfig={projectConfig}
                selectedServices={selectedServices}
                totals={calculateTotals()}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Project Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Project Configuration</CardTitle>
          <CardDescription>Enter project details and client information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectConfig.projectName}
                onChange={(e) => setProjectConfig({...projectConfig, projectName: e.target.value})}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={projectConfig.clientName}
                onChange={(e) => setProjectConfig({...projectConfig, clientName: e.target.value})}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={projectConfig.clientEmail}
                onChange={(e) => setProjectConfig({...projectConfig, clientEmail: e.target.value})}
                placeholder="Enter client email"
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Client Phone</Label>
              <Input
                id="clientPhone"
                value={projectConfig.clientPhone}
                onChange={(e) => setProjectConfig({...projectConfig, clientPhone: e.target.value})}
                placeholder="Enter client phone"
              />
            </div>
            <div>
              <Label htmlFor="projectLocation">Project Location</Label>
              <Input
                id="projectLocation"
                value={projectConfig.projectLocation}
                onChange={(e) => setProjectConfig({...projectConfig, projectLocation: e.target.value})}
                placeholder="Enter project location"
              />
            </div>
            <div>
              <Label htmlFor="wellType">Well Classification</Label>
              <Select 
                value={projectConfig.wellType} 
                onValueChange={(value) => {
                  setProjectConfig({...projectConfig, wellType: value});
                  // Re-evaluate selected services rates and quantities based on new classification
                  setSelectedServices(selectedServices.map(s => {
                    const pricing = pricingSchedules.find(ps => ps.serviceId === s.service.id && ps.wellType === value);
                    const wellTime = wellTimes.find(wt => wt.serviceId === s.service.id);
                    
                    const isUnpriced = !pricing || parseFloat(pricing.unitPrice ?? "0") === 0;
                    const unitPrice = pricing ? parseFloat(pricing.unitPrice ?? "0") : parseFloat(s.service.baseRate ?? "0");
                    
                    let quantity = 1;
                    if (s.service.pricingType === "Per Day") {
                      if (wellTime && wellTime.estimatedTime) {
                        quantity = parseFloat((wellTime.estimatedTime / 24).toFixed(2));
                      } else {
                        quantity = projectConfig.duration;
                      }
                    } else if (pricing && pricing.duration && pricing.duration > 0) {
                      quantity = pricing.duration;
                    }

                    return {
                      ...s,
                      unitPrice,
                      quantity,
                      totalPrice: unitPrice * quantity,
                      isUnpriced
                    };
                  }));
                }}
              >
                <SelectTrigger id="wellType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MISHRIF VERTICAL">MISHRIF VERTICAL</SelectItem>
                  <SelectItem value="MISHRIF DEVIATED">MISHRIF DEVIATED</SelectItem>
                  <SelectItem value="NAHR UMR VERTICAL">NAHR UMR VERTICAL</SelectItem>
                  <SelectItem value="ZUBAIR VERTICAL">ZUBAIR VERTICAL</SelectItem>
                  <SelectItem value="ZUBAIR DEVIATED">ZUBAIR DEVIATED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                value={projectConfig.duration}
                onChange={(e) => setProjectConfig({...projectConfig, duration: parseInt(e.target.value) || 30})}
                placeholder="Enter duration"
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={projectConfig.startDate}
                onChange={(e) => setProjectConfig({...projectConfig, startDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={projectConfig.currency} onValueChange={(value) => setProjectConfig({...projectConfig, currency: value})}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Selection and Pricing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ServiceSelection
          services={services}
          selectedServices={selectedServices}
          onServiceToggle={handleServiceToggle}
          wellType={projectConfig.wellType}
          pricingSchedules={pricingSchedules}
          wellTimes={wellTimes}
        />
        
        <PricingSummary
          selectedServices={selectedServices}
          projectConfig={projectConfig}
          onQuantityChange={handleQuantityChange}
          onUnitPriceChange={handleUnitPriceChange}
          onRemoveService={handleRemoveService}
          totals={calculateTotals()}
        />
      </div>

      {/* Generate Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center gap-4">
            <Button className="industry-primary" size="lg" disabled={selectedServices.length === 0}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Tender Document
            </Button>
            <Button variant="outline" size="lg" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Tender
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
