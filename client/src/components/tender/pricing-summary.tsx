import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import { WELL_CLASS_SHORT, type SelectedServiceMatrix, type MatrixTotals } from "@shared/pricing";

interface ProjectConfig {
  duration: number;
  currency: string;
  baseCurrency?: string;
  exchangeRate?: number;
  taxRate: number;
  contingencyRate: number;
  wellType: string;
}

interface PricingSummaryProps {
  selectedMatrix: SelectedServiceMatrix[];
  projectConfig: ProjectConfig;
  onRemoveService: (serviceId: number) => void;
  totals: MatrixTotals;
}

export default function PricingSummary({
  selectedMatrix,
  projectConfig,
  onRemoveService,
  totals,
}: PricingSummaryProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: projectConfig.currency }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Summary</CardTitle>
        <CardDescription>Aggregated across all active well classes in the matrix</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedMatrix.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No services selected</div>
        ) : (
          <>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedMatrix.map((row) => (
                <div key={row.service.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onRemoveService(row.service.id)}>
                      <X className="h-3 w-3 text-industry-error" />
                    </Button>
                    <span className="font-medium">{row.service.name}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(row.totalPrice)}</span>
                </div>
              ))}
            </div>

            {totals.wellClassSummaries.length > 0 && (
              <>
                <Separator />
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">By Well Class</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {totals.wellClassSummaries.map((ws) => (
                      <div key={ws.wellClass} className="flex justify-between p-2 bg-industry-primary/5 rounded text-sm">
                        <span>{WELL_CLASS_SHORT[ws.wellClass] ?? ws.wellClass}</span>
                        <span className="font-semibold">{formatCurrency(ws.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Matrix Subtotal</span>
                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({projectConfig.taxRate}%)</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Contingency ({projectConfig.contingencyRate}%)</span>
                <span>{formatCurrency(totals.contingency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total ({projectConfig.baseCurrency ?? "USD"})</span>
                <span className="text-industry-primary">{formatCurrency(totals.total)}</span>
              </div>
              {(projectConfig.exchangeRate ?? 1) !== 1 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Local ({projectConfig.currency})</span>
                  <span>{formatCurrency(totals.localTotal)}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
