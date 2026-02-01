import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "../storage";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateJobToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export async function authenticateWithCredentials(email: string, password: string): Promise<AuthResult> {
  const user = await storage.getUserByEmail(email);
  
  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }
  
  if (!user.passwordHash) {
    return { success: false, error: "This account uses Replit authentication" };
  }
  
  if (!user.isActive) {
    return { success: false, error: "Account is disabled" };
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    return { success: false, error: "Invalid email or password" };
  }
  
  return { success: true, user };
}

export async function createCredentialsUser(
  email: string,
  password: string,
  role: "technician" | "manager" | "admin",
  name?: string
): Promise<User> {
  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();
  
  const user = await storage.createUser({
    id,
    email,
    passwordHash,
    role,
    firstName: name?.split(" ")[0] || null,
    lastName: name?.split(" ").slice(1).join(" ") || null,
    isActive: true,
  });
  
  return user;
}

export async function seedUsers() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const managerEmail = process.env.MANAGER_EMAIL;
  const managerPassword = process.env.MANAGER_PASSWORD;
  const techEmail = process.env.TECH_EMAIL;
  const techPassword = process.env.TECH_PASSWORD;
  
  const usersToSeed = [];
  
  if (adminEmail && adminPassword) {
    const existing = await storage.getUserByEmail(adminEmail);
    if (!existing) {
      usersToSeed.push({ email: adminEmail, password: adminPassword, role: "admin" as const, name: "Admin User" });
    }
  }
  
  if (managerEmail && managerPassword) {
    const existing = await storage.getUserByEmail(managerEmail);
    if (!existing) {
      usersToSeed.push({ email: managerEmail, password: managerPassword, role: "manager" as const, name: "Manager User" });
    }
  }
  
  if (techEmail && techPassword) {
    const existing = await storage.getUserByEmail(techEmail);
    if (!existing) {
      usersToSeed.push({ email: techEmail, password: techPassword, role: "technician" as const, name: "Technician User" });
    }
  }
  
  for (const user of usersToSeed) {
    try {
      await createCredentialsUser(user.email, user.password, user.role, user.name);
      console.log(`Created ${user.role} user: ${user.email}`);
    } catch (error) {
      console.error(`Failed to create ${user.role} user:`, error);
    }
  }
  
  if (usersToSeed.length > 0) {
    console.log(`Seeded ${usersToSeed.length} credentials users`);
  }
}
