import { 
  services, 
  pricingSchedules, 
  tenders, 
  tenderServices, 
  wellTimes,
  type Service, 
  type InsertService,
  type PricingSchedule,
  type InsertPricingSchedule,
  type Tender,
  type InsertTender,
  type TenderService,
  type InsertTenderService,
  type WellTime,
  type InsertWellTime,
  type ServiceWithPricing,
  type TenderWithServices,
  type DashboardStats
} from "@shared/schema";

export interface IStorage {
  // Services
  getServices(): Promise<Service[]>;
  getService(id: number): Promise<Service | undefined>;
  getServiceWithPricing(id: number): Promise<ServiceWithPricing | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  searchServices(query: string): Promise<Service[]>;

  // Pricing Schedules
  getPricingSchedules(): Promise<PricingSchedule[]>;
  getPricingSchedulesByService(serviceId: number): Promise<PricingSchedule[]>;
  createPricingSchedule(schedule: InsertPricingSchedule): Promise<PricingSchedule>;
  updatePricingSchedule(id: number, schedule: Partial<InsertPricingSchedule>): Promise<PricingSchedule | undefined>;
  deletePricingSchedule(id: number): Promise<boolean>;

  // Tenders
  getTenders(): Promise<Tender[]>;
  getTender(id: number): Promise<TenderWithServices | undefined>;
  createTender(tender: InsertTender): Promise<Tender>;
  updateTender(id: number, tender: Partial<InsertTender>): Promise<Tender | undefined>;
  deleteTender(id: number): Promise<boolean>;

  // Tender Services
  addTenderService(tenderService: InsertTenderService): Promise<TenderService>;
  removeTenderService(tenderId: number, serviceId: number): Promise<boolean>;
  getTenderServices(tenderId: number): Promise<TenderService[]>;

  // Well Times
  getWellTimes(): Promise<WellTime[]>;
  getWellTimesByService(serviceId: number): Promise<WellTime[]>;
  createWellTime(wellTime: InsertWellTime): Promise<WellTime>;
  updateWellTime(id: number, wellTime: Partial<InsertWellTime>): Promise<WellTime | undefined>;
  deleteWellTime(id: number): Promise<boolean>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Bulk operations
  bulkCreateServices(services: InsertService[]): Promise<Service[]>;
  bulkCreatePricingSchedules(schedules: InsertPricingSchedule[]): Promise<PricingSchedule[]>;
  bulkCreateWellTimes(wellTimes: InsertWellTime[]): Promise<WellTime[]>;
}

export class MemStorage implements IStorage {
  private services: Map<number, Service>;
  private pricingSchedules: Map<number, PricingSchedule>;
  private tenders: Map<number, Tender>;
  private tenderServices: Map<number, TenderService>;
  private wellTimes: Map<number, WellTime>;
  private currentId: number;

  constructor() {
    this.services = new Map();
    this.pricingSchedules = new Map();
    this.tenders = new Map();
    this.tenderServices = new Map();
    this.wellTimes = new Map();
    this.currentId = 1;
    this.seedData();
  }

