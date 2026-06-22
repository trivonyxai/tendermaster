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

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // Bulk operations
  bulkCreateServices(services: InsertService[]): Promise<Service[]>;
  bulkCreatePricingSchedules(schedules: InsertPricingSchedule[]): Promise<PricingSchedule[]>;
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
    // Seed with sample services from the CSV data
    const sampleServices = [
      { name: "Project Management", segment: "BL-IWC-PMG", pricingType: "Per Day", baseRate: "1200", isActive: true },
      { name: "1000 HP Drilling Rig", segment: "BL-WCE-RIG", pricingType: "Per Day", baseRate: "5500", isActive: true },
      { name: "1500 HP Drilling Rig", segment: "BL-WCE-RIG", pricingType: "Per Day", baseRate: "7200", isActive: true },
      { name: "2000 HP Drilling Rig", segment: "BL-WCE-RIG", pricingType: "Per Day", baseRate: "9800", isActive: true },
      { name: "Cementing Products", segment: "BL-WCF-CEM", pricingType: "Per Job", baseRate: "12500", isActive: true },
      { name: "Cementing Services", segment: "BL-WCF-CEM", pricingType: "Per Job", baseRate: "8750", isActive: true },
      { name: "MWD Services", segment: "BL-WCM-DM", pricingType: "Per Day", baseRate: "2800", isActive: true },
    ];

    sampleServices.forEach(service => {
      const id = this.currentId++;
      this.services.set(id, {
        id,
        ...service,
        createdAt: new Date(),
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
      ...service,
      createdAt: new Date(),
    };
    this.services.set(id, newService);
    return newService;
  }

  async updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined> {
    const existing = this.services.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...service };
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
      ...schedule,
      createdAt: new Date(),
    };
    this.pricingSchedules.set(id, newSchedule);
    return newSchedule;
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
      ...tender,
      createdAt: new Date(),
    };
    this.tenders.set(id, newTender);
    return newTender;
  }

  async updateTender(id: number, tender: Partial<InsertTender>): Promise<Tender | undefined> {
    const existing = this.tenders.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...tender };
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
      ...tenderService,
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
      ...wellTime,
    };
    this.wellTimes.set(id, newWellTime);
    return newWellTime;
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
      totalValue: `$${(totalValue / 1000000).toFixed(1)}M`,
      completionRate: `${completionRate}%`,
    };
  }

  async bulkCreateServices(services: InsertService[]): Promise<Service[]> {
    const createdServices: Service[] = [];
    for (const service of services) {
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
}

export const storage = new MemStorage();
