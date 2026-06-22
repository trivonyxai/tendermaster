import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertServiceSchema, 
  insertTenderSchema, 
  insertTenderServiceSchema,
  insertPricingScheduleSchema,
  insertWellTimeSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Services endpoints
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/services/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      const services = await storage.searchServices(q);
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to search services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getServiceWithPricing(id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const serviceData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(serviceData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.put("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const serviceData = insertServiceSchema.partial().parse(req.body);
      const service = await storage.updateService(id, serviceData);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteService(id);
      if (!deleted) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  // Tenders endpoints
  app.get("/api/tenders", async (req, res) => {
    try {
      const tenders = await storage.getTenders();
      res.json(tenders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenders" });
    }
  });

  app.get("/api/tenders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tender = await storage.getTender(id);
      if (!tender) {
        return res.status(404).json({ error: "Tender not found" });
      }
      res.json(tender);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tender" });
    }
  });

  app.post("/api/tenders", async (req, res) => {
    try {
      const tenderData = insertTenderSchema.parse(req.body);
      const tender = await storage.createTender(tenderData);
      res.status(201).json(tender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid tender data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create tender" });
    }
  });

  app.put("/api/tenders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenderData = insertTenderSchema.partial().parse(req.body);
      const tender = await storage.updateTender(id, tenderData);
      if (!tender) {
        return res.status(404).json({ error: "Tender not found" });
      }
      res.json(tender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid tender data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update tender" });
    }
  });

  app.delete("/api/tenders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTender(id);
      if (!deleted) {
        return res.status(404).json({ error: "Tender not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tender" });
    }
  });

  // Tender Services endpoints
  app.post("/api/tenders/:id/services", async (req, res) => {
    try {
      const tenderId = parseInt(req.params.id);
      const serviceData = insertTenderServiceSchema.parse({
        ...req.body,
        tenderId,
      });
      const tenderService = await storage.addTenderService(serviceData);
      res.status(201).json(tenderService);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid tender service data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add tender service" });
    }
  });

  app.delete("/api/tenders/:tenderId/services/:serviceId", async (req, res) => {
    try {
      const tenderId = parseInt(req.params.tenderId);
      const serviceId = parseInt(req.params.serviceId);
      const deleted = await storage.removeTenderService(tenderId, serviceId);
      if (!deleted) {
        return res.status(404).json({ error: "Tender service not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove tender service" });
    }
  });

  // Dashboard endpoints
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // CSV Import endpoint
  app.post("/api/import/services", async (req, res) => {
    try {
      const { services } = req.body;
      if (!Array.isArray(services)) {
        return res.status(400).json({ error: "Services must be an array" });
      }
      
      const validServices = services.map(service => insertServiceSchema.parse(service));
      const createdServices = await storage.bulkCreateServices(validServices);
      res.status(201).json({ 
        success: true, 
        count: createdServices.length,
        services: createdServices 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to import services" });
    }
  });

  // Pricing Schedules endpoints
  app.get("/api/pricing-schedules", async (req, res) => {
    try {
      const schedules = await storage.getPricingSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pricing schedules" });
    }
  });

  app.post("/api/pricing-schedules", async (req, res) => {
    try {
      const scheduleData = insertPricingScheduleSchema.parse(req.body);
      const schedule = await storage.createPricingSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pricing schedule data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create pricing schedule" });
    }
  });

  app.put("/api/pricing-schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const scheduleData = insertPricingScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updatePricingSchedule(id, scheduleData);
      if (!schedule) {
        return res.status(404).json({ error: "Pricing schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pricing schedule data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update pricing schedule" });
    }
  });

  app.delete("/api/pricing-schedules/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePricingSchedule(id);
      if (!deleted) {
        return res.status(404).json({ error: "Pricing schedule not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete pricing schedule" });
    }
  });

  // Well Times endpoints
  app.get("/api/well-times", async (req, res) => {
    try {
      const times = await storage.getWellTimes();
      res.json(times);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch well times" });
    }
  });

  app.post("/api/well-times", async (req, res) => {
    try {
      const timeData = insertWellTimeSchema.parse(req.body);
      const time = await storage.createWellTime(timeData);
      res.status(201).json(time);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid well time data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create well time" });
    }
  });

  app.put("/api/well-times/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const timeData = insertWellTimeSchema.partial().parse(req.body);
      const time = await storage.updateWellTime(id, timeData);
      if (!time) {
        return res.status(404).json({ error: "Well time not found" });
      }
      res.json(time);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid well time data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update well time" });
    }
  });

  app.delete("/api/well-times/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWellTime(id);
      if (!deleted) {
        return res.status(404).json({ error: "Well time not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete well time" });
    }
  });

  // Bulk Import Pricing Schedules endpoint
  app.post("/api/import/pricing-schedules", async (req, res) => {
    try {
      const { schedules } = req.body;
      if (!Array.isArray(schedules)) {
        return res.status(400).json({ error: "Schedules must be an array" });
      }
      
      const validSchedules = schedules.map(s => insertPricingScheduleSchema.parse(s));
      const createdSchedules = await storage.bulkCreatePricingSchedules(validSchedules);
      res.status(201).json({ 
        success: true, 
        count: createdSchedules.length,
        schedules: createdSchedules 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pricing schedule data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to import pricing schedules" });
    }
  });

  // Bulk Import Well Times endpoint
  app.post("/api/import/well-times", async (req, res) => {
    try {
      const { wellTimes } = req.body;
      if (!Array.isArray(wellTimes)) {
        return res.status(400).json({ error: "Well times must be an array" });
      }
      
      const validWellTimes = wellTimes.map(w => insertWellTimeSchema.parse(w));
      const createdWellTimes = await storage.bulkCreateWellTimes(validWellTimes);
      res.status(201).json({ 
        success: true, 
        count: createdWellTimes.length,
        wellTimes: createdWellTimes 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid well time data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to import well times" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
