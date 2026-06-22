import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DataTable from "@/components/ui/data-table";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Edit, Trash2, Filter } from "lucide-react";
import type { Service } from "@shared/schema";

export default function ServiceMaster() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<Service[]>({
    queryKey: ["/api/services/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/services/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: searchQuery.trim().length > 0,
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Service deleted",
        description: "The service has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteService = (id: number) => {
    if (window.confirm("Are you sure you want to delete this service?")) {
      deleteServiceMutation.mutate(id);
    }
  };

  const getSegmentColor = (segment: string) => {
    if (segment.includes("RIG")) return "bg-industry-primary/10 text-industry-primary";
    if (segment.includes("CEM")) return "bg-industry-accent/10 text-industry-accent";
    if (segment.includes("DM")) return "bg-industry-success/10 text-industry-success";
    if (segment.includes("PMG")) return "bg-industry-warning/10 text-industry-warning";
    return "bg-gray-100 text-gray-700";
  };

  const getServiceIcon = (segment: string) => {
    if (segment.includes("RIG")) return "🔧";
    if (segment.includes("CEM")) return "🏗️";
    if (segment.includes("DM")) return "📡";
    if (segment.includes("PMG")) return "📊";
    return "🔧";
  };

  const displayedServices = searchQuery.trim() ? searchResults : services;

  const columns = [
    {
      header: "Service Name",
      accessor: "name" as keyof Service,
      render: (service: Service) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-industry-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-sm">{getServiceIcon(service.segment)}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{service.name}</div>
            <div className="text-sm text-gray-500">Professional service</div>
          </div>
        </div>
      ),
    },
    {
      header: "Segment",
      accessor: "segment" as keyof Service,
      render: (service: Service) => (
        <Badge className={getSegmentColor(service.segment)}>
          {service.segment}
        </Badge>
      ),
    },
    {
      header: "Pricing Type",
      accessor: "pricingType" as keyof Service,
      render: (service: Service) => (
        <span className="text-sm text-gray-900">{service.pricingType}</span>
      ),
    },
    {
      header: "Base Rate",
      accessor: "baseRate" as keyof Service,
      render: (service: Service) => (
        <span className="text-sm font-medium text-gray-900">${service.baseRate}</span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive" as keyof Service,
      render: (service: Service) => (
        <Badge variant={service.isActive ? "default" : "secondary"} className={
          service.isActive 
            ? "bg-industry-success/10 text-industry-success" 
            : "bg-gray-100 text-gray-700"
        }>
          {service.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: "id" as keyof Service,
      render: (service: Service) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-industry-primary hover:text-industry-primary"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteService(service.id)}
            className="text-industry-error hover:text-industry-error"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
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
          <h2 className="text-2xl font-semibold text-gray-900">Service Master Data</h2>
          <p className="text-gray-600">Manage and view all available services and their pricing</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button className="industry-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search services by name or segment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Services ({displayedServices?.length || 0})
            {searchQuery && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                - Search results for "{searchQuery}"
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {searchQuery ? "Filtered service results" : "All available services in the system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-industry-primary"></div>
            </div>
          ) : (
            <DataTable
              data={displayedServices || []}
              columns={columns}
              searchable={false}
              pagination={true}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
