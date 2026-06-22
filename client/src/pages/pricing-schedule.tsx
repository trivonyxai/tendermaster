import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import DataTable from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { Search, Edit, Plus, Calculator } from "lucide-react";
import type { Service, PricingSchedule } from "@shared/schema";

export default function PricingSchedulePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSchedule, setEditingSchedule] = useState<PricingSchedule | null>(null);
  const [newRate, setNewRate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<PricingSchedule[]>({
    queryKey: ["/api/pricing-schedules"],
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, unitPrice }: { id: number; unitPrice: string }) => {
      return apiRequest("PUT", `/api/pricing-schedules/${id}`, { unitPrice });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-schedules"] });
      setEditingSchedule(null);
      toast({
        title: "Rate updated",
        description: "The service rate has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update rate. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (schedule: PricingSchedule) => {
    setEditingSchedule(schedule);
    setNewRate(schedule.unitPrice || "0.00");
  };

  const handleSaveRate = () => {
    if (!editingSchedule) return;
    const cleanRate = String(parseFloat(newRate) || 0);
    updateRateMutation.mutate({ id: editingSchedule.id, unitPrice: cleanRate });
  };

  // Combine schedule data with service name for rendering
  const displayData = schedules.map(s => {
    const service = services.find(srv => srv.id === s.serviceId);
    
    // Construct a readable line code based on prefix sequence
    let prefix = "MV";
    if (s.wellType?.toUpperCase().includes("DEVIATED")) prefix = "MD";
    else if (s.wellType?.toUpperCase().includes("NAHR UMR")) prefix = "NUV";
    else if (s.wellType?.toUpperCase().includes("ZUBAIR VERTICAL")) prefix = "ZV";
    else if (s.wellType?.toUpperCase().includes("ZUBAIR DEVIATED")) prefix = "ZD";

    let index = s.serviceId ?? 0;
    if (prefix === "MD") index = Math.max(1, (s.serviceId ?? 0) - 9);
    else if (prefix === "NUV") index = Math.max(1, (s.serviceId ?? 0) - 39);
    else if (prefix === "ZV") index = 1;

    return {
      ...s,
      serviceName: service?.name || "Unknown Service",
      segment: service?.segment || "Seg-General",
      lineCode: `${prefix}.${index}`,
    };
  });

  const getSegmentColor = (segment: string) => {
    if (segment.includes("RIG")) return "bg-industry-primary/10 text-industry-primary";
    if (segment.includes("CEM")) return "bg-industry-accent/10 text-industry-accent";
    if (segment.includes("DM")) return "bg-industry-success/10 text-industry-success";
    if (segment.includes("PMG")) return "bg-industry-warning/10 text-industry-warning";
    return "bg-gray-100 text-gray-700";
  };

  const columns = [
    {
      header: "Line Code",
      accessor: "lineCode" as any,
      render: (item: any) => (
        <span className="font-semibold text-gray-700">{item.lineCode}</span>
      )
    },
    {
      header: "Well Classification",
      accessor: "wellType" as any,
      render: (item: any) => (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 font-medium">
          {item.wellType}
        </Badge>
      )
    },
    {
      header: "Service Name",
      accessor: "serviceName" as any,
      render: (item: any) => (
        <span className="text-sm font-medium text-gray-900">{item.serviceName}</span>
      )
    },
    {
      header: "Segment",
      accessor: "segment" as any,
      render: (item: any) => (
        <Badge className={getSegmentColor(item.segment)}>
          {item.segment}
        </Badge>
      )
    },
    {
      header: "Contract Unit Rate",
      accessor: "unitPrice" as any,
      render: (item: any) => (
        <span className="text-sm font-semibold text-gray-900">
          ${parseFloat(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "id" as any,
      render: (item: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEditClick(item)}
          className="text-industry-primary hover:text-industry-primary"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Rate
        </Button>
      )
    }
  ];

  if (servicesLoading || schedulesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Pricing Schedule & Rates</h2>
          <p className="text-gray-600">Review and adjust contractual rates for specific well operation phases</p>
        </div>
        <Button className="industry-primary" disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Pricing Tier
        </Button>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-industry-primary/10 rounded-lg flex items-center justify-center">
              <Calculator className="h-6 w-6 text-industry-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Priced Items</p>
              <p className="text-xl font-bold text-gray-900">{schedules.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rates Directory</CardTitle>
          <CardDescription>
            Lists operational phases and corresponding rates. Editing rates updates calculations in new tenders dynamically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={displayData}
            columns={columns}
            searchable={true}
            pagination={true}
          />
        </CardContent>
      </Card>

      {/* Edit Rate Dialog */}
      <Dialog open={editingSchedule !== null} onOpenChange={(open) => !open && setEditingSchedule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit Rate</DialogTitle>
          </DialogHeader>
          {editingSchedule && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Service</p>
                <p className="text-sm font-medium text-gray-900">{(editingSchedule as any).serviceName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Classification / Phase</p>
                <p className="text-sm font-medium text-gray-900">{editingSchedule.wellType} - {(editingSchedule as any).lineCode}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-input">Contract rate in USD ($)</Label>
                <Input
                  id="rate-input"
                  type="number"
                  step="0.01"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSchedule(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRate} className="industry-primary" disabled={updateRateMutation.isPending}>
              {updateRateMutation.isPending ? "Saving..." : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
