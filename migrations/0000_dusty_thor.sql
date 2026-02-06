CREATE TYPE "public"."country_hint" AS ENUM('FR', 'ZA', 'CD', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."photo_rule" AS ENUM('optional', 'required', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('technician', 'manager', 'admin');--> statement-breakpoint
CREATE TYPE "public"."wash_status" AS ENUM('received', 'prewash', 'foam', 'rinse', 'dry', 'complete');--> statement-breakpoint
CREATE TABLE "customer_confirmations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wash_job_id" varchar NOT NULL,
	"access_token" varchar(64) NOT NULL,
	"rating" integer,
	"notes" text,
	"issue_reported" text,
	"confirmed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_job_access" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wash_job_id" varchar NOT NULL,
	"token" varchar(64) NOT NULL,
	"customer_name" varchar(255),
	"customer_email" varchar(255),
	"service_code" varchar(50),
	"last_viewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_job_access_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "event_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"plate_display" varchar(50),
	"plate_normalized" varchar(50),
	"country_hint" "country_hint",
	"wash_job_id" varchar,
	"parking_session_id" varchar,
	"user_id" varchar,
	"payload_json" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "frequent_parkers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate_normalized" varchar(50) NOT NULL,
	"plate_display" varchar(50) NOT NULL,
	"customer_name" varchar(255),
	"customer_phone" varchar(50),
	"customer_email" varchar(255),
	"visit_count" integer DEFAULT 1,
	"total_spent" integer DEFAULT 0,
	"is_vip" boolean DEFAULT false,
	"monthly_pass_expiry" timestamp,
	"notes" text,
	"last_visit_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "frequent_parkers_plate_normalized_unique" UNIQUE("plate_normalized")
);
--> statement-breakpoint
CREATE TABLE "parking_reservations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate_display" varchar(50),
	"plate_normalized" varchar(50),
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(50),
	"customer_email" varchar(255),
	"zone_id" varchar,
	"spot_number" varchar(20),
	"reserved_from" timestamp NOT NULL,
	"reserved_until" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"confirmation_code" varchar(20) NOT NULL,
	"parking_session_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parking_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate_display" varchar(50) NOT NULL,
	"plate_normalized" varchar(50) NOT NULL,
	"country_hint" "country_hint" DEFAULT 'OTHER',
	"entry_at" timestamp DEFAULT now(),
	"exit_at" timestamp,
	"entry_photo_url" text,
	"exit_photo_url" text,
	"technician_id" varchar NOT NULL,
	"zone_id" varchar,
	"spot_number" varchar(20),
	"calculated_fee" integer,
	"paid_amount" integer,
	"is_paid" boolean DEFAULT false,
	"wash_job_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parking_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hourly_rate" integer DEFAULT 500,
	"daily_max_rate" integer DEFAULT 3000,
	"grace_period_minutes" integer DEFAULT 15,
	"total_capacity" integer DEFAULT 50,
	"currency" varchar(3) DEFAULT 'USD',
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parking_zones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"capacity" integer DEFAULT 10,
	"hourly_rate" integer,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "parking_zones_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "photo_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step" "wash_status" NOT NULL,
	"rule" "photo_rule" DEFAULT 'optional' NOT NULL,
	"updated_by" varchar,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "photo_rules_step_unique" UNIQUE("step")
);
--> statement-breakpoint
CREATE TABLE "service_checklist_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wash_job_id" varchar NOT NULL,
	"label" varchar(255) NOT NULL,
	"order_index" integer DEFAULT 0,
	"expected" boolean DEFAULT true,
	"confirmed" boolean DEFAULT false,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role" "user_role" DEFAULT 'technician' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"first_name" varchar(255),
	"last_name" varchar(255),
	"profile_image_url" varchar(512),
	"password_hash" text,
	"role" "user_role" DEFAULT 'technician',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wash_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate_display" varchar(50) NOT NULL,
	"plate_normalized" varchar(50) NOT NULL,
	"country_hint" "country_hint" DEFAULT 'OTHER',
	"status" "wash_status" DEFAULT 'received' NOT NULL,
	"technician_id" varchar NOT NULL,
	"service_code" varchar(100),
	"stage_timestamps" jsonb,
	"start_at" timestamp DEFAULT now(),
	"end_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wash_photos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wash_job_id" varchar NOT NULL,
	"url" text NOT NULL,
	"status_at_time" "wash_status" NOT NULL,
	"uploaded_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_retries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_url" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"attempts" integer DEFAULT 0,
	"last_error" text,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");