import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  WELL_CLASS_SHORT,
  buildMarkupTableRows,
  type SelectedServiceMatrix,
} from "@shared/pricing";
import { RotateCcw } from "lucide-react";

interface MarkupTableProps {
  selectedMatrix: SelectedServiceMatrix[];
  activeWellClasses: string[];
  wellClassDiscounts: Record<string, number>;
  markupOverrides: Record<number, number>;
  onMarkupChange: (serviceId: number, markup: number) => void;
  onRevertMarkup: (serviceId: number) => void;
  onWellClassDiscountChange: (wellClass: string, discount: number) => void;
}

export default function MarkupTable({
  selectedMatrix,
  activeWellClasses,
  wellClassDiscounts,
  markupOverrides,
  onMarkupChange,
  onRevertMarkup,
  onWellClassDiscountChange,
}: MarkupTableProps) {
  if (selectedMatrix.length === 0) {
    return null;
  }

  const rows = buildMarkupTableRows(selectedMatrix, activeWellClasses, wellClassDiscounts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Markup Table Summary</CardTitle>
        <CardDescription>
          Two-tier markup chain: segment/TP markup per service, well-class discount per column
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-3 py-2 text-left sticky left-0 bg-gray-50 z-10 min-w-[180px]">Service</th>
                <th className="border px-2 py-2 text-center">Type</th>
                <th className="border px-2 py-2 text-center">Default</th>
                <th className="border px-2 py-2 text-center min-w-[90px]">Applied</th>
                {activeWellClasses.map((wc) => (
                  <th key={wc} className="border px-2 py-2 text-center min-w-[80px]">
                    <div className="font-semibold">{WELL_CLASS_SHORT[wc]}</div>
                    <div className="text-[10px] text-gray-500 font-normal">Discount</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isOverridden = markupOverrides[row.serviceId] !== undefined;
                return (
                  <tr key={row.serviceId} className="hover:bg-gray-50/50">
                    <td className="border px-3 py-2 sticky left-0 bg-white z-10">
                      <div className="font-medium text-gray-900">{row.serviceName}</div>
                      <div className="text-xs text-gray-500">{row.segment}</div>
                    </td>
                    <td className="border px-2 py-2 text-center">
                      <Badge variant="outline" className="text-[10px]">{row.serviceType}</Badge>
                    </td>
                    <td className="border px-2 py-2 text-center text-gray-600">
                      {row.defaultMarkup.toFixed(3)}
                    </td>
                    <td className="border px-2 py-2">
                      <div className="flex items-center gap-1 justify-center">
                        <Input
                          type="number"
                          step="0.001"
                          className="h-7 text-xs w-20"
                          value={row.appliedMarkup}
                          onChange={(e) =>
                            onMarkupChange(row.serviceId, parseFloat(e.target.value) || row.defaultMarkup)
                          }
                        />
                        {isOverridden && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Revert to default"
                            onClick={() => onRevertMarkup(row.serviceId)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                    {activeWellClasses.map((wc) => {
                      const cell = row.cells.find((c) => c.wellClass === wc);
                      const discount = wellClassDiscounts[wc] ?? cell?.wellDiscount ?? 1;
                      return (
                        <td key={wc} className="border px-2 py-2 text-center">
                          <Input
                            type="number"
                            step="0.01"
                            className="h-7 text-xs w-16 mx-auto"
                            value={discount}
                            onChange={(e) =>
                              onWellClassDiscountChange(wc, parseFloat(e.target.value) || 1)
                            }
                          />
                          {cell && cell.basePrice > 0 && (
                            <div className="text-[10px] text-gray-500 mt-1">
                              net {cell.netMarkup.toFixed(3)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
