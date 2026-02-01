import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { normalizePlate, displayPlate } from "./lib/plate-utils";
import { requireRole, ensureUserRole } from "./lib/roles";
import { savePhoto } from "./lib/photo-storage";
import { authenticateWithCredentials, seedUsers, generateJobToken } from "./lib/credentials-auth";
import { z } from "zod";
import { WASH_STATUS_ORDER, COUNTRY_HINTS } from "@shared/schema";

// SSE clients for real-time updates
const sseClients: Set<any> = new Set();
const customerSseClients: Set<{ res: any; washJobId: string }> = new Set();

function broadcastEvent(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    client.write(message);
  });
  
  // Also notify customer clients watching specific jobs
  if (data.job?.id || data.washJobId) {
    const jobId = data.job?.id || data.washJobId;
    customerSseClients.forEach(client => {
      if (client.washJobId === jobId) {
        client.res.write(message);
      }
    });
  }
}

// Validation schemas
const createWashJobSchema = z.object({
  plateDisplay: z.string().min(1, "Plate is required"),
  countryHint: z.enum(COUNTRY_HINTS).optional().default("OTHER"),
  photo: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(WASH_STATUS_ORDER),
});

const parkingSchema = z.object({
  plateDisplay: z.string().min(1, "Plate is required"),
  countryHint: z.enum(COUNTRY_HINTS).optional().default("OTHER"),
  photo: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // Seed credentials users from env vars
  await seedUsers();

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Credentials login endpoint
  const credentialsLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.post("/api/auth/credentials/login", async (req: any, res) => {
    try {
      const result = credentialsLoginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid email or password format" });
      }

      const { email, password } = result.data;
      const authResult = await authenticateWithCredentials(email, password);

      if (!authResult.success || !authResult.user) {
        return res.status(401).json({ message: authResult.error || "Authentication failed" });
      }

      const user = authResult.user;
      
      // Set up passport session for credentials user
      req.login({
        claims: { sub: user.id },
        authType: "credentials",
        role: user.role,
        email: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      }, (err: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ 
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            role: user.role,
          }
        });
      });
    } catch (error) {
      console.error("Credentials login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Middleware to ensure user has a role assigned after auth
  app.use("/api", async (req: any, res, next) => {
    // For credentials auth, role is already in session
    if (req.user?.authType === "credentials") {
      return next();
    }
    // For Replit auth, ensure role in userRoles table
    if (req.user?.claims?.sub) {
      await ensureUserRole(req.user.claims.sub);
    }
    next();
  });

  // Get current user with role
  app.get("/api/user/role", isAuthenticated, async (req: any, res) => {
    try {
      // For credentials auth, role is in session
      if (req.user?.authType === "credentials") {
        return res.json({ role: req.user.role || "technician" });
      }
      // For Replit auth, get from userRoles table
      const userId = req.user?.claims?.sub;
      const userRole = await storage.getUserRole(userId);
      res.json({ role: userRole?.role || "technician" });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ message: "Failed to fetch role" });
    }
  });

  // SSE endpoint for real-time updates
  app.get("/api/stream", isAuthenticated, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sseClients.add(res);
    
    req.on("close", () => {
      sseClients.delete(res);
    });

    // Send initial ping
    res.write("data: {\"type\":\"connected\"}\n\n");
  });

  // =====================
  // WASH JOBS
  // =====================

  // Create wash job
  app.post("/api/wash-jobs", isAuthenticated, async (req: any, res) => {
    try {
      const result = createWashJobSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const { plateDisplay, countryHint, photo } = result.data;
      const userId = req.user?.claims?.sub;

      // Save photo if provided
      let photoUrl: string | undefined;
      if (photo) {
        try {
          const saved = await savePhoto(photo);
          photoUrl = saved.url;
        } catch (err) {
          console.error("Photo save error:", err);
        }
      }

      const job = await storage.createWashJob({
        plateDisplay: displayPlate(plateDisplay),
        plateNormalized: normalizePlate(plateDisplay),
        countryHint,
        technicianId: userId,
        status: "received",
        startAt: new Date(),
      });

      // Save initial photo if provided
      if (photoUrl) {
        await storage.addWashPhoto({
          washJobId: job.id,
          url: photoUrl,
          statusAtTime: "received",
        });
      }

      // Log event
      await storage.logEvent({
        type: "wash_created",
        plateDisplay: job.plateDisplay,
        plateNormalized: job.plateNormalized,
        countryHint: job.countryHint,
        washJobId: job.id,
        userId,
        payloadJson: { hasPhoto: !!photoUrl },
      });

      // Broadcast to SSE clients
      broadcastEvent({ type: "wash_created", job });

      res.json(job);
    } catch (error) {
      console.error("Error creating wash job:", error);
      res.status(500).json({ message: "Failed to create wash job" });
    }
  });

  // Get wash jobs
  app.get("/api/wash-jobs", isAuthenticated, async (req: any, res) => {
    try {
      const { status, my } = req.query;
      const userId = req.user?.claims?.sub;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (my === "true" || my === "") filters.technicianId = userId;

      const jobs = await storage.getWashJobs(filters);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching wash jobs:", error);
      res.status(500).json({ message: "Failed to fetch wash jobs" });
    }
  });

  // Get single wash job
  app.get("/api/wash-jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.getWashJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching wash job:", error);
      res.status(500).json({ message: "Failed to fetch wash job" });
    }
  });

  // Update wash job status
  app.patch("/api/wash-jobs/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const result = updateStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const { status } = result.data;
      const userId = req.user?.claims?.sub;

      let job;
      if (status === "complete") {
        job = await storage.completeWashJob(req.params.id);
      } else {
        job = await storage.updateWashJobStatus(req.params.id, status);
      }

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Log event
      await storage.logEvent({
        type: "wash_status_update",
        plateDisplay: job.plateDisplay,
        plateNormalized: job.plateNormalized,
        countryHint: job.countryHint,
        washJobId: job.id,
        userId,
        payloadJson: { status },
      });

      // Broadcast update
      broadcastEvent({ type: "wash_status_update", job });

      res.json(job);
    } catch (error) {
      console.error("Error updating wash job status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Add photo to wash job
  app.post("/api/wash-jobs/:id/photos", isAuthenticated, async (req: any, res) => {
    try {
      const { photo } = req.body;
      if (!photo) {
        return res.status(400).json({ message: "Photo is required" });
      }

      const job = await storage.getWashJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const saved = await savePhoto(photo);
      const washPhoto = await storage.addWashPhoto({
        washJobId: job.id,
        url: saved.url,
        statusAtTime: job.status as any,
      });

      // Log event
      await storage.logEvent({
        type: "wash_photo",
        plateDisplay: job.plateDisplay,
        plateNormalized: job.plateNormalized,
        countryHint: job.countryHint,
        washJobId: job.id,
        userId: req.user?.claims?.sub,
        payloadJson: { photoUrl: saved.url },
      });

      res.json(washPhoto);
    } catch (error) {
      console.error("Error adding wash photo:", error);
      res.status(500).json({ message: "Failed to add photo" });
    }
  });

  // =====================
  // PARKING
  // =====================

  // Parking entry
  app.post("/api/parking/entry", isAuthenticated, async (req: any, res) => {
    try {
      const result = parkingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const { plateDisplay, countryHint, photo } = result.data;
      const userId = req.user?.claims?.sub;
      const normalized = normalizePlate(plateDisplay);
      
      // Check for existing open session
      const existing = await storage.findOpenParkingSession(normalized);
      if (existing) {
        return res.status(409).json({ 
          message: "Vehicle already has an open parking session",
          existingSession: existing
        });
      }

      // Save photo if provided
      let entryPhotoUrl: string | null = null;
      if (photo) {
        try {
          const saved = await savePhoto(photo);
          entryPhotoUrl = saved.url;
        } catch (err) {
          console.error("Photo save error:", err);
        }
      }

      const session = await storage.createParkingEntry({
        plateDisplay: displayPlate(plateDisplay),
        plateNormalized: normalized,
        countryHint,
        technicianId: userId,
        entryAt: new Date(),
        entryPhotoUrl,
      });

      // Log event
      await storage.logEvent({
        type: "parking_entry",
        plateDisplay: session.plateDisplay,
        plateNormalized: session.plateNormalized,
        countryHint: session.countryHint,
        parkingSessionId: session.id,
        userId,
        payloadJson: { hasPhoto: !!entryPhotoUrl },
      });

      broadcastEvent({ type: "parking_entry", session });

      res.json(session);
    } catch (error) {
      console.error("Error creating parking entry:", error);
      res.status(500).json({ message: "Failed to create parking entry" });
    }
  });

  // Parking exit
  app.post("/api/parking/exit", isAuthenticated, async (req: any, res) => {
    try {
      const result = parkingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const { plateDisplay, photo } = result.data;
      const userId = req.user?.claims?.sub;
      const normalized = normalizePlate(plateDisplay);
      
      // Find open session
      const session = await storage.findOpenParkingSession(normalized);
      if (!session) {
        return res.status(404).json({ 
          message: "No open parking session found for this plate"
        });
      }

      // Save exit photo if provided
      let exitPhotoUrl: string | undefined;
      if (photo) {
        try {
          const saved = await savePhoto(photo);
          exitPhotoUrl = saved.url;
        } catch (err) {
          console.error("Photo save error:", err);
        }
      }

      const closedSession = await storage.closeParkingSession(session.id, exitPhotoUrl);

      // Log event
      await storage.logEvent({
        type: "parking_exit",
        plateDisplay: session.plateDisplay,
        plateNormalized: session.plateNormalized,
        countryHint: session.countryHint,
        parkingSessionId: session.id,
        userId,
        payloadJson: { hasPhoto: !!exitPhotoUrl },
      });

      broadcastEvent({ type: "parking_exit", session: closedSession });

      res.json(closedSession);
    } catch (error) {
      console.error("Error processing parking exit:", error);
      res.status(500).json({ message: "Failed to process parking exit" });
    }
  });

  // Get parking sessions
  app.get("/api/parking/sessions", isAuthenticated, async (req, res) => {
    try {
      const { open } = req.query;
      const filters: any = {};
      if (open === "true") filters.open = true;
      if (open === "false") filters.open = false;

      const sessions = await storage.getParkingSessions(filters);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching parking sessions:", error);
      res.status(500).json({ message: "Failed to fetch parking sessions" });
    }
  });

  // =====================
  // MANAGER ENDPOINTS (require manager/admin role)
  // =====================

  // Events / Audit Log
  app.get("/api/events", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { plate, type, limit } = req.query;
      const events = await storage.getEvents({
        plate: plate as string,
        type: type as string,
        limit: limit ? parseInt(limit as string) : 100,
      });
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Analytics
  app.get("/api/analytics/summary", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const summary = await storage.getAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Live queue stats
  app.get("/api/queue/stats", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const activeJobs = await storage.getWashJobs({ status: undefined });
      const openParking = await storage.getParkingSessions({ open: true });
      const analytics = await storage.getAnalyticsSummary();
      
      res.json({
        activeWashes: activeJobs.filter(j => j.status !== "complete").length,
        parkedVehicles: openParking.length,
        todayWashes: analytics.todayWashes,
        activeJobs: activeJobs.filter(j => j.status !== "complete"),
      });
    } catch (error) {
      console.error("Error fetching queue stats:", error);
      res.status(500).json({ message: "Failed to fetch queue stats" });
    }
  });

  // =====================
  // CUSTOMER ACCESS (Public routes with token)
  // =====================

  // Get job by customer token (public)
  app.get("/api/customer/job/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const access = await storage.getCustomerJobAccessByToken(token);
      
      if (!access) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Update last viewed
      await storage.updateCustomerJobAccessViewedAt(token);

      const job = await storage.getWashJob(access.washJobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const photos = await storage.getWashPhotos(access.washJobId);
      const checklist = await storage.getServiceChecklistItems(access.washJobId);
      const confirmation = await storage.getCustomerConfirmation(access.washJobId);

      res.json({
        job,
        photos,
        checklist,
        confirmation,
        customerName: access.customerName,
        serviceCode: access.serviceCode,
      });
    } catch (error) {
      console.error("Error fetching customer job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  // Customer SSE for job updates
  app.get("/api/customer/stream/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const access = await storage.getCustomerJobAccessByToken(token);
      
      if (!access) {
        return res.status(404).json({ message: "Job not found" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      // Add to job-specific SSE clients
      const client = { res, washJobId: access.washJobId };
      customerSseClients.add(client);
      
      req.on("close", () => {
        customerSseClients.delete(client);
      });

      res.write("data: {\"type\":\"connected\"}\n\n");
    } catch (error) {
      res.status(500).json({ message: "Stream error" });
    }
  });

  // Customer confirm checklist
  app.post("/api/customer/confirm/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { checklistConfirmations, rating, notes, issueReported } = req.body;
      
      const access = await storage.getCustomerJobAccessByToken(token);
      if (!access) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Update checklist items - verify each item belongs to this job
      if (checklistConfirmations && Array.isArray(checklistConfirmations)) {
        for (const item of checklistConfirmations) {
          if (item.id && typeof item.confirmed === "boolean") {
            await storage.updateChecklistItemConfirmedForJob(
              item.id, 
              access.washJobId, 
              item.confirmed
            );
          }
        }
      }

      // Create confirmation record
      const confirmation = await storage.createCustomerConfirmation({
        washJobId: access.washJobId,
        accessToken: token,
        rating: rating || null,
        notes: notes || null,
        issueReported: issueReported || null,
      });

      // Log event
      await storage.logEvent({
        type: "customer_confirmation",
        washJobId: access.washJobId,
        payloadJson: { rating, hasNotes: !!notes, hasIssue: !!issueReported },
      });

      res.json({ message: "Confirmation recorded", confirmation });
    } catch (error) {
      console.error("Error saving customer confirmation:", error);
      res.status(500).json({ message: "Failed to save confirmation" });
    }
  });

  // =====================
  // INTEGRATION ENDPOINT (for CRM)
  // =====================

  const integrationJobSchema = z.object({
    plateDisplay: z.string().min(1),
    customerName: z.string().optional(),
    customerEmail: z.string().email().optional(),
    serviceCode: z.string().optional(),
    serviceChecklist: z.array(z.string()).optional(),
  });

  app.post("/api/integrations/create-job", async (req, res) => {
    try {
      // Verify integration secret
      const secret = req.headers["x-integration-secret"] || req.headers["authorization"];
      if (secret !== process.env.INTEGRATION_SECRET) {
        return res.status(401).json({ message: "Invalid integration secret" });
      }

      const result = integrationJobSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.errors[0].message });
      }

      const { plateDisplay, customerName, customerEmail, serviceCode, serviceChecklist } = result.data;

      // Create wash job
      const job = await storage.createWashJob({
        plateDisplay: displayPlate(plateDisplay),
        plateNormalized: normalizePlate(plateDisplay),
        countryHint: "OTHER",
        technicianId: "integration",
        status: "received",
        startAt: new Date(),
      });

      // Create customer access token
      const token = generateJobToken();
      const access = await storage.createCustomerJobAccess({
        washJobId: job.id,
        token,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        serviceCode: serviceCode || null,
      });

      // Create service checklist items
      const checklistItems = serviceChecklist || WASH_STATUS_ORDER.filter(s => s !== "received");
      await storage.createServiceChecklistItems(
        checklistItems.map((label, index) => ({
          washJobId: job.id,
          label,
          orderIndex: index,
          expected: true,
          confirmed: false,
        }))
      );

      // Log event
      await storage.logEvent({
        type: "integration_job_created",
        plateDisplay: job.plateDisplay,
        plateNormalized: job.plateNormalized,
        washJobId: job.id,
        payloadJson: { serviceCode, hasCustomer: !!customerName },
      });

      // Broadcast update
      broadcastEvent({ type: "wash_created", job });

      const baseUrl = process.env.APP_URL || `https://${req.hostname}`;
      res.json({
        job,
        customerUrl: `${baseUrl}/customer/job/${token}`,
        token,
      });
    } catch (error) {
      console.error("Error creating integration job:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  // =====================
  // OCR (Placeholder)
  // =====================

  app.post("/api/ocr/plate-candidates", isAuthenticated, async (req, res) => {
    // MVP: Return empty candidates, user must enter manually
    // This endpoint is designed to be replaced with real OCR later
    res.json({
      candidates: [],
      confidence: [],
      message: "OCR not available in MVP. Please enter plate manually."
    });
  });

  return httpServer;
}
