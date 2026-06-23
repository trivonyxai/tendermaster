import {
  services,
  pricingSchedules,
  pricingScheduleWellClasses,
  tenders,
  tenderServices,
  wellTimes,
  scenarios,
  tenderStatusLog,
  type Service,
  type InsertService,
  type PricingSchedule,
  type InsertPricingSchedule,
  type PricingScheduleWellClass,
  type InsertPricingScheduleWellClass,
  type Tender,
  type InsertTender,
  type TenderService,
  type InsertTenderService,
  type WellTime,
  type InsertWellTime,
  type ServiceWithPricing,
  type TenderWithServices,
  type DashboardStats,
  type BulkImportResult,
  type TenderSummary,
  type Scenario,
  type InsertScenario,
  type PricingMatrix,
  type TenderStatusLog,
  type ActivityItem,
} from "@shared/schema";
import { inferServiceType, WELL_CLASSES, resolveWellTime } from "@shared/pricing";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { getDb } from "./db";

export interface IStorage {
  getServices(segment?: string): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServiceWithPricing(id: number): Promise<ServiceWithPricing | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  searchServices(query: string, segment?: string): Promise<Service[]>;

  getPricingSchedules(): Promise<PricingSchedule[]>;
  getPricingSchedulesByService(serviceId: number): Promise<PricingSchedule[]>;
  createPricingSchedule(schedule: InsertPricingSchedule): Promise<PricingSchedule>;
  updatePricingSchedule(id: number, schedule: Partial<InsertPricingSchedule>): Promise<PricingSchedule | undefined>;
  deletePricingSchedule(id: number): Promise<boolean>;

  getPricingScheduleWellClasses(scheduleId?: number): Promise<PricingScheduleWellClass[]>;
  createPricingScheduleWellClass(row: InsertPricingScheduleWellClass): Promise<PricingScheduleWellClass>;
  updatePricingScheduleWellClass(id: number, row: Partial<InsertPricingScheduleWellClass>): Promise<PricingScheduleWellClass | undefined>;
  deletePricingScheduleWellClass(id: number): Promise<boolean>;
  getPricingMatrix(serviceIds?: number[]): Promise<PricingMatrix>;

  getTenders(): Promise<Tender[]>;
  getTender(id: number): Promise<TenderWithServices | undefined>;
  createTender(tender: InsertTender): Promise<Tender>;
  updateTender(id: number, tender: Partial<InsertTender>): Promise<Tender | undefined>;
  updateTenderStatus(id: number, status: string, note?: string): Promise<Tender | undefined>;
  deleteTender(id: number): Promise<boolean>;
  createTenderComplete(tender: InsertTender, lineItems: InsertTenderService[]): Promise<TenderWithServices>;
  getTenderSummary(id: number): Promise<TenderSummary | undefined>;
  exportTendersCsv(): Promise<string>;

  addTenderService(tenderService: InsertTenderService): Promise<TenderService>;
  removeTenderService(tenderId: number, serviceId: number): Promise<boolean>;
  getTenderServices(tenderId: number): Promise<TenderService[]>;

  getScenarios(tenderId: number): Promise<Scenario[]>;
  upsertScenario(scenario: InsertScenario): Promise<Scenario>;

  getWellTimes(): Promise<WellTime[]>;
  getWellTimesByService(serviceId: number): Promise<WellTime[]>;
  createWellTime(wellTime: InsertWellTime): Promise<WellTime>;
  updateWellTime(id: number, wellTime: Partial<InsertWellTime>): Promise<WellTime | undefined>;
  deleteWellTime(id: number): Promise<boolean>;

  getDashboardStats(): Promise<DashboardStats>;
  getRecentActivity(limit?: number): Promise<ActivityItem[]>;

  bulkCreateServices(servicesList: InsertService[]): Promise<BulkImportResult & { services: Service[] }>;
  bulkCreatePricingSchedules(schedules: InsertPricingSchedule[]): Promise<BulkImportResult & { schedules: PricingSchedule[] }>;
  bulkCreateWellTimes(wellTimesList: InsertWellTime[]): Promise<BulkImportResult & { wellTimes: WellTime[] }>;
}

function normalizeService(service: InsertService, id: number, createdAt: Date): Service {
  const segment = service.segment;
  const name = service.name;
  return {
    id,
    name,
    segment,
    pricingType: service.pricingType,
    baseRate: service.baseRate != null ? String(parseFloat(String(service.baseRate)).toFixed(2)) : null,
    segmentMarkup: service.segmentMarkup ?? "1.000",
    tpMarkup: service.tpMarkup ?? "1.150",
    serviceType: service.serviceType ?? inferServiceType(segment, name),
    itemCode: service.itemCode ?? null,
    itemGroup: service.itemGroup ?? null,
    isActive: service.isActive ?? true,
    createdAt,
  };
}

