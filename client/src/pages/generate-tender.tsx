import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceSelection from "@/components/tender/service-selection";
import PricingSummary from "@/components/tender/pricing-summary";
import WellClassMatrix from "@/components/tender/well-class-matrix";
import MarkupTable from "@/components/tender/markup-table";
import TenderPreview from "@/components/tender/tender-preview";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getAppDefaults } from "@/pages/settings";
import {
  buildServiceMatrix,
  calculateMatrixTotals,
  WELL_CLASSES,
  WELL_TYPE_DISCOUNTS,
  RIG_COLUMNS,
  type SelectedServiceMatrix,
  type RigColumnKey,
} from "@shared/pricing";
import { Save, Eye, FileText } from "lucide-react";
import type { Service, PricingSchedule, WellTime, PricingScheduleWellClass } from "@shared/schema";

interface ProjectConfig {
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectLocation: string;
  duration: number;
  startDate: string;
  currency: string;
  baseCurrency: string;
  exchangeRate: number;
  taxRate: number;
  contingencyRate: number;
  wellType: string;
  wellBasket: string;
  wellTypeDiscount: number;
  selectedRig: RigColumnKey | "";
}

const defaults = getAppDefaults();

const DEFAULT_ACTIVE_WELL_CLASSES = [
  "MISHRIF VERTICAL",
  "MISHRIF DEVIATED",
  "NAHR UMR VERTICAL",
  "ZUBAIR VERTICAL",
];

