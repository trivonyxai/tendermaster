import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import type { Service, PricingSchedule, WellTime } from "@shared/schema";

interface ServiceSelectionProps {
  services: Service[];
  selectedServices: Array<{
    service: Service;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isUnpriced?: boolean;
  }>;
  onServiceToggle: (service: Service, isSelected: boolean) => void;
  wellType: string;
  pricingSchedules: PricingSchedule[];
  wellTimes: WellTime[];
}

export default function ServiceSelection({
  services,
  selectedServices,
  onServiceToggle,
  wellType,
  pricingSchedules,
}: ServiceSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "segment" | "thirdparty">("all");
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  const segments = Array.from(new Set(services.map((s) => s.segment))).sort();

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.segment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesSegment = !segmentFilter || service.segment === segmentFilter;
    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "segment" && (service.serviceType === "Segment" || !service.serviceType)) ||
      (typeFilter === "thirdparty" && (service.serviceType === "ThirdParty" || service.serviceType === "Riskpot"));
    return matchesSearch && matchesSegment && matchesType;
  });

  const servicesBySegment = filteredServices.reduce(
    (acc, service) => {
      if (!acc[service.segment]) acc[service.segment] = [];
      acc[service.segment].push(service);
      return acc;
    },
    {} as Record<string, Service[]>,
  );

  const toggleSegment = (segment: string) => {
    const next = new Set(expandedSegments);
    if (next.has(segment)) next.delete(segment);
    else next.add(segment);
    setExpandedSegments(next);
  };

  const isServiceSelected = (serviceId: number) => selectedServices.some((s) => s.service.id === serviceId);

  const checkUnpriced = (serviceId: number) => {
    const pricing = pricingSchedules.find(
      (ps) => ps.serviceId === serviceId && (ps.wellType === wellType || ps.wellClass === wellType),
    );
    return !pricing || parseFloat(pricing.unitPrice ?? "0") === 0;
  };

  const getRateDisplay = (service: Service) => {
    const pricing = pricingSchedules.find(
      (ps) => ps.serviceId === service.id && (ps.wellType === wellType || ps.wellClass === wellType),
    );
    if (pricing && parseFloat(pricing.unitPrice ?? "0") > 0) {
      return `$${parseFloat(pricing.unitPrice ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    }
    return `$${parseFloat(service.baseRate ?? "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Selection</CardTitle>
        <CardDescription>Filter by segment · {filteredServices.length} services</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant={typeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("all")}>
            All
          </Button>
          <Button variant={typeFilter === "segment" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("segment")}>
            Segments
          </Button>
          <Button variant={typeFilter === "thirdparty" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("thirdparty")}>
            Third Parties
          </Button>
        </div>

        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
          <Button variant={segmentFilter === "" ? "secondary" : "ghost"} size="sm" onClick={() => setSegmentFilter("")}>
            All Segments
          </Button>
          {segments.map((seg) => (
            <Button
              key={seg}
              variant={segmentFilter === seg ? "secondary" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setSegmentFilter(seg)}
            >
              {seg}
            </Button>
          ))}
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {Object.entries(servicesBySegment).map(([segment, segmentServices]) => (
            <Collapsible key={segment} open={expandedSegments.has(segment)} onOpenChange={() => toggleSegment(segment)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div>
                    <h5 className="font-medium text-gray-900">{segment}</h5>
                    <p className="text-sm text-gray-500">{segmentServices.length} services</p>
                  </div>
                  {expandedSegments.has(segment) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 mt-2 space-y-2">
                  {segmentServices.map((service) => {
                    const isUnpriced = checkUnpriced(service.id);
                    return (
                      <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isServiceSelected(service.id)}
                            onCheckedChange={(checked) => onServiceToggle(service, checked as boolean)}
                          />
                          <div>
                            <p className="text-sm font-medium">{service.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {service.itemCode && <Badge variant="outline" className="text-xs">{service.itemCode}</Badge>}
                              <Badge variant="secondary" className="text-xs">{service.pricingType}</Badge>
                              {isUnpriced && (
                                <Badge variant="outline" className="text-xs text-red-600 bg-red-50">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Unpriced
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-medium">{getRateDisplay(service)}</span>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