function monthTrend(current: number, previous: number): string {
  if (previous === 0) return "N/A";
  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)}%`;
}

function computeDashboardTrends<T extends { createdAt: Date | null }>(
  items: T[],
  now = new Date(),
): { current: number; previous: number } {
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  let current = 0;
  let previous = 0;
  for (const item of items) {
    if (!item.createdAt) continue;
    const d = new Date(item.createdAt);
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) current++;
    if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) previous++;
  }
  return { current, previous };
}

export class MemStorage implements IStorage {
  private servicesMap: Map<number, Service>;
  private pricingSchedulesMap: Map<number, PricingSchedule>;
  private wellClassesMap: Map<number, PricingScheduleWellClass>;
  private tendersMap: Map<number, Tender>;
  private tenderServicesMap: Map<number, TenderService>;
  private wellTimesMap: Map<number, WellTime>;
  private scenariosMap: Map<number, Scenario>;
  private statusLogMap: Map<number, TenderStatusLog>;
  private currentId: number;

  constructor() {
    this.servicesMap = new Map();
    this.pricingSchedulesMap = new Map();
    this.wellClassesMap = new Map();
    this.tendersMap = new Map();
    this.tenderServicesMap = new Map();
    this.wellTimesMap = new Map();
    this.scenariosMap = new Map();
    this.statusLogMap = new Map();
    this.currentId = 1;
    this.seedData();
  }

  private seedData() {
    const sampleServices: InsertService[] = [
      { name: "Project Management", segment: "BL-IWC-PMG", pricingType: "Per Day", baseRate: "1200", isActive: true },
      { name: "SLR Rig Demob", segment: "BL-WCE-RIG", pricingType: "None", baseRate: "1500", isActive: true },
      { name: "SLR Rig Mob ", segment: "BL-WCE-RIG", pricingType: "Per Day", baseRate: "1500", isActive: true },
      { name: "SLR Rig Move", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "2000", isActive: true },
      { name: "SLR Rig Camp", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "2500", isActive: true },
      { name: "SLR Support", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "1800", isActive: true },
      { name: "SLR Civil Works", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "3500", isActive: true },
      { name: "500 HP WO Rig", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "4200", isActive: true },
      { name: "750 HP WO Rig", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "4800", isActive: true },
      { name: "1000 HP WO Rig", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "5500", isActive: true },
      { name: "1000 HP Drilling Rig", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "5500", isActive: true },
      { name: "1500 HP Drilling Rig", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "7200", isActive: true },
      { name: "2000 HP Drilling Rig", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "9800", isActive: true },
      { name: "2500 HP Drilling Rig", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "11500", isActive: true },
      { name: "3000 HP Drilling Rig", segment: "BL-WCE-RIG", pricingType: "Lumpsum", baseRate: "14000", isActive: true },
      { name: "Bits & Drilling Tools", segment: "BL-WCD-BDT", pricingType: "Lumpsum", baseRate: "3000", isActive: true },
      { name: "Drilling tools", segment: "BL-WCD-BDT", pricingType: "Lumpsum", baseRate: "3500", isActive: true },
      { name: "Fishing Products", segment: "BL-WCD-BDT", pricingType: "Lumpsum", baseRate: "4500", isActive: true },
      { name: "Fishing Services/Rental", segment: "BL-WCD-BDT", pricingType: "Lumpsum", baseRate: "5000", isActive: true },
      { name: "D&M Services", segment: "BL-WCM-DM", pricingType: "Lumpsum", baseRate: "6000", isActive: true },
      { name: "Performance Drilling Motors / RSS", segment: "BL-WCM-DM", pricingType: "Lumpsum", baseRate: "7500", isActive: true },
      { name: "MWD Services", segment: "BL-WCM-DM", pricingType: "Lumpsum", baseRate: "2800", isActive: true },
      { name: "Mud Logging GSS", segment: "BL-WCM-DM", pricingType: "Lumpsum", baseRate: "2200", isActive: true },
      { name: "Mud Logging Services", segment: "BL-WCM-GSS", pricingType: "Lumpsum", baseRate: "2500", isActive: true },
      { name: "M-I Equipment (Centrifuge)", segment: "BL-WCF-MI", pricingType: "Lumpsum", baseRate: "1500", isActive: true },
      { name: "M-I Filtration", segment: "BL-WCF-MI", pricingType: "Lumpsum", baseRate: "1800", isActive: true },
      { name: "Drilling Fluid Services", segment: "BL-WCF-MI", pricingType: "Lumpsum", baseRate: "5500", isActive: true },
      { name: "M-I Fluids-Contingency", segment: "BL-WCF-MI", pricingType: "Lumpsum", baseRate: "8000", isActive: true },
      { name: "Drilling Fluid Products & Services", segment: "BL-WCF-MI", pricingType: "Lumpsum", baseRate: "9500", isActive: true },
      { name: "M-I Shaker Screens", segment: "BL-WCF-MI", pricingType: "Lumpsum", baseRate: "1000", isActive: true },
      { name: "MI-Waste Management", segment: "BL-WCF-MI", pricingType: "Lumpsum", baseRate: "3200", isActive: true },
      { name: "M-I Fluids Safety Margin", segment: "BL-WCF-MI", pricingType: "Lumpsum", baseRate: "4000", isActive: true },
      { name: "MI-Wellbore Cleaning Tools", segment: "BL-WCF-MI", pricingType: "Lumpsum", baseRate: "2500", isActive: true },
      { name: "Cementing Products", segment: "BL-WCF-CEM", pricingType: "Lumpsum", baseRate: "12500", isActive: true },
      { name: "Cementing Services", segment: "BL-WCF-CEM", pricingType: "Lumpsum", baseRate: "8750", isActive: true },
      { name: "Coiled Tubing Services", segment: "BL-RPE-CT", pricingType: "Lumpsum", baseRate: "7000", isActive: true },
      { name: "Cementting equipment and crew: flat monthly charge", segment: "BL-RPE-CT", pricingType: "Lumpsum", baseRate: "15000", isActive: true },
      { name: "Hydraulic Fracturing", segment: "BL-RP-STIM", pricingType: "Lumpsum", baseRate: "25000", isActive: true },
      { name: "Acidizing", segment: "BL-RP-STIM", pricingType: "Lumpsum", baseRate: "12000", isActive: true },
      { name: "Sand Control Job", segment: "BL-RP-STIM", pricingType: "Lumpsum", baseRate: "18000", isActive: true },
      { name: "Liner Hanger Products", segment: "BL-WPS-CPL", pricingType: "Lumpsum", baseRate: "9000", isActive: true },
      { name: "Liner Hanger Services", segment: "BL-WPS-CPL", pricingType: "Lumpsum", baseRate: "4500", isActive: true },
      { name: "Completions Products", segment: "BL-WPS-CPL", pricingType: "Lumpsum", baseRate: "11000", isActive: true },
      { name: "Completions Services", segment: "BL-WPS-CPL", pricingType: "Lumpsum", baseRate: "6000", isActive: true },
      { name: "Stimulation Tools - Products", segment: "BL-WPS-CPL", pricingType: "Lumpsum", baseRate: "8000", isActive: true },
      { name: "Stimulation Tools - Services", segment: "BL-WPS-CPL", pricingType: "Lumpsum", baseRate: "5000", isActive: true },
      { name: "Sand Control Tools - Products", segment: "BL-WPS-CPL", pricingType: "Lumpsum", baseRate: "7500", isActive: true },
      { name: "Sand Control Tools - Services", segment: "BL-WPS-CPL", pricingType: "Lumpsum", baseRate: "4500", isActive: true },
      { name: "Slickline Services", segment: "BL-RPE-WL", pricingType: "Lumpsum", baseRate: "3500", isActive: true },
      { name: "Slickline Products", segment: "BL-RPE-WL", pricingType: "Lumpsum", baseRate: "1500", isActive: true },
      { name: "Wireline Services", segment: "BL-RPE-WL", pricingType: "Lumpsum", baseRate: "9500", isActive: true },
      { name: "Wireline Products", segment: "BL-RPE-WL", pricingType: "Lumpsum", baseRate: "4000", isActive: true },
      { name: "Surface Well Testing Mob/Demob", segment: "BL-RPE-TS", pricingType: "Lumpsum", baseRate: "12000", isActive: true },
      { name: "Surface Well Testing", segment: "BL-RPE-TS", pricingType: "Lumpsum", baseRate: "8500", isActive: true },
      { name: "TCP with Downhole tools", segment: "BL-RPE-TS", pricingType: "Lumpsum", baseRate: "14000", isActive: true },
      { name: "DST Tools", segment: "BL-RPE-TS", pricingType: "Lumpsum", baseRate: "9000", isActive: true },
      { name: "Wellhead", segment: "BL-SPS-CAM", pricingType: "Lumpsum", baseRate: "15000", isActive: true },
      { name: "Wellhead Installation", segment: "BL-SPS-CAM", pricingType: "Lumpsum", baseRate: "5000", isActive: true },
      { name: "ESP System", segment: "BL-SPS-ALS", pricingType: "Lumpsum", baseRate: "22000", isActive: true },
      { name: "GL System", segment: "BL-SPS-ALS", pricingType: "Lumpsum", baseRate: "12000", isActive: true },
      { name: "AL Surface work", segment: "BL-SPS-ALS", pricingType: "Lumpsum", baseRate: "4500", isActive: true },
      { name: "PTS Support", segment: "BL-DI-DSS", pricingType: "Lumpsum", baseRate: "3000", isActive: true },
      { name: "SIS Support", segment: "BL-DI-DSS", pricingType: "Lumpsum", baseRate: "4000", isActive: true },
      { name: "Real Time Data Services", segment: "BL-DI-DSS", pricingType: "Lumpsum", baseRate: "2500", isActive: true },
      { name: "Communications IT_", segment: "BL-DI-DSS", pricingType: "Lumpsum", baseRate: "2000", isActive: true },
      { name: "Liner Hanger system ", segment: "BL-WPS-CPL", pricingType: "Lumpsum", baseRate: "9500", isActive: true },
    ];

    sampleServices.forEach((service, index) => {
      const id = this.currentId++;
      const itemCode = index < 9 ? `MV.${index + 1}` : `MD.${index - 8}`;
      this.servicesMap.set(id, normalizeService({ ...service, itemCode, itemGroup: index < 9 ? "MISHRIF VERTICAL" : "MISHRIF DEVIATED" }, id, new Date()));
    });

    const defaultPricing = [
      { serviceId: 1, wellType: "MISHRIF VERTICAL", wellClass: "MISHRIF VERTICAL", duration: 24, unitPrice: "585046.48" },
      { serviceId: 2, wellType: "MISHRIF VERTICAL", wellClass: "MISHRIF VERTICAL", duration: 0, unitPrice: "669.09" },
      { serviceId: 3, wellType: "MISHRIF VERTICAL", wellClass: "MISHRIF VERTICAL", duration: 0, unitPrice: "262.78" },
      { serviceId: 4, wellType: "MISHRIF VERTICAL", wellClass: "MISHRIF VERTICAL", duration: 0, unitPrice: "413.06" },
      { serviceId: 5, wellType: "MISHRIF VERTICAL", wellClass: "MISHRIF VERTICAL", duration: 0, unitPrice: "872.08" },
      { serviceId: 7, wellType: "MISHRIF VERTICAL", wellClass: "MISHRIF VERTICAL", duration: 0, unitPrice: "6497.27" },
      { serviceId: 8, wellType: "MISHRIF VERTICAL", wellClass: "MISHRIF VERTICAL", duration: 3, unitPrice: "59098.52" },
      { serviceId: 9, wellType: "MISHRIF VERTICAL", wellClass: "MISHRIF VERTICAL", duration: 0, unitPrice: "13500.00" },
      { serviceId: 10, wellType: "MISHRIF DEVIATED", wellClass: "MISHRIF DEVIATED", duration: 26, unitPrice: "618616.07" },
      { serviceId: 11, wellType: "MISHRIF DEVIATED", wellClass: "MISHRIF DEVIATED", duration: 0, unitPrice: "669.09" },
      { serviceId: 12, wellType: "MISHRIF DEVIATED", wellClass: "MISHRIF DEVIATED", duration: 0, unitPrice: "262.78" },
      { serviceId: 13, wellType: "MISHRIF DEVIATED", wellClass: "MISHRIF DEVIATED", duration: 0, unitPrice: "483.06" },
      { serviceId: 14, wellType: "MISHRIF DEVIATED", wellClass: "MISHRIF DEVIATED", duration: 0, unitPrice: "680.77" },
      { serviceId: 16, wellType: "MISHRIF DEVIATED", wellClass: "MISHRIF DEVIATED", duration: 0, unitPrice: "6497.27" },
      { serviceId: 17, wellType: "MISHRIF DEVIATED", wellClass: "MISHRIF DEVIATED", duration: 3, unitPrice: "54174.79" },
      { serviceId: 18, wellType: "MISHRIF DEVIATED", wellClass: "MISHRIF DEVIATED", duration: 0, unitPrice: "13500.00" },
      // NAHR UMR VERTICAL — services 40-48 map to NUV line items
      { serviceId: 40, wellType: "NAHR UMR VERTICAL", wellClass: "NAHR UMR VERTICAL", duration: 22, unitPrice: "542000.00" },
      { serviceId: 41, wellType: "NAHR UMR VERTICAL", wellClass: "NAHR UMR VERTICAL", duration: 0, unitPrice: "7200.00" },
      { serviceId: 42, wellType: "NAHR UMR VERTICAL", wellClass: "NAHR UMR VERTICAL", duration: 0, unitPrice: "4800.00" },
      { serviceId: 43, wellType: "NAHR UMR VERTICAL", wellClass: "NAHR UMR VERTICAL", duration: 2, unitPrice: "52000.00" },
      // ZUBAIR VERTICAL
      { serviceId: 66, wellType: "ZUBAIR VERTICAL", wellClass: "ZUBAIR VERTICAL", duration: 20, unitPrice: "498500.00" },
      { serviceId: 34, wellType: "ZUBAIR VERTICAL", wellClass: "ZUBAIR VERTICAL", duration: 0, unitPrice: "12800.00" },
      { serviceId: 35, wellType: "ZUBAIR VERTICAL", wellClass: "ZUBAIR VERTICAL", duration: 0, unitPrice: "9100.00" },
    ];

    defaultPricing.forEach((ps) => {
      const id = this.currentId++;
      const schedule: PricingSchedule = {
        id,
        serviceId: ps.serviceId,
        wellType: ps.wellType,
        wellClass: ps.wellClass,
        paymentMethod: null,
        duration: ps.duration,
        totalTimeUnits: null,
        applicableTotalTime: null,
        singleWellQty: 1,
        unitPrice: ps.unitPrice,
        currency: "USD",
        createdAt: new Date(),
      };
      this.pricingSchedulesMap.set(id, schedule);
      this.seedWellClassRow(schedule);
    });

    const defaultWellTimes = [
      { serviceId: 1, section: "Well Site Services", wellClass: "MISHRIF VERTICAL", sectionCode: "MV.1", estimatedTime: 584, contingencyTime: 0, totalDays: "24.3333" },
      { serviceId: 2, section: "32\" drilling phase with preinstalled Conductor Pipe", wellClass: "MISHRIF VERTICAL", sectionCode: "MV.2", estimatedTime: 0, contingencyTime: 0, totalDays: "0" },
      { serviceId: 3, section: "23\" drilling phase", wellClass: "MISHRIF VERTICAL", sectionCode: "MV.3", estimatedTime: 4, contingencyTime: 0, totalDays: "0.1667" },
      { serviceId: 4, section: "17 1/2\" drilling phase", wellClass: "MISHRIF VERTICAL", sectionCode: "MV.4", estimatedTime: 12, contingencyTime: 0, totalDays: "0.5" },
      { serviceId: 5, section: "12 1/4\" drilling phase", wellClass: "MISHRIF VERTICAL", sectionCode: "MV.5", estimatedTime: 8, contingencyTime: 0, totalDays: "0.3333" },
      { serviceId: 7, section: "Running of kill string", wellClass: "MISHRIF VERTICAL", sectionCode: "MV.7", estimatedTime: 10, contingencyTime: 0, totalDays: "0.4167" },
      { serviceId: 8, section: "Running of completion string", wellClass: "MISHRIF VERTICAL", sectionCode: "MV.8", estimatedTime: 76, contingencyTime: 0, totalDays: "3.1667" },
      { serviceId: 9, section: "Wellhead and X-mas Tree installation service", wellClass: "MISHRIF VERTICAL", sectionCode: "MV.9", estimatedTime: 0, contingencyTime: 0, totalDays: "0" },
      { serviceId: 10, section: "Well Site Services", wellClass: "MISHRIF DEVIATED", sectionCode: "MD.1", estimatedTime: 644, contingencyTime: 0, totalDays: "26.8333" },
      { serviceId: 11, section: "32\" drilling phase with preinstalled Conductor Pipe", wellClass: "MISHRIF DEVIATED", sectionCode: "MD.2", estimatedTime: 0, contingencyTime: 0, totalDays: "0" },
      { serviceId: 12, section: "23\" drilling phase", wellClass: "MISHRIF DEVIATED", sectionCode: "MD.3", estimatedTime: 4, contingencyTime: 0, totalDays: "0.1667" },
      { serviceId: 13, section: "17 1/2\" drilling phase", wellClass: "MISHRIF DEVIATED", sectionCode: "MD.4", estimatedTime: 13, contingencyTime: 0, totalDays: "0.5417" },
      { serviceId: 14, section: "12 1/4\" drilling phase", wellClass: "MISHRIF DEVIATED", sectionCode: "MD.5", estimatedTime: 9, contingencyTime: 0, totalDays: "0.375" },
      { serviceId: 16, section: "Running of kill string", wellClass: "MISHRIF DEVIATED", sectionCode: "MD.7", estimatedTime: 10, contingencyTime: 0, totalDays: "0.4167" },
      { serviceId: 17, section: "Running of completion string", wellClass: "MISHRIF DEVIATED", sectionCode: "MD.8", estimatedTime: 78, contingencyTime: 0, totalDays: "3.25" },
      { serviceId: 18, section: "Wellhead and X-mas Tree installation service", wellClass: "MISHRIF DEVIATED", sectionCode: "MD.9", estimatedTime: 0, contingencyTime: 0, totalDays: "0" },
      { serviceId: 40, section: "Well Site Services", wellClass: "NAHR UMR VERTICAL", sectionCode: "NUV.1", estimatedTime: 528, contingencyTime: 0, totalDays: "22.0" },
      { serviceId: 41, section: "Cementing Services", wellClass: "NAHR UMR VERTICAL", sectionCode: "NUV.2", estimatedTime: 0, contingencyTime: 0, totalDays: "0" },
      { serviceId: 66, section: "Liner Hanger system", wellClass: "ZUBAIR VERTICAL", sectionCode: "ZV.1", estimatedTime: 480, contingencyTime: 0, totalDays: "20.0" },
    ];

    defaultWellTimes.forEach((wt) => {
      const id = this.currentId++;
      this.wellTimesMap.set(id, {
        id,
        serviceId: wt.serviceId,
        section: wt.section,
        wellClass: wt.wellClass,
        sectionCode: wt.sectionCode,
        estimatedTime: wt.estimatedTime,
        contingencyTime: wt.contingencyTime,
        totalDays: wt.totalDays,
        scenarioOption: 1,
      });
    });
  }

  private seedWellClassRow(schedule: PricingSchedule) {
    const wellClass = schedule.wellClass ?? schedule.wellType ?? "MISHRIF VERTICAL";
    const unitPrice = schedule.unitPrice ?? "0";
    const id = this.currentId++;
    this.wellClassesMap.set(id, {
      id,
      scheduleId: schedule.id,
      wellClass,
      singleWellQty: 1,
      qtySlb: 1,
      qtyCli: 1,
      rig607SevP90: unitPrice,
      rig607Cev: unitPrice,
      rig768SevP90: unitPrice,
      rig768Cev: unitPrice,
      rig814SevP90: unitPrice,
      rig814Cev: unitPrice,
    });
  }

  async getServices(segment?: string): Promise<Service[]> {
    const all = Array.from(this.servicesMap.values());
    if (!segment) return all;
    return all.filter((s) => s.segment === segment);
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.servicesMap.get(id);
  }

  async getServiceWithPricing(id: number): Promise<ServiceWithPricing | undefined> {
    const service = this.servicesMap.get(id);
    if (!service) return undefined;
    return {
      ...service,
      pricingSchedules: Array.from(this.pricingSchedulesMap.values()).filter((ps) => ps.serviceId === id),
      wellTimes: Array.from(this.wellTimesMap.values()).filter((wt) => wt.serviceId === id),
    };
  }

  async createService(service: InsertService): Promise<Service> {
    const id = this.currentId++;
    const newService = normalizeService(service, id, new Date());
    this.servicesMap.set(id, newService);
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const existing = this.servicesMap.get(id);
    if (!existing) return undefined;
    const updated = normalizeService({ ...existing, ...service }, id, existing.createdAt ?? new Date());
    this.servicesMap.set(id, updated);
    return updated;
  }

  async deleteService(id: number): Promise<boolean> {
    return this.servicesMap.delete(id);
  }

  async searchServices(query: string, segment?: string): Promise<Service[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.servicesMap.values()).filter((service) => {
      const matchesQuery =
        service.name.toLowerCase().includes(lowerQuery) ||
        service.segment.toLowerCase().includes(lowerQuery) ||
        (service.itemCode?.toLowerCase().includes(lowerQuery) ?? false);
      const matchesSegment = !segment || service.segment === segment;
      return matchesQuery && matchesSegment;
    });
  }

  async getPricingSchedules(): Promise<PricingSchedule[]> {
    return Array.from(this.pricingSchedulesMap.values());
  }

  async getPricingSchedulesByService(serviceId: number): Promise<PricingSchedule[]> {
    return Array.from(this.pricingSchedulesMap.values()).filter((ps) => ps.serviceId === serviceId);
  }

  async createPricingSchedule(schedule: InsertPricingSchedule): Promise<PricingSchedule> {
    const id = this.currentId++;
    const newSchedule: PricingSchedule = {
      id,
      serviceId: schedule.serviceId ?? null,
      wellType: schedule.wellType ?? null,
      wellClass: schedule.wellClass ?? schedule.wellType ?? null,
      paymentMethod: schedule.paymentMethod ?? null,
      duration: schedule.duration ?? null,
      totalTimeUnits: schedule.totalTimeUnits ?? null,
      applicableTotalTime: schedule.applicableTotalTime ?? null,
      singleWellQty: schedule.singleWellQty ?? 1,
      unitPrice: schedule.unitPrice != null ? String(parseFloat(String(schedule.unitPrice)).toFixed(2)) : null,
      currency: schedule.currency ?? "USD",
      createdAt: new Date(),
    };
    this.pricingSchedulesMap.set(id, newSchedule);
    this.seedWellClassRow(newSchedule);
    return newSchedule;
  }

  async updatePricingSchedule(id: number, schedule: Partial<InsertPricingSchedule>): Promise<PricingSchedule | undefined> {
    const existing = this.pricingSchedulesMap.get(id);
    if (!existing) return undefined;
    const updated: PricingSchedule = {
      ...existing,
      ...schedule,
      unitPrice: schedule.unitPrice !== undefined
        ? (schedule.unitPrice != null ? String(parseFloat(String(schedule.unitPrice)).toFixed(2)) : null)
        : existing.unitPrice,
    } as PricingSchedule;
    this.pricingSchedulesMap.set(id, updated);
    return updated;
  }

  async deletePricingSchedule(id: number): Promise<boolean> {
    Array.from(this.wellClassesMap.entries()).forEach(([key, wc]) => {
      if (wc.scheduleId === id) this.wellClassesMap.delete(key);
    });
    return this.pricingSchedulesMap.delete(id);
  }

  async getPricingScheduleWellClasses(scheduleId?: number): Promise<PricingScheduleWellClass[]> {
    const all = Array.from(this.wellClassesMap.values());
    if (scheduleId) return all.filter((wc) => wc.scheduleId === scheduleId);
    return all;
  }

  async createPricingScheduleWellClass(row: InsertPricingScheduleWellClass): Promise<PricingScheduleWellClass> {
    const id = this.currentId++;
    const created: PricingScheduleWellClass = {
      id,
      scheduleId: row.scheduleId ?? null,
      wellClass: row.wellClass,
      singleWellQty: row.singleWellQty ?? 1,
      qtySlb: row.qtySlb ?? 1,
      qtyCli: row.qtyCli ?? 1,
      rig607SevP90: row.rig607SevP90 ?? null,
      rig607Cev: row.rig607Cev ?? null,
      rig768SevP90: row.rig768SevP90 ?? null,
      rig768Cev: row.rig768Cev ?? null,
      rig814SevP90: row.rig814SevP90 ?? null,
      rig814Cev: row.rig814Cev ?? null,
    };
    this.wellClassesMap.set(id, created);
    return created;
  }

  async updatePricingScheduleWellClass(
    id: number,
    row: Partial<InsertPricingScheduleWellClass>,
  ): Promise<PricingScheduleWellClass | undefined> {
    const existing = this.wellClassesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...row } as PricingScheduleWellClass;
    this.wellClassesMap.set(id, updated);
    return updated;
  }

  async deletePricingScheduleWellClass(id: number): Promise<boolean> {
    return this.wellClassesMap.delete(id);
  }

  async getPricingMatrix(serviceIds?: number[]): Promise<PricingMatrix> {
    const wellClassList = [...WELL_CLASSES];
    const allServices = serviceIds?.length
      ? serviceIds.map((id) => this.servicesMap.get(id)).filter((s): s is Service => !!s)
      : Array.from(this.servicesMap.values());

    const schedules = Array.from(this.pricingSchedulesMap.values());
    const wellClassRows = Array.from(this.wellClassesMap.values());
    const allWellTimes = Array.from(this.wellTimesMap.values());

    const rows = allServices.map((service) => {
      const cells: PricingMatrix["rows"][0]["cells"] = {};
      for (const wellClass of wellClassList) {
        const schedule =
          schedules.find(
            (ps) => ps.serviceId === service.id && (ps.wellClass === wellClass || ps.wellType === wellClass),
          ) ?? null;
        const wellClassRow = schedule
          ? wellClassRows.find((wc) => wc.scheduleId === schedule.id && wc.wellClass === wellClass) ?? null
          : null;
        const wellTime = resolveWellTime(allWellTimes, service.id, wellClass, service.itemCode);
        let resolvedDays: number | null = null;
        if (wellTime?.totalDays) resolvedDays = parseFloat(String(wellTime.totalDays));
        else if (wellTime?.estimatedTime) resolvedDays = parseFloat((wellTime.estimatedTime / 24).toFixed(4));

        cells[wellClass] = {
          schedule,
          wellClassRow,
          resolvedDays,
          estimatedHours: wellTime?.estimatedTime ?? null,
        };
      }
      return { service, cells };
    });

    return { wellClasses: wellClassList, rows };
  }

  async getTenders(): Promise<Tender[]> {
    return Array.from(this.tendersMap.values()).sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
    );
  }

  async getTender(id: number): Promise<TenderWithServices | undefined> {
    const tender = this.tendersMap.get(id);
    if (!tender) return undefined;
    const items = Array.from(this.tenderServicesMap.values()).filter((ts) => ts.tenderId === id);
    return {
      ...tender,
      services: items.map((ts) => ({
        ...ts,
        service: this.servicesMap.get(ts.serviceId!)!,
      })),
    };
  }

  async createTender(tender: InsertTender): Promise<Tender> {
    const id = this.currentId++;
    const newTender: Tender = {
      id,
      projectName: tender.projectName,
      clientName: tender.clientName,
      clientEmail: tender.clientEmail ?? null,
      clientPhone: tender.clientPhone ?? null,
      projectLocation: tender.projectLocation ?? null,
      wellType: tender.wellType ?? null,
      duration: tender.duration,
      startDate: tender.startDate != null ? new Date(tender.startDate) : null,
      subtotal: tender.subtotal != null ? String(parseFloat(String(tender.subtotal)).toFixed(2)) : null,
      taxRate: tender.taxRate != null ? String(parseFloat(String(tender.taxRate)).toFixed(2)) : "8.50",
      contingencyRate: tender.contingencyRate != null ? String(parseFloat(String(tender.contingencyRate)).toFixed(2)) : "10.00",
      totalAmount: tender.totalAmount != null ? String(parseFloat(String(tender.totalAmount)).toFixed(2)) : null,
      currency: tender.currency ?? "USD",
      baseCurrency: tender.baseCurrency ?? "USD",
      exchangeRate: tender.exchangeRate != null ? String(tender.exchangeRate) : "1.0",
      wellBasket: tender.wellBasket ?? "SLB",
      status: tender.status ?? "draft",
      createdAt: new Date(),
    };
    this.tendersMap.set(id, newTender);
    return newTender;
  }

  async updateTender(id: number, tender: Partial<InsertTender>): Promise<Tender | undefined> {
    const existing = this.tendersMap.get(id);
    if (!existing) return undefined;
    const updated: Tender = {
      ...existing,
      ...tender,
      startDate: tender.startDate !== undefined ? (tender.startDate != null ? new Date(tender.startDate) : null) : existing.startDate,
    } as Tender;
    this.tendersMap.set(id, updated);
    return updated;
  }

  async updateTenderStatus(id: number, status: string, note?: string): Promise<Tender | undefined> {
    const existing = this.tendersMap.get(id);
    if (!existing) return undefined;
    const logId = this.currentId++;
    this.statusLogMap.set(logId, {
      id: logId,
      tenderId: id,
      fromStatus: existing.status,
      toStatus: status,
      note: note ?? null,
      changedAt: new Date(),
    });
    return this.updateTender(id, { status });
  }

  private logTenderStatus(tenderId: number, fromStatus: string | null, toStatus: string, note?: string) {
    const logId = this.currentId++;
    this.statusLogMap.set(logId, {
      id: logId,
      tenderId,
      fromStatus,
      toStatus,
      note: note ?? null,
      changedAt: new Date(),
    });
  }

  async deleteTender(id: number): Promise<boolean> {
    Array.from(this.tenderServicesMap.entries()).forEach(([key, ts]) => {
      if (ts.tenderId === id) this.tenderServicesMap.delete(key);
    });
    Array.from(this.scenariosMap.entries()).forEach(([key, sc]) => {
      if (sc.tenderId === id) this.scenariosMap.delete(key);
    });
    Array.from(this.statusLogMap.entries()).forEach(([key, log]) => {
      if (log.tenderId === id) this.statusLogMap.delete(key);
    });
    return this.tendersMap.delete(id);
  }

  async createTenderComplete(tender: InsertTender, lineItems: InsertTenderService[]): Promise<TenderWithServices> {
    const created = await this.createTender(tender);
    this.logTenderStatus(created.id, null, created.status ?? "draft", "Tender created");
    for (const item of lineItems) {
      await this.addTenderService({ ...item, tenderId: created.id });
    }
    return (await this.getTender(created.id))!;
  }

  async getTenderSummary(id: number): Promise<TenderSummary | undefined> {
    const tender = await this.getTender(id);
    if (!tender) return undefined;
    const totalAmount = parseFloat(tender.totalAmount ?? "0");
    const segmentMap = new Map<string, { totalPrice: number; count: number; serviceType: string }>();

    for (const item of tender.services) {
      const key = item.service.segment;
      const existing = segmentMap.get(key) ?? { totalPrice: 0, count: 0, serviceType: item.service.serviceType ?? "Segment" };
      existing.totalPrice += parseFloat(item.totalPrice ?? "0");
      existing.count += 1;
      segmentMap.set(key, existing);
    }

    const segments = Array.from(segmentMap.entries()).map(([segment, data]) => ({
      segment,
      serviceType: data.serviceType,
      totalPrice: data.totalPrice,
      count: data.count,
      percentage: totalAmount > 0 ? (data.totalPrice / totalAmount) * 100 : 0,
    }));

    return { tenderId: id, totalAmount, segments };
  }

  async exportTendersCsv(): Promise<string> {
    const rows = await this.getTenders();
    const header = "id,projectName,clientName,status,totalAmount,currency,wellType,createdAt";
    const lines = rows.map((t) =>
      [t.id, t.projectName, t.clientName, t.status, t.totalAmount, t.currency, t.wellType, t.createdAt?.toISOString()].join(","),
    );
    return [header, ...lines].join("\n");
  }

  async addTenderService(tenderService: InsertTenderService): Promise<TenderService> {
    const id = this.currentId++;
    const newTenderService: TenderService = {
      id,
      tenderId: tenderService.tenderId ?? null,
      serviceId: tenderService.serviceId ?? null,
      quantity: tenderService.quantity,
      unitPrice: tenderService.unitPrice != null ? String(parseFloat(String(tenderService.unitPrice)).toFixed(2)) : null,
      totalPrice: tenderService.totalPrice != null ? String(parseFloat(String(tenderService.totalPrice)).toFixed(2)) : null,
      appliedMarkup: tenderService.appliedMarkup ?? null,
      appliedWellDiscount: tenderService.appliedWellDiscount ?? null,
      wellClass: tenderService.wellClass ?? null,
    };
    this.tenderServicesMap.set(id, newTenderService);
    return newTenderService;
  }

  async removeTenderService(tenderId: number, serviceId: number): Promise<boolean> {
    const entry = Array.from(this.tenderServicesMap.entries()).find(
      ([, ts]) => ts.tenderId === tenderId && ts.serviceId === serviceId,
    );
    if (!entry) return false;
    return this.tenderServicesMap.delete(entry[0]);
  }

  async getTenderServices(tenderId: number): Promise<TenderService[]> {
    return Array.from(this.tenderServicesMap.values()).filter((ts) => ts.tenderId === tenderId);
  }

  async getScenarios(tenderId: number): Promise<Scenario[]> {
    return Array.from(this.scenariosMap.values()).filter((s) => s.tenderId === tenderId);
  }

  async upsertScenario(scenario: InsertScenario): Promise<Scenario> {
    const existing = Array.from(this.scenariosMap.values()).find(
      (s) => s.tenderId === scenario.tenderId && s.label === scenario.label,
    );
    if (existing) {
      const updated = { ...existing, ...scenario };
      this.scenariosMap.set(existing.id, updated);
      return updated;
    }
    const id = this.currentId++;
    const created: Scenario = {
      id,
      tenderId: scenario.tenderId ?? null,
      label: scenario.label,
      wellTimeOption: scenario.wellTimeOption ?? 1,
      notes: scenario.notes ?? null,
    };
    this.scenariosMap.set(id, created);
    return created;
  }

  async getWellTimes(): Promise<WellTime[]> {
    return Array.from(this.wellTimesMap.values());
  }

  async getWellTimesByService(serviceId: number): Promise<WellTime[]> {
    return Array.from(this.wellTimesMap.values()).filter((wt) => wt.serviceId === serviceId);
  }

  async createWellTime(wellTime: InsertWellTime): Promise<WellTime> {
    const id = this.currentId++;
    const newWellTime: WellTime = {
      id,
      serviceId: wellTime.serviceId ?? null,
      section: wellTime.section,
      wellClass: wellTime.wellClass ?? null,
      sectionCode: wellTime.sectionCode ?? null,
      estimatedTime: wellTime.estimatedTime ?? null,
      contingencyTime: wellTime.contingencyTime ?? null,
      totalDays: wellTime.totalDays ?? null,
      scenarioOption: wellTime.scenarioOption ?? 1,
    };
    this.wellTimesMap.set(id, newWellTime);
    return newWellTime;
  }

  async updateWellTime(id: number, wellTime: Partial<InsertWellTime>): Promise<WellTime | undefined> {
    const existing = this.wellTimesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...wellTime } as WellTime;
    this.wellTimesMap.set(id, updated);
    return updated;
  }

  async deleteWellTime(id: number): Promise<boolean> {
    return this.wellTimesMap.delete(id);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allServices = Array.from(this.servicesMap.values());
    const allTenders = Array.from(this.tendersMap.values());
    const activeTenders = allTenders.filter((t) => t.status === "draft" || t.status === "sent").length;
    const totalValue = allTenders.reduce((sum, tender) => sum + parseFloat(tender.totalAmount || "0"), 0);
    const completionRate = allTenders.length > 0
      ? Math.round((allTenders.filter((t) => t.status === "approved").length / allTenders.length) * 100)
      : 0;

    const serviceTrend = computeDashboardTrends(allServices);
    const tenderTrend = computeDashboardTrends(allTenders);

    return {
      totalServices: allServices.length,
      activeTenders,
      totalValue: `$${(totalValue / 1000000).toFixed(2)}M`,
      completionRate: `${completionRate}%`,
      servicesTrend: monthTrend(serviceTrend.current, serviceTrend.previous),
      tendersTrend: monthTrend(tenderTrend.current, tenderTrend.previous),
      valueTrend: monthTrend(
        allTenders.filter((t) => {
          if (!t.createdAt) return false;
          const d = new Date(t.createdAt);
          return d.getMonth() === new Date().getMonth();
        }).reduce((s, t) => s + parseFloat(t.totalAmount || "0"), 0),
        allTenders.filter((t) => {
          if (!t.createdAt) return false;
          const d = new Date(t.createdAt);
          const now = new Date();
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        }).reduce((s, t) => s + parseFloat(t.totalAmount || "0"), 0),
      ),
      completionTrend: monthTrend(
        allTenders.filter((t) => t.status === "approved" && t.createdAt && new Date(t.createdAt).getMonth() === new Date().getMonth()).length,
        allTenders.filter((t) => {
          if (!t.createdAt || t.status !== "approved") return false;
          const d = new Date(t.createdAt);
          const now = new Date();
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        }).length,
      ),
    };
  }

  async getRecentActivity(limit = 10): Promise<ActivityItem[]> {
    const items: ActivityItem[] = [];

    for (const tender of Array.from(this.tendersMap.values())) {
      items.push({
        id: `tender-${tender.id}`,
        type: "tender",
        title: tender.projectName,
        description: `${tender.clientName} · ${tender.status}`,
        timestamp: tender.createdAt ?? new Date(),
        href: "/history",
        status: tender.status ?? undefined,
      });
    }

    for (const log of Array.from(this.statusLogMap.values())) {
      const tender = this.tendersMap.get(log.tenderId!);
      items.push({
        id: `status-${log.id}`,
        type: "status_change",
        title: tender?.projectName ?? `Tender #${log.tenderId}`,
        description: `${log.fromStatus ?? "new"} → ${log.toStatus}`,
        timestamp: log.changedAt ?? new Date(),
        href: "/history",
        status: log.toStatus,
      });
    }

    for (const service of Array.from(this.servicesMap.values()).slice(-20)) {
      if (service.createdAt) {
        items.push({
          id: `service-${service.id}`,
          type: "service",
          title: service.name,
          description: `Service catalog · ${service.segment}`,
          timestamp: service.createdAt,
          href: "/service-master",
        });
      }
    }

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  private findServiceByNameSegment(name: string, segment: string): Service | undefined {
    return Array.from(this.servicesMap.values()).find(
      (s) => s.name.toLowerCase().trim() === name.toLowerCase().trim() && s.segment === segment,
    );
  }

  async bulkCreateServices(servicesList: InsertService[]): Promise<BulkImportResult & { services: Service[] }> {
    const createdServices: Service[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const service of servicesList) {
      try {
        const existing = this.findServiceByNameSegment(service.name, service.segment);
        if (existing) {
          const updatedService = await this.updateService(existing.id, service);
          if (updatedService) {
            createdServices.push(updatedService);
            updated++;
          } else {
            skipped++;
          }
        } else {
          const newService = await this.createService(service);
          createdServices.push(newService);
          created++;
        }
      } catch (e) {
        errors.push(`Failed to import ${service.name}: ${e}`);
        skipped++;
      }
    }

    return { success: true, created, updated, skipped, count: created + updated, errors, services: createdServices };
  }

  async bulkCreatePricingSchedules(schedules: InsertPricingSchedule[]): Promise<BulkImportResult & { schedules: PricingSchedule[] }> {
    const createdSchedules: PricingSchedule[] = [];
    let created = 0;
    const errors: string[] = [];

    for (const schedule of schedules) {
      try {
        const item = await this.createPricingSchedule(schedule);
        createdSchedules.push(item);
        created++;
      } catch (e) {
        errors.push(`Failed pricing schedule for service ${schedule.serviceId}: ${e}`);
      }
    }

    return { success: true, created, updated: 0, skipped: schedules.length - created, count: created, errors, schedules: createdSchedules };
  }

  async bulkCreateWellTimes(wellTimesList: InsertWellTime[]): Promise<BulkImportResult & { wellTimes: WellTime[] }> {
    const createdWellTimes: WellTime[] = [];
    let created = 0;
    const errors: string[] = [];

    for (const wt of wellTimesList) {
      try {
        const item = await this.createWellTime(wt);
        createdWellTimes.push(item);
        created++;
      } catch (e) {
        errors.push(`Failed well time for service ${wt.serviceId}: ${e}`);
      }
    }

    return { success: true, created, updated: 0, skipped: wellTimesList.length - created, count: created, errors, wellTimes: createdWellTimes };
  }
}

