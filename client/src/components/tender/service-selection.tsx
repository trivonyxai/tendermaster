import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  wellTimes
}: ServiceSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.segment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const servicesBySegment = filteredServices.reduce((acc, service) => {
    if (!acc[service.segment]) {
      acc[service.segment] = [];
    }
    acc[service.segment].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const toggleSegment = (segment: string) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(segment)) {
      newExpanded.delete(segment);
    } else {
      newExpanded.add(segment);
    }
    setExpandedSegments(newExpanded);
  };

  const isServiceSelected = (serviceId: number) => {
    return selectedServices.some(s => s.service.id === serviceId);
  };

  const getSegmentIcon = (segment: string) => {
    if (segment.includes("RIG")) return "🔧";
    if (segment.includes("CEM")) return "🏗️";
    if (segment.includes("DM")) return "📡";
    if (segment.includes("PMG")) return "📊";
    return "🔧";
  };

  const checkUnpriced = (serviceId: number) => {
    const pricing = pricingSchedules.find(ps => ps.serviceId === serviceId && ps.wellType === wellType);
    return !pricing || parseFloat(pricing.unitPrice ?? "0") === 0;
  };

  const getRateDisplay = (service: Service) => {
    const pricing = pricingSchedules.find(ps => ps.serviceId === service.id && ps.wellType === wellType);
    if (pricing && parseFloat(pricing.unitPrice ?? "0") > 0) {
      return `$${parseFloat(pricing.unitPrice ?? "0").toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
    return `$${parseFloat(service.baseRate ?? "0").toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Selection</CardTitle>
        <CardDescription>Choose services for your tender</CardDescription>
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

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {Object.entries(servicesBySegment).map(([segment, segmentServices]) => (
            <Collapsible
              key={segment}
              open={expandedSegments.has(segment)}
              onOpenChange={() => toggleSegment(segment)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getSegmentIcon(segment)}</span>
                    <div>
                      <h5 className="font-medium text-gray-900">{segment}</h5>
                      <p className="text-sm text-gray-500">{segmentServices.length} services</p>
                    </div>
                  </div>
                  {expandedSegments.has(segment) ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 mt-2 space-y-2">
                  {segmentServices.map((service) => {
                    const isUnpriced = checkUnpriced(service.id);
                    return (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isServiceSelected(service.id)}
                            onCheckedChange={(checked) => onServiceToggle(service, checked as boolean)}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{service.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {service.pricingType}
                              </Badge>
                              {isUnpriced ? (
                                <Badge variant="outline" className="text-xs text-industry-error bg-red-50 border-red-200 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Unpriced
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-industry-success">
                                  Active Rate
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {getRateDisplay(service)}
                          </span>
                          <p className="text-xs text-gray-500">
                            {service.pricingType.toLowerCase()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {Object.keys(servicesBySegment).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No services found matching your search</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
