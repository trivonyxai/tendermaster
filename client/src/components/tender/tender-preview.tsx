import { PDFDownloadLink } from "@react-pdf/renderer";
import PDFTenderDocument from "./pdf-tender-document";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Service } from "@shared/schema";

interface SelectedService {
  service: Service;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface ProjectConfig {
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectLocation: string;
  duration: number;
  startDate: string;
  currency: string;
  taxRate: number;
  contingencyRate: number;
  wellType: string;
}

interface TenderPreviewProps {
  projectConfig: ProjectConfig;
  selectedServices: SelectedService[];
  totals: {
    subtotal: number;
    tax: number;
    contingency: number;
    total: number;
  };
}

export default function TenderPreview({ projectConfig, selectedServices, totals }: TenderPreviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: projectConfig.currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex justify-end">
        <PDFDownloadLink
          document={
            <PDFTenderDocument
              projectConfig={projectConfig}
              selectedServices={selectedServices}
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

      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">TENDER DOCUMENT</h1>
        <p className="text-gray-600">Project Reference: T-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 1000)).padStart(3, '0')}</p>
        <p className="text-gray-600">Date: {currentDate}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Company:</strong> {projectConfig.clientName || "TBD"}</p>
            <p><strong>Email:</strong> {projectConfig.clientEmail || "TBD"}</p>
            <p><strong>Phone:</strong> {projectConfig.clientPhone || "TBD"}</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Project Name:</strong> {projectConfig.projectName || "TBD"}</p>
            <p><strong>Location:</strong> {projectConfig.projectLocation || "TBD"}</p>
            <p><strong>Duration:</strong> {projectConfig.duration} days</p>
            <p><strong>Start Date:</strong> {formatDate(projectConfig.startDate)}</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {selectedServices.map((selectedService) => (
                <tr key={selectedService.service.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{selectedService.service.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {selectedService.quantity} {selectedService.service.pricingType === "Per Day" ? "days" : "job"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(selectedService.unitPrice)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(selectedService.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex justify-end">
          <div className="w-64">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({projectConfig.taxRate}%):</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Contingency ({projectConfig.contingencyRate}%):</span>
                <span>{formatCurrency(totals.contingency)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>This tender is valid for 30 days from the date of issue.</p>
        <p>Terms and conditions apply. Please contact us for any clarifications.</p>
      </div>
    </div>
  </div>
);
}

