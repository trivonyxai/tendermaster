import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  segment: text("segment").notNull(),
  pricingType: text("pricing_type").notNull(), // Per Day, Per Job, Lumpsum, etc.
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pricingSchedules = pgTable("pricing_schedules", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id),
  wellType: text("well_type"),
  duration: integer("duration"), // in days
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenders = pgTable("tenders", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  projectLocation: text("project_location"),
  duration: integer("duration").notNull(), // in days
  startDate: timestamp("start_date"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("8.5"),
  contingencyRate: decimal("contingency_rate", { precision: 5, scale: 2 }).default("10"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  currency: text("currency").default("USD"),
  status: text("status").default("draft"), // draft, sent, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const tenderServices = pgTable("tender_services", {
  id: serial("id").primaryKey(),
  tenderId: integer("tender_id").references(() => tenders.id),
  serviceId: integer("service_id").references(() => services.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),
});

export const wellTimes = pgTable("well_times", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => services.id),
  section: text("section").notNull(),
  estimatedTime: integer("estimated_time"), // in hours
  contingencyTime: integer("contingency_time"), // in hours
});

// Insert schemas
export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
});

export const insertPricingScheduleSchema = createInsertSchema(pricingSchedules).omit({
  id: true,
  createdAt: true,
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

// Types
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type PricingSchedule = typeof pricingSchedules.$inferSelect;
export type InsertPricingSchedule = z.infer<typeof insertPricingScheduleSchema>;

export type Tender = typeof tenders.$inferSelect;
export type InsertTender = z.infer<typeof insertTenderSchema>;

export type TenderService = typeof tenderServices.$inferSelect;
export type InsertTenderService = z.infer<typeof insertTenderServiceSchema>;

export type WellTime = typeof wellTimes.$inferSelect;
export type InsertWellTime = z.infer<typeof insertWellTimeSchema>;

// Additional types for frontend
export type ServiceWithPricing = Service & {
  pricingSchedules: PricingSchedule[];
  wellTimes: WellTime[];
};

export type TenderWithServices = Tender & {
  services: (TenderService & { service: Service })[];
};

export type DashboardStats = {
  totalServices: number;
  activeTenders: number;
  totalValue: string;
  completionRate: string;
};
