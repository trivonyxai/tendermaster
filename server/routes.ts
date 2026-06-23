import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import {
  insertServiceSchema,
  insertTenderSchema,
  insertTenderServiceSchema,
  insertPricingScheduleSchema,
  insertPricingScheduleWellClassSchema,
  insertWellTimeSchema,
  insertScenarioSchema,
  TENDER_STATUSES,
} from "@shared/schema";
import { z } from "zod";

const completeTenderSchema = z.object({
  tender: insertTenderSchema,
  services: z.array(insertTenderServiceSchema.omit({ tenderId: true })),
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth")) return next();
    return requireAuth(req, res, next);
  });

  app.get("/api/services", async (req, res) => {
    try {
      const segment = typeof req.query.segment === "string" ? req.query.segment : undefined;
      const servicesList = await storage.getServices(segment);
      res.json(servicesList);
    } catch {
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/services/search", async (req, res) => {
    try {
      const { q, segment } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      const segmentFilter = typeof segment === "string" ? segment : undefined;
      const results = await storage.searchServices(q, segmentFilter);
      res.json(results);
    } catch {
      res.status(500).json({ error: "Failed to search services" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const service = await storage.getServiceWithPricing(id);
      if (!service) return res.status(404).json({ error: "Service not found" });
      res.json(service);
    } catch {
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
      if (!service) return res.status(404).json({ error: "Service not found" });
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
      if (!deleted) return res.status(404).json({ error: "Service not found" });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete service" });
    }
  });

  app.get("/api/tenders", async (_req, res) => {
    try {
      const tendersList = await storage.getTenders();
      res.json(tendersList);
    } catch {
      res.status(500).json({ error: "Failed to fetch tenders" });
    }
  });

  app.get("/api/tenders/export", async (_req, res) => {
    try {
      const csv = await storage.exportTendersCsv();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="tenders-export.csv"');
      res.send(csv);
    } catch {
      res.status(500).json({ error: "Failed to export tenders" });
    }
  });

  app.get("/api/tenders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tender = await storage.getTender(id);
      if (!tender) return res.status(404).json({ error: "Tender not found" });
      res.json(tender);
    } catch {
      res.status(500).json({ error: "Failed to fetch tender" });
    }
  });

  app.get("/api/tenders/:id/summary", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const summary = await storage.getTenderSummary(id);
      if (!summary) return res.status(404).json({ error: "Tender not found" });
      res.json(summary);
    } catch {
      res.status(500).json({ error: "Failed to fetch tender summary" });
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

  app.post("/api/tenders/complete", async (req, res) => {
    try {
      const { tender, services: lineItems } = completeTenderSchema.parse(req.body);
      const created = await storage.createTenderComplete(tender, lineItems);
      res.status(201).json(created);
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
      if (!tender) return res.status(404).json({ error: "Tender not found" });
      res.json(tender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid tender data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update tender" });
    }
  });

  app.patch("/api/tenders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = z.object({ status: z.enum(TENDER_STATUSES) }).parse(req.body);
      const tender = await storage.updateTenderStatus(id, status);
      if (!tender) return res.status(404).json({ error: "Tender not found" });
      res.json(tender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid status", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update tender status" });
    }
  });

  app.delete("/api/tenders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTender(id);
      if (!deleted) return res.status(404).json({ error: "Tender not found" });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete tender" });
    }
  });

  app.post("/api/tenders/:id/services", async (req, res) => {
    try {
      const tenderId = parseInt(req.params.id);
      const serviceData = insertTenderServiceSchema.parse({ ...req.body, tenderId });
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
      if (!deleted) return res.status(404).json({ error: "Tender service not found" });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to remove tender service" });
    }
  });

  app.get("/api/tenders/:id/scenarios", async (req, res) => {
    try {
      const tenderId = parseInt(req.params.id);
      const list = await storage.getScenarios(tenderId);
      res.json(list);
    } catch {
      res.status(500).json({ error: "Failed to fetch scenarios" });
    }
  });

  app.post("/api/tenders/:id/scenarios", async (req, res) => {
    try {
      const tenderId = parseInt(req.params.id);
      const scenarioData = insertScenarioSchema.parse({ ...req.body, tenderId });
      const scenario = await storage.upsertScenario(scenarioData);
      res.status(201).json(scenario);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid scenario data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save scenario" });
    }
  });

  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/activity", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const activity = await storage.getRecentActivity(limit);
      res.json(activity);
    } catch {
      res.status(500).json({ error: "Failed to fetch dashboard activity" });
    }
  });

  app.post("/api/import/services", async (req, res) => {
    try {
      const { services: servicesList } = req.body;
      if (!Array.isArray(servicesList)) {
        return res.status(400).json({ error: "Services must be an array" });
      }
      const validServices = servicesList.map((service) => insertServiceSchema.parse(service));
      const result = await storage.bulkCreateServices(validServices);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid service data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to import services" });
    }
  });

  app.get("/api/pricing-schedules", async (_req, res) => {
    try {
      const schedules = await storage.getPricingSchedules();
      res.json(schedules);
    } catch {
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
      if (!schedule) return res.status(404).json({ error: "Pricing schedule not found" });
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
      if (!deleted) return res.status(404).json({ error: "Pricing schedule not found" });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete pricing schedule" });
    }
  });

  app.get("/api/pricing-matrix", async (req, res) => {
    try {
      const serviceIdsParam = typeof req.query.serviceIds === "string" ? req.query.serviceIds : undefined;
      const serviceIds = serviceIdsParam
        ? serviceIdsParam.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
        : undefined;
      const matrix = await storage.getPricingMatrix(serviceIds);
      res.json(matrix);
    } catch {
      res.status(500).json({ error: "Failed to fetch pricing matrix" });
    }
  });

  app.get("/api/pricing-schedule-well-classes", async (req, res) => {
    try {
      const scheduleId = req.query.scheduleId ? parseInt(String(req.query.scheduleId)) : undefined;
      const rows = await storage.getPricingScheduleWellClasses(scheduleId);
      res.json(rows);
    } catch {
      res.status(500).json({ error: "Failed to fetch well class rows" });
    }
  });

  app.post("/api/pricing-schedules/:id/well-classes", async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id);
      const rowData = insertPricingScheduleWellClassSchema.parse({ ...req.body, scheduleId });
      const row = await storage.createPricingScheduleWellClass(rowData);
      res.status(201).json(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid well class data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create well class row" });
    }
  });

  app.put("/api/pricing-schedule-well-classes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rowData = insertPricingScheduleWellClassSchema.partial().parse(req.body);
      const row = await storage.updatePricingScheduleWellClass(id, rowData);
      if (!row) return res.status(404).json({ error: "Well class row not found" });
      res.json(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid well class data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update well class row" });
    }
  });

  app.delete("/api/pricing-schedule-well-classes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePricingScheduleWellClass(id);
      if (!deleted) return res.status(404).json({ error: "Well class row not found" });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete well class row" });
    }
  });

  app.get("/api/well-times", async (_req, res) => {
    try {
      const times = await storage.getWellTimes();
      res.json(times);
    } catch {
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
      if (!time) return res.status(404).json({ error: "Well time not found" });
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
      if (!deleted) return res.status(404).json({ error: "Well time not found" });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete well time" });
    }
  });

  app.post("/api/import/pricing-schedules", async (req, res) => {
    try {
      const { schedules } = req.body;
      if (!Array.isArray(schedules)) {
        return res.status(400).json({ error: "Schedules must be an array" });
      }
      const validSchedules = schedules.map((s) => insertPricingScheduleSchema.parse(s));
      const result = await storage.bulkCreatePricingSchedules(validSchedules);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid pricing schedule data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to import pricing schedules" });
    }
  });

  app.post("/api/import/well-times", async (req, res) => {
    try {
      const { wellTimes: wellTimesList } = req.body;
      if (!Array.isArray(wellTimesList)) {
        return res.status(400).json({ error: "Well times must be an array" });
      }
      const validWellTimes = wellTimesList.map((w) => insertWellTimeSchema.parse(w));
      const result = await storage.bulkCreateWellTimes(validWellTimes);
      res.status(201).json(result);
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