  private seedData() {
    // Seed with all 66 services from the CSV data
    const sampleServices = [
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

    sampleServices.forEach(service => {
      const id = this.currentId++;
      this.services.set(id, {
        id,
        ...service,
        createdAt: new Date(),
      });
    });

    // Seed default pricing schedules corresponding to the sample tender
    const defaultPricing = [
      // Mishrif Vertical Well (MV.1 to MV.9)
      { serviceId: 1, wellType: "MISHRIF VERTICAL", duration: 24, unitPrice: "585046.48" },
      { serviceId: 2, wellType: "MISHRIF VERTICAL", duration: 0, unitPrice: "669.09" },
      { serviceId: 3, wellType: "MISHRIF VERTICAL", duration: 0, unitPrice: "262.78" },
      { serviceId: 4, wellType: "MISHRIF VERTICAL", duration: 0, unitPrice: "413.06" },
      { serviceId: 5, wellType: "MISHRIF VERTICAL", duration: 0, unitPrice: "872.08" },
      { serviceId: 7, wellType: "MISHRIF VERTICAL", duration: 0, unitPrice: "6497.27" },
      { serviceId: 8, wellType: "MISHRIF VERTICAL", duration: 3, unitPrice: "59098.52" },
      { serviceId: 9, wellType: "MISHRIF VERTICAL", duration: 0, unitPrice: "13500.00" },

      // Mishrif Deviated Well (MD.1 to MD.9)
      { serviceId: 10, wellType: "MISHRIF DEVIATED", duration: 26, unitPrice: "618616.07" },
      { serviceId: 11, wellType: "MISHRIF DEVIATED", duration: 0, unitPrice: "669.09" },
      { serviceId: 12, wellType: "MISHRIF DEVIATED", duration: 0, unitPrice: "262.78" },
      { serviceId: 13, wellType: "MISHRIF DEVIATED", duration: 0, unitPrice: "483.06" },
      { serviceId: 14, wellType: "MISHRIF DEVIATED", duration: 0, unitPrice: "680.77" },
      { serviceId: 16, wellType: "MISHRIF DEVIATED", duration: 0, unitPrice: "6497.27" },
      { serviceId: 17, wellType: "MISHRIF DEVIATED", duration: 3, unitPrice: "54174.79" },
      { serviceId: 18, wellType: "MISHRIF DEVIATED", duration: 0, unitPrice: "13500.00" }
    ];

    defaultPricing.forEach(ps => {
      const id = this.currentId++;
      this.pricingSchedules.set(id, {
        id,
        serviceId: ps.serviceId,
        wellType: ps.wellType,
        duration: ps.duration,
        unitPrice: ps.unitPrice,
        currency: "USD",
        createdAt: new Date()
      });
    });

    // Seed default well times corresponding to the well times per section CSV
    const defaultWellTimes = [
      // MV
      { serviceId: 1, section: "Well Site Services", estimatedTime: 584, contingencyTime: 0 },
      { serviceId: 2, section: "32\" drilling phase with preinstalled Conductor Pipe", estimatedTime: 0, contingencyTime: 0 },
      { serviceId: 3, section: "23\" drilling phase", estimatedTime: 4, contingencyTime: 0 },
      { serviceId: 4, section: "17 1/2\" drilling phase", estimatedTime: 12, contingencyTime: 0 },
      { serviceId: 5, section: "12 1/4\" drilling phase", estimatedTime: 8, contingencyTime: 0 },
      { serviceId: 7, section: "Running of kill string", estimatedTime: 10, contingencyTime: 0 },
      { serviceId: 8, section: "Running of completion string", estimatedTime: 76, contingencyTime: 0 },
      { serviceId: 9, section: "Wellhead and X-mas Tree installation service", estimatedTime: 0, contingencyTime: 0 },
      
      // MD
      { serviceId: 10, section: "Well Site Services", estimatedTime: 644, contingencyTime: 0 },
      { serviceId: 11, section: "32\" drilling phase with preinstalled Conductor Pipe", estimatedTime: 0, contingencyTime: 0 },
      { serviceId: 12, section: "23\" drilling phase", estimatedTime: 4, contingencyTime: 0 },
      { serviceId: 13, section: "17 1/2\" drilling phase", estimatedTime: 13, contingencyTime: 0 },
      { serviceId: 14, section: "12 1/4\" drilling phase", estimatedTime: 9, contingencyTime: 0 },
      { serviceId: 16, section: "Running of kill string", estimatedTime: 10, contingencyTime: 0 },
      { serviceId: 17, section: "Running of completion string", estimatedTime: 78, contingencyTime: 0 },
      { serviceId: 18, section: "Wellhead and X-mas Tree installation service", estimatedTime: 0, contingencyTime: 0 }
    ];

    defaultWellTimes.forEach(wt => {
      const id = this.currentId++;
      this.wellTimes.set(id, {
        id,
        serviceId: wt.serviceId,
        section: wt.section,
        estimatedTime: wt.estimatedTime,
        contingencyTime: wt.contingencyTime
      });
    });
  }

  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getServiceWithPricing(id: number): Promise<ServiceWithPricing | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;

    const pricingSchedules = Array.from(this.pricingSchedules.values())
      .filter(ps => ps.serviceId === id);
    const wellTimes = Array.from(this.wellTimes.values())
      .filter(wt => wt.serviceId === id);

    return {
      ...service,
      pricingSchedules,
      wellTimes,
    };
  }