export class DatabaseStorage implements IStorage {
  async getServices(segment?: string): Promise<Service[]> {
    const db = getDb();
    if (segment) {
      return db.select().from(services).where(eq(services.segment, segment));
    }
    return db.select().from(services);
  }

  async getService(id: number): Promise<Service | undefined> {
    const db = getDb();
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getServiceWithPricing(id: number): Promise<ServiceWithPricing | undefined> {
    const service = await this.getService(id);
    if (!service) return undefined;
    return {
      ...service,
      pricingSchedules: await this.getPricingSchedulesByService(id),
      wellTimes: await this.getWellTimesByService(id),
    };
  }

  async createService(service: InsertService): Promise<Service> {
    const db = getDb();
    const [created] = await db.insert(services).values(service).returning();
    return created;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const db = getDb();
    const [updated] = await db.update(services).set(service).where(eq(services.id, id)).returning();
    return updated;
  }

  async deleteService(id: number): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(services).where(eq(services.id, id)).returning();
    return result.length > 0;
  }

  async searchServices(query: string, segment?: string): Promise<Service[]> {
    const db = getDb();
    const pattern = `%${query}%`;
    const conditions = [
      or(ilike(services.name, pattern), ilike(services.segment, pattern), ilike(services.itemCode, pattern)),
    ];
    if (segment) conditions.push(eq(services.segment, segment));
    return db.select().from(services).where(and(...conditions));
  }

