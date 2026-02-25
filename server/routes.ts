import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { normalizePlate, displayPlate } from "./lib/plate-utils";
import { requireRole, ensureUserRole, isSuperAdmin, requireSuperAdminMiddleware } from "./lib/roles";
import { savePhoto } from "./lib/photo-storage";
import {
  queueBookingNotification,
  detectBookingChangeType,
  renderBookingNotification,
  markNotificationSent,
  type BookingNotificationType,
} from "./lib/notification-service";
import { authenticateWithCredentials, seedUsers, generateJobToken } from "./lib/credentials-auth";
import { extractTenantContext } from "./lib/tenant-context";
import { getEnabledFeatures, seedFeatureFlags, requireFeature } from "./lib/feature-flags";
import { generateBillingSnapshot, generateAllSnapshots } from "./lib/billing-snapshot";
import { z } from "zod";
import { WASH_STATUS_ORDER, COUNTRY_HINTS, RESERVATION_STATUSES, SERVICE_CODES, SERVICE_TYPE_CONFIG, LOYALTY_POINTS_PER_SERVICE, SERVICE_PACKAGES, VEHICLE_SIZES } from "@shared/schema";
import type { ServiceCode, WashStatus, VehicleSize } from "@shared/schema";
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
  getUpcomingBookingsWithMemberships,
  findCRMCustomerByPlate,
  findCRMMembershipByPlate,
  creditCRMLoyaltyPoints,
  getCRMLoyaltyAnalytics,
  getManagerBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  isTimeSlotAvailable,
  getCRMServices,
  getAvailableTimeSlots
} from "./lib/booking-db";
import {
  calculateParkingFee,
  calculateParkingDuration,
  enrichSessionWithCalculations,
  generateConfirmationCode,
  formatCurrency
} from "./lib/parking-utils";
import { startNotificationProcessor } from "./lib/notification-processor";
import { getVapidPublicKey, sendPushToCustomer, sendPushToAllManagers } from "./lib/web-push-service";
import { calculateJobPriority } from "./lib/priority-calculator";
import { fireWebhook } from "./lib/webhook-service";
import { startWebhookProcessor } from "./lib/webhook-processor";
import { getQueuePosition } from "./lib/eta-calculator";

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
  serviceCode: z.enum(SERVICE_CODES).optional().default("STANDARD"),
  servicePackageCode: z.string().optional(), // Named package (e.g. "VAMOS", "LA_OBRA")
  vehicleSize: z.enum(VEHICLE_SIZES).optional(), // small/medium/large for pricing
  customSteps: z.array(z.string()).optional(), // Custom step list override
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

  // Start notification delivery processor (Twilio SMS/WhatsApp)
  startNotificationProcessor();

  // Start webhook retry processor (CRM webhook exponential backoff)
  startWebhookProcessor();

  // Multi-tenancy context middleware
  app.use("/api", extractTenantContext());

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

      const { plateDisplay, countryHint, photo, serviceCode, servicePackageCode, vehicleSize, customSteps } = result.data;
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

      // Resolve service steps: customSteps > named package > service type config
      let resolvedSteps: string[] = [];
      let resolvedServiceCode = serviceCode || "STANDARD";
      let resolvedPackageName: string | null = null;
      let resolvedPrice: number | null = null;
      if (customSteps && customSteps.length > 0) {
        resolvedSteps = customSteps;
      } else if (servicePackageCode && SERVICE_PACKAGES[servicePackageCode]) {
        const pkg = SERVICE_PACKAGES[servicePackageCode];
        resolvedSteps = pkg.steps;
        resolvedServiceCode = pkg.serviceCode;
        resolvedPackageName = pkg.label;
        if (vehicleSize && pkg.pricing[vehicleSize]) {
          resolvedPrice = pkg.pricing[vehicleSize];
        }
      } else {
        const cfg = SERVICE_TYPE_CONFIG[resolvedServiceCode as ServiceCode];
        resolvedSteps = cfg?.steps || [];
      }

      const job = await storage.createWashJob({
        plateDisplay: displayPlate(plateDisplay),
        plateNormalized: normalizePlate(plateDisplay),
        countryHint,
        technicianId: userId,
        status: "received",
        serviceCode: resolvedServiceCode,
        startAt: new Date(),
      });

      // Create customer access token for tracking
      const token = generateJobToken();
      await storage.createCustomerJobAccess({
        washJobId: job.id,
        token,
        customerName: null,
        customerEmail: null,
        serviceCode: resolvedPackageName || servicePackageCode || resolvedServiceCode,
      });

      // Auto-populate service checklist items based on resolved steps
      if (resolvedSteps.length > 0) {
        await storage.createServiceChecklistItems(
          resolvedSteps.map((label, index) => ({
            washJobId: job.id,
            label,
            orderIndex: index,
            expected: true,
            confirmed: false,
          }))
        );
      }

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

      // Fire CRM webhook (non-blocking)
      fireWebhook("wash_created", { jobId: job.id, plate: job.plateDisplay, plateNormalized: job.plateNormalized, serviceCode: job.serviceCode, status: job.status }).catch(() => {});

      // Push notification to managers about new job
      try {
        await sendPushToAllManagers({
          title: "New Wash Job",
          body: `${job.plateDisplay} — ${job.serviceCode} added to queue`,
          url: "/manager/dashboard",
          tag: `new-job-${job.id}`,
        });
      } catch (_pushErr) { /* non-blocking */ }

      // Return job with customer tracking URL and service info
      const baseUrl = getBaseUrl(req);
      res.json({
        ...job,
        customerUrl: `${baseUrl}/customer/job/${token}`,
        customerToken: token,
        packageName: resolvedPackageName,
        vehicleSize: vehicleSize || null,
        price: resolvedPrice,
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
      // Include checklist items in the response
      const checklist = await storage.getServiceChecklistItems(job.id);
      res.json({ ...job, checklist });
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

      // Get current job to validate transition
      const currentJob = await storage.getWashJob(req.params.id as string);
      if (!currentJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Determine service mode
      const svcCode = (currentJob.serviceCode as ServiceCode) || "STANDARD";
      const svcConfig = SERVICE_TYPE_CONFIG[svcCode];

      // For timer-mode services only allow "complete"
      if (svcConfig?.mode === "timer" && status !== "complete") {
        return res.status(400).json({ message: "This service type only supports marking as complete" });
      }

      // Ensure we're not going backward
      const currentIdx = WASH_STATUS_ORDER.indexOf(currentJob.status as WashStatus);
      const newIdx = WASH_STATUS_ORDER.indexOf(status as WashStatus);
      if (newIdx >= 0 && currentIdx >= 0 && newIdx <= currentIdx) {
        return res.status(400).json({ message: "Cannot move to a previous or current status" });
      }

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

      // Fire CRM webhook (non-blocking)
      fireWebhook("wash_status_update", { jobId: job.id, plate: job.plateDisplay, plateNormalized: job.plateNormalized, status, serviceCode: job.serviceCode }).catch(() => {});

      // === AUTO-CREDIT LOYALTY POINTS ON COMPLETION (CRM) ===
      if (status === "complete" && job) {
        try {
          const svcCode = (job.serviceCode || "STANDARD") as ServiceCode;
          const basePoints = LOYALTY_POINTS_PER_SERVICE[svcCode] || 0;

          if (basePoints > 0) {
            // Look up CRM membership to get multiplier and userId
            const membership = await findCRMMembershipByPlate(job.plateNormalized);

            if (membership) {
              // Apply loyalty multiplier (e.g. Premium = 2x)
              const pointsToAward = Math.round(basePoints * membership.loyaltyMultiplier);

              // Credit points directly to CRM User.loyaltyPoints
              const creditResult = await creditCRMLoyaltyPoints(membership.userId, pointsToAward);
              const newBalance = creditResult?.newBalance ?? (membership.loyaltyPoints + pointsToAward);

              // Log transaction locally for audit trail
              await storage.logLoyaltyTransaction({
                crmUserId: membership.userId,
                memberNumber: membership.memberNumber,
                type: "earn_wash",
                points: pointsToAward,
                balanceAfter: newBalance,
                washJobId: job.id,
                serviceCode: svcCode,
                description: `Earned ${pointsToAward} points for ${SERVICE_TYPE_CONFIG[svcCode].label}${membership.loyaltyMultiplier > 1 ? ` (${membership.loyaltyMultiplier}x multiplier)` : ""}`,
                createdBy: userId,
              });

              // Log the loyalty event
              await storage.logEvent({
                type: "loyalty_points_earned",
                plateDisplay: job.plateDisplay,
                plateNormalized: job.plateNormalized,
                washJobId: job.id,
                userId,
                payloadJson: {
                  points: pointsToAward,
                  serviceCode: svcCode,
                  balanceAfter: newBalance,
                  memberNumber: membership.memberNumber,
                  tierName: membership.tierName,
                  loyaltyMultiplier: membership.loyaltyMultiplier,
                },
              });

              // Broadcast loyalty update
              broadcastEvent({
                type: "loyalty_points_earned",
                washJobId: job.id,
                points: pointsToAward,
                balance: newBalance,
                memberNumber: membership.memberNumber,
              });
            }

            // Also increment local membership wash count if applicable
            const localMembership = await storage.getActiveMembershipForPlate(job.plateNormalized);
            if (localMembership) {
              await storage.incrementMembershipWashUsed(localMembership.id);
            }
          }
        } catch (loyaltyErr) {
          // Non-blocking: log error but don't fail the wash completion
          console.error("Loyalty points credit failed (non-blocking):", loyaltyErr);
        }

        // === AUTO-QUEUE "CAR READY" SMS/WHATSAPP NOTIFICATION ===
        try {
          const membership = await findCRMMembershipByPlate(job.plateNormalized);
          const customerPhone = membership?.customerPhone;
          const customerName = membership?.customerName;
          if (customerPhone) {
            await storage.createNotification({
              customerName: customerName || undefined,
              customerPhone,
              customerEmail: membership?.customerEmail || undefined,
              plateNormalized: job.plateNormalized,
              channel: "sms",
              type: "wash_complete",
              message: `Hi ${customerName || "there"}! Your vehicle (${job.plateDisplay}) is ready for pickup. Thank you for choosing Prestige by Ekhaya!`,
              washJobId: job.id,
              status: "pending",
            });
          }
        } catch (notifErr) {
          console.error("Auto-notification queue failed (non-blocking):", notifErr);
        }

        // Push notification to customer on wash complete
        try {
          const customerAccess = await storage.getCustomerJobAccessByJobId(job.id);
          if (customerAccess) {
            await sendPushToCustomer(customerAccess.token, {
              title: "Your Car is Ready!",
              body: `Your vehicle (${job.plateDisplay}) is ready for pickup.`,
              url: `/customer/job/${customerAccess.token}`,
              tag: `wash-complete-${job.id}`,
            });
          }
        } catch (_pushErr) { /* non-blocking */ }

        // === AUTO-CONSUME INVENTORY ON WASH COMPLETION ===
        try {
          const svcCode = (job.serviceCode || "STANDARD") as string;
          await storage.autoConsumeForWashJob(job.id, svcCode, userId);
        } catch (_invErr) {
          console.error("Inventory auto-consumption failed (non-blocking):", _invErr);
        }
      }

      res.json(job);
    } catch (error) {
      console.error("Error updating wash job status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Delete wash job (manager/admin only)
  app.delete("/api/wash-jobs/:id", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const job = await storage.getWashJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const deleted = await storage.deleteWashJob(req.params.id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete job" });
      }

      // Log the deletion event
      await storage.logEvent({
        type: "wash_deleted",
        plateDisplay: job.plateDisplay,
        plateNormalized: job.plateNormalized,
        countryHint: job.countryHint,
        userId: req.user.id,
        payloadJson: { jobId: job.id, serviceCode: job.serviceCode, status: job.status },
      });

      res.json({ message: "Job deleted" });
    } catch (error) {
      console.error("Error deleting wash job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // Send custom SMS/WhatsApp notification (manager/admin only)
  app.post("/api/notifications/send", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    const schema = z.object({
      customerPhone: z.string().min(1),
      message: z.string().min(1),
      channel: z.enum(["sms", "whatsapp"]).default("sms"),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.errors[0].message });

    try {
      const notification = await storage.createNotification({
        customerPhone: result.data.customerPhone,
        channel: result.data.channel,
        type: "custom",
        message: result.data.message,
        status: "pending",
        createdBy: req.user?.claims?.sub || req.user?.id,
      });
      res.json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to queue notification" });
    }
  });

  // =====================
  // WEB PUSH NOTIFICATIONS
  // =====================

  // Get VAPID public key (public endpoint)
  app.get("/api/push/vapid-key", (_req, res) => {
    const key = getVapidPublicKey();
    res.json({ vapidPublicKey: key });
  });

  // Staff push subscription (authenticated)
  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    const schema = z.object({
      endpoint: z.string().url(),
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.errors[0].message });

    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const sub = await storage.savePushSubscription({
        endpoint: result.data.endpoint,
        p256dh: result.data.p256dh,
        auth: result.data.auth,
        userId,
      });
      res.json(sub);
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  // Customer push subscription (token-gated)
  app.post("/api/customer/push/subscribe/:token", async (req, res) => {
    const { token } = req.params;
    const access = await storage.getCustomerJobAccessByToken(token);
    if (!access) return res.status(404).json({ message: "Invalid token" });

    const schema = z.object({
      endpoint: z.string().url(),
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.errors[0].message });

    try {
      const sub = await storage.savePushSubscription({
        endpoint: result.data.endpoint,
        p256dh: result.data.p256dh,
        auth: result.data.auth,
        customerToken: token,
      });
      res.json(sub);
    } catch (error) {
      console.error("Error saving customer push subscription:", error);
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  // =====================
  // ETA & QUEUE POSITION
  // =====================

  // Helper: get priority-sorted active jobs for today
  async function getSortedActiveJobs() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const allJobs = await storage.getWashJobs({ fromDate: todayStart });
    const active = allJobs.filter(j => j.status !== "complete");
    const withPriority = await Promise.all(
      active.map(async (job) => {
        try {
          const { score } = await calculateJobPriority(job);
          return { ...job, priority: score };
        } catch {
          return { ...job, priority: 0 };
        }
      })
    );
    withPriority.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return withPriority;
  }

  // Queue position for authenticated users (technicians/managers)
  app.get("/api/wash-jobs/:id/queue-position", isAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsSummary();
      const sortedJobs = await getSortedActiveJobs();
      const result = getQueuePosition(req.params.id as string, sortedJobs, analytics.avgCycleTimeMinutes);
      if (!result) return res.status(404).json({ message: "Job not in active queue" });
      res.json(result);
    } catch (error) {
      console.error("Error getting queue position:", error);
      res.status(500).json({ message: "Failed to get queue position" });
    }
  });

  // Queue position for customers (token-gated)
  app.get("/api/customer/job/:token/queue-position", async (req, res) => {
    try {
      const access = await storage.getCustomerJobAccessByToken(req.params.token);
      if (!access) return res.status(404).json({ message: "Invalid token" });

      const analytics = await storage.getAnalyticsSummary();
      const sortedJobs = await getSortedActiveJobs();
      const result = getQueuePosition(access.washJobId, sortedJobs, analytics.avgCycleTimeMinutes);
      if (!result) return res.json({ position: 0, estimatedMinutes: 0, totalInQueue: 0, estimatedReadyAt: null });
      res.json(result);
    } catch (error) {
      console.error("Error getting customer queue position:", error);
      res.status(500).json({ message: "Failed to get queue position" });
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
  // WASH JOB CHECKLIST
  // =====================

  // Get checklist items for a wash job
  app.get("/api/wash-jobs/:id/checklist", isAuthenticated, async (req: any, res) => {
    try {
      const items = await storage.getServiceChecklistItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching checklist:", error);
      res.status(500).json({ message: "Failed to fetch checklist" });
    }
  });

  // Confirm/unconfirm a checklist item (technician marks step done)
  app.patch("/api/wash-jobs/:id/checklist/:itemId/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const { confirmed } = req.body;
      const item = await storage.updateChecklistItemConfirmedForJob(
        req.params.itemId,
        req.params.id,
        confirmed !== false
      );
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      // Broadcast update to SSE clients
      const job = await storage.getWashJob(req.params.id);
      if (job) broadcastEvent({ type: "checklist_updated", jobId: job.id, item });
      res.json(item);
    } catch (error) {
      console.error("Error confirming checklist item:", error);
      res.status(500).json({ message: "Failed to confirm checklist item" });
    }
  });

  // Skip a checklist item with optional reason
  app.patch("/api/wash-jobs/:id/checklist/:itemId/skip", isAuthenticated, async (req: any, res) => {
    try {
      const { reason } = req.body;
      const item = await storage.skipChecklistItem(
        req.params.itemId,
        req.params.id,
        reason
      );
      if (!item) {
        return res.status(404).json({ message: "Checklist item not found" });
      }
      const job = await storage.getWashJob(req.params.id);
      if (job) broadcastEvent({ type: "checklist_updated", jobId: job.id, item });
      res.json(item);
    } catch (error) {
      console.error("Error skipping checklist item:", error);
      res.status(500).json({ message: "Failed to skip checklist item" });
    }
  });

  // Get available service packages (for service selection UI)
  app.get("/api/service-packages", isAuthenticated, async (req: any, res) => {
    try {
      // Return both custom tenant packages from DB and built-in packages
      const dbPackages = await storage.getServicePackages(true);
      const builtIn = Object.entries(SERVICE_PACKAGES).map(([code, pkg]) => ({
        code,
        name: pkg.label,
        description: pkg.description,
        tier: pkg.tier,
        durationMinutes: pkg.durationMinutes,
        steps: pkg.steps,
        pricing: pkg.pricing,
        serviceCode: pkg.serviceCode,
        isBuiltIn: true,
      }));
      res.json({ packages: dbPackages, builtInPackages: builtIn });
    } catch (error) {
      console.error("Error fetching service packages:", error);
      res.status(500).json({ message: "Failed to fetch service packages" });
    }
  });

  // Get steps for a specific service code (for preview)
  app.get("/api/service-steps/:code", async (req, res) => {
    const { code } = req.params;
    // Check named packages first
    if (SERVICE_PACKAGES[code]) {
      return res.json({
        code,
        label: SERVICE_PACKAGES[code].label,
        steps: SERVICE_PACKAGES[code].steps,
        durationMinutes: SERVICE_PACKAGES[code].durationMinutes,
      });
    }
    // Check service type config
    const cfg = SERVICE_TYPE_CONFIG[code as ServiceCode];
    if (cfg) {
      return res.json({
        code,
        label: cfg.label,
        steps: cfg.steps,
        durationMinutes: cfg.durationMinutes,
      });
    }
    res.status(404).json({ message: "Service not found" });
  });

  // =====================
  // PARKING
  // =====================
  // Feature gate: all parking endpoints require "parking" feature
  app.use("/api/parking", requireFeature("parking"));

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

      // Fire CRM webhook (non-blocking)
      fireWebhook("parking_entry", { sessionId: session.id, plate: session.plateDisplay, plateNormalized: session.plateNormalized }).catch(() => {});

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
      if (!closedSession) {
        return res.status(500).json({ message: "Failed to close parking session" });
      }

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

      // Fire CRM webhook (non-blocking)
      fireWebhook("parking_exit", { sessionId: closedSession.id, plate: closedSession.plateDisplay, plateNormalized: closedSession.plateNormalized, fee: feeResult.finalFee, durationMinutes: feeResult.durationMinutes }).catch(() => {});

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
          tenantId: "default",
          branchId: null,
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
          tenantId: "default",
          branchId: null,
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

      // Enrich events with user display names
      const allUsers = await storage.getUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const enriched = events.map(event => {
        const user = event.userId ? userMap.get(event.userId) : null;
        return {
          ...event,
          userDisplayName: user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
            : null,
        };
      });

      res.json(enriched);
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

  // Technician performance (customer ratings aggregation)
  app.get("/api/analytics/technician-performance", isAuthenticated, requireRole("manager", "admin"), async (_req, res) => {
    try {
      const performance = await storage.getTechnicianPerformance();
      res.json(performance);
    } catch (error) {
      console.error("Error fetching technician performance:", error);
      res.status(500).json({ message: "Failed to fetch technician performance" });
    }
  });

  // Live queue stats
  app.get("/api/queue/stats", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      // Only show today's jobs in the live queue
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayJobs = await storage.getWashJobs({ fromDate: todayStart });
      const openParking = await storage.getParkingSessions({ open: true });
      const analytics = await storage.getAnalyticsSummary();

      // Calculate priority for active jobs
      const activeJobs = todayJobs.filter(j => j.status !== "complete");
      const jobsWithPriority = await Promise.all(
        activeJobs.map(async (job) => {
          try {
            const { score, factors } = await calculateJobPriority(job);
            return { ...job, priority: score, priorityFactors: factors };
          } catch {
            return { ...job, priority: 0, priorityFactors: {} };
          }
        })
      );

      // Sort by priority descending
      jobsWithPriority.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      res.json({
        activeWashes: activeJobs.length,
        parkedVehicles: openParking.length,
        todayWashes: analytics.todayWashes,
        activeJobs: jobsWithPriority,
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
  // LOYALTY POINTS
  // =====================

  // Combined customer lookup by plate: CRM customer + membership + subscription
  app.get("/api/customer/lookup-by-plate", isAuthenticated, async (req, res) => {
    try {
      const { plate } = req.query;
      if (!plate || typeof plate !== "string") {
        return res.status(400).json({ message: "Plate parameter required" });
      }

      const plateNormalized = normalizePlate(plate);

      const [crmCustomer, crmSubscription, crmMembership] = await Promise.all([
        findCRMCustomerByPlate(plateNormalized).catch(() => null),
        findCRMSubscriptionByPlate(plate).catch(() => null),
        findCRMMembershipByPlate(plateNormalized).catch(() => null),
      ]);

      const isRegistered = !!(crmCustomer || crmMembership);

      res.json({
        isRegistered,
        crmCustomer,
        crmSubscription,
        crmMembership,
      });
    } catch (error) {
      console.error("Error looking up customer by plate:", error);
      res.status(500).json({ message: "Failed to look up customer" });
    }
  });

  // Get loyalty membership by plate (from CRM)
  app.get("/api/loyalty/by-plate", isAuthenticated, async (req, res) => {
    try {
      const { plate } = req.query;
      if (!plate || typeof plate !== "string") {
        return res.status(400).json({ message: "Plate parameter required" });
      }

      const plateNormalized = normalizePlate(plate);
      const membership = await findCRMMembershipByPlate(plateNormalized);

      if (!membership) {
        return res.status(404).json({ message: "No membership found for this plate" });
      }

      res.json(membership);
    } catch (error) {
      console.error("Error fetching loyalty membership:", error);
      res.status(500).json({ message: "Failed to fetch loyalty membership" });
    }
  });

  // Loyalty analytics (CRM members + local transaction history)
  app.get("/api/loyalty/analytics", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const crmAnalytics = await getCRMLoyaltyAnalytics();
      const localTransactions = await storage.getLoyaltyTransactions({ limit: 1000 });

      // Calculate points issued today from local audit log
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTransactions = localTransactions.filter(
        t => t.createdAt && new Date(t.createdAt) >= todayStart && t.points > 0
      );
      const pointsIssuedToday = todayTransactions.reduce((sum, t) => sum + t.points, 0);
      const totalPointsIssued = localTransactions
        .filter(t => t.points > 0)
        .reduce((sum, t) => sum + t.points, 0);

      res.json({
        totalAccounts: crmAnalytics?.totalMembers || 0,
        totalPointsIssued,
        totalPointsRedeemed: 0,
        pointsIssuedToday,
        topEarners: (crmAnalytics?.topMembers || []).map(m => ({
          plateDisplay: m.memberNumber,
          customerName: m.customerName,
          pointsBalance: m.loyaltyPoints,
          totalWashes: 0,
        })),
      });
    } catch (error) {
      console.error("Error fetching loyalty analytics:", error);
      res.status(500).json({ message: "Failed to fetch loyalty analytics" });
    }
  });

  // Get loyalty info for a specific wash job (used on completion screen)
  app.get("/api/loyalty/by-wash-job/:washJobId", isAuthenticated, async (req, res) => {
    try {
      const washJobId = req.params.washJobId as string;
      const job = await storage.getWashJob(washJobId);
      if (!job) {
        return res.status(404).json({ message: "Wash job not found" });
      }

      // Look up CRM membership by plate
      const membership = await findCRMMembershipByPlate(job.plateNormalized);
      if (!membership) {
        return res.json({ account: null, transaction: null });
      }

      // Find the local audit transaction for this wash job
      const transactions = await storage.getLoyaltyTransactions({ limit: 200 });
      const washTransaction = transactions.find(t => t.washJobId === washJobId);

      res.json({
        account: {
          membershipNumber: membership.memberNumber,
          pointsBalance: membership.loyaltyPoints,
          tier: membership.tierName,
          totalWashes: 0,
        },
        transaction: washTransaction ? {
          points: washTransaction.points,
          balanceAfter: washTransaction.balanceAfter,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching loyalty info for wash job:", error);
      res.status(500).json({ message: "Failed to fetch loyalty info" });
    }
  });

  // Manager: Award manual bonus points (credits to CRM)
  app.post("/api/loyalty/bonus", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const schema = z.object({
        plate: z.string().min(1),
        points: z.number().int().min(1),
        description: z.string().optional(),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data" });
      }

      const { plate, points, description } = result.data;
      const opUserId = req.user?.claims?.sub;
      const plateNormalized = normalizePlate(plate);

      // Find membership in CRM
      const membership = await findCRMMembershipByPlate(plateNormalized);
      if (!membership) {
        return res.status(404).json({ message: "No CRM membership found for this plate" });
      }

      // Credit to CRM
      const creditResult = await creditCRMLoyaltyPoints(membership.userId, points);
      const newBalance = creditResult?.newBalance ?? (membership.loyaltyPoints + points);

      // Log locally
      await storage.logLoyaltyTransaction({
        crmUserId: membership.userId,
        memberNumber: membership.memberNumber,
        type: "earn_bonus",
        points,
        balanceAfter: newBalance,
        description: description || `Bonus ${points} points awarded by manager`,
        createdBy: opUserId,
      });

      await storage.logEvent({
        type: "loyalty_bonus_awarded",
        plateDisplay: displayPlate(plate),
        plateNormalized,
        userId: opUserId,
        payloadJson: { points, balanceAfter: newBalance, memberNumber: membership.memberNumber },
      });

      res.json({ membership: { ...membership, loyaltyPoints: newBalance }, points });
    } catch (error) {
      console.error("Error awarding bonus points:", error);
      res.status(500).json({ message: "Failed to award bonus points" });
    }
  });

  // =====================
  // MANAGER BOOKING MANAGEMENT (Admin/Manager only)
  // =====================

  // Get all bookings with filters
  app.get("/api/manager/bookings", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { status, fromDate, toDate, search, limit, offset } = req.query;

      console.log("Manager Bookings API: Request received with query:", req.query);

      const filters: any = {};
      if (status && typeof status === "string") filters.status = status;
      if (fromDate && typeof fromDate === "string") filters.fromDate = new Date(fromDate);
      if (toDate && typeof toDate === "string") filters.toDate = new Date(toDate);
      if (search && typeof search === "string") filters.customerSearch = search;
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await getManagerBookings(filters);

      // If there's an error (like DB not connected), log it
      if (result.error) {
        console.warn("Manager Bookings API: Error -", result.technicalError || result.error);
      }

      // Only include technical error for super admin
      const isSuperAdminUser = (req as any).user?.isSuperAdmin === true;
      const response: any = {
        bookings: result.bookings,
        total: result.total,
      };

      if (result.error) {
        response.error = result.error;
        // Only super admin sees technical details
        if (isSuperAdminUser && result.technicalError) {
          response.technicalError = result.technicalError;
        }
      }

      res.json(response);
    } catch (error) {
      console.error("Error fetching manager bookings:", error);
      const isSuperAdminUser = (req as any).user?.isSuperAdmin === true;
      res.status(500).json({
        message: "Failed to fetch bookings",
        technicalError: isSuperAdminUser ? String(error) : undefined
      });
    }
  });

  // Get single booking details
  app.get("/api/manager/bookings/:id", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const booking = await getBookingById(id);

      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking details:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  // Update booking (reschedule, change service, update notes)
  app.patch("/api/manager/bookings/:id", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.claims?.sub;

      const updateSchema = z.object({
        bookingDate: z.string().optional(),
        timeSlot: z.string().optional(),
        serviceId: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW", "READY_FOR_PICKUP"]).optional(),
        reason: z.string().optional(), // reason for change, included in notification
      });

      const result = updateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid update data", errors: result.error.errors });
      }

      const { reason, ...updates } = result.data;

      // Fetch original booking before changes (for notification diff)
      const originalBooking = await getBookingById(id);
      if (!originalBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // If rescheduling, check time slot availability
      if (updates.bookingDate || updates.timeSlot) {
        const newDate = updates.bookingDate ? new Date(updates.bookingDate) : originalBooking.bookingDate;
        const newTimeSlot = updates.timeSlot || originalBooking.timeSlot;
        const isAvailable = await isTimeSlotAvailable(newDate, newTimeSlot, id);
        if (!isAvailable) {
          return res.status(409).json({ message: "Time slot is not available" });
        }
      }

      const updateData: any = {};
      if (updates.bookingDate) updateData.bookingDate = new Date(updates.bookingDate);
      if (updates.timeSlot) updateData.timeSlot = updates.timeSlot;
      if (updates.serviceId) updateData.serviceId = updates.serviceId;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.status) updateData.status = updates.status;

      const success = await updateBooking(id, updateData);
      if (!success) {
        return res.status(500).json({ message: "Failed to update booking" });
      }

      // Detect change type and queue customer notification
      const changeSummary = detectBookingChangeType(originalBooking, updateData);
      const notificationId = await queueBookingNotification(
        changeSummary.type,
        {
          customerName: originalBooking.customerName,
          customerEmail: originalBooking.customerEmail,
          customerPhone: originalBooking.customerPhone,
          bookingReference: originalBooking.bookingReference,
          licensePlate: originalBooking.licensePlate,
          vehicleMake: originalBooking.vehicleMake,
          vehicleModel: originalBooking.vehicleModel,
          serviceName: originalBooking.serviceName,
          originalDate: originalBooking.bookingDate,
          originalTimeSlot: originalBooking.timeSlot,
          newDate: updateData.bookingDate || originalBooking.bookingDate,
          newTimeSlot: updateData.timeSlot || originalBooking.timeSlot,
          reason,
          bookingId: id,
        },
        userId
      );

      await storage.logEvent({
        type: "booking_modified",
        userId,
        payloadJson: {
          bookingId: id,
          updates: updateData,
          modifiedBy: userId,
          modifiedAt: new Date().toISOString(),
          notificationQueued: !!notificationId,
          notificationId,
        },
      });

      const updatedBooking = await getBookingById(id);
      res.json({
        message: "Booking updated successfully",
        booking: updatedBooking,
        notificationQueued: !!notificationId,
        notificationId,
      });
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Cancel booking
  app.delete("/api/manager/bookings/:id", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.claims?.sub;
      const { reason } = req.body || {};

      const booking = await getBookingById(id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (booking.status === "CANCELLED") {
        return res.status(400).json({ message: "Booking is already cancelled" });
      }

      if (booking.status === "COMPLETED") {
        return res.status(400).json({ message: "Cannot cancel a completed booking" });
      }

      const success = await cancelBooking(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to cancel booking" });
      }

      // Queue cancellation notification
      const notificationId = await queueBookingNotification(
        "BOOKING_CANCELLED",
        {
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          bookingReference: booking.bookingReference,
          licensePlate: booking.licensePlate,
          vehicleMake: booking.vehicleMake,
          vehicleModel: booking.vehicleModel,
          serviceName: booking.serviceName,
          originalDate: booking.bookingDate,
          originalTimeSlot: booking.timeSlot,
          reason,
          bookingId: id,
        },
        userId
      );

      await storage.logEvent({
        type: "booking_cancelled",
        userId,
        payloadJson: {
          bookingId: id,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          bookingDate: booking.bookingDate,
          timeSlot: booking.timeSlot,
          cancelledBy: userId,
          cancelledAt: new Date().toISOString(),
          notificationQueued: !!notificationId,
          notificationId,
        },
      });

      res.json({ message: "Booking cancelled successfully", notificationQueued: !!notificationId, notificationId });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  // =====================
  // BOOKING NOTIFICATIONS
  // =====================

  // Preview a notification before sending manually
  app.post("/api/manager/notifications/preview", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { bookingId, type, reason } = req.body;
      if (!bookingId || !type) {
        return res.status(400).json({ message: "bookingId and type are required" });
      }

      const validTypes: BookingNotificationType[] = ["BOOKING_CANCELLED", "BOOKING_MODIFIED", "BOOKING_RESCHEDULED"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid notification type" });
      }

      const booking = await getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const { subject, body } = renderBookingNotification(type as BookingNotificationType, {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        bookingReference: booking.bookingReference,
        licensePlate: booking.licensePlate,
        vehicleMake: booking.vehicleMake,
        vehicleModel: booking.vehicleModel,
        serviceName: booking.serviceName,
        originalDate: booking.bookingDate,
        originalTimeSlot: booking.timeSlot,
        reason,
        bookingId,
      });

      res.json({ subject, body, customerEmail: booking.customerEmail, customerPhone: booking.customerPhone });
    } catch (error) {
      console.error("Error previewing notification:", error);
      res.status(500).json({ message: "Failed to generate preview" });
    }
  });

  // Manually queue/send a notification
  app.post("/api/manager/notifications/send", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { bookingId, type, subject, body, reason } = req.body;
      const userId = (req as any).user?.claims?.sub;

      if (!bookingId || !type || !body) {
        return res.status(400).json({ message: "bookingId, type, and body are required" });
      }

      const booking = await getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const notificationId = await queueBookingNotification(
        type as BookingNotificationType,
        {
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          bookingReference: booking.bookingReference,
          licensePlate: booking.licensePlate,
          vehicleMake: booking.vehicleMake,
          vehicleModel: booking.vehicleModel,
          serviceName: booking.serviceName,
          originalDate: booking.bookingDate,
          originalTimeSlot: booking.timeSlot,
          reason,
          bookingId,
        },
        userId
      );

      if (!notificationId) {
        return res.status(500).json({ message: "Failed to queue notification" });
      }

      // Mark as sent immediately (manual trigger)
      await markNotificationSent(notificationId);

      await storage.logEvent({
        type: "notification_sent_manual",
        userId,
        payloadJson: { notificationId, bookingId, notificationType: type, customerEmail: booking.customerEmail },
      });

      res.json({ message: "Notification queued successfully", notificationId });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Get available services
  app.get("/api/manager/services", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const services = await getCRMServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // Get available time slots for a date
  app.get("/api/manager/timeslots", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { date } = req.query;
      if (!date || typeof date !== "string") {
        return res.status(400).json({ message: "Date parameter required" });
      }

      const slots = await getAvailableTimeSlots(new Date(date));
      res.json(slots);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      res.status(500).json({ message: "Failed to fetch time slots" });
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

      // Get the user first to check if they're the super admin
      const allUsers = await storage.getUsers();
      const targetUser = allUsers.find(u => u.id === userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Protect super admin from role changes
      if (isSuperAdmin(targetUser.email)) {
        return res.status(403).json({ message: "Cannot modify super admin account" });
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

      // Get the user first to check if they're the super admin
      const allUsers = await storage.getUsers();
      const targetUser = allUsers.find(u => u.id === userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Protect super admin from being disabled
      if (isSuperAdmin(targetUser.email)) {
        return res.status(403).json({ message: "Cannot disable super admin account" });
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
  // TECHNICIAN TIME TRACKING
  // =====================

  // Get current clock-in status for the logged-in technician
  app.get("/api/time/status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const activeLog = await storage.getActiveTimeLog(userId);
      res.json({ clockedIn: !!activeLog, activeLog: activeLog || null });
    } catch (error) {
      res.status(500).json({ message: "Failed to get time status" });
    }
  });

  // Clock in
  app.post("/api/time/clock-in", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { notes } = req.body;

      // Check if already clocked in
      const existing = await storage.getActiveTimeLog(userId);
      if (existing) {
        return res.status(400).json({ message: "Already clocked in" });
      }

      const log = await storage.clockIn(userId, notes);
      await storage.logEvent({ type: "clock_in", userId, payloadJson: { logId: log.id } });
      res.json({ message: "Clocked in successfully", log });
    } catch (error) {
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  // Clock out
  app.post("/api/time/clock-out", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;

      const activeLog = await storage.getActiveTimeLog(userId);
      if (!activeLog) {
        return res.status(400).json({ message: "Not currently clocked in" });
      }

      const log = await storage.clockOut(activeLog.id);
      await storage.logEvent({ type: "clock_out", userId, payloadJson: { logId: activeLog.id, totalMinutes: log?.totalMinutes } });
      res.json({ message: "Clocked out successfully", log });
    } catch (error) {
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // Log a break start
  app.post("/api/time/break/start", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { type, notes } = req.body;

      if (!["lunch", "short", "absent"].includes(type)) {
        return res.status(400).json({ message: "Invalid break type" });
      }

      const activeLog = await storage.getActiveTimeLog(userId);
      if (!activeLog) {
        return res.status(400).json({ message: "Not clocked in" });
      }

      const log = await storage.addBreakLog(activeLog.id, { type, notes });
      res.json({ message: "Break started", log });
    } catch (error) {
      res.status(500).json({ message: "Failed to start break" });
    }
  });

  // End a break
  app.post("/api/time/break/end", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;

      const activeLog = await storage.getActiveTimeLog(userId);
      if (!activeLog) {
        return res.status(400).json({ message: "Not clocked in" });
      }

      const log = await storage.endBreakLog(activeLog.id);
      res.json({ message: "Break ended", log });
    } catch (error) {
      res.status(500).json({ message: "Failed to end break" });
    }
  });

  // Get my own time logs (technician)
  app.get("/api/time/logs", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { fromDate, toDate } = req.query;

      const logs = await storage.getTimeLogs({
        technicianId: userId,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        limit: 50,
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get time logs" });
    }
  });

  // Manager/Admin: Get all time logs (roster view)
  app.get("/api/manager/roster", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { technicianId, fromDate, toDate } = req.query;

      const logs = await storage.getTimeLogs({
        technicianId: technicianId as string | undefined,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        limit: 200,
      });

      // Attach user details to each log
      const allUsers = await storage.getUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const enriched = logs.map(log => ({
        ...log,
        technician: userMap.get(log.technicianId) || null,
      }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to get roster" });
    }
  });

  // Manager/Admin: Who is currently clocked in
  app.get("/api/manager/roster/active", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const logs = await storage.getTimeLogs({ limit: 200 });
      const activeLogs = logs.filter(l => !l.clockOutAt);

      const allUsers = await storage.getUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const enriched = activeLogs.map(log => ({
        ...log,
        technician: userMap.get(log.technicianId) || null,
      }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active roster" });
    }
  });

  // Manager/Admin: Force clock-out a technician who forgot to clock out
  app.post("/api/manager/roster/force-clockout/:logId", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const logId = String(req.params.logId);
      const managerId = (req as any).user?.claims?.sub;

      const log = await storage.clockOut(logId);
      if (!log) {
        return res.status(404).json({ message: "Time log not found or already clocked out" });
      }

      storage.logEvent({
        type: "force_clock_out",
        userId: managerId,
        payloadJson: { logId, technicianId: log.technicianId, totalMinutes: log.totalMinutes },
      }).catch((err: Error) => console.error("Failed to log force_clock_out event:", err));

      res.json({ message: "Technician clocked out successfully", log });
    } catch (error) {
      console.error("POST /api/manager/roster/force-clockout error:", error);
      res.status(500).json({ message: "Failed to force clock-out" });
    }
  });

  // =====================
  // STAFF ALERTS (running late, absent, etc.)
  // =====================

  // Technician: Send an alert to management
  app.post("/api/time/alert", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { type, message, estimatedArrival } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      if (!type || !["running_late", "absent", "emergency", "other"].includes(type)) {
        return res.status(400).json({ message: "Invalid alert type" });
      }

      const alert = await storage.createStaffAlert({
        technicianId: String(userId),
        type,
        message: message || undefined,
        estimatedArrival: estimatedArrival || undefined,
      });

      // Log event in background — don't block the response
      storage.logEvent({
        type: "staff_alert",
        userId: String(userId),
        payloadJson: { alertId: alert.id, alertType: type },
      }).catch(err => console.error("Failed to log staff_alert event:", err));

      res.json({ alert });
    } catch (error) {
      console.error("POST /api/time/alert error:", error);
      res.status(500).json({ message: "Failed to send alert" });
    }
  });

  // Manager/Admin: Get staff alerts
  app.get("/api/manager/alerts", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const { unacknowledgedOnly } = req.query;
      const alerts = await storage.getStaffAlerts({
        unacknowledgedOnly: unacknowledgedOnly === "true",
      });

      const allUsers = await storage.getUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const enriched = alerts.map(a => ({
        ...a,
        technician: userMap.get(a.technicianId) || null,
      }));

      res.json(enriched);
    } catch (error) {
      console.error("GET /api/manager/alerts error:", error);
      res.status(500).json({ message: "Failed to get alerts" });
    }
  });

  // Manager/Admin: Acknowledge a staff alert
  app.patch("/api/manager/alerts/:id/acknowledge", isAuthenticated, requireRole("manager", "admin"), async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const alertId = String(req.params.id);
      const alert = await storage.acknowledgeStaffAlert(alertId, String(userId));
      if (!alert) return res.status(404).json({ message: "Alert not found" });
      res.json({ alert });
    } catch (error) {
      res.status(500).json({ message: "Failed to acknowledge alert" });
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

      // Push notification to managers if issue reported
      if (issueReported) {
        try {
          const job = await storage.getWashJob(access.washJobId);
          await sendPushToAllManagers({
            title: "Issue Reported",
            body: `Customer reported an issue${job ? ` for ${job.plateDisplay}` : ""}: ${typeof issueReported === "string" ? issueReported : "See details"}`,
            url: "/manager/dashboard",
            tag: `issue-${access.washJobId}`,
          });
        } catch (_pushErr) { /* non-blocking */ }
      }

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
    servicePackageCode: z.string().optional(), // Named package (e.g. "VAMOS", "LA_OBRA")
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

      const { plateDisplay, customerName, customerEmail, serviceCode, servicePackageCode, serviceChecklist } = result.data;

      // Resolve steps: explicit checklist > named package > service type config > fallback
      let resolvedSteps: string[] = [];
      let resolvedServiceCode = serviceCode || "STANDARD";
      if (serviceChecklist && serviceChecklist.length > 0) {
        resolvedSteps = serviceChecklist;
      } else if (servicePackageCode && SERVICE_PACKAGES[servicePackageCode]) {
        const pkg = SERVICE_PACKAGES[servicePackageCode];
        resolvedSteps = pkg.steps;
        resolvedServiceCode = pkg.serviceCode;
      } else if (resolvedServiceCode && SERVICE_TYPE_CONFIG[resolvedServiceCode as ServiceCode]) {
        resolvedSteps = SERVICE_TYPE_CONFIG[resolvedServiceCode as ServiceCode].steps;
      }

      // Create wash job
      const job = await storage.createWashJob({
        plateDisplay: displayPlate(plateDisplay),
        plateNormalized: normalizePlate(plateDisplay),
        countryHint: "OTHER",
        technicianId: "integration",
        status: "received",
        serviceCode: resolvedServiceCode,
        startAt: new Date(),
      });

      // Create customer access token
      const token = generateJobToken();
      const access = await storage.createCustomerJobAccess({
        washJobId: job.id,
        token,
        customerName: customerName || null,
        customerEmail: customerEmail || null,
        serviceCode: servicePackageCode || resolvedServiceCode || null,
      });

      // Create service checklist items from resolved steps
      const checklistItems = resolvedSteps.length > 0 ? resolvedSteps : WASH_STATUS_ORDER.filter(s => s !== "received");
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

      // Fire CRM webhook (non-blocking)
      fireWebhook("wash_created", { jobId: job.id, plate: job.plateDisplay, plateNormalized: job.plateNormalized, serviceCode: job.serviceCode, status: job.status, source: "integration" }).catch(() => {});

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
  // TENANTS & BRANCHES (Multi-tenancy)
  // =====================

  // --- Tenant Branding (public for login page) ---
  app.get("/api/public/branding/:slug", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySlug(req.params.slug as string);
      if (!tenant || !tenant.isActive) return res.status(404).json({ message: "Tenant not found" });
      res.json({
        name: tenant.name,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        logoUrl: tenant.logoUrl,
        faviconUrl: tenant.faviconUrl,
      });
    } catch (error) {
      console.error("Error fetching public branding:", error);
      res.status(500).json({ message: "Failed to fetch branding" });
    }
  });

  // --- Tenant Branding (authenticated) ---
  app.get("/api/tenant/branding", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.tenantId || "default";
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant branding:", error);
      res.status(500).json({ message: "Failed to fetch branding" });
    }
  });

  app.put("/api/tenant/branding", isAuthenticated, requireRole("admin"), async (req: any, res) => {
    try {
      const tenantId = req.tenantId || "default";
      const { primaryColor, secondaryColor, logoUrl, faviconUrl, customDomain } = req.body;
      const tenant = await storage.updateTenant(tenantId, { primaryColor, secondaryColor, logoUrl, faviconUrl, customDomain });
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant branding:", error);
      res.status(500).json({ message: "Failed to update branding" });
    }
  });

  // --- Branches ---
  app.get("/api/branches", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.tenantId || "default";
      const result = await storage.getBranches(tenantId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.post("/api/branches", isAuthenticated, requireRole("admin"), async (req: any, res) => {
    try {
      const tenantId = req.tenantId || "default";
      const branch = await storage.createBranch({ ...req.body, tenantId });
      res.status(201).json(branch);
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ message: "Failed to create branch" });
    }
  });

  app.get("/api/branches/:id", isAuthenticated, async (req: any, res) => {
    try {
      const branch = await storage.getBranch(req.params.id as string);
      if (!branch) return res.status(404).json({ message: "Branch not found" });
      res.json(branch);
    } catch (error) {
      console.error("Error fetching branch:", error);
      res.status(500).json({ message: "Failed to fetch branch" });
    }
  });

  app.patch("/api/branches/:id", isAuthenticated, requireRole("admin"), async (req: any, res) => {
    try {
      const branch = await storage.updateBranch(req.params.id as string, req.body);
      if (!branch) return res.status(404).json({ message: "Branch not found" });
      res.json(branch);
    } catch (error) {
      console.error("Error updating branch:", error);
      res.status(500).json({ message: "Failed to update branch" });
    }
  });

  // --- Admin Tenant Management (Super Admin) ---
  app.get("/api/admin/tenants", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const result = await storage.getTenants();
      res.json(result);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.post("/api/admin/tenants", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const { name, slug, plan } = req.body;
      if (!name || !slug) return res.status(400).json({ message: "name and slug are required" });
      // Check slug uniqueness
      const existing = await storage.getTenantBySlug(slug);
      if (existing) return res.status(409).json({ message: "Slug already in use" });
      const tenant = await storage.createTenant({ name, slug, plan: plan || "free" });
      // Create a default branch for the new tenant
      const branch = await storage.createBranch({ tenantId: tenant.id, name: "Main Branch" });
      res.status(201).json({ tenant, branch });
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  app.get("/api/admin/tenants/:id", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id as string);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      const tenantBranches = await storage.getBranches(tenant.id);
      res.json({ ...tenant, branches: tenantBranches });
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/admin/tenants/:id", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const tenant = await storage.updateTenant(req.params.id as string, req.body);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  app.delete("/api/admin/tenants/:id", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      // Soft delete: set isActive = false
      const tenant = await storage.updateTenant(req.params.id as string, { isActive: false });
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json({ message: "Tenant deactivated", tenant });
    } catch (error) {
      console.error("Error deactivating tenant:", error);
      res.status(500).json({ message: "Failed to deactivate tenant" });
    }
  });

  // =====================
  // INVENTORY
  // =====================
  // Feature gate: all inventory endpoints require "inventory" feature
  app.use("/api/inventory", requireFeature("inventory"));

  // --- Inventory Items ---
  app.get("/api/inventory/items", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const { category, lowStock, active } = req.query;
      const items = await storage.getInventoryItems({
        category: category as string | undefined,
        lowStock: lowStock === "true",
        active: active !== undefined ? active === "true" : undefined,
      });
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  app.post("/api/inventory/items", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const item = await storage.createInventoryItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.get("/api/inventory/items/:id", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id as string);
      if (!item) return res.status(404).json({ message: "Item not found" });
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.patch("/api/inventory/items/:id", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const item = await storage.updateInventoryItem(req.params.id as string, req.body);
      if (!item) return res.status(404).json({ message: "Item not found" });
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.post("/api/inventory/items/:id/adjust", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const { quantity, notes } = req.body;
      if (typeof quantity !== "number") return res.status(400).json({ message: "quantity is required" });
      const item = await storage.adjustInventoryStock(req.params.id as string, quantity);
      if (!item) return res.status(404).json({ message: "Item not found" });
      // Log the manual adjustment as a consumption record for audit trail
      if (quantity !== 0) {
        await storage.logEvent({
          type: "inventory_adjustment",
          userId: req.user?.id,
          payloadJson: { itemId: req.params.id, quantity, notes, itemName: item.name },
        });
      }
      res.json(item);
    } catch (error) {
      console.error("Error adjusting inventory stock:", error);
      res.status(500).json({ message: "Failed to adjust stock" });
    }
  });

  // --- Suppliers ---
  app.get("/api/inventory/suppliers", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const activeOnly = req.query.active === "true";
      const result = await storage.getSuppliers(activeOnly || undefined);
      res.json(result);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/inventory/suppliers", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const supplier = await storage.createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.get("/api/inventory/suppliers/:id", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id as string);
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.patch("/api/inventory/suppliers/:id", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const supplier = await storage.updateSupplier(req.params.id as string, req.body);
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  // --- Inventory Consumption ---
  app.get("/api/inventory/consumption", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const { itemId, fromDate, toDate } = req.query;
      const result = await storage.getInventoryConsumption({
        itemId: itemId as string | undefined,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching consumption:", error);
      res.status(500).json({ message: "Failed to fetch consumption records" });
    }
  });

  app.post("/api/inventory/consumption", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const record = await storage.logInventoryConsumption({
        ...req.body,
        createdBy: req.user?.id,
      });
      res.status(201).json(record);
    } catch (error) {
      console.error("Error logging consumption:", error);
      res.status(500).json({ message: "Failed to log consumption" });
    }
  });

  // --- Purchase Orders ---
  app.get("/api/inventory/purchase-orders", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const { status, supplierId } = req.query;
      const result = await storage.getPurchaseOrders({
        status: status as string | undefined,
        supplierId: supplierId as string | undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.post("/api/inventory/purchase-orders", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const order = await storage.createPurchaseOrder({
        ...req.body,
        createdBy: req.user?.id,
      });
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.get("/api/inventory/purchase-orders/:id", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const order = await storage.getPurchaseOrder(req.params.id as string);
      if (!order) return res.status(404).json({ message: "Purchase order not found" });
      res.json(order);
    } catch (error) {
      console.error("Error fetching purchase order:", error);
      res.status(500).json({ message: "Failed to fetch purchase order" });
    }
  });

  app.patch("/api/inventory/purchase-orders/:id", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const order = await storage.updatePurchaseOrder(req.params.id as string, req.body);
      if (!order) return res.status(404).json({ message: "Purchase order not found" });
      res.json(order);
    } catch (error) {
      console.error("Error updating purchase order:", error);
      res.status(500).json({ message: "Failed to update purchase order" });
    }
  });

  app.post("/api/inventory/purchase-orders/:id/receive", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const order = await storage.receivePurchaseOrder(req.params.id as string);
      if (!order) return res.status(404).json({ message: "Purchase order not found" });
      await storage.logEvent({
        type: "purchase_order_received",
        userId: req.user?.id,
        payloadJson: { orderId: order.id, supplierId: order.supplierId, totalCost: order.totalCost },
      });
      res.json(order);
    } catch (error) {
      console.error("Error receiving purchase order:", error);
      res.status(500).json({ message: "Failed to receive purchase order" });
    }
  });

  // --- Inventory Analytics & Alerts ---
  app.get("/api/inventory/analytics", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const analytics = await storage.getInventoryAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching inventory analytics:", error);
      res.status(500).json({ message: "Failed to fetch inventory analytics" });
    }
  });

  app.get("/api/inventory/low-stock", isAuthenticated, requireRole("manager", "admin"), async (req: any, res) => {
    try {
      const items = await storage.getLowStockItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching low-stock items:", error);
      res.status(500).json({ message: "Failed to fetch low-stock items" });
    }
  });

  // =====================
  // BILLING
  // =====================

  // Tenant admin: own billing usage
  app.get("/api/tenant/billing/usage", isAuthenticated, requireRole("admin"), async (req: any, res) => {
    try {
      const tenantId = req.tenantId || "default";
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });

      // Get current month usage in real-time
      const { db: dbRef } = await import("./db");
      const { washJobs, parkingSessions, users: usersTable, branches: branchesTable } = await import("@shared/schema");
      const { eq, and, gte, sql: sqlFn } = await import("drizzle-orm");
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [washCount] = await dbRef.select({ count: sqlFn<number>`count(*)::int` }).from(washJobs).where(and(eq(washJobs.tenantId, tenantId), gte(washJobs.createdAt, startOfMonth)));
      const [parkingCount] = await dbRef.select({ count: sqlFn<number>`count(*)::int` }).from(parkingSessions).where(and(eq(parkingSessions.tenantId, tenantId), gte(parkingSessions.createdAt, startOfMonth)));
      const [userCount] = await dbRef.select({ count: sqlFn<number>`count(*)::int` }).from(usersTable).where(and(eq(usersTable.tenantId, tenantId), eq(usersTable.isActive, true)));
      const [branchCount] = await dbRef.select({ count: sqlFn<number>`count(*)::int` }).from(branchesTable).where(and(eq(branchesTable.tenantId, tenantId), eq(branchesTable.isActive, true)));

      res.json({
        plan: tenant.plan,
        washCount: washCount?.count || 0,
        parkingSessionCount: parkingCount?.count || 0,
        activeUserCount: userCount?.count || 0,
        branchCount: branchCount?.count || 0,
      });
    } catch (error) {
      console.error("Error fetching billing usage:", error);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });

  // Super admin: all tenants billing overview
  app.get("/api/admin/billing", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const { db: dbRef } = await import("./db");
      const { billingSnapshots } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      const snapshots = await dbRef.select().from(billingSnapshots).orderBy(desc(billingSnapshots.month));
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching billing:", error);
      res.status(500).json({ message: "Failed to fetch billing" });
    }
  });

  // Super admin: trigger snapshot generation
  app.post("/api/admin/billing/snapshot", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const month = req.body.month || new Date().toISOString().slice(0, 7);
      const count = await generateAllSnapshots(month);
      res.json({ message: `Generated snapshots for ${count} tenants`, month });
    } catch (error) {
      console.error("Error generating snapshots:", error);
      res.status(500).json({ message: "Failed to generate snapshots" });
    }
  });

  // =====================
  // FEATURE FLAGS
  // =====================

  // Get current tenant's enabled features
  app.get("/api/features", isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.tenantId || "default";
      const features = await getEnabledFeatures(tenantId);
      res.json({ features });
    } catch (error) {
      console.error("Error fetching features:", error);
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  // Super admin: list all feature flags
  app.get("/api/admin/features", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const { db: dbRef } = await import("./db");
      const { featureFlags } = await import("@shared/schema");
      const flags = await dbRef.select().from(featureFlags);
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  // Super admin: seed default feature flags
  app.post("/api/admin/features/seed", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      await seedFeatureFlags();
      res.json({ message: "Feature flags seeded" });
    } catch (error) {
      console.error("Error seeding features:", error);
      res.status(500).json({ message: "Failed to seed features" });
    }
  });

  // Super admin: set feature overrides for a tenant
  app.put("/api/admin/tenants/:id/features", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const tenantId = req.params.id as string;
      const { overrides } = req.body; // [{ featureCode: string, enabled: boolean }]
      if (!Array.isArray(overrides)) return res.status(400).json({ message: "overrides array required" });

      const { db: dbRef } = await import("./db");
      const { tenantFeatureOverrides } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");

      for (const override of overrides) {
        const [existing] = await dbRef.select().from(tenantFeatureOverrides).where(
          and(eq(tenantFeatureOverrides.tenantId, tenantId), eq(tenantFeatureOverrides.featureCode, override.featureCode))
        );
        if (existing) {
          await dbRef.update(tenantFeatureOverrides).set({ enabled: override.enabled, updatedAt: new Date() }).where(eq(tenantFeatureOverrides.id, existing.id));
        } else {
          await dbRef.insert(tenantFeatureOverrides).values({ tenantId, featureCode: override.featureCode, enabled: override.enabled });
        }
      }

      const features = await getEnabledFeatures(tenantId);
      res.json({ features });
    } catch (error) {
      console.error("Error setting feature overrides:", error);
      res.status(500).json({ message: "Failed to set feature overrides" });
    }
  });

  // =====================
  // GLOBAL ANALYTICS (Super Admin)
  // =====================

  app.get("/api/admin/analytics/global", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const { db: dbRef } = await import("./db");
      const { tenants: tenantsTable, washJobs: wjTable, parkingSessions: psTable } = await import("@shared/schema");
      const { sql: sqlFn, eq, gte } = await import("drizzle-orm");

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Total tenants
      const [tenantCount] = await dbRef.select({ count: sqlFn<number>`count(*)::int` }).from(tenantsTable);

      // Total washes this month
      const [washCount] = await dbRef.select({ count: sqlFn<number>`count(*)::int` }).from(wjTable).where(gte(wjTable.createdAt, startOfMonth));

      // Total parking sessions this month
      const [parkCount] = await dbRef.select({ count: sqlFn<number>`count(*)::int` }).from(psTable).where(gte(psTable.createdAt, startOfMonth));

      // Top tenants by wash count
      const topTenants = await dbRef
        .select({
          tenantId: wjTable.tenantId,
          tenantName: tenantsTable.name,
          washCount: sqlFn<number>`count(*)::int`,
        })
        .from(wjTable)
        .leftJoin(tenantsTable, eq(wjTable.tenantId, tenantsTable.id))
        .where(gte(wjTable.createdAt, startOfMonth))
        .groupBy(wjTable.tenantId, tenantsTable.name)
        .orderBy(sqlFn`count(*) desc`)
        .limit(10);

      // Plan distribution
      const planDist = await dbRef
        .select({ plan: tenantsTable.plan, count: sqlFn<number>`count(*)::int` })
        .from(tenantsTable)
        .where(eq(tenantsTable.isActive, true))
        .groupBy(tenantsTable.plan);

      res.json({
        totalTenants: tenantCount?.count || 0,
        monthlyWashes: washCount?.count || 0,
        monthlyParkingSessions: parkCount?.count || 0,
        topTenants,
        planDistribution: planDist,
      });
    } catch (error) {
      console.error("Error fetching global analytics:", error);
      res.status(500).json({ message: "Failed to fetch global analytics" });
    }
  });

  app.get("/api/admin/analytics/trends", isAuthenticated, requireSuperAdminMiddleware(), async (req: any, res) => {
    try {
      const { db: dbRef } = await import("./db");
      const { washJobs: wjTable, tenants: tenantsTable } = await import("@shared/schema");
      const { sql: sqlFn, gte } = await import("drizzle-orm");

      const months = parseInt(req.query.months as string) || 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Monthly wash counts
      const monthlyWashes = await dbRef
        .select({
          month: sqlFn<string>`to_char(${wjTable.createdAt}, 'YYYY-MM')`,
          count: sqlFn<number>`count(*)::int`,
        })
        .from(wjTable)
        .where(gte(wjTable.createdAt, startDate))
        .groupBy(sqlFn`to_char(${wjTable.createdAt}, 'YYYY-MM')`)
        .orderBy(sqlFn`to_char(${wjTable.createdAt}, 'YYYY-MM')`);

      // Monthly new tenants
      const monthlyTenants = await dbRef
        .select({
          month: sqlFn<string>`to_char(${tenantsTable.createdAt}, 'YYYY-MM')`,
          count: sqlFn<number>`count(*)::int`,
        })
        .from(tenantsTable)
        .where(gte(tenantsTable.createdAt, startDate))
        .groupBy(sqlFn`to_char(${tenantsTable.createdAt}, 'YYYY-MM')`)
        .orderBy(sqlFn`to_char(${tenantsTable.createdAt}, 'YYYY-MM')`);

      res.json({ monthlyWashes, monthlyTenants });
    } catch (error) {
      console.error("Error fetching trends:", error);
      res.status(500).json({ message: "Failed to fetch trends" });
    }
  });

  // =====================
  // OCR — plate candidate extraction
  // =====================

  app.post("/api/ocr/plate-candidates", isAuthenticated, async (req, res) => {
    try {
      const { image } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ message: "Missing base64 image data" });
      }

      const { recognizePlate } = await import("./lib/ocr-service");
      const candidates = await recognizePlate(image);

      res.json({ candidates });
    } catch (error) {
      console.error("OCR error:", error);
      res.json({ candidates: [], message: "OCR processing failed" });
    }
  });

  return httpServer;
}
