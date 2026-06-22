// This would typically use libraries like jsPDF or Puppeteer
// For now, we'll create a simple HTML-to-PDF conversion utility

export interface TenderData {
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectLocation: string;
  duration: number;
  startDate: string;
  services: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    contingency: number;
    total: number;
  };
  currency: string;
  taxRate: number;
  contingencyRate: number;
}

export function generateTenderHTML(data: TenderData): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data.currency,
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tender Document</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #1565C0; margin: 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .info-section h3 { color: #1565C0; margin-bottom: 10px; }
        .info-section p { margin: 5px 0; }
        .services-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .services-table th, .services-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        .services-table th { background-color: #f5f5f5; }
        .totals { text-align: right; margin-top: 20px; }
        .totals table { margin-left: auto; }
        .totals td { padding: 5px 10px; }
        .total-row { font-weight: bold; border-top: 2px solid #1565C0; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>TENDER DOCUMENT</h1>
        <p>Project Reference: T-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}</p>
        <p>Date: ${currentDate}</p>
      </div>

      <div class="info-grid">
        <div class="info-section">
          <h3>Client Information</h3>
          <p><strong>Company:</strong> ${data.clientName || 'TBD'}</p>
          <p><strong>Email:</strong> ${data.clientEmail || 'TBD'}</p>
          <p><strong>Phone:</strong> ${data.clientPhone || 'TBD'}</p>
        </div>
        <div class="info-section">
          <h3>Project Details</h3>
          <p><strong>Project Name:</strong> ${data.projectName || 'TBD'}</p>
          <p><strong>Location:</strong> ${data.projectLocation || 'TBD'}</p>
          <p><strong>Duration:</strong> ${data.duration} days</p>
          <p><strong>Start Date:</strong> ${formatDate(data.startDate)}</p>
        </div>
      </div>

      <h3>Service Breakdown</h3>
      <table class="services-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.services.map(service => `
            <tr>
              <td>${service.name}</td>
              <td>${service.quantity}</td>
              <td>${formatCurrency(service.unitPrice)}</td>
              <td>${formatCurrency(service.totalPrice)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td>${formatCurrency(data.totals.subtotal)}</td>
          </tr>
          <tr>
            <td>Tax (${data.taxRate}%):</td>
            <td>${formatCurrency(data.totals.tax)}</td>
          </tr>
          <tr>
            <td>Contingency (${data.contingencyRate}%):</td>
            <td>${formatCurrency(data.totals.contingency)}</td>
          </tr>
          <tr class="total-row">
            <td>Total:</td>
            <td>${formatCurrency(data.totals.total)}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p>This tender is valid for 30 days from the date of issue.</p>
        <p>Terms and conditions apply. Please contact us for any clarifications.</p>
      </div>
    </body>
    </html>
  `;
}

export function downloadTenderPDF(data: TenderData) {
  const html = generateTenderHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