  async getPricingSchedules(): Promise<PricingSchedule[]> {
    return getDb().select().from(pricingSchedules);
  }

  async getPricingSchedulesByService(serviceId: number): Promise<PricingSchedule[]> {
    return getDb().select().from(pricingSchedules).where(eq(pricingSchedules.serviceId, serviceId));
  }

  async createPricingSchedule(schedule: InsertPricingSchedule): Promise<PricingSchedule> {
    const [created] = await getDb().insert(pricingSchedules).values(schedule).returning();
    const wellClass = created.wellClass ?? created.wellType ?? "MISHRIF VERTICAL";
    const unitPrice = created.unitPrice ?? "0";
    await this.createPricingScheduleWellClass({
      scheduleId: created.id,
      wellClass,
      singleWellQty: 1,
      qtySlb: 1,
      qtyCli: 1,
      rig607SevP90: unitPrice,
      rig607Cev: unitPrice,
      rig768SevP90: unitPrice,
      rig768Cev: unitPrice,
      rig814SevP90: unitPrice,
      rig814Cev: unitPrice,
    });
    return created;
  }

  async updatePricingSchedule(id: number, schedule: Partial<InsertPricingSchedule>): Promise<PricingSchedule | undefined> {
    const [updated] = await getDb().update(pricingSchedules).set(schedule).where(eq(pricingSchedules.id, id)).returning();
    return updated;
  }

