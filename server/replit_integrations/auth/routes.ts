import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { storage } from "../../storage";
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from "../../lib/roles";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      // Handle both credentials and Replit auth
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // For credentials users, get from main storage (includes role)
      if (req.user?.authType === "credentials") {
        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if super admin
        const isSuper = isSuperAdmin(user.email);
        return res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: isSuper ? "super_admin" : (user.role || "technician"),
          isSuperAdmin: isSuper,
          profileImageUrl: user.profileImageUrl,
          authType: "credentials",
        });
      }

      // For Replit OAuth users, get from auth storage and fetch role separately
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get role from userRoles table for Replit users
      const userRole = await storage.getUserRole(userId);

      // Check if super admin
      const isSuper = isSuperAdmin(user.email);

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: isSuper ? "super_admin" : (userRole?.role || "technician"),
        isSuperAdmin: isSuper,
        profileImageUrl: user.profileImageUrl,
        authType: "replit",
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
