import { db } from "./db";
import { washJobs, parkingSessions, eventLogs, washPhotos, customerJobAccess, serviceChecklistItems, customerConfirmations } from "@shared/schema";

async function clearDummyData() {
  try {
    console.log("Clearing dummy data from database...");

    // Clear all data tables (keeps user accounts and roles)
    await db.delete(customerConfirmations);
    await db.delete(serviceChecklistItems);
    await db.delete(customerJobAccess);
    await db.delete(washPhotos);
    await db.delete(eventLogs);
    await db.delete(parkingSessions);
    await db.delete(washJobs);

    console.log("✅ Dummy data cleared successfully!");
    console.log("Your database is now clean and ready for real data.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing dummy data:", error);
    process.exit(1);
  }
}

clearDummyData();