  async deletePricingSchedule(id: number): Promise<boolean> {
    const db = getDb();
    await db.delete(pricingScheduleWellClasses).where(eq(pricingScheduleWellClasses.scheduleId, id));
    const result = await db.delete(pricingSchedules).where(eq(pricingSchedules.id, id)).returning();
    return result.length > 0;
  }

  async getPricingScheduleWellClasses(scheduleId?: number): Promise<PricingScheduleWellClass[]> {
    const db = getDb();
    if (scheduleId) {
      return db.select().from(pricingScheduleWellClasses).where(eq(pricingScheduleWellClasses.scheduleId, scheduleId));
    }
    return db.select().from(pricingScheduleWellClasses);
  }

  async createPricingScheduleWellClass(row: InsertPricingScheduleWellClass): Promise<PricingScheduleWellClass> {
    const [created] = await getDb().insert(pricingScheduleWellClasses).values(row).returning();
    return created;
  }

  async updatePricingScheduleWellClass(
    id: number,
    row: Partial<InsertPricingScheduleWellClass>,
  ): Promise<PricingScheduleWellClass | undefined> {
    const [updated] = await getDb()
      .update(pricingScheduleWellClasses)
      .set(row)
      .where(eq(pricingScheduleWellClasses.id, id))
      .returning();
    return updated;
  }

