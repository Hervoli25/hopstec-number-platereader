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
import { WASH_STATUS_ORDER, COUNTRY_HINTS, RESERVATION_STATUSES } from "@shared/schema";
import {
  getUpcomingBookings,
  getTodayBookings,
  findBookingByPlate,
  updateBookingStatus,
  getCRMNotifications,
  createCRMNotification,
  updateCRMNotificationStatus,
  getCRMNotificationsForCustomer,
  getCRMSubscriptions,
  findCRMSubscriptionByPlate,
  findCRMSubscriptionByEmail,
  findCRMSubscriptionByPhone,
  getBookingWithMembership,
  getUpcomingBookingsWithMemberships
} from "./lib/booking-db";
import {
  calculateParkingFee,
  calculateParkingDuration,
  enrichSessionWithCalculations,
  generateConfirmationCode,
  formatCurrency
} from "./lib/parking-utils";

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

// Helper to get base URL (handles Vercel's proxy headers)
function getBaseUrl(req: any): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  // Vercel and other proxies set x-forwarded-host
  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost || req.hostname;
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${protocol}://${host}`;
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

  // Credentials registration endpoint
  const credentialsRegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().optional(),
  });

  app.post("/api/auth/credentials/register", async (req, res) => {
    try {
      const result = credentialsRegisterSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Please fill in all required fields correctly" });
      }

      const { email, password, firstName, lastName } = result.data;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Create new user as technician (default role)
      const { createCredentialsUser } = await import("./lib/credentials-auth");
      const name = lastName ? `${firstName} ${lastName}` : firstName;
      await createCredentialsUser(email, password, "technician", name);

      res.json({ success: true, message: "Account created successfully" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

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

  // Universal logout endpoint (works for both credentials and Replit auth)
  app.post("/api/auth/logout", (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        res.json({ message: "Logged out successfully" });
      });
    });
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

  // Debug endpoint to check current user info (including role)
  app.get("/api/user/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      let role = "technician";
      let userDetails = null;

      // For credentials auth, role is in session
      if (req.user?.authType === "credentials") {
        role = req.user.role || "technician";
        userDetails = await storage.getUserById(userId);
      } else {
        // For Replit auth, get from userRoles table
        const userRole = await storage.getUserRole(userId);
        role = userRole?.role || "technician";
      }

      res.json({
        userId,
        role,
        authType: req.user?.authType || "replit",
        email: req.user?.email,
        name: req.user?.name,
        userDetails
      });
    } catch (error) {
      console.error("Error fetching user info:", error);
      res.status(500).json({ message: "Failed to fetch user info" });
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

      // Create customer access token for tracking
      const token = generateJobToken();
      await storage.createCustomerJobAccess({
        washJobId: job.id,
        token,
        customerName: null,
        customerEmail: null,
        serviceCode: null,
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

      // Return job with customer tracking URL
      const baseUrl = getBaseUrl(req);
      res.json({
        ...job,
        customerUrl: `${baseUrl}/customer/job/${token}`,
        customerToken: token,
      });
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
      const job = await storage.getWashJob(req.params.id as string);
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

      // Calculate fee with business settings
      const settings = await storage.getParkingSettings();
      const businessSettings = await storage.getBusinessSettings();
      const parker = await storage.getFrequentParker(normalized);
      const validations = await storage.getParkingValidations(session.id);
      const feeResult = calculateParkingFee(session, settings || null, parker, businessSettings, validations);

      const closedSession = await storage.closeParkingSession(session.id, exitPhotoUrl, feeResult.finalFee);

      // Update frequent parker stats
      if (parker) {
        await storage.incrementParkerVisit(normalized, feeResult.finalFee);
      }

      // Log event
      await storage.logEvent({
        type: "parking_exit",
        plateDisplay: session.plateDisplay,
        plateNormalized: session.plateNormalized,
        countryHint: session.countryHint,
        parkingSessionId: session.id,
        userId,
        payloadJson: {
          hasPhoto: !!exitPhotoUrl,
          fee: feeResult.finalFee,
          duration: feeResult.durationMinutes
        },
      });

      broadcastEvent({ type: "parking_exit", session: closedSession });

      res.json({
        ...closedSession,
        feeDetails: feeResult,
        formattedFee: formatCurrency(feeResult.finalFee, feeResult.currency)
      });
    } catch (error) {
      console.error("Error processing parking exit:", error);
      res.status(500).json({ message: "Failed to process parking exit" });
    }
  });

  // Get parking sessions with enriched data
  app.get("/api/parking/sessions", isAuthenticated, async (req, res) => {
    try {
      const { open, plateSearch, fromDate, toDate, zoneId } = req.query;
      const filters: any = {};
      if (open === "true") filters.open = true;
      if (open === "false") filters.open = false;
      if (plateSearch) filters.plateSearch = plateSearch as string;
      if (fromDate) filters.fromDate = new Date(fromDate as string);
      if (toDate) filters.toDate = new Date(toDate as string);
      if (zoneId) filters.zoneId = zoneId as string;

      const sessions = await storage.getParkingSessions(filters);
      const settings = await storage.getParkingSettings();

      // Enrich sessions with duration and fee calculations
      const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
          const parker = await storage.getFrequentParker(session.plateNormalized);
          return enrichSessionWithCalculations(session, settings || null, parker);
        })
      );

      res.json(enrichedSessions);
    } catch (error) {
      console.error("Error fetching parking sessions:", error);
      res.status(500).json({ message: "Failed to fetch parking sessions" });
    }
  });

  // Get single parking session with details
  app.get("/api/parking/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const session = await storage.getParkingSession(String(req.params.id));
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const settings = await storage.getParkingSettings();
      const parker = await storage.getFrequentParker(session.plateNormalized);
      const enriched = enrichSessionWithCalculations(session, settings || null, parker);

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching parking session:", error);
      res.status(500).json({ message: "Failed to fetch parking session" });
    }
  });

  // Update parking session (assign zone/spot, add notes, link to wash)
  app.patch("/api/parking/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const { zoneId, spotNumber, notes, washJobId } = req.body;
      const session = await storage.updateParkingSession(String(req.params.id), {
        zoneId,
        spotNumber,
        notes,
        washJobId
      });

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      broadcastEvent({ type: "parking_updated", session });
      res.json(session);
    } catch (error) {
      console.error("Error updating parking session:", error);
      res.status(500).json({ message: "Failed to update parking session" });
    }
  });

  // Parking analytics
  app.get("/api/parking/analytics", isAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getParkingAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching parking analytics:", error);
      res.status(500).json({ message: "Failed to fetch parking analytics" });
    }
  });

  // =====================
  // PARKING SETTINGS
  // =====================

  app.get("/api/parking/settings", isAuthenticated, async (req, res) => {
    try {
      let settings = await storage.getParkingSettings();
      if (!settings) {
        // Return defaults
        settings = {
          id: "",
          hourlyRate: 500,
          firstHourRate: null,
          dailyMaxRate: 3000,
          weeklyRate: null,
          monthlyPassRate: 5000,
          nightRate: null,
          nightStartHour: 22,
          nightEndHour: 6,
          weekendRate: null,
          gracePeriodMinutes: 15,
          overstayPenaltyRate: null,
          lostTicketFee: 2000,
          validationDiscountPercent: 0,
          totalCapacity: 50,
          currency: "USD",
          updatedBy: null,
          updatedAt: null,
          createdAt: null
        };
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching parking settings:", error);
      res.status(500).json({ message: "Failed to fetch parking settings" });
    }
  });

  app.put("/api/parking/settings", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const {
        hourlyRate, firstHourRate, dailyMaxRate, weeklyRate, monthlyPassRate,
        nightRate, nightStartHour, nightEndHour, weekendRate,
        gracePeriodMinutes, overstayPenaltyRate, lostTicketFee, validationDiscountPercent,
        totalCapacity, currency
      } = req.body;
      const userId = req.user?.claims?.sub;

      const settings = await storage.upsertParkingSettings({
        hourlyRate,
        firstHourRate,
        dailyMaxRate,
        weeklyRate,
        monthlyPassRate,
        nightRate,
        nightStartHour,
        nightEndHour,
        weekendRate,
        gracePeriodMinutes,
        overstayPenaltyRate,
        lostTicketFee,
        validationDiscountPercent,
        totalCapacity,
        currency,
        updatedBy: userId
      });

      res.json(settings);
    } catch (error) {
      console.error("Error updating parking settings:", error);
      res.status(500).json({ message: "Failed to update parking settings" });
    }
  });

  // =====================
  // BUSINESS SETTINGS
  // =====================

  app.get("/api/business/settings", isAuthenticated, async (req, res) => {
    try {
      let settings = await storage.getBusinessSettings();
      if (!settings) {
        // Return defaults
        settings = {
          id: "",
          businessName: "ParkWash Pro",
          businessLogo: null,
          businessAddress: null,
          businessPhone: null,
          businessEmail: null,
          currency: "USD",
          currencySymbol: "$",
          locale: "en-US",
          timezone: "UTC",
          taxRate: 0,
          taxLabel: "Tax",
          receiptFooter: null,
          updatedBy: null,
          updatedAt: null,
          createdAt: null
        };
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching business settings:", error);
      res.status(500).json({ message: "Failed to fetch business settings" });
    }
  });

  app.put("/api/business/settings", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const {
        businessName, businessLogo, businessAddress, businessPhone, businessEmail,
        currency, currencySymbol, locale, timezone, taxRate, taxLabel, receiptFooter
      } = req.body;
      const userId = req.user?.claims?.sub;

      const settings = await storage.upsertBusinessSettings({
        businessName,
        businessLogo,
        businessAddress,
        businessPhone,
        businessEmail,
        currency,
        currencySymbol,
        locale,
        timezone,
        taxRate,
        taxLabel,
        receiptFooter,
        updatedBy: userId
      });

      res.json(settings);
    } catch (error) {
      console.error("Error updating business settings:", error);
      res.status(500).json({ message: "Failed to update business settings" });
    }
  });

  // =====================
  // PARKING ZONES
  // =====================

  app.get("/api/parking/zones", isAuthenticated, async (req, res) => {
    try {
      const { all } = req.query;
      const zones = await storage.getParkingZones(all !== "true");

      // Add occupancy info
      const zonesWithOccupancy = await Promise.all(
        zones.map(async (zone) => {
          const occupied = await storage.getZoneOccupancy(zone.id);
          return { ...zone, occupied, available: (zone.capacity || 0) - occupied };
        })
      );

      res.json(zonesWithOccupancy);
    } catch (error) {
      console.error("Error fetching parking zones:", error);
      res.status(500).json({ message: "Failed to fetch parking zones" });
    }
  });

  app.post("/api/parking/zones", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { name, code, capacity, hourlyRate, description } = req.body;
      const zone = await storage.createParkingZone({
        name,
        code,
        capacity,
        hourlyRate,
        description
      });
      res.json(zone);
    } catch (error) {
      console.error("Error creating parking zone:", error);
      res.status(500).json({ message: "Failed to create parking zone" });
    }
  });

  app.put("/api/parking/zones/:id", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { name, code, capacity, hourlyRate, description, isActive } = req.body;
      const zone = await storage.updateParkingZone(String(req.params.id), {
        name,
        code,
        capacity,
        hourlyRate,
        description,
        isActive
      });

      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }

      res.json(zone);
    } catch (error) {
      console.error("Error updating parking zone:", error);
      res.status(500).json({ message: "Failed to update parking zone" });
    }
  });

  // =====================
  // FREQUENT PARKERS / VIP
  // =====================

  app.get("/api/parking/frequent-parkers", isAuthenticated, async (req, res) => {
    try {
      const { vip, monthlyPass } = req.query;
      const filters: any = {};
      if (vip === "true") filters.isVip = true;
      if (monthlyPass === "true") filters.hasMonthlyPass = true;

      const parkers = await storage.getFrequentParkers(filters);
      res.json(parkers);
    } catch (error) {
      console.error("Error fetching frequent parkers:", error);
      res.status(500).json({ message: "Failed to fetch frequent parkers" });
    }
  });

  app.get("/api/parking/frequent-parkers/:plate", isAuthenticated, async (req, res) => {
    try {
      const normalized = normalizePlate(String(req.params.plate));
      const parker = await storage.getFrequentParker(normalized);

      if (!parker) {
        return res.status(404).json({ message: "Parker not found" });
      }

      res.json(parker);
    } catch (error) {
      console.error("Error fetching frequent parker:", error);
      res.status(500).json({ message: "Failed to fetch frequent parker" });
    }
  });

  app.put("/api/parking/frequent-parkers/:id", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { customerName, customerPhone, customerEmail, isVip, monthlyPassExpiry, notes } = req.body;
      const parker = await storage.updateFrequentParker(String(req.params.id), {
        customerName,
        customerPhone,
        customerEmail,
        isVip,
        monthlyPassExpiry: monthlyPassExpiry ? new Date(monthlyPassExpiry) : undefined,
        notes
      });

      if (!parker) {
        return res.status(404).json({ message: "Parker not found" });
      }

      res.json(parker);
    } catch (error) {
      console.error("Error updating frequent parker:", error);
      res.status(500).json({ message: "Failed to update frequent parker" });
    }
  });

  // =====================
  // PARKING RESERVATIONS
  // =====================

  app.get("/api/parking/reservations", isAuthenticated, async (req, res) => {
    try {
      const { status, fromDate, toDate } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (fromDate) filters.fromDate = new Date(fromDate as string);
      if (toDate) filters.toDate = new Date(toDate as string);

      const reservations = await storage.getParkingReservations(filters);
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  app.post("/api/parking/reservations", isAuthenticated, async (req, res) => {
    try {
      const { plateDisplay, customerName, customerPhone, customerEmail, zoneId, spotNumber, reservedFrom, reservedUntil, notes } = req.body;

      const confirmationCode = generateConfirmationCode();

      const reservation = await storage.createParkingReservation({
        plateDisplay,
        customerName,
        customerPhone,
        customerEmail,
        zoneId,
        spotNumber,
        reservedFrom: new Date(reservedFrom),
        reservedUntil: new Date(reservedUntil),
        confirmationCode,
        status: "confirmed",
        notes
      });

      res.json(reservation);
    } catch (error) {
      console.error("Error creating reservation:", error);
      res.status(500).json({ message: "Failed to create reservation" });
    }
  });

  app.get("/api/parking/reservations/lookup/:code", async (req, res) => {
    try {
      const reservation = await storage.getParkingReservationByCode(String(req.params.code));
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      res.json(reservation);
    } catch (error) {
      console.error("Error looking up reservation:", error);
      res.status(500).json({ message: "Failed to lookup reservation" });
    }
  });

  app.put("/api/parking/reservations/:id", isAuthenticated, async (req, res) => {
    try {
      const { status, plateDisplay, zoneId, spotNumber, notes } = req.body;
      const reservation = await storage.updateParkingReservation(String(req.params.id), {
        status,
        plateDisplay,
        zoneId,
        spotNumber,
        notes
      });

      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      res.json(reservation);
    } catch (error) {
      console.error("Error updating reservation:", error);
      res.status(500).json({ message: "Failed to update reservation" });
    }
  });

  // Check-in with reservation code
  app.post("/api/parking/reservations/:id/check-in", isAuthenticated, async (req: any, res) => {
    try {
      const reservation = await storage.getParkingReservation(String(req.params.id));
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (reservation.status !== "confirmed") {
        return res.status(400).json({ message: "Reservation is not in confirmed status" });
      }

      const userId = req.user?.claims?.sub;
      const plateDisplay = reservation.plateDisplay || "RESERVED";
      const plateNormalized = normalizePlate(plateDisplay);

      // Create parking session
      const session = await storage.createParkingEntry({
        plateDisplay,
        plateNormalized,
        technicianId: userId,
        zoneId: reservation.zoneId || undefined,
        spotNumber: reservation.spotNumber || undefined
      });

      // Update reservation
      await storage.checkInReservation(reservation.id, session.id);

      // Track frequent parker
      if (reservation.plateDisplay) {
        const normalized = normalizePlate(reservation.plateDisplay);
        await storage.getOrCreateFrequentParker(normalized, reservation.plateDisplay);
      }

      broadcastEvent({ type: "parking_entry", session });

      res.json({ session, reservation: { ...reservation, status: "checked_in" } });
    } catch (error) {
      console.error("Error checking in reservation:", error);
      res.status(500).json({ message: "Failed to check in reservation" });
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
  // CRM BOOKINGS (from external booking database)
  // =====================

  // Get upcoming bookings from CRM
  app.get("/api/crm/bookings", isAuthenticated, async (req, res) => {
    try {
      const bookings = await getUpcomingBookings(30);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching CRM bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Get today's bookings from CRM
  app.get("/api/crm/bookings/today", isAuthenticated, async (req, res) => {
    try {
      const bookings = await getTodayBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching today's bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Search booking by license plate
  app.get("/api/crm/bookings/search", isAuthenticated, async (req, res) => {
    try {
      const { plate } = req.query;
      if (!plate || typeof plate !== "string") {
        return res.status(400).json({ message: "Plate parameter required" });
      }

      const booking = await findBookingByPlate(plate);
      if (!booking) {
        return res.status(404).json({ message: "No booking found for this plate" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Error searching CRM booking:", error);
      res.status(500).json({ message: "Failed to search booking" });
    }
  });

  // Update booking status in CRM (when wash completes)
  app.patch("/api/crm/bookings/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const status = req.body.status as string;

      if (!["IN_PROGRESS", "COMPLETED", "READY_FOR_PICKUP"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const success = await updateBookingStatus(id, status as "IN_PROGRESS" | "COMPLETED" | "READY_FOR_PICKUP");
      if (!success) {
        return res.status(500).json({ message: "Failed to update booking status" });
      }

      res.json({ message: "Booking status updated" });
    } catch (error) {
      console.error("Error updating CRM booking status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Get booking with membership info
  app.get("/api/crm/bookings/:id/details", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const booking = await getBookingWithMembership(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking details:", error);
      res.status(500).json({ message: "Failed to fetch booking details" });
    }
  });

  // Get upcoming bookings with membership info
  app.get("/api/crm/bookings/with-memberships", isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const bookings = await getUpcomingBookingsWithMemberships(limit);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings with memberships:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // =====================
  // CRM NOTIFICATIONS (from external CRM database)
  // =====================

  // Get notifications from CRM
  app.get("/api/crm/notifications", isAuthenticated, async (req, res) => {
    try {
      const { userId, status, type, limit } = req.query;
      const notifications = await getCRMNotifications({
        userId: userId as string | undefined,
        status: status as string | undefined,
        type: type as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching CRM notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get notifications for a customer by email or phone
  app.get("/api/crm/notifications/customer", isAuthenticated, async (req, res) => {
    try {
      const { email, phone, limit } = req.query;
      if (!email && !phone) {
        return res.status(400).json({ message: "Email or phone required" });
      }

      const notifications = await getCRMNotificationsForCustomer(
        email as string | undefined,
        phone as string | undefined,
        limit ? parseInt(limit as string) : 50
      );
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching customer notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Create notification in CRM
  app.post("/api/crm/notifications", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        userId: z.string(),
        type: z.string(),
        title: z.string(),
        message: z.string(),
        channel: z.enum(["sms", "email", "push", "both"]),
        bookingId: z.string().optional(),
        vehicleId: z.string().optional(),
      });

      const data = schema.parse(req.body);
      const notification = await createCRMNotification(data);

      if (!notification) {
        return res.status(500).json({ message: "Failed to create notification" });
      }

      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating CRM notification:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  // Update notification status in CRM
  app.patch("/api/crm/notifications/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      if (!["pending", "sent", "failed", "read"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const success = await updateCRMNotificationStatus(id, status);
      if (!success) {
        return res.status(500).json({ message: "Failed to update notification status" });
      }

      res.json({ message: "Notification status updated" });
    } catch (error) {
      console.error("Error updating CRM notification status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // =====================
  // CRM SUBSCRIPTIONS/MEMBERSHIPS (from external CRM database)
  // =====================

  // Get subscriptions from CRM
  app.get("/api/crm/subscriptions", isAuthenticated, async (req, res) => {
    try {
      const { userId, status, type } = req.query;
      const subscriptions = await getCRMSubscriptions({
        userId: userId as string | undefined,
        status: status as string | undefined,
        type: type as string | undefined,
      });
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching CRM subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Find subscription by license plate
  app.get("/api/crm/subscriptions/by-plate", isAuthenticated, async (req, res) => {
    try {
      const { plate } = req.query;
      if (!plate || typeof plate !== "string") {
        return res.status(400).json({ message: "Plate parameter required" });
      }

      const subscription = await findCRMSubscriptionByPlate(plate);
      if (!subscription) {
        return res.status(404).json({ message: "No active subscription found for this plate" });
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error finding subscription by plate:", error);
      res.status(500).json({ message: "Failed to find subscription" });
    }
  });

  // Find subscription by email
  app.get("/api/crm/subscriptions/by-email", isAuthenticated, async (req, res) => {
    try {
      const { email } = req.query;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email parameter required" });
      }

      const subscription = await findCRMSubscriptionByEmail(email);
      if (!subscription) {
        return res.status(404).json({ message: "No active subscription found for this email" });
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error finding subscription by email:", error);
      res.status(500).json({ message: "Failed to find subscription" });
    }
  });

  // Find subscription by phone
  app.get("/api/crm/subscriptions/by-phone", isAuthenticated, async (req, res) => {
    try {
      const { phone } = req.query;
      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ message: "Phone parameter required" });
      }

      const subscription = await findCRMSubscriptionByPhone(phone);
      if (!subscription) {
        return res.status(404).json({ message: "No active subscription found for this phone" });
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error finding subscription by phone:", error);
      res.status(500).json({ message: "Failed to find subscription" });
    }
  });

  // =====================
  // ADMIN USER MANAGEMENT
  // =====================

  // Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post("/api/admin/users", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        role: z.enum(["technician", "manager", "admin"]),
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid user data" });
      }

      const { email, password, firstName, lastName, role } = result.data;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const { createCredentialsUser } = await import("./lib/credentials-auth");
      const name = lastName ? `${firstName} ${lastName}` : firstName;
      const user = await createCredentialsUser(email, password, role, name);

      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/admin/users/:userId/role", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const userId = req.params.userId as string;
      const { role } = req.body;
      
      if (!["technician", "manager", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.updateUser(userId, { role });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  // Toggle user active status (admin only)
  app.patch("/api/admin/users/:userId/active", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const userId = req.params.userId as string;
      const { isActive } = req.body;
      
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "Invalid status" });
      }

      const user = await storage.updateUser(userId, { isActive });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update status" });
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

      const baseUrl = getBaseUrl(req);
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
