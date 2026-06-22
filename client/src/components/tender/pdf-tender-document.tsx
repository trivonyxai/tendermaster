import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
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

interface PDFTenderDocumentProps {
  projectConfig: ProjectConfig;
  selectedServices: SelectedService[];
  totals: {
    subtotal: number;
    tax: number;
    contingency: number;
    total: number;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    color: "#333333",
    fontSize: 10,
    lineHeight: 1.5,
  },
  coverPage: {
    padding: 60,
    fontFamily: "Helvetica",
    color: "#1e293b",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a8a",
    paddingBottom: 15,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1e3a8a",
    marginTop: 80,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#64748b",
    marginTop: 10,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 5,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  metaItem: {
    width: "50%",
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
  },
  metaValue: {
    fontSize: 11,
    fontWeight: "bold",
  },
  table: {
    display: "flex",
    flexDirection: "column",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    padding: 8,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
    fontWeight: "bold",
    color: "#475569",
  },
  col1: { width: "40%" },
  col2: { width: "15%", textAlign: "center" },
  col3: { width: "20%", textAlign: "right" },
  col4: { width: "25%", textAlign: "right" },
  
  summaryBlock: {
    marginTop: 20,
    alignSelf: "flex-end",
    width: "40%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: "#1e3a8a",
    marginTop: 5,
  },
  totalText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
  },
  signatureContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 60,
  },
  signatureBox: {
    width: "45%",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 10,
    textAlign: "center",
  },
});

export default function PDFTenderDocument({ projectConfig, selectedServices, totals }: PDFTenderDocumentProps) {
  const formatVal = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: projectConfig.currency,
    }).format(amount);
  };

  const formattedDate = projectConfig.startDate
    ? new Date(projectConfig.startDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "TBD";

  const tenderRef = `T-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <Text style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 2 }}>
            Commercial Proposal
          </Text>
          <Text style={styles.title}>SERVICE TENDER PROPOSAL</Text>
          <Text style={styles.subtitle}>Reference ID: {tenderRef}</Text>

          <View style={{ marginTop: 40 }}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Client Company</Text>
                <Text style={styles.metaValue}>{projectConfig.clientName || "TBD"}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Contact Email</Text>
                <Text style={styles.metaValue}>{projectConfig.clientEmail || "TBD"}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Contact Phone</Text>
                <Text style={styles.metaValue}>{projectConfig.clientPhone || "TBD"}</Text>
              </View>
            </View>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Project & Technical Scope</Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Project Name</Text>
                <Text style={styles.metaValue}>{projectConfig.projectName || "TBD"}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Project Location</Text>
                <Text style={styles.metaValue}>{projectConfig.projectLocation || "TBD"}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Well Classification</Text>
                <Text style={styles.metaValue}>{projectConfig.wellType}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Est. Duration</Text>
                <Text style={styles.metaValue}>{projectConfig.duration} Days</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Estimated Start Date</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>
            </View>
          </View>
        </View>

        <View>
          <Text style={{ textAlign: "center", fontSize: 9, color: "#94a3b8" }}>
            Generated on {new Date().toLocaleDateString()} via TenderFlow Management Engine.
          </Text>
        </View>
      </Page>

      {/* Scope of Services Table & Pricing Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerContainer}>
          <Text style={styles.logo}>TenderFlow</Text>
          <Text style={{ fontSize: 9, color: "#64748b" }}>Proposal ID: {tenderRef}</Text>
        </View>

        <Text style={styles.sectionTitle}>Scope of Work & Commercial Allocation</Text>

        <View style={styles.table}>
          {/* Header Row */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.col1, { fontWeight: "bold" }]}>Service Description</Text>
            <Text style={[styles.col2, { fontWeight: "bold" }]}>Qty</Text>
            <Text style={[styles.col3, { fontWeight: "bold" }]}>Unit Rate</Text>
            <Text style={[styles.col4, { fontWeight: "bold" }]}>Total ({projectConfig.currency})</Text>
          </View>

          {/* Data Rows */}
          {selectedServices.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.col1}>{item.service.name}</Text>
              <Text style={styles.col2}>
                {item.quantity} {item.service.pricingType === "Per Day" ? "days" : "job"}
              </Text>
              <Text style={styles.col3}>{formatVal(item.unitPrice)}</Text>
              <Text style={styles.col4}>{formatVal(item.totalPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryBlock}>
          <View style={styles.summaryRow}>
            <Text style={{ color: "#64748b" }}>Subtotal:</Text>
            <Text style={{ fontWeight: "bold" }}>{formatVal(totals.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: "#64748b" }}>Tax ({projectConfig.taxRate}%):</Text>
            <Text style={{ fontWeight: "bold" }}>{formatVal(totals.tax)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: "#64748b" }}>Contingency ({projectConfig.contingencyRate}%):</Text>
            <Text style={{ fontWeight: "bold" }}>{formatVal(totals.contingency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Grand Total:</Text>
            <Text style={styles.totalText}>{formatVal(totals.total)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 45 }}>
          <Text style={styles.sectionTitle}>Authorization & Approvals</Text>
          <Text style={{ fontSize: 9, color: "#64748b", marginBottom: 20 }}>
            This commercial proposal is valid for 30 days. Signing below signifies mutual acceptance of the scope and cost allocation.
          </Text>
          
          <View style={styles.signatureContainer}>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 30 }}>Prepared By</Text>
              <Text style={{ fontSize: 9, color: "#64748b" }}>Service Provider Representative</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 30 }}>Approved By</Text>
              <Text style={{ fontSize: 9, color: "#64748b" }}>Client Authorized Signatory</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `Page ${pageNumber} of ${totalPages}`
        )} />
      </Page>
    </Document>
  );
}
