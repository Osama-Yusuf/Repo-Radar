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
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "scanned_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_name" text NOT NULL,
	"last_scanned_at" timestamp DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"raw_trivy_output" jsonb,
	CONSTRAINT "scanned_images_image_name_unique" UNIQUE("image_name")
);
--> statement-breakpoint
CREATE TABLE "vulnerabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"scanned_image_id" integer NOT NULL,
	"vulnerability_id" text NOT NULL,
	"pkg_name" text NOT NULL,
	"installed_version" text NOT NULL,
	"fixed_version" text,
	"severity" text NOT NULL,
	"title" text,
	"description" text,
	"datasource" text,
	CONSTRAINT "vulnerabilities_scanned_image_id_vulnerability_id_pkg_name_installed_version_unique" UNIQUE("scanned_image_id","vulnerability_id","pkg_name","installed_version")
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_logs" ADD CONSTRAINT "check_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_parameters" ADD CONSTRAINT "webhook_parameters_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_scanned_image_id_scanned_images_id_fk" FOREIGN KEY ("scanned_image_id") REFERENCES "public"."scanned_images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vulnerability_id_idx" ON "vulnerabilities" USING btree ("vulnerability_id");