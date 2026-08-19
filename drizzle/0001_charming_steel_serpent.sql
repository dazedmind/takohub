CREATE TYPE "public"."order_status" AS ENUM('NEW', 'R2D', 'FULFILLED');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('LOW_STOCK', 'IN_STOCK');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'BS', 'IM');--> statement-breakpoint
CREATE TABLE "branch_inventory" (
	"branch_inventory_id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer,
	"item_id" integer,
	"current_stock" integer,
	"status" "stock_status",
	"last_updated" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"item_id" serial PRIMARY KEY NOT NULL,
	"item_name" text,
	"unit" text,
	"central_stock" integer,
	"status" "stock_status",
	"photo_url" text,
	"last_updated" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory_usage_log" (
	"usage_id" serial PRIMARY KEY NOT NULL,
	"session_id" integer,
	"branch_id" integer,
	"item_id" integer,
	"quantity_used" integer,
	"logged_at" timestamp,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "session_log" (
	"session_id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"branch_id" integer,
	"start_shift" timestamp,
	"end_shift" timestamp
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "role" NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "production" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "waste" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "expenses" CASCADE;--> statement-breakpoint
DROP TABLE "inventory" CASCADE;--> statement-breakpoint
DROP TABLE "order_items" CASCADE;--> statement-breakpoint
DROP TABLE "production" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
DROP TABLE "waste" CASCADE;--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_branch_id_branches_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_seller_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_approved_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sales" DROP CONSTRAINT "sales_branch_id_branches_id_fk";
--> statement-breakpoint
ALTER TABLE "sales" DROP CONSTRAINT "sales_seller_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "branch_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."order_status" USING "status"::"public"."order_status";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "seller_id";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "requested_date";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "approved_by";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "approved_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "branch_id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "branch_name" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "ordered_by" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shift_type" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_list" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "created_on" timestamp;--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "branch_id";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "seller_id";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "sales_id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "session_id" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "total_plates" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "total_sales" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cash_onhand" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "expenses" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "salary" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "gcash_payment" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "free" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "waste" integer;--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_item_id_inventory_items_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_usage_log" ADD CONSTRAINT "inventory_usage_log_session_id_session_log_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session_log"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_usage_log" ADD CONSTRAINT "inventory_usage_log_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_usage_log" ADD CONSTRAINT "inventory_usage_log_item_id_inventory_items_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_log" ADD CONSTRAINT "session_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_log" ADD CONSTRAINT "session_log_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branches_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("branch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_ordered_by_user_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_session_id_session_log_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session_log"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN "updated_at";