export default function GenerateTender() {
  const [selectedMatrix, setSelectedMatrix] = useState<SelectedServiceMatrix[]>([]);
  const [activeWellClasses, setActiveWellClasses] = useState<string[]>(DEFAULT_ACTIVE_WELL_CLASSES);
  const [wellClassDiscounts, setWellClassDiscounts] = useState<Record<string, number>>(() => ({ ...WELL_TYPE_DISCOUNTS }));
  const [markupOverrides, setMarkupOverrides] = useState<Record<number, number>>({});
  const [activeScenario, setActiveScenario] = useState("1");
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    projectName: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    projectLocation: "",
    duration: 30,
    startDate: "",
    currency: defaults.currency,
    baseCurrency: "USD",
    exchangeRate: defaults.exchangeRate,
    taxRate: defaults.taxRate,
    contingencyRate: defaults.contingencyRate,
    wellType: "MISHRIF VERTICAL",
    wellBasket: defaults.wellBasket,
    wellTypeDiscount: 1.0,
    selectedRig: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: pricingSchedules = [], isLoading: pricingLoading } = useQuery<PricingSchedule[]>({
    queryKey: ["/api/pricing-schedules"],
  });

  const { data: wellTimes = [], isLoading: wellTimesLoading } = useQuery<WellTime[]>({
    queryKey: ["/api/well-times"],
  });

  const { data: wellClassRows = [], isLoading: wellClassesLoading } = useQuery<PricingScheduleWellClass[]>({
    queryKey: ["/api/pricing-schedule-well-classes"],
  });

  const buildConfig = (merged: ProjectConfig, overrides?: { wellClassDiscounts?: Record<string, number>; markupOverrides?: Record<number, number> }) => ({
    projectDuration: merged.duration,
    wellBasket: merged.wellBasket,
    wellTypeDiscount: merged.wellTypeDiscount,
    wellClassDiscounts: overrides?.wellClassDiscounts ?? wellClassDiscounts,
    markupOverrides: overrides?.markupOverrides ?? markupOverrides,
    scenarioOption: parseInt(activeScenario),
    selectedRig: merged.selectedRig || undefined,
  });

  const matrixConfig = buildConfig(projectConfig);

  const rebuildMatrix = (serviceList: Service[], wellClasses: string[], cfg = matrixConfig) =>
    serviceList.map((service) =>
      buildServiceMatrix(service, wellClasses, pricingSchedules, wellClassRows, wellTimes, cfg),
    );

  const rebuildAll = (config: Partial<ProjectConfig> = {}, wellClasses = activeWellClasses) => {
    const merged = { ...projectConfig, ...config };
    const cfg = buildConfig(merged);
    setSelectedMatrix(
      selectedMatrix.map((row) =>
        buildServiceMatrix(row.service, wellClasses, pricingSchedules, wellClassRows, wellTimes, cfg),
      ),
    );
  };

  const handleServiceToggle = (service: Service, isSelected: boolean) => {
    if (isSelected) {
      const row = buildServiceMatrix(
        service,
        activeWellClasses,
        pricingSchedules,
        wellClassRows,
        wellTimes,
        matrixConfig,
      );
      setSelectedMatrix([...selectedMatrix, row]);
    } else {
      setSelectedMatrix(selectedMatrix.filter((r) => r.service.id !== service.id));
    }
  };

  const handleToggleWellClass = (wellClass: string, active: boolean) => {
    const next = active
      ? Array.from(new Set([...activeWellClasses, wellClass]))
      : activeWellClasses.filter((wc) => wc !== wellClass);
    setActiveWellClasses(next);
    setSelectedMatrix(rebuildMatrix(selectedMatrix.map((r) => r.service), next));
  };

  const handleCellChange = (
    serviceId: number,
    wellClass: string,
    field: "quantity" | "unitPrice",
    value: number,
  ) => {
    setSelectedMatrix(
      selectedMatrix.map((row) => {
        if (row.service.id !== serviceId) return row;
        const cells = row.cells.map((cell) => {
          if (cell.wellClass !== wellClass) return cell;
          const updated = { ...cell, [field]: value, totalPrice: 0 };
          updated.totalPrice = updated.isActive ? updated.unitPrice * updated.quantity : 0;
          return updated;
        });
        return {
          ...row,
          cells,
          totalPrice: cells.reduce((s, c) => s + (c.isActive ? c.totalPrice : 0), 0),
        };
      }),
    );
  };

  const handleToggleCell = (serviceId: number, wellClass: string, active: boolean) => {
    setSelectedMatrix(
      selectedMatrix.map((row) => {
        if (row.service.id !== serviceId) return row;
        const cells = row.cells.map((cell) => {
          if (cell.wellClass !== wellClass) return cell;
          return { ...cell, isActive: active, totalPrice: active ? cell.unitPrice * cell.quantity : 0 };
        });
        return {
          ...row,
          cells,
          totalPrice: cells.reduce((s, c) => s + (c.isActive ? c.totalPrice : 0), 0),
        };
      }),
    );
  };

  const handleRemoveService = (serviceId: number) => {
    setSelectedMatrix(selectedMatrix.filter((r) => r.service.id !== serviceId));
    setMarkupOverrides((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
  };

  const handleMarkupChange = (serviceId: number, markup: number) => {
    const next = { ...markupOverrides, [serviceId]: markup };
    setMarkupOverrides(next);
    const cfg = buildConfig(projectConfig, { markupOverrides: next });
    setSelectedMatrix(
      selectedMatrix.map((row) =>
        row.service.id === serviceId
          ? buildServiceMatrix(row.service, activeWellClasses, pricingSchedules, wellClassRows, wellTimes, cfg)
          : row,
      ),
    );
  };

  const handleRevertMarkup = (serviceId: number) => {
    const next = { ...markupOverrides };
    delete next[serviceId];
    setMarkupOverrides(next);
    const cfg = buildConfig(projectConfig, { markupOverrides: next });
    setSelectedMatrix(
      selectedMatrix.map((row) =>
        row.service.id === serviceId
          ? buildServiceMatrix(row.service, activeWellClasses, pricingSchedules, wellClassRows, wellTimes, cfg)
          : row,
      ),
    );
  };

  const handleWellClassDiscountChange = (wellClass: string, discount: number) => {
    const next = { ...wellClassDiscounts, [wellClass]: discount };
    setWellClassDiscounts(next);
    const cfg = buildConfig(projectConfig, { wellClassDiscounts: next });
    setSelectedMatrix(rebuildMatrix(selectedMatrix.map((r) => r.service), activeWellClasses, cfg));
  };

  const validateBeforeSave = (): boolean => {
    if (!projectConfig.projectName.trim()) {
      toast({ title: "Validation error", description: "Project name is required.", variant: "destructive" });
      return false;
    }
    if (!projectConfig.clientName.trim()) {
      toast({ title: "Validation error", description: "Client name is required.", variant: "destructive" });
      return false;
    }
    if (selectedMatrix.length === 0) {
      toast({ title: "Validation error", description: "Select at least one service.", variant: "destructive" });
      return false;
    }
    const hasPriced = selectedMatrix.some((row) => row.cells.some((c) => c.isActive && c.totalPrice > 0));
    if (!hasPriced) {
      toast({ title: "Validation error", description: "At least one active priced cell is required.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const totals = calculateMatrixTotals(selectedMatrix, {
    taxRate: projectConfig.taxRate,
    contingencyRate: projectConfig.contingencyRate,
    exchangeRate: projectConfig.exchangeRate,
    subtotal: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ status, openPreview }: { status: string; openPreview?: boolean }) => {
      const lineItems = selectedMatrix.flatMap((row) =>
        row.cells
          .filter((c) => c.isActive && c.totalPrice > 0)
          .map((c) => ({
            serviceId: row.service.id,
            quantity: Math.max(1, Math.round(c.quantity)),
            unitPrice: c.unitPrice.toFixed(2),
            totalPrice: c.totalPrice.toFixed(2),
            appliedMarkup: (c.appliedMarkup ?? 1).toFixed(3),
            appliedWellDiscount: (c.appliedWellDiscount ?? projectConfig.wellTypeDiscount).toFixed(3),
            wellClass: c.wellClass,
          })),
      );

      const payload = {
        tender: {
          projectName: projectConfig.projectName || "Untitled Tender",
          clientName: projectConfig.clientName || "TBD",
          clientEmail: projectConfig.clientEmail,
          clientPhone: projectConfig.clientPhone,
          projectLocation: projectConfig.projectLocation,
          wellType: projectConfig.wellType,
          duration: projectConfig.duration,
          startDate: projectConfig.startDate || null,
          subtotal: totals.subtotal.toFixed(2),
          taxRate: projectConfig.taxRate.toString(),
          contingencyRate: projectConfig.contingencyRate.toString(),
          totalAmount: totals.total.toFixed(2),
          currency: projectConfig.currency,
          baseCurrency: projectConfig.baseCurrency,
          exchangeRate: projectConfig.exchangeRate.toString(),
          wellBasket: projectConfig.wellBasket,
          status,
        },
        services: lineItems,
      };
      const res = await apiRequest("POST", "/api/tenders/complete", payload);
      return { tender: await res.json(), openPreview };
    },
    onSuccess: ({ tender, openPreview }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: openPreview ? "Tender generated" : "Draft saved",
        description: `Tender #${tender.id} — ${tender.projectName}`,
      });
      if (openPreview) setShowPreview(true);
      else setLocation("/history");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save tender.", variant: "destructive" });
    },
  });

  const isLoading = servicesLoading || pricingLoading || wellTimesLoading || wellClassesLoading;

  // Flat list for ServiceSelection compatibility
  const selectedServicesFlat = selectedMatrix.map((row) => {
    const primaryCell = row.cells.find((c) => c.wellClass === projectConfig.wellType) ?? row.cells[0];
    return {
      service: row.service,
      quantity: primaryCell?.quantity ?? 1,
      unitPrice: primaryCell?.unitPrice ?? 0,
      totalPrice: row.totalPrice,
      isUnpriced: primaryCell?.isUnpriced,
      resolvedDays: primaryCell?.resolvedDays ?? undefined,
    };
  });

  if (isLoading) {
    return <div className="p-6 animate-pulse h-96 bg-gray-200 rounded-xl" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Generate New Tender</h2>
          <p className="text-gray-600">Configure markup chain, well-class matrix, and generate tender documents</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={selectedMatrix.length === 0 || saveMutation.isPending}
            onClick={() => {
              if (validateBeforeSave()) saveMutation.mutate({ status: "draft" });
            }}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      <Tabs value={activeScenario} onValueChange={(v) => { setActiveScenario(v); rebuildAll(); }}>
        <TabsList>
          <TabsTrigger value="1">Option 1</TabsTrigger>
          <TabsTrigger value="2">Option 2</TabsTrigger>
          <TabsTrigger value="3">Option 3</TabsTrigger>
        </TabsList>
        <TabsContent value={activeScenario} className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Configuration</CardTitle>
              <CardDescription>Commercial assumptions and rig-type pricing selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Project Name</Label>
                  <Input value={projectConfig.projectName} onChange={(e) => setProjectConfig({ ...projectConfig, projectName: e.target.value })} />
                </div>
                <div>
                  <Label>Client Name</Label>
                  <Input value={projectConfig.clientName} onChange={(e) => setProjectConfig({ ...projectConfig, clientName: e.target.value })} />
                </div>
                <div>
                  <Label>Primary Well Class (focus)</Label>
                  <Select
                    value={projectConfig.wellType}
                    onValueChange={(value) => {
                      const config = { ...projectConfig, wellType: value, wellTypeDiscount: WELL_TYPE_DISCOUNTS[value] ?? 1.0 };
                      setProjectConfig(config);
                      rebuildAll(config);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WELL_CLASSES.map((wc) => (
                        <SelectItem key={wc} value={wc}>{wc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Well Basket</Label>
                  <Select
                    value={projectConfig.wellBasket}
                    onValueChange={(value) => {
                      const config = { ...projectConfig, wellBasket: value };
                      setProjectConfig(config);
                      rebuildAll(config);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SLB">SLB Well Basket (qtySLB)</SelectItem>
                      <SelectItem value="Client">Client Well Basket (qtyCLI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rig Type Column</Label>
                  <Select
                    value={projectConfig.selectedRig || "base"}
                    onValueChange={(value) => {
                      const rig: RigColumnKey | "" = value === "base" ? "" : (value as RigColumnKey);
                      const config = { ...projectConfig, selectedRig: rig };
                      setProjectConfig(config);
                      rebuildAll(config);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base Schedule Rate</SelectItem>
                      {RIG_COLUMNS.map((r) => (
                        <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration fallback (days)</Label>
                  <Input
                    type="number"
                    value={projectConfig.duration}
                    onChange={(e) => {
                      const config = { ...projectConfig, duration: parseInt(e.target.value) || 30 };
                      setProjectConfig(config);
                      rebuildAll(config);
                    }}
                  />
                </div>
                <div>
                  <Label>Well-Type Discount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={projectConfig.wellTypeDiscount}
                    onChange={(e) => {
                      const config = { ...projectConfig, wellTypeDiscount: parseFloat(e.target.value) || 1 };
                      setProjectConfig(config);
                      rebuildAll(config);
                    }}
                  />
                </div>
                <div>
                  <Label>Exchange Rate</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={projectConfig.exchangeRate}
                    onChange={(e) => setProjectConfig({ ...projectConfig, exchangeRate: parseFloat(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" value={projectConfig.taxRate} onChange={(e) => setProjectConfig({ ...projectConfig, taxRate: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ServiceSelection
                services={services}
                selectedServices={selectedServicesFlat}
                onServiceToggle={handleServiceToggle}
                wellType={projectConfig.wellType}
                pricingSchedules={pricingSchedules}
                wellTimes={wellTimes}
              />
            </div>
            <div className="lg:col-span-2">
              <PricingSummary
                selectedMatrix={selectedMatrix}
                projectConfig={projectConfig}
                onRemoveService={handleRemoveService}
                totals={totals}
              />
            </div>
          </div>

          <WellClassMatrix
            selectedMatrix={selectedMatrix}
            activeWellClasses={activeWellClasses}
            onToggleWellClass={handleToggleWellClass}
            onCellChange={handleCellChange}
            onToggleCell={handleToggleCell}
            selectedRig={projectConfig.selectedRig || undefined}
            currency={projectConfig.currency}
          />

          <MarkupTable
            selectedMatrix={selectedMatrix}
            activeWellClasses={activeWellClasses}
            wellClassDiscounts={wellClassDiscounts}
            markupOverrides={markupOverrides}
            onMarkupChange={handleMarkupChange}
            onRevertMarkup={handleRevertMarkup}
            onWellClassDiscountChange={handleWellClassDiscountChange}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-center gap-4">
                <Button
                  className="industry-primary"
                  size="lg"
                  disabled={selectedMatrix.length === 0 || saveMutation.isPending}
                  onClick={() => {
                    if (validateBeforeSave()) saveMutation.mutate({ status: "sent", openPreview: true });
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Generating..." : "Generate Tender Document"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tender Preview</DialogTitle>
          </DialogHeader>
          <TenderPreview
            projectConfig={projectConfig}
            selectedMatrix={selectedMatrix}
            activeWellClasses={activeWellClasses}
            totals={totals}
            wellClassDiscounts={wellClassDiscounts}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
