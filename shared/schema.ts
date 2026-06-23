import { pgTable, text, serial, integer, boolean, decimal, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  segment: text("segment").notNull(),
  pricingType: text("pricing_type").notNull(),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }),
  segmentMarkup: decimal("segment_markup", { precision: 6, scale: 3 }).default("1.000"),
  tpMarkup: decimal("tp_markup", { precision: 6, scale: 3 }).default("1.150"),
  serviceType: text("service_type").default("Segment"),
  itemCode: text("item_code"),
  itemGroup: text("item_group"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  nameSegmentUnique: uniqueIndex("services_name_segment_unique").on(table.name, table.segment),
}));

export const pricingSchedules = pgTable("pricing_schedules", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id),
  wellType: text("well_type"),
  wellClass: text("well_class"),
  paymentMethod: text("payment_method"),
  duration: integer("duration"),
  totalTimeUnits: integer("total_time_units"),
  applicableTotalTime: decimal("applicable_total_time", { precision: 10, scale: 4 }),
  singleWellQty: integer("single_well_qty").default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pricingScheduleWellClasses = pgTable("pricing_schedule_well_classes", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => pricingSchedules.id),
  wellClass: text("well_class").notNull(),
  singleWellQty: integer("single_well_qty").default(1),
  qtySlb: integer("qty_slb").default(1),
  qtyCli: integer("qty_cli").default(1),
  rig607SevP90: decimal("rig_607_sev_p90", { precision: 10, scale: 2 }),
  rig607Cev: decimal("rig_607_cev", { precision: 10, scale: 2 }),
  rig768SevP90: decimal("rig_768_sev_p90", { precision: 10, scale: 2 }),
  rig768Cev: decimal("rig_768_cev", { precision: 10, scale: 2 }),
  rig814SevP90: decimal("rig_814_sev_p90", { precision: 10, scale: 2 }),
  rig814Cev: decimal("rig_814_cev", { precision: 10, scale: 2 }),
});

export const tenders = pgTable("tenders", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  projectLocation: text("project_location"),
  wellType: text("well_type"),
  duration: integer("duration").notNull(),
  startDate: timestamp("start_date"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("8.5"),
  contingencyRate: decimal("contingency_rate", { precision: 5, scale: 2 }).default("10"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("USD"),
  baseCurrency: text("base_currency").default("USD"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).default("1.0"),
  wellBasket: text("well_basket").default("SLB"),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenderServices = pgTable("tender_services", {
  id: serial("id").primaryKey(),
  tenderId: integer("tender_id").references(() => tenders.id),
  serviceId: integer("service_id").references(() => services.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),
  appliedMarkup: decimal("applied_markup", { precision: 6, scale: 3 }),
  appliedWellDiscount: decimal("applied_well_discount", { precision: 6, scale: 3 }),
  wellClass: text("well_class"),
});

export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  tenderId: integer("tender_id").references(() => tenders.id),
  label: text("label").notNull(),
  wellTimeOption: integer("well_time_option").default(1),
  notes: text("notes"),
});

export const tenderStatusLog = pgTable("tender_status_log", {
  id: serial("id").primaryKey(),
  tenderId: integer("tender_id").references(() => tenders.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  note: text("note"),
  changedAt: timestamp("changed_at").defaultNow(),
});

export const wellTimes = pgTable("well_times", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id),
  section: text("section").notNull(),
  wellClass: text("well_class"),
  sectionCode: text("section_code"),
  estimatedTime: integer("estimated_time"),
  contingencyTime: integer("contingency_time"),
  totalDays: decimal("total_days", { precision: 8, scale: 4 }),
  scenarioOption: integer("scenario_option").default(1),
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertPricingScheduleSchema = createInsertSchema(pricingSchedules).omit({
  id: true,
  createdAt: true,
});

export const insertPricingScheduleWellClassSchema = createInsertSchema(pricingScheduleWellClasses).omit({
  id: true,
});

export const insertTenderSchema = createInsertSchema(tenders).omit({
  id: true,
  createdAt: true,
});

export const insertTenderServiceSchema = createInsertSchema(tenderServices).omit({
  id: true,
});

export const insertWellTimeSchema = createInsertSchema(wellTimes).omit({
  id: true,
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({
  id: true,
});

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type PricingSchedule = typeof pricingSchedules.$inferSelect;
export type InsertPricingSchedule = z.infer<typeof insertPricingScheduleSchema>;

export type PricingScheduleWellClass = typeof pricingScheduleWellClasses.$inferSelect;
export type InsertPricingScheduleWellClass = z.infer<typeof insertPricingScheduleWellClassSchema>;

export type Tender = typeof tenders.$inferSelect;
export type InsertTender = z.infer<typeof insertTenderSchema>;

export type TenderService = typeof tenderServices.$inferSelect;
export type InsertTenderService = z.infer<typeof insertTenderServiceSchema>;

export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;

export type TenderStatusLog = typeof tenderStatusLog.$inferSelect;

export type WellTime = typeof wellTimes.$inferSelect;
export type InsertWellTime = z.infer<typeof insertWellTimeSchema>;

export type PricingScheduleWithWellClasses = PricingSchedule & {
  wellClasses: PricingScheduleWellClass[];
};

export type PricingMatrixRow = {
  service: Service;
  cells: Record<string, {
    schedule: PricingSchedule | null;
    wellClassRow: PricingScheduleWellClass | null;
    resolvedDays: number | null;
    estimatedHours: number | null;
  }>;
};

export type PricingMatrix = {
  wellClasses: string[];
  rows: PricingMatrixRow[];
};

export type ServiceWithPricing = Service & {
  pricingSchedules: PricingSchedule[];
  wellTimes: WellTime[];
};

export type TenderWithServices = Tender & {
  services: (TenderService & { service: Service })[];
};

export type TenderSummarySegment = {
  segment: string;
  serviceType: string;
  totalPrice: number;
  count: number;
  percentage: number;
};

export type TenderSummary = {
  tenderId: number;
  totalAmount: number;
  segments: TenderSummarySegment[];
};

export type DashboardStats = {
  totalServices: number;
  activeTenders: number;
  totalValue: string;
  completionRate: string;
  servicesTrend: string;
  tendersTrend: string;
  valueTrend: string;
  completionTrend: string;
};

export type ActivityItem = {
  id: string;
  type: "tender" | "service" | "status_change";
  title: string;
  description: string;
  timestamp: Date | string;
  href?: string;
  status?: string;
};

export type BulkImportResult = {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  count: number;
  errors: string[];
};

export const TENDER_STATUSES = ["draft", "sent", "approved", "rejected"] as const;
export type TenderStatus = (typeof TENDER_STATUSES)[number];
