import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import type { Service } from "@shared/schema";

interface SelectedService {
  service: Service;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ProjectConfig {
  duration: number;
  currency: string;
  taxRate: number;
  contingencyRate: number;
}

interface PricingSummaryProps {
  selectedServices: SelectedService[];
  projectConfig: ProjectConfig;
  onQuantityChange: (serviceId: number, quantity: number) => void;
  onRemoveService: (serviceId: number) => void;
  totals: {
    subtotal: number;
    tax: number;
    contingency: number;
    total: number;
  };
}

export default function PricingSummary({ 
  selectedServices, 
  projectConfig, 
  onQuantityChange, 
  onRemoveService,
  totals 
}: PricingSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: projectConfig.currency,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selected Services & Pricing</CardTitle>
        <CardDescription>Review and adjust your service selections</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedServices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <p>No services selected</p>
            <p className="text-sm">Choose services from the left to see pricing</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900">Selected Services</h5>
            {selectedServices.map((selectedService) => (
              <div key={selectedService.service.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveService(selectedService.service.id)}
                  className="text-industry-error hover:text-industry-error p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{selectedService.service.name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedService.quantity} × {formatCurrency(selectedService.unitPrice)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`quantity-${selectedService.service.id}`} className="text-xs text-gray-500">
                    Qty:
                  </Label>
                  <Input
                    id={`quantity-${selectedService.service.id}`}
                    type="number"
                    value={selectedService.quantity}
                    onChange={(e) => onQuantityChange(selectedService.service.id, parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-xs"
                    min="1"
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 min-w-[80px] text-right">
                  {formatCurrency(selectedService.totalPrice)}
                </span>
              </div>
            ))}
          </div>
        )}

        {selectedServices.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-900">Pricing Summary</h5>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({projectConfig.taxRate}%):</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Contingency ({projectConfig.contingencyRate}%):</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(totals.contingency)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-industry-primary">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