  async deletePricingScheduleWellClass(id: number): Promise<boolean> {
    const result = await getDb().delete(pricingScheduleWellClasses).where(eq(pricingScheduleWellClasses.id, id)).returning();
    return result.length > 0;
  }

  async getPricingMatrix(serviceIds?: number[]): Promise<PricingMatrix> {
    const db = getDb();
    const wellClassList = [...WELL_CLASSES];
    const allServices = serviceIds?.length
      ? await Promise.all(serviceIds.map((id) => this.getService(id)))
      : await this.getServices();
    const servicesList = allServices.filter((s): s is Service => !!s);
    const schedules = await this.getPricingSchedules();
    const wellClassRows = await this.getPricingScheduleWellClasses();
    const allWellTimes = await this.getWellTimes();

    const rows = servicesList.map((service) => {
      const cells: PricingMatrix["rows"][0]["cells"] = {};
      for (const wellClass of wellClassList) {
        const schedule =
          schedules.find(
            (ps) => ps.serviceId === service.id && (ps.wellClass === wellClass || ps.wellType === wellClass),
          ) ?? null;
        const wellClassRow = schedule
          ? wellClassRows.find((wc) => wc.scheduleId === schedule.id && wc.wellClass === wellClass) ?? null
          : null;
        const wellTime = resolveWellTime(allWellTimes, service.id, wellClass, service.itemCode);
        let resolvedDays: number | null = null;
        if (wellTime?.totalDays) resolvedDays = parseFloat(String(wellTime.totalDays));
        else if (wellTime?.estimatedTime) resolvedDays = parseFloat((wellTime.estimatedTime / 24).toFixed(4));

        cells[wellClass] = {
          schedule,
          wellClassRow,
          resolvedDays,
          estimatedHours: wellTime?.estimatedTime ?? null,
        };
      }
      return { service, cells };
    });

    return { wellClasses: wellClassList, rows };
  }

