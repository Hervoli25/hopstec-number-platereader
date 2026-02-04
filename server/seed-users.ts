import "dotenv/config";
import { seedUsers } from "./lib/credentials-auth";

async function main() {
  console.log("Seeding user accounts from .env...");

  try {
    await seedUsers();
    console.log("✅ User seeding completed successfully!");
    console.log("\nYou can now login with:");
    console.log(`- Admin: ${process.env.ADMIN_EMAIL}`);
    console.log(`- Manager: ${process.env.MANAGER_EMAIL}`);
    console.log(`- Technician: ${process.env.TECH_EMAIL}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
}

main();
