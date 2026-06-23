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
import { Clock, Edit, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Service, WellTime } from "@shared/schema";

export default function WellTimesPage() {
  const [editingWellTime, setEditingWellTime] = useState<WellTime | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [estTime, setEstTime] = useState("");
  const [contTime, setContTime] = useState("");
  const [newWellTime, setNewWellTime] = useState({
    serviceId: "",
    section: "",
    wellClass: "MISHRIF VERTICAL",
    sectionCode: "",
    estimatedTime: "0",
    contingencyTime: "0",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: wellTimes = [], isLoading: wellTimesLoading } = useQuery<WellTime[]>({
    queryKey: ["/api/well-times"],
  });

  const updateTimeMutation = useMutation({
    mutationFn: async ({ id, estimatedTime, contingencyTime }: { id: number; estimatedTime: number; contingencyTime: number }) => {
      return apiRequest("PUT", `/api/well-times/${id}`, { estimatedTime, contingencyTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/well-times"] });
      setEditingWellTime(null);
      toast({
        title: "Well time updated",
        description: "The estimated operational times have been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update well times. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/well-times/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/well-times"] });
      toast({ title: "Well time deleted" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const est = parseInt(newWellTime.estimatedTime) || 0;
      return apiRequest("POST", "/api/well-times", {
        serviceId: parseInt(newWellTime.serviceId),
        section: newWellTime.section,
        wellClass: newWellTime.wellClass,
        sectionCode: newWellTime.sectionCode || null,
        estimatedTime: est,
        contingencyTime: parseInt(newWellTime.contingencyTime) || 0,
        totalDays: (est / 24).toFixed(4),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/well-times"] });
      setAddDialogOpen(false);
      toast({ title: "Well time created" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const handleEditClick = (wt: WellTime) => {
    setEditingWellTime(wt);
    setEstTime(String(wt.estimatedTime || 0));
    setContTime(String(wt.contingencyTime || 0));
  };

  const handleSaveTimes = () => {
    if (!editingWellTime) return;
    updateTimeMutation.mutate({
      id: editingWellTime.id,
      estimatedTime: parseInt(estTime) || 0,
      contingencyTime: parseInt(contTime) || 0,
    });
  };

  const getSegmentColor = (segment: string) => {
    if (segment.includes("RIG")) return "bg-industry-primary/10 text-industry-primary";
    if (segment.includes("CEM")) return "bg-industry-accent/10 text-industry-accent";
    if (segment.includes("DM")) return "bg-industry-success/10 text-industry-success";
    if (segment.includes("PMG")) return "bg-industry-warning/10 text-industry-warning";
    return "bg-gray-100 text-gray-700";
  };

  // Combine well times with service catalog
  const displayData = wellTimes.map(wt => {
    const service = services.find(s => s.id === wt.serviceId);
    
    // Construct line codes similar to pricing schedule
    let prefix = "MV";
    if (wt.section?.toUpperCase().includes("32\"") || wt.section?.toUpperCase().includes("23\"") || wt.section?.toUpperCase().includes("17") || wt.section?.toUpperCase().includes("12") || wt.section?.toUpperCase().includes("8\"")) {
      // It's a phase
    }
    // We can show the code mapping
    const srvId = wt.serviceId ?? 0;
    let index = srvId;
    if (srvId > 9 && srvId <= 18) {
      prefix = "MD";
      index = srvId - 9;
    } else if (srvId > 18 && srvId <= 48) {
      prefix = "NUV";
      index = srvId - 39;
    } else if (srvId === 66) {
      prefix = "ZV";
      index = 1;
    }

    return {
      ...wt,
      serviceName: service?.name || "Unknown Service",
      segment: service?.segment || "Seg-General",
      lineCode: `${prefix}.${index}`,
    };
  });

  const columns = [
    {
      header: "Code Mapping",
      accessor: "lineCode" as any,
      render: (item: any) => (
        <span className="font-semibold text-gray-700">{item.lineCode}</span>
      )
    },
    {
      header: "Operational Phase/Section",
      accessor: "section" as any,
      render: (item: any) => (
        <span className="text-sm font-medium text-gray-900">{item.section}</span>
      )
    },
    {
      header: "Matched Service",
      accessor: "serviceName" as any,
      render: (item: any) => (
        <span className="text-sm text-gray-600">{item.serviceName}</span>
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
      header: "Est. Time (Hours)",
      accessor: "estimatedTime" as any,
      render: (item: any) => (
        <span className="text-sm font-medium text-gray-900">{item.estimatedTime} hrs</span>
      )
    },
    {
      header: "Contingency Time (Hours)",
      accessor: "contingencyTime" as any,
      render: (item: any) => (
        <span className="text-sm text-gray-600">{item.contingencyTime} hrs</span>
      )
    },
    {
      header: "Actions",
      accessor: "id" as any,
      render: (item: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEditClick(item)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm("Delete this well time entry?")) deleteMutation.mutate(item.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-industry-error" />
          </Button>
        </div>
      )
    }
  ];

  if (servicesLoading || wellTimesLoading) {
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
          <h2 className="text-2xl font-semibold text-gray-900">Well Operation Times</h2>
          <p className="text-gray-600">Manage time estimates and contingency buffers for well operations</p>
        </div>
        <Button className="industry-primary" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Phase Estimate
        </Button>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="w-12 h-12 bg-industry-primary/10 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-industry-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Phases Monitored</p>
              <p className="text-xl font-bold text-gray-900">{wellTimes.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Well Times Directory</CardTitle>
          <CardDescription>
            Lists standard clean drilling and completion times mapped to services.
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

      {/* Edit Times Dialog */}
      <Dialog open={editingWellTime !== null} onOpenChange={(open) => !open && setEditingWellTime(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Operation Times</DialogTitle>
          </DialogHeader>
          {editingWellTime && (
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Matched Service</p>
                <p className="text-sm font-medium text-gray-900">{(editingWellTime as any).serviceName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Phase / Section</p>
                <p className="text-sm font-medium text-gray-900">{editingWellTime.section} - {(editingWellTime as any).lineCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="est-time-input">Clean Time (Hours)</Label>
                  <Input
                    id="est-time-input"
                    type="number"
                    value={estTime}
                    onChange={(e) => setEstTime(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cont-time-input">Contingency Buffer (Hours)</Label>
                  <Input
                    id="cont-time-input"
                    type="number"
                    value={contTime}
                    onChange={(e) => setContTime(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWellTime(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTimes} className="industry-primary" disabled={updateTimeMutation.isPending}>
              {updateTimeMutation.isPending ? "Saving..." : "Save Times"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Phase Estimate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Service</Label>
              <Select value={newWellTime.serviceId} onValueChange={(v) => setNewWellTime({ ...newWellTime, serviceId: v })}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Section / Phase</Label>
              <Input value={newWellTime.section} onChange={(e) => setNewWellTime({ ...newWellTime, section: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Well Class</Label>
                <Select value={newWellTime.wellClass} onValueChange={(v) => setNewWellTime({ ...newWellTime, wellClass: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MISHRIF VERTICAL">MISHRIF VERTICAL</SelectItem>
                    <SelectItem value="MISHRIF DEVIATED">MISHRIF DEVIATED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Section Code</Label>
                <Input value={newWellTime.sectionCode} onChange={(e) => setNewWellTime({ ...newWellTime, sectionCode: e.target.value })} placeholder="MV.3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Est. Time (hrs)</Label>
                <Input value={newWellTime.estimatedTime} onChange={(e) => setNewWellTime({ ...newWellTime, estimatedTime: e.target.value })} />
              </div>
              <div>
                <Label>Contingency (hrs)</Label>
                <Input value={newWellTime.contingencyTime} onChange={(e) => setNewWellTime({ ...newWellTime, contingencyTime: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              className="industry-primary"
              disabled={!newWellTime.serviceId || !newWellTime.section || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