  async createService(service: InsertService): Promise<Service> {
    const id = this.currentId++;
    const newService: Service = {
      id,
      name: service.name,
      segment: service.segment,
      pricingType: service.pricingType,
      baseRate: service.baseRate !== undefined && service.baseRate !== null ? String(parseFloat(String(service.baseRate)).toFixed(2)) : null,
      isActive: service.isActive ?? true,
      createdAt: new Date(),
    };
    this.services.set(id, newService);
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const existing = this.services.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...service,
      baseRate: service.baseRate !== undefined ? (service.baseRate !== null ? String(parseFloat(String(service.baseRate)).toFixed(2)) : null) : existing.baseRate,
    };
    this.services.set(id, updated);
    return updated;
  }

  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }

  async searchServices(query: string): Promise<Service[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.services.values()).filter(service =>
      service.name.toLowerCase().includes(lowerQuery) ||
      service.segment.toLowerCase().includes(lowerQuery)
    );
  }

  async getPricingSchedules(): Promise<PricingSchedule[]> {
    return Array.from(this.pricingSchedules.values());
  }

  async getPricingSchedulesByService(serviceId: number): Promise<PricingSchedule[]> {
    return Array.from(this.pricingSchedules.values()).filter(ps => ps.serviceId === serviceId);
  }

  async createPricingSchedule(schedule: InsertPricingSchedule): Promise<PricingSchedule> {
    const id = this.currentId++;
    const newSchedule: PricingSchedule = {
      id,
      serviceId: schedule.serviceId ?? null,
      wellType: schedule.wellType ?? null,
      duration: schedule.duration ?? null,
      unitPrice: schedule.unitPrice !== undefined && schedule.unitPrice !== null ? String(parseFloat(String(schedule.unitPrice)).toFixed(2)) : null,
      currency: schedule.currency ?? null,
      createdAt: new Date(),
    };
    this.pricingSchedules.set(id, newSchedule);
    return newSchedule;
  }

  async updatePricingSchedule(id: number, schedule: Partial<InsertPricingSchedule>): Promise<PricingSchedule | undefined> {
    const existing = this.pricingSchedules.get(id);
    if (!existing) return undefined;

    const updated: PricingSchedule = {
      ...existing,
      serviceId: schedule.serviceId !== undefined ? (schedule.serviceId ?? null) : existing.serviceId,
      wellType: schedule.wellType !== undefined ? (schedule.wellType ?? null) : existing.wellType,
      duration: schedule.duration !== undefined ? (schedule.duration ?? null) : existing.duration,
      unitPrice: schedule.unitPrice !== undefined ? (schedule.unitPrice !== null ? String(parseFloat(String(schedule.unitPrice)).toFixed(2)) : null) : existing.unitPrice,
      currency: schedule.currency !== undefined ? (schedule.currency ?? null) : existing.currency,
    };
    this.pricingSchedules.set(id, updated);
    return updated;
  }

  async deletePricingSchedule(id: number): Promise<boolean> {
    return this.pricingSchedules.delete(id);
  }

  async getTenders(): Promise<Tender[]> {
    return Array.from(this.tenders.values());
  }

  async getTender(id: number): Promise<TenderWithServices | undefined> {
    const tender = this.tenders.get(id);
    if (!tender) return undefined;

    const tenderServices = Array.from(this.tenderServices.values())
      .filter(ts => ts.tenderId === id);

    const services = tenderServices.map(ts => ({
      ...ts,
      service: this.services.get(ts.serviceId!)!,
    }));

    return {
      ...tender,
      services,
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
      duration: tender.duration,
      startDate: tender.startDate !== undefined ? (tender.startDate !== null ? new Date(tender.startDate) : null) : null,
      subtotal: tender.subtotal !== undefined && tender.subtotal !== null ? String(parseFloat(String(tender.subtotal)).toFixed(2)) : null,
      taxRate: tender.taxRate !== undefined && tender.taxRate !== null ? String(parseFloat(String(tender.taxRate)).toFixed(2)) : "8.50",
      contingencyRate: tender.contingencyRate !== undefined && tender.contingencyRate !== null ? String(parseFloat(String(tender.contingencyRate)).toFixed(2)) : "10.00",
      totalAmount: tender.totalAmount !== undefined && tender.totalAmount !== null ? String(parseFloat(String(tender.totalAmount)).toFixed(2)) : null,
      currency: tender.currency ?? null,
      status: tender.status ?? null,
      createdAt: new Date(),
    };
    this.tenders.set(id, newTender);
    return newTender;
  }

  async updateTender(id: number, tender: Partial<InsertTender>): Promise<Tender | undefined> {
    const existing = this.tenders.get(id);
    if (!existing) return undefined;

    const updated: Tender = { 
      ...existing,
      projectName: tender.projectName ?? existing.projectName,
      clientName: tender.clientName ?? existing.clientName,
      clientEmail: tender.clientEmail !== undefined ? (tender.clientEmail ?? null) : existing.clientEmail,
      clientPhone: tender.clientPhone !== undefined ? (tender.clientPhone ?? null) : existing.clientPhone,
      projectLocation: tender.projectLocation !== undefined ? (tender.projectLocation ?? null) : existing.projectLocation,
      duration: tender.duration ?? existing.duration,
      startDate: tender.startDate !== undefined ? (tender.startDate !== null ? new Date(tender.startDate) : null) : existing.startDate,
      subtotal: tender.subtotal !== undefined ? (tender.subtotal !== null ? String(parseFloat(String(tender.subtotal)).toFixed(2)) : null) : existing.subtotal,
      taxRate: tender.taxRate !== undefined ? (tender.taxRate !== null ? String(parseFloat(String(tender.taxRate)).toFixed(2)) : null) : existing.taxRate,
      contingencyRate: tender.contingencyRate !== undefined ? (tender.contingencyRate !== null ? String(parseFloat(String(tender.contingencyRate)).toFixed(2)) : null) : existing.contingencyRate,
      totalAmount: tender.totalAmount !== undefined ? (tender.totalAmount !== null ? String(parseFloat(String(tender.totalAmount)).toFixed(2)) : null) : existing.totalAmount,
      currency: tender.currency !== undefined ? (tender.currency ?? null) : existing.currency,
      status: tender.status !== undefined ? (tender.status ?? null) : existing.status,
    };
    this.tenders.set(id, updated);
    return updated;
  }

  async deleteTender(id: number): Promise<boolean> {
    return this.tenders.delete(id);
  }

  async addTenderService(tenderService: InsertTenderService): Promise<TenderService> {
    const id = this.currentId++;
    const newTenderService: TenderService = {
      id,
      tenderId: tenderService.tenderId ?? null,
      serviceId: tenderService.serviceId ?? null,
      quantity: tenderService.quantity,
      unitPrice: tenderService.unitPrice !== undefined && tenderService.unitPrice !== null ? String(parseFloat(String(tenderService.unitPrice)).toFixed(2)) : null,
      totalPrice: tenderService.totalPrice !== undefined && tenderService.totalPrice !== null ? String(parseFloat(String(tenderService.totalPrice)).toFixed(2)) : null,
    };
    this.tenderServices.set(id, newTenderService);
    return newTenderService;
  }

  async removeTenderService(tenderId: number, serviceId: number): Promise<boolean> {
    const tenderService = Array.from(this.tenderServices.values())
      .find(ts => ts.tenderId === tenderId && ts.serviceId === serviceId);
    
    if (!tenderService) return false;
    return this.tenderServices.delete(tenderService.id);
  }

  async getTenderServices(tenderId: number): Promise<TenderService[]> {
    return Array.from(this.tenderServices.values()).filter(ts => ts.tenderId === tenderId);
  }

  async getWellTimes(): Promise<WellTime[]> {
    return Array.from(this.wellTimes.values());
  }

  async getWellTimesByService(serviceId: number): Promise<WellTime[]> {
    return Array.from(this.wellTimes.values()).filter(wt => wt.serviceId === serviceId);
  }

  async createWellTime(wellTime: InsertWellTime): Promise<WellTime> {
    const id = this.currentId++;
    const newWellTime: WellTime = {
      id,
      serviceId: wellTime.serviceId ?? null,
      section: wellTime.section,
      estimatedTime: wellTime.estimatedTime ?? null,
      contingencyTime: wellTime.contingencyTime ?? null,
    };
    this.wellTimes.set(id, newWellTime);
    return newWellTime;
  }

  async updateWellTime(id: number, wellTime: Partial<InsertWellTime>): Promise<WellTime | undefined> {
    const existing = this.wellTimes.get(id);
    if (!existing) return undefined;

    const updated: WellTime = {
      ...existing,
      serviceId: wellTime.serviceId !== undefined ? (wellTime.serviceId ?? null) : existing.serviceId,
      section: wellTime.section ?? existing.section,
      estimatedTime: wellTime.estimatedTime !== undefined ? (wellTime.estimatedTime ?? null) : existing.estimatedTime,
      contingencyTime: wellTime.contingencyTime !== undefined ? (wellTime.contingencyTime ?? null) : existing.contingencyTime,
    };
    this.wellTimes.set(id, updated);
    return updated;
  }

  async deleteWellTime(id: number): Promise<boolean> {
    return this.wellTimes.delete(id);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const totalServices = this.services.size;
    const activeTenders = Array.from(this.tenders.values()).filter(t => t.status === 'draft' || t.status === 'sent').length;
    
    const totalValue = Array.from(this.tenders.values())
      .reduce((sum, tender) => sum + parseFloat(tender.totalAmount || "0"), 0);

    const completionRate = this.tenders.size > 0 
      ? Math.round((Array.from(this.tenders.values()).filter(t => t.status === 'approved').length / this.tenders.size) * 100)
      : 0;

    return {
      totalServices,
      activeTenders,
      totalValue: `$${(totalValue / 1000000).toFixed(2)}M`,
      completionRate: `${completionRate}%`,
    };
  }

  async bulkCreateServices(servicesList: InsertService[]): Promise<Service[]> {
    const createdServices: Service[] = [];
    for (const service of servicesList) {
      const created = await this.createService(service);
      createdServices.push(created);
    }
    return createdServices;
  }

  async bulkCreatePricingSchedules(schedules: InsertPricingSchedule[]): Promise<PricingSchedule[]> {
    const createdSchedules: PricingSchedule[] = [];
    for (const schedule of schedules) {
      const created = await this.createPricingSchedule(schedule);
      createdSchedules.push(created);
    }
    return createdSchedules;
  }

  async bulkCreateWellTimes(wellTimesList: InsertWellTime[]): Promise<WellTime[]> {
    const createdWellTimes: WellTime[] = [];
    for (const wt of wellTimesList) {
      const created = await this.createWellTime(wt);
      createdWellTimes.push(created);
    }
    return createdWellTimes;
  }
}

export const storage = new MemStorage();