  async getTenders(): Promise<Tender[]> {
    return getDb().select().from(tenders).orderBy(desc(tenders.createdAt));
  }

  async getTender(id: number): Promise<TenderWithServices | undefined> {
    const [tender] = await getDb().select().from(tenders).where(eq(tenders.id, id));
    if (!tender) return undefined;
    const items = await getDb()
      .select()
      .from(tenderServices)
      .where(eq(tenderServices.tenderId, id));
    const withServices = await Promise.all(
      items.map(async (item) => ({
        ...item,
        service: (await this.getService(item.serviceId!))!,
      })),
    );
    return { ...tender, services: withServices };
  }

  async createTender(tender: InsertTender): Promise<Tender> {
    const [created] = await getDb().insert(tenders).values(tender).returning();
    return created;
  }

  async updateTender(id: number, tender: Partial<InsertTender>): Promise<Tender | undefined> {
    const [updated] = await getDb().update(tenders).set(tender).where(eq(tenders.id, id)).returning();
    return updated;
  }

  async updateTenderStatus(id: number, status: string, note?: string): Promise<Tender | undefined> {
    const [existing] = await getDb().select().from(tenders).where(eq(tenders.id, id));
    if (!existing) return undefined;
    await getDb().insert(tenderStatusLog).values({
      tenderId: id,
      fromStatus: existing.status,
      toStatus: status,
      note: note ?? null,
    });
    return this.updateTender(id, { status });
  }

  async deleteTender(id: number): Promise<boolean> {
    const db = getDb();
    await db.delete(tenderServices).where(eq(tenderServices.tenderId, id));
    await db.delete(scenarios).where(eq(scenarios.tenderId, id));
    await db.delete(tenderStatusLog).where(eq(tenderStatusLog.tenderId, id));
    const result = await db.delete(tenders).where(eq(tenders.id, id)).returning();
    return result.length > 0;
  }

  async createTenderComplete(tender: InsertTender, lineItems: InsertTenderService[]): Promise<TenderWithServices> {
    const created = await this.createTender(tender);
    await getDb().insert(tenderStatusLog).values({
      tenderId: created.id,
      fromStatus: null,
      toStatus: created.status ?? "draft",
      note: "Tender created",
    });
    for (const item of lineItems) {
      await this.addTenderService({ ...item, tenderId: created.id });
    }
    return (await this.getTender(created.id))!;
  }

  async getTenderSummary(id: number): Promise<TenderSummary | undefined> {
    const tender = await this.getTender(id);
    if (!tender) return undefined;
    const totalAmount = parseFloat(tender.totalAmount ?? "0");
    const segmentMap = new Map<string, { totalPrice: number; count: number; serviceType: string }>();

    for (const item of tender.services) {
      const key = item.service.segment;
      const existing = segmentMap.get(key) ?? { totalPrice: 0, count: 0, serviceType: item.service.serviceType ?? "Segment" };
      existing.totalPrice += parseFloat(item.totalPrice ?? "0");
      existing.count += 1;
      segmentMap.set(key, existing);
    }

    const segments = Array.from(segmentMap.entries()).map(([segment, data]) => ({
      segment,
      serviceType: data.serviceType,
      totalPrice: data.totalPrice,
      count: data.count,
      percentage: totalAmount > 0 ? (data.totalPrice / totalAmount) * 100 : 0,
    }));

    return { tenderId: id, totalAmount, segments };
  }

  async exportTendersCsv(): Promise<string> {
    const rows = await this.getTenders();
    const header = "id,projectName,clientName,status,totalAmount,currency,wellType,createdAt";
    const lines = rows.map((t) =>
      [t.id, t.projectName, t.clientName, t.status, t.totalAmount, t.currency, t.wellType, t.createdAt?.toISOString()].join(","),
    );
    return [header, ...lines].join("\n");
  }

  async addTenderService(tenderService: InsertTenderService): Promise<TenderService> {
    const [created] = await getDb().insert(tenderServices).values(tenderService).returning();
    return created;
  }

