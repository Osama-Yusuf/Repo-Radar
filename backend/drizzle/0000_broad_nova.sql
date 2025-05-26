CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"repo_url" text NOT NULL,
	"check_interval" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"branch_name" text NOT NULL,
	"last_commit_sha" text
);
--> statement-breakpoint
CREATE TABLE "check_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"branch_name" text NOT NULL,
	"commit_sha" text,
	"commit_message" text,
	"commit_author" text,
	"commit_date" timestamp,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text,
	"action_type" text NOT NULL,
	"webhook_url" text,
	"script_content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_id" integer NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_parameters" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_id" integer NOT NULL,
	"branch" text NOT NULL,
	"name" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_parameters_action_id_branch_name_unique" UNIQUE("action_id","branch","name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password" text NOT NULL,
	"role" varchar(10) DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "tracked_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_name" text NOT NULL,
	"image_tag" text NOT NULL,
	"image_digest" text,
	"namespace" text,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_scanned_at" timestamp DEFAULT now() NOT NULL,
	"scan_status" text NOT NULL,
	"raw_trivy_output" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracked_images_image_name_image_tag_image_digest_unique" UNIQUE("image_name","image_tag","image_digest")
);
--> statement-breakpoint
CREATE TABLE "image_vulnerabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracked_image_id" integer NOT NULL,
	"vulnerability_cve_id" text NOT NULL,
	"pkg_name" text NOT NULL,
	"installed_version" text NOT NULL,
	"fixed_version" text,
	"severity" text NOT NULL,
	"title" text,
	"description" text,
	"datasource" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "image_vulnerabilities_tracked_image_id_vulnerability_cve_id_pkg_name_installed_version_unique" UNIQUE("tracked_image_id","vulnerability_cve_id","pkg_name","installed_version")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"github_api_url" text,
	"github_token" text,
	"kubernetes_namespaces" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "gitleaks_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"description" text NOT NULL,
	"secret" text NOT NULL,
	"file_path" text NOT NULL,
	"line_number" integer,
	"commit_hash" text NOT NULL,
	"author" text,
	"date" timestamp,
	"tags" jsonb,
	"rule_id" text NOT NULL,
	"scanned_at" timestamp DEFAULT now() NOT NULL,
	"commit_url" text
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_logs" ADD CONSTRAINT "check_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_parameters" ADD CONSTRAINT "webhook_parameters_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_vulnerabilities" ADD CONSTRAINT "image_vulnerabilities_tracked_image_id_tracked_images_id_fk" FOREIGN KEY ("tracked_image_id") REFERENCES "public"."tracked_images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gitleaks_findings" ADD CONSTRAINT "gitleaks_findings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vulnerability_cve_id_idx" ON "image_vulnerabilities" USING btree ("vulnerability_cve_id");