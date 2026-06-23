import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import DataTable from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import type { Service } from "@shared/schema";

const emptyForm = {
  name: "",
  segment: "",
  pricingType: "Lumpsum",
  baseRate: "",
  segmentMarkup: "1.000",
  tpMarkup: "1.150",
  itemCode: "",
  itemGroup: "",
  serviceType: "Segment",
  isActive: true,
};

export default function ServiceMaster() {
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: segmentFilter ? ["/api/services", `?segment=${segmentFilter}`] : ["/api/services"],
    queryFn: async () => {
      const url = segmentFilter ? `/api/services?segment=${encodeURIComponent(segmentFilter)}` : "/api/services";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<Service[]>({
    queryKey: ["/api/services/search", searchQuery, segmentFilter],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      let url = `/api/services/search?q=${encodeURIComponent(searchQuery)}`;
      if (segmentFilter) url += `&segment=${encodeURIComponent(segmentFilter)}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: searchQuery.trim().length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        baseRate: data.baseRate || null,
        itemCode: data.itemCode || null,
        itemGroup: data.itemGroup || null,
      };
      if (editingService) {
        return apiRequest("PUT", `/api/services/${editingService.id}`, payload);
      }
      return apiRequest("POST", "/api/services", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDialogOpen(false);
      setEditingService(null);
      setForm(emptyForm);
      toast({ title: editingService ? "Service updated" : "Service created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save service.", variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete service.", variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingService(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      segment: service.segment,
      pricingType: service.pricingType,
      baseRate: service.baseRate ?? "",
      segmentMarkup: service.segmentMarkup ?? "1.000",
      tpMarkup: service.tpMarkup ?? "1.150",
      itemCode: service.itemCode ?? "",
      itemGroup: service.itemGroup ?? "",
      serviceType: service.serviceType ?? "Segment",
      isActive: service.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const segments = Array.from(new Set((services ?? []).map((s) => s.segment))).sort();

  const getSegmentColor = (segment: string) => {
    if (segment.includes("RIG")) return "bg-industry-primary/10 text-industry-primary";
    if (segment.includes("CEM")) return "bg-industry-accent/10 text-industry-accent";
    if (segment.includes("DM")) return "bg-industry-success/10 text-industry-success";
    if (segment.includes("PMG")) return "bg-industry-warning/10 text-industry-warning";
    return "bg-gray-100 text-gray-700";
  };

  const displayedServices = searchQuery.trim() ? searchResults : services;

  const columns = [
    {
      header: "Service Name",
      accessor: "name" as keyof Service,
      render: (service: Service) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{service.name}</div>
          {service.itemCode && <div className="text-xs text-gray-500">{service.itemCode}</div>}
        </div>
      ),
    },
    {
      header: "Segment",
      accessor: "segment" as keyof Service,
      render: (service: Service) => <Badge className={getSegmentColor(service.segment)}>{service.segment}</Badge>,
    },
    {
      header: "Type",
      accessor: "serviceType" as keyof Service,
      render: (service: Service) => <span className="text-sm">{service.serviceType ?? "Segment"}</span>,
    },
    {
      header: "Pricing Type",
      accessor: "pricingType" as keyof Service,
      render: (service: Service) => <span className="text-sm">{service.pricingType}</span>,
    },
    {
      header: "Base Rate",
      accessor: "baseRate" as keyof Service,
      render: (service: Service) => <span className="text-sm font-medium">${service.baseRate}</span>,
    },
    {
      header: "Status",
      accessor: "isActive" as keyof Service,
      render: (service: Service) => (
        <Badge variant={service.isActive ? "default" : "secondary"}>
          {service.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: "id" as keyof Service,
      render: (service: Service) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm("Delete this service?")) deleteServiceMutation.mutate(service.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-industry-error" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="p-6 animate-pulse h-96 bg-gray-200 rounded-xl" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Service Master Data</h2>
          <p className="text-gray-600">Manage and view all available services and their pricing</p>
        </div>
        <Button className="industry-primary" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search services by name, segment, or item code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={segmentFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => setSegmentFilter("")}
            >
              All
            </Button>
            {segments.map((seg) => (
              <Button
                key={seg}
                variant={segmentFilter === seg ? "default" : "outline"}
                size="sm"
                onClick={() => setSegmentFilter(seg)}
              >
                {seg}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services ({displayedServices?.length || 0})</CardTitle>
          <CardDescription>Full CRUD for service master records</CardDescription>
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-industry-primary" />
            </div>
          ) : (
            <DataTable data={displayedServices || []} columns={columns} searchable={false} pagination />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Segment</Label>
              <Input value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} placeholder="BL-WCE-RIG" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pricing Type</Label>
                <Select value={form.pricingType} onValueChange={(v) => setForm({ ...form, pricingType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lumpsum">Lumpsum</SelectItem>
                    <SelectItem value="Per Day">Per Day</SelectItem>
                    <SelectItem value="Per Job">Per Job</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Type</Label>
                <Select value={form.serviceType} onValueChange={(v) => setForm({ ...form, serviceType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Segment">Segment</SelectItem>
                    <SelectItem value="ThirdParty">Third Party</SelectItem>
                    <SelectItem value="Riskpot">Riskpot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Base Rate ($)</Label>
                <Input type="number" value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: e.target.value })} />
              </div>
              <div>
                <Label>Item Code</Label>
                <Input value={form.itemCode} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} placeholder="MV.1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Segment Markup</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.segmentMarkup}
                  onChange={(e) => setForm({ ...form, segmentMarkup: e.target.value })}
                  placeholder="1.000"
                />
              </div>
              <div>
                <Label>Third Party Markup</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.tpMarkup}
                  onChange={(e) => setForm({ ...form, tpMarkup: e.target.value })}
                  placeholder="1.150"
                />
              </div>
            </div>
            <div>
              <Label>Item Group / Well Class</Label>
              <Input value={form.itemGroup} onChange={(e) => setForm({ ...form, itemGroup: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className="industry-primary"
              disabled={!form.name || !form.segment || saveMutation.isPending}
              onClick={() => saveMutation.mutate(form)}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
