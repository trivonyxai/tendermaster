import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFTenderDocument from "./pdf-tender-document";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { WELL_CLASS_SHORT, buildMarkupTableRows, type SelectedServiceMatrix, type MatrixTotals } from "@shared/pricing";

interface ProjectConfig {
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectLocation: string;
  duration: number;
  startDate: string;
  currency: string;
  baseCurrency?: string;
  exchangeRate?: number;
  taxRate: number;
  contingencyRate: number;
  wellType: string;
}

interface TenderPreviewProps {
  projectConfig: ProjectConfig;
  selectedMatrix: SelectedServiceMatrix[];
  activeWellClasses: string[];
  totals: MatrixTotals;
  wellClassDiscounts?: Record<string, number>;
}

const COLORS = ["#1e3a8a", "#0d9488", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];

export default function TenderPreview({
  projectConfig,
  selectedMatrix,
  activeWellClasses,
  totals,
  wellClassDiscounts = {},
}: TenderPreviewProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: projectConfig.currency }).format(amount);

  // Flat list for PDF (primary well class cells)
  const selectedServicesFlat = selectedMatrix.map((row) => {
    const cell = row.cells.find((c) => c.wellClass === projectConfig.wellType && c.isActive) ?? row.cells.find((c) => c.isActive);
    return {
      service: row.service,
      quantity: cell?.quantity ?? 1,
      unitPrice: cell?.unitPrice ?? 0,
      totalPrice: row.totalPrice,
    };
  });

  const segmentSummary = selectedMatrix.reduce(
    (acc, row) => {
      const seg = row.service.segment;
      acc[seg] = (acc[seg] ?? 0) + row.totalPrice;
      return acc;
    },
    {} as Record<string, number>,
  );

  const chartData = Object.entries(segmentSummary).map(([segment, value]) => ({
    segment: segment.length > 20 ? segment.slice(0, 18) + "…" : segment,
    value,
    percentage: totals.subtotal > 0 ? ((value / totals.subtotal) * 100).toFixed(1) : "0",
  }));

  const markupRows = buildMarkupTableRows(selectedMatrix, activeWellClasses, wellClassDiscounts);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex justify-end">
        <PDFDownloadLink
          document={
            <PDFTenderDocument
              projectConfig={projectConfig}
              selectedServices={selectedServicesFlat}
              totals={totals}
            />
          }
          fileName={`${projectConfig.projectName || "Tender"}_Proposal.pdf`}
        >
          {({ loading }) => (
            <Button className="industry-primary" disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              {loading ? "Generating PDF..." : "Download Proposal PDF"}
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      <Tabs defaultValue="cover">
        <TabsList>
          <TabsTrigger value="cover">Cover</TabsTrigger>
          <TabsTrigger value="annex">Annex (Matrix)</TabsTrigger>
          <TabsTrigger value="markup">Markup Table</TabsTrigger>
          <TabsTrigger value="summary">AFE Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="cover" className="bg-white border rounded-lg p-8 mt-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">TENDER DOCUMENT</h1>
            <p className="text-gray-600">Primary Well Class: {projectConfig.wellType}</p>
            <p className="text-gray-600">Active Classes: {activeWellClasses.map((w) => WELL_CLASS_SHORT[w]).join(", ")}</p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Client</h3>
              <p className="text-sm">{projectConfig.clientName || "TBD"}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Project</h3>
              <p className="text-sm">{projectConfig.projectName || "TBD"}</p>
            </div>
          </div>
          <div className="border-t mt-6 pt-4 text-right">
            <p className="text-lg font-bold">Grand Total: {formatCurrency(totals.total)}</p>
          </div>
        </TabsContent>

        <TabsContent value="annex" className="mt-4">
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-2 text-left sticky left-0 bg-gray-50">Item / Service</th>
                  {activeWellClasses.map((wc) => (
                    <th key={wc} colSpan={2} className="border px-2 py-2 text-center">
                      {WELL_CLASS_SHORT[wc]}
                    </th>
                  ))}
                </tr>
                <tr className="bg-gray-50">
                  <th className="border px-2 py-1 sticky left-0 bg-gray-50" />
                  {activeWellClasses.flatMap((wc) => [
                    <th key={`${wc}-unit`} className="border px-1 py-1">Unit</th>,
                    <th key={`${wc}-total`} className="border px-1 py-1">Total</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {selectedMatrix.map((row) => (
                  <tr key={row.service.id}>
                    <td className="border px-2 py-2 sticky left-0 bg-white">
                      <div className="font-medium">{row.service.itemCode}</div>
                      <div>{row.service.name}</div>
                    </td>
                    {activeWellClasses.flatMap((wc) => {
                      const cell = row.cells.find((c) => c.wellClass === wc);
                      if (!cell || !cell.isActive) {
                        return [
                          <td key={`${row.service.id}-${wc}-unit`} className="border px-1 py-2 text-gray-300">—</td>,
                          <td key={`${row.service.id}-${wc}-total`} className="border px-1 py-2 text-gray-300">—</td>,
                        ];
                      }
                      return [
                        <td key={`${row.service.id}-${wc}-unit`} className="border px-1 py-2 text-right">{formatCurrency(cell.unitPrice)}</td>,
                        <td key={`${row.service.id}-${wc}-total`} className="border px-1 py-2 text-right font-medium">{formatCurrency(cell.totalPrice)}</td>,
                      ];
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="border px-2 py-2">Class Totals</td>
                  {activeWellClasses.map((wc) => {
                    const classTotal = totals.wellClassSummaries.find((s) => s.wellClass === wc)?.subtotal ?? 0;
                    return (
                      <td key={wc} colSpan={2} className="border px-2 py-2 text-center">
                        {formatCurrency(classTotal)}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="markup" className="mt-4">
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-2 text-left">Service</th>
                  <th className="border px-2 py-2 text-center">Type</th>
                  <th className="border px-2 py-2 text-center">Default</th>
                  <th className="border px-2 py-2 text-center">Applied</th>
                  {activeWellClasses.map((wc) => (
                    <th key={wc} className="border px-2 py-2 text-center">
                      {WELL_CLASS_SHORT[wc]} Disc.
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {markupRows.map((row) => (
                  <tr key={row.serviceId}>
                    <td className="border px-2 py-2">
                      <div className="font-medium">{row.serviceName}</div>
                      <div className="text-gray-500">{row.segment}</div>
                    </td>
                    <td className="border px-2 py-2 text-center">{row.serviceType}</td>
                    <td className="border px-2 py-2 text-center">{row.defaultMarkup.toFixed(3)}</td>
                    <td className="border px-2 py-2 text-center font-medium">{row.appliedMarkup.toFixed(3)}</td>
                    {activeWellClasses.map((wc) => {
                      const cell = row.cells.find((c) => c.wellClass === wc);
                      return (
                        <td key={wc} className="border px-2 py-2 text-center">
                          {(cell?.wellDiscount ?? 1).toFixed(3)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="summary" className="mt-4 space-y-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="segment" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" radius={4}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full text-sm border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Well Class</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 text-right">Services</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {totals.wellClassSummaries.map((ws) => (
                <tr key={ws.wellClass}>
                  <td className="px-3 py-2">{ws.wellClass}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(ws.subtotal)}</td>
                  <td className="px-3 py-2 text-right">{ws.serviceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
