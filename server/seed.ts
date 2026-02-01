import { db } from "./db";
import { washJobs, parkingSessions, eventLogs } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  try {
    // Check if we already have data
    const [existingJobs] = await db.select({ count: sql<number>`count(*)::int` }).from(washJobs);
    
    if (existingJobs.count > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    console.log("Seeding database with sample data...");

    // Sample wash jobs with different statuses
    const sampleJobs = [
      {
        plateDisplay: "AB-123-CD",
        plateNormalized: "AB123CD",
        countryHint: "FR" as const,
        status: "foam" as const,
        technicianId: "demo-tech-1",
        startAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      },
      {
        plateDisplay: "CA 456-789",
        plateNormalized: "CA456789",
        countryHint: "ZA" as const,
        status: "rinse" as const,
        technicianId: "demo-tech-1",
        startAt: new Date(Date.now() - 20 * 60 * 1000), // 20 min ago
      },
      {
        plateDisplay: "123 A KIN",
        plateNormalized: "123AKIN",
        countryHint: "CD" as const,
        status: "received" as const,
        technicianId: "demo-tech-2",
        startAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
      },
      {
        plateDisplay: "XY-999-ZZ",
        plateNormalized: "XY999ZZ",
        countryHint: "FR" as const,
        status: "complete" as const,
        technicianId: "demo-tech-1",
        startAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        endAt: new Date(Date.now() - 30 * 60 * 1000), // completed 30 min ago
      },
    ];

    await db.insert(washJobs).values(sampleJobs);

    // Sample parking sessions
    const sampleParkingSessions = [
      {
        plateDisplay: "GP ABC 123",
        plateNormalized: "GPABC123",
        countryHint: "ZA" as const,
        technicianId: "demo-tech-1",
        entryAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        plateDisplay: "EF-456-GH",
        plateNormalized: "EF456GH",
        countryHint: "FR" as const,
        technicianId: "demo-tech-2",
        entryAt: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
      },
    ];

    await db.insert(parkingSessions).values(sampleParkingSessions);

    // Sample events
    const sampleEvents = [
      {
        type: "wash_created",
        plateDisplay: "AB-123-CD",
        plateNormalized: "AB123CD",
        countryHint: "FR" as const,
        userId: "demo-tech-1",
        payloadJson: { source: "camera" },
      },
      {
        type: "wash_status_update",
        plateDisplay: "AB-123-CD",
        plateNormalized: "AB123CD",
        countryHint: "FR" as const,
        userId: "demo-tech-1",
        payloadJson: { status: "prewash" },
      },
      {
        type: "parking_entry",
        plateDisplay: "GP ABC 123",
        plateNormalized: "GPABC123",
        countryHint: "ZA" as const,
        userId: "demo-tech-1",
        payloadJson: {},
      },
    ];

    await db.insert(eventLogs).values(sampleEvents);

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
