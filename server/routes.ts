import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertServiceSchema, insertTenderSchema, insertTenderServiceSchema } from "@shared/schema";
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

  const httpServer = createServer(app);
  return httpServer;
}
