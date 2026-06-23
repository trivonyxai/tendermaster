import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { WELL_CLASSES, WELL_CLASS_SHORT, type SelectedServiceMatrix, type WellClassMatrixCell } from "@shared/pricing";
import type { RigColumnKey } from "@shared/pricing";

interface WellClassMatrixProps {
  selectedMatrix: SelectedServiceMatrix[];
  activeWellClasses: string[];
  onToggleWellClass: (wellClass: string, active: boolean) => void;
  onCellChange: (serviceId: number, wellClass: string, field: "quantity" | "unitPrice", value: number) => void;
  onToggleCell: (serviceId: number, wellClass: string, active: boolean) => void;
  selectedRig?: RigColumnKey;
  currency?: string;
}

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function WellClassMatrix({
  selectedMatrix,
  activeWellClasses,
  onToggleWellClass,
  onCellChange,
  onToggleCell,
  currency = "USD",
}: WellClassMatrixProps) {
  if (selectedMatrix.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Well-Class Pricing Matrix</CardTitle>
          <CardDescription>Select services to view the AFE cross-tab matrix</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-gray-500">
          No services selected ù choose services from the panel on the left.
        </CardContent>
      </Card>
    );
  }

  const wellClassTotals = activeWellClasses.map((wc) => ({
    wellClass: wc,
    total: selectedMatrix.reduce((sum, row) => {
      const cell = row.cells.find((c) => c.wellClass === wc);
      return sum + (cell?.isActive ? cell.totalPrice : 0);
    }, 0),
  }));

  const renderCell = (row: SelectedServiceMatrix, cell: WellClassMatrixCell) => {
    const short = WELL_CLASS_SHORT[cell.wellClass] ?? cell.wellClass.slice(0, 3);
    return (
      <td key={cell.wellClass} className={`border px-2 py-2 text-xs align-top ${!cell.isActive ? "bg-gray-50 opacity-50" : ""}`}>
        <div className="flex items-center gap-1 mb-1">
          <Checkbox
            checked={cell.isActive}
            onCheckedChange={(checked) => onToggleCell(row.service.id, cell.wellClass, checked as boolean)}
          />
          {cell.isUnpriced && <Badge variant="outline" className="text-[9px] text-red-600">Unpriced</Badge>}
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Unit</div>
          <Input
            type="number"
            className="h-7 text-xs w-24"
            value={cell.unitPrice}
            disabled={!cell.isActive}
            onChange={(e) => onCellChange(row.service.id, cell.wellClass, "unitPrice", parseFloat(e.target.value) || 0)}
          />
          <div className="text-gray-500">Qty {row.service.pricingType === "Per Day" && cell.resolvedDays != null && (
            <span className="text-industry-primary">({cell.resolvedDays.toFixed(2)}d)</span>
          )}</div>
          <Input
            type="number"
            className="h-7 text-xs w-24"
            value={cell.quantity}
            disabled={!cell.isActive}
            step="any"
            onChange={(e) => onCellChange(row.service.id, cell.wellClass, "quantity", parseFloat(e.target.value) || 0)}
          />
          <div className="font-semibold text-gray-900">{formatMoney(cell.totalPrice, currency)}</div>
        </div>
      </td>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Well-Class Pricing Matrix</CardTitle>
        <CardDescription>
          Service rows ù well class columns ù Per Day quantities resolved from well-times table
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {WELL_CLASSES.map((wc) => (
            <label key={wc} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50">
              <Checkbox
                checked={activeWellClasses.includes(wc)}
                onCheckedChange={(checked) => onToggleWellClass(wc, checked as boolean)}
              />
              <span className="font-medium">{WELL_CLASS_SHORT[wc] ?? wc}</span>
            </label>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-3 py-2 text-left sticky left-0 bg-gray-50 z-10 min-w-[200px]">Service</th>
                {activeWellClasses.map((wc) => (
                  <th key={wc} className="border px-2 py-2 text-center min-w-[130px]">
                    <div className="font-semibold">{WELL_CLASS_SHORT[wc]}</div>
                    <div className="text-[10px] text-gray-500 font-normal">Unit / Qty / Total</div>
                  </th>
                ))}
                <th className="border px-3 py-2 text-right bg-industry-primary/5">Row Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedMatrix.map((row) => (
                <tr key={row.service.id} className="hover:bg-gray-50/50">
                  <td className="border px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="font-medium text-gray-900">{row.service.name}</div>
                    <div className="text-xs text-gray-500">{row.service.itemCode} ù {row.service.pricingType}</div>
                  </td>
                  {row.cells.filter((c) => activeWellClasses.includes(c.wellClass)).map((cell) => renderCell(row, cell))}
                  <td className="border px-3 py-2 text-right font-semibold bg-industry-primary/5">
                    {formatMoney(row.totalPrice, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td className="border px-3 py-2 sticky left-0 bg-gray-100">Well Class Totals</td>
                {wellClassTotals.map((wt) => (
                  <td key={wt.wellClass} className="border px-2 py-2 text-center">
                    {formatMoney(wt.total, currency)}
                  </td>
                ))}
                <td className="border px-3 py-2 text-right text-industry-primary">
                  {formatMoney(wellClassTotals.reduce((s, w) => s + w.total, 0), currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
