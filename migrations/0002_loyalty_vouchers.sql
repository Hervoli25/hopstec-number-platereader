CREATE TYPE "public"."voucher_status" AS ENUM('active', 'used', 'expired');--> statement-breakpoint
CREATE TABLE "loyalty_vouchers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL DEFAULT 'default',
	"branch_id" varchar,
	"loyalty_account_id" varchar NOT NULL,
	"code" varchar(20) NOT NULL,
	"points_redeemed" integer NOT NULL DEFAULT 1000,
	"for_package_code" varchar(50),
	"for_service_code" varchar(50),
	"status" "voucher_status" NOT NULL DEFAULT 'active',
	"issued_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"used_at" timestamp,
	"used_in_wash_job_id" varchar,
	"used_by_staff_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "loyalty_vouchers_code_unique" UNIQUE("code")
);