  async removeTenderService(tenderId: number, serviceId: number): Promise<boolean> {
    const result = await getDb()
      .delete(tenderServices)
      .where(and(eq(tenderServices.tenderId, tenderId), eq(tenderServices.serviceId, serviceId)))
      .returning();
    return result.length > 0;
  }

  async getTenderServices(tenderId: number): Promise<TenderService[]> {
    return getDb().select().from(tenderServices).where(eq(tenderServices.tenderId, tenderId));
  }

  async getScenarios(tenderId: number): Promise<Scenario[]> {
    return getDb().select().from(scenarios).where(eq(scenarios.tenderId, tenderId));
  }

  async upsertScenario(scenario: InsertScenario): Promise<Scenario> {
    const existing = (await this.getScenarios(scenario.tenderId!)).find((s) => s.label === scenario.label);
    if (existing) {
      const [updated] = await getDb()
        .update(scenarios)
        .set(scenario)
        .where(eq(scenarios.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await getDb().insert(scenarios).values(scenario).returning();
    return created;
  }

  async getWellTimes(): Promise<WellTime[]> {
    return getDb().select().from(wellTimes);
  }

  async getWellTimesByService(serviceId: number): Promise<WellTime[]> {
    return getDb().select().from(wellTimes).where(eq(wellTimes.serviceId, serviceId));
  }

  async createWellTime(wellTime: InsertWellTime): Promise<WellTime> {
    const [created] = await getDb().insert(wellTimes).values(wellTime).returning();
    return created;
  }

  async updateWellTime(id: number, wellTime: Partial<InsertWellTime>): Promise<WellTime | undefined> {
    const [updated] = await getDb().update(wellTimes).set(wellTime).where(eq(wellTimes.id, id)).returning();
    return updated;
  }

  async deleteWellTime(id: number): Promise<boolean> {
    const result = await getDb().delete(wellTimes).where(eq(wellTimes.id, id)).returning();
    return result.length > 0;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allServices = await this.getServices();
    const allTenders = await this.getTenders();
    const activeTenders = allTenders.filter((t) => t.status === "draft" || t.status === "sent").length;
    const totalValue = allTenders.reduce((sum, tender) => sum + parseFloat(tender.totalAmount || "0"), 0);
    const completionRate = allTenders.length > 0
      ? Math.round((allTenders.filter((t) => t.status === "approved").length / allTenders.length) * 100)
      : 0;

    const serviceTrend = computeDashboardTrends(allServices);
    const tenderTrend = computeDashboardTrends(allTenders);

    return {
      totalServices: allServices.length,
      activeTenders,
      totalValue: `$${(totalValue / 1000000).toFixed(2)}M`,
      completionRate: `${completionRate}%`,
      servicesTrend: monthTrend(serviceTrend.current, serviceTrend.previous),
      tendersTrend: monthTrend(tenderTrend.current, tenderTrend.previous),
      valueTrend: monthTrend(
        allTenders.filter((t) => {
          if (!t.createdAt) return false;
          const d = new Date(t.createdAt);
          return d.getMonth() === new Date().getMonth();
        }).reduce((s, t) => s + parseFloat(t.totalAmount || "0"), 0),
        allTenders.filter((t) => {
          if (!t.createdAt) return false;
          const d = new Date(t.createdAt);
          const now = new Date();
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        }).reduce((s, t) => s + parseFloat(t.totalAmount || "0"), 0),
      ),
      completionTrend: monthTrend(
        allTenders.filter((t) => t.status === "approved" && t.createdAt && new Date(t.createdAt).getMonth() === new Date().getMonth()).length,
        allTenders.filter((t) => {
          if (!t.createdAt || t.status !== "approved") return false;
          const d = new Date(t.createdAt);
          const now = new Date();
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        }).length,
      ),
    };
  }

  async getRecentActivity(limit = 10): Promise<ActivityItem[]> {
    const db = getDb();
    const allTenders = await this.getTenders();
    const statusLogs = await db.select().from(tenderStatusLog).orderBy(desc(tenderStatusLog.changedAt));
    const allServices = await this.getServices();
    const items: ActivityItem[] = [];

    for (const tender of allTenders) {
      items.push({
        id: `tender-${tender.id}`,
        type: "tender",
        title: tender.projectName,
        description: `${tender.clientName} · ${tender.status}`,
        timestamp: tender.createdAt ?? new Date(),
        href: "/history",
        status: tender.status ?? undefined,
      });
    }

    for (const log of statusLogs) {
      const tender = allTenders.find((t) => t.id === log.tenderId);
      items.push({
        id: `status-${log.id}`,
        type: "status_change",
        title: tender?.projectName ?? `Tender #${log.tenderId}`,
        description: `${log.fromStatus ?? "new"} → ${log.toStatus}`,
        timestamp: log.changedAt ?? new Date(),
        href: "/history",
        status: log.toStatus,
      });
    }

    for (const service of allServices.slice(-20)) {
      if (service.createdAt) {
        items.push({
          id: `service-${service.id}`,
          type: "service",
          title: service.name,
          description: `Service catalog · ${service.segment}`,
          timestamp: service.createdAt,
          href: "/service-master",
        });
      }
    }

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async bulkCreateServices(servicesList: InsertService[]): Promise<BulkImportResult & { services: Service[] }> {
    const db = getDb();
    const createdServices: Service[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const service of servicesList) {
      try {
        const [row] = await db
          .insert(services)
          .values(service)
          .onConflictDoUpdate({
            target: [services.name, services.segment],
            set: {
              pricingType: service.pricingType,
              baseRate: service.baseRate,
              segmentMarkup: service.segmentMarkup,
              tpMarkup: service.tpMarkup,
              serviceType: service.serviceType,
              itemCode: service.itemCode,
              itemGroup: service.itemGroup,
              isActive: service.isActive ?? true,
            },
          })
          .returning();
        createdServices.push(row);
        const existing = await db
          .select()
          .from(services)
          .where(and(eq(services.name, service.name), eq(services.segment, service.segment)));
        if (existing.length > 1) updated++;
        else created++;
      } catch (e) {
        errors.push(`Failed ${service.name}: ${e}`);
        skipped++;
      }
    }

    return { success: true, created, updated, skipped, count: created + updated, errors, services: createdServices };
  }

  async bulkCreatePricingSchedules(schedules: InsertPricingSchedule[]): Promise<BulkImportResult & { schedules: PricingSchedule[] }> {
    const createdSchedules: PricingSchedule[] = [];
    let created = 0;
    const errors: string[] = [];
    for (const schedule of schedules) {
      try {
        const item = await this.createPricingSchedule(schedule);
        createdSchedules.push(item);
        created++;
      } catch (e) {
        errors.push(`Failed schedule: ${e}`);
      }
    }
    return { success: true, created, updated: 0, skipped: schedules.length - created, count: created, errors, schedules: createdSchedules };
  }

  async bulkCreateWellTimes(wellTimesList: InsertWellTime[]): Promise<BulkImportResult & { wellTimes: WellTime[] }> {
    const createdWellTimes: WellTime[] = [];
    let created = 0;
    const errors: string[] = [];
    for (const wt of wellTimesList) {
      try {
        const item = await this.createWellTime(wt);
        createdWellTimes.push(item);
        created++;
      } catch (e) {
        errors.push(`Failed well time: ${e}`);
      }
    }
    return { success: true, created, updated: 0, skipped: wellTimesList.length - created, count: created, errors, wellTimes: createdWellTimes };
  }
}

let storageInstance: IStorage | null = null;

export async function initStorage(): Promise<IStorage> {
  if (storageInstance) return storageInstance;

  if (process.env.DATABASE_URL) {
    try {
      const { pingDb } = await import("./db");
      const ok = await pingDb();
      if (ok) {
        storageInstance = new DatabaseStorage();
        console.log("Using DatabaseStorage (PostgreSQL)");
        return storageInstance;
      }
    } catch (err) {
      console.warn("Database unavailable, falling back to MemStorage:", err);
    }
  }

  storageInstance = new MemStorage();
  console.log("Using MemStorage (in-memory)");
  return storageInstance;
}

export let storage: IStorage = new MemStorage();

export function setStorage(instance: IStorage) {
  storage = instance;
  storageInstance = instance;
}
