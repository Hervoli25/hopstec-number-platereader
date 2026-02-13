CREATE TYPE "public"."loyalty_tier" AS ENUM('basic', 'premium');--> statement-breakpoint
CREATE TYPE "public"."loyalty_transaction_type" AS ENUM('earn_wash', 'earn_bonus', 'redeem', 'expire', 'adjust');--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" varchar(255) DEFAULT 'ParkWash Pro',
	"business_logo" text,
	"business_address" text,
	"business_phone" varchar(50),
	"business_email" varchar(255),
	"currency" varchar(3) DEFAULT 'USD',
	"currency_symbol" varchar(10) DEFAULT '$',
	"locale" varchar(10) DEFAULT 'en-US',
	"timezone" varchar(50) DEFAULT 'UTC',
	"tax_rate" integer DEFAULT 0,
	"tax_label" varchar(50) DEFAULT 'Tax',
	"receipt_footer" text,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_memberships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(50),
	"customer_email" varchar(255),
	"plate_normalized" varchar(50),
	"plate_display" varchar(50),
	"membership_type" varchar(50) NOT NULL,
	"price" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"auto_renew" boolean DEFAULT false,
	"washes_included" integer,
	"washes_used" integer DEFAULT 0,
	"parking_included" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" varchar(255),
	"customer_phone" varchar(50),
	"customer_email" varchar(255),
	"plate_normalized" varchar(50),
	"channel" varchar(20) NOT NULL,
	"type" varchar(50) NOT NULL,
	"subject" varchar(255),
	"message" text NOT NULL,
	"wash_job_id" varchar,
	"parking_session_id" varchar,
	"booking_id" varchar,
	"membership_id" varchar,
	"status" varchar(20) DEFAULT 'pending',
	"sent_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0,
	"scheduled_for" timestamp,
	"external_id" varchar(255),
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate_normalized" varchar(50) NOT NULL,
	"plate_display" varchar(50) NOT NULL,
	"customer_name" varchar(255),
	"customer_phone" varchar(50),
	"customer_email" varchar(255),
	"crm_user_id" varchar(255),
	"membership_number" varchar(20) NOT NULL,
	"tier" "loyalty_tier" DEFAULT 'basic',
	"points_balance" integer DEFAULT 0,
	"lifetime_points" integer DEFAULT 0,
	"total_washes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "loyalty_accounts_plate_normalized_unique" UNIQUE("plate_normalized"),
	CONSTRAINT "loyalty_accounts_membership_number_unique" UNIQUE("membership_number")
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loyalty_account_id" varchar NOT NULL,
	"type" "loyalty_transaction_type" NOT NULL,
	"points" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"wash_job_id" varchar,
	"service_code" varchar(100),
	"description" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"subject" varchar(255),
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "parking_validations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parking_session_id" varchar NOT NULL,
	"validator_name" varchar(255) NOT NULL,
	"validator_code" varchar(50) NOT NULL,
	"discount_minutes" integer DEFAULT 0,
	"discount_percent" integer DEFAULT 0,
	"discount_amount" integer DEFAULT 0,
	"validated_by" varchar,
	"validated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"duration_minutes" integer DEFAULT 30,
	"services" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_packages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "staff_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"technician_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"message" text,
	"estimated_arrival" varchar,
	"acknowledged" boolean DEFAULT false,
	"acknowledged_by" varchar,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "technician_time_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"technician_id" varchar NOT NULL,
	"clock_in_at" timestamp NOT NULL,
	"clock_out_at" timestamp,
	"total_minutes" integer,
	"break_logs" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "photo_rules" ALTER COLUMN "step" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wash_jobs" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wash_jobs" ALTER COLUMN "status" SET DEFAULT 'received'::text;--> statement-breakpoint
ALTER TABLE "wash_photos" ALTER COLUMN "status_at_time" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."wash_status";--> statement-breakpoint
CREATE TYPE "public"."wash_status" AS ENUM('received', 'prewash', 'rinse', 'dry_vacuum', 'simple_polish', 'detailing_polish', 'tyre_shine', 'clay_treatment', 'complete');--> statement-breakpoint
ALTER TABLE "photo_rules" ALTER COLUMN "step" SET DATA TYPE "public"."wash_status" USING "step"::"public"."wash_status";--> statement-breakpoint
ALTER TABLE "wash_jobs" ALTER COLUMN "status" SET DEFAULT 'received'::"public"."wash_status";--> statement-breakpoint
ALTER TABLE "wash_jobs" ALTER COLUMN "status" SET DATA TYPE "public"."wash_status" USING "status"::"public"."wash_status";--> statement-breakpoint
ALTER TABLE "wash_photos" ALTER COLUMN "status_at_time" SET DATA TYPE "public"."wash_status" USING "status_at_time"::"public"."wash_status";--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "first_hour_rate" integer;--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "weekly_rate" integer;--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "monthly_pass_rate" integer DEFAULT 5000;--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "night_rate" integer;--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "night_start_hour" integer DEFAULT 22;--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "night_end_hour" integer DEFAULT 6;--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "weekend_rate" integer;--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "overstay_penalty_rate" integer;--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "lost_ticket_fee" integer DEFAULT 2000;--> statement-breakpoint
ALTER TABLE "parking_settings" ADD COLUMN "validation_discount_percent" integer DEFAULT 0;