import "dotenv/config";
import { db } from "./db";
import { users } from "@shared/schema";
import { seedUsers } from "./lib/credentials-auth";

async function main() {
  console.log("🗑️  Deleting all existing users...");

  try {
    // Delete all users
    await db.delete(users);
    console.log("✅ All users deleted");

    console.log("\n📝 Creating fresh user accounts from .env...");
    await seedUsers();

    console.log("\n✅ Users reset successfully!");
    console.log("\nYou can now login with:");
    console.log(`- Admin: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`);
    console.log(`- Manager: ${process.env.MANAGER_EMAIL} / ${process.env.MANAGER_PASSWORD}`);
    console.log(`- Technician: ${process.env.TECH_EMAIL} / ${process.env.TECH_PASSWORD}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting users:", error);
    process.exit(1);
  }
}

main();
