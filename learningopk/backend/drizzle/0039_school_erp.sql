-- School Management ERP (Gauzy-inspired) — schema migration
-- Core: RBAC roles/permissions, user roles, tags, invitations
CREATE TABLE IF NOT EXISTS "erp_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_roles_school_key_idx" ON "erp_roles" USING btree ("school_id", "key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL REFERENCES "erp_roles"("id") ON DELETE CASCADE,
	"permission" text NOT NULL,
	"enabled" boolean NOT NULL DEFAULT true
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_role_permissions_role_permission_idx" ON "erp_role_permissions" USING btree ("role_id", "permission");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_role_permissions_role_idx" ON "erp_role_permissions" USING btree ("role_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"role_id" integer NOT NULL REFERENCES "erp_roles"("id") ON DELETE CASCADE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_user_roles_school_user_role_idx" ON "erp_user_roles" USING btree ("school_id", "user_id", "role_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_user_roles_school_user_idx" ON "erp_user_roles" USING btree ("school_id", "user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_tags_school_name_idx" ON "erp_tags" USING btree ("school_id", "name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_tag_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"tag_id" integer NOT NULL REFERENCES "erp_tags"("id") ON DELETE CASCADE,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_tag_links_tag_target_idx" ON "erp_tag_links" USING btree ("tag_id", "target_type", "target_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_tag_links_target_idx" ON "erp_tag_links" USING btree ("target_type", "target_id", "school_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"email" text NOT NULL,
	"role_id" integer REFERENCES "erp_roles"("id") ON DELETE SET NULL,
	"token" text NOT NULL UNIQUE,
	"status" text NOT NULL DEFAULT 'invited',
	"invited_by" text REFERENCES "user"("id") ON DELETE SET NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_invitations_school_email_idx" ON "erp_invitations" USING btree ("school_id", "email");
--> statement-breakpoint
-- HRM: departments, positions, employees, teams, staff attendance, time off,
-- holidays, payroll, expenses
CREATE TABLE IF NOT EXISTS "erp_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_departments_school_name_idx" ON "erp_departments" USING btree ("school_id", "name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"department_id" integer REFERENCES "erp_departments"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_positions_school_name_idx" ON "erp_positions" USING btree ("school_id", "name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
	"employee_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"work_email" text,
	"phone" text,
	"avatar_url" text,
	"department_id" integer REFERENCES "erp_departments"("id") ON DELETE SET NULL,
	"position_id" integer REFERENCES "erp_positions"("id") ON DELETE SET NULL,
	"employment_type" text NOT NULL DEFAULT 'full_time',
	"joined_at" date,
	"ended_at" date,
	"is_active" boolean NOT NULL DEFAULT true,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_employees_school_code_idx" ON "erp_employees" USING btree ("school_id", "employee_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_employees_school_active_idx" ON "erp_employees" USING btree ("school_id", "is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_employees_user_idx" ON "erp_employees" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_employees_department_idx" ON "erp_employees" USING btree ("department_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_teams_school_name_idx" ON "erp_teams" USING btree ("school_id", "name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"team_id" integer NOT NULL REFERENCES "erp_teams"("id") ON DELETE CASCADE,
	"employee_id" integer NOT NULL REFERENCES "erp_employees"("id") ON DELETE CASCADE,
	"is_manager" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_team_members_team_employee_idx" ON "erp_team_members" USING btree ("team_id", "employee_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_team_members_employee_idx" ON "erp_team_members" USING btree ("employee_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"employee_id" integer NOT NULL REFERENCES "erp_employees"("id") ON DELETE CASCADE,
	"work_date" date NOT NULL,
	"check_in" timestamp with time zone,
	"check_out" timestamp with time zone,
	"status" text NOT NULL DEFAULT 'present',
	"source" text NOT NULL DEFAULT 'manual',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_attendance_employee_date_idx" ON "erp_attendance_records" USING btree ("employee_id", "work_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_attendance_school_date_idx" ON "erp_attendance_records" USING btree ("school_id", "work_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_time_off_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"description" text,
	"paid" boolean NOT NULL DEFAULT true,
	"requires_approval" boolean NOT NULL DEFAULT true,
	"annual_days" integer NOT NULL DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_time_off_policies_school_name_idx" ON "erp_time_off_policies" USING btree ("school_id", "name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_time_off_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"employee_id" integer NOT NULL REFERENCES "erp_employees"("id") ON DELETE CASCADE,
	"policy_id" integer REFERENCES "erp_time_off_policies"("id") ON DELETE SET NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text NOT NULL DEFAULT 'requested',
	"reason" text,
	"decided_by" text REFERENCES "user"("id") ON DELETE SET NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_time_off_requests_school_status_idx" ON "erp_time_off_requests" USING btree ("school_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_time_off_requests_employee_idx" ON "erp_time_off_requests" USING btree ("employee_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_official_holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_official_holidays_school_idx" ON "erp_official_holidays" USING btree ("school_id", "start_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_salary_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"employee_id" integer NOT NULL REFERENCES "erp_employees"("id") ON DELETE CASCADE,
	"currency" text NOT NULL DEFAULT 'PKR',
	"basic_salary" numeric(12, 2) NOT NULL DEFAULT '0',
	"components" jsonb NOT NULL DEFAULT '{}',
	"effective_from" date NOT NULL,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_salary_structures_employee_idx" ON "erp_salary_structures" USING btree ("employee_id", "is_active");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_payroll_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text NOT NULL DEFAULT 'draft',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_payroll_runs_school_period_idx" ON "erp_payroll_runs" USING btree ("school_id", "period_start", "period_end");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_payslips" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"payroll_run_id" integer NOT NULL REFERENCES "erp_payroll_runs"("id") ON DELETE CASCADE,
	"employee_id" integer NOT NULL REFERENCES "erp_employees"("id") ON DELETE CASCADE,
	"basic_salary" numeric(12, 2) NOT NULL,
	"allowances" numeric(12, 2) NOT NULL DEFAULT '0',
	"deductions" numeric(12, 2) NOT NULL DEFAULT '0',
	"net_pay" numeric(12, 2) NOT NULL,
	"breakdown" jsonb NOT NULL DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_payslips_run_employee_idx" ON "erp_payslips" USING btree ("payroll_run_id", "employee_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_expense_categories_school_name_idx" ON "erp_expense_categories" USING btree ("school_id", "name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"category_id" integer REFERENCES "erp_expense_categories"("id") ON DELETE SET NULL,
	"employee_id" integer REFERENCES "erp_employees"("id") ON DELETE SET NULL,
	"title" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL DEFAULT 'PKR',
	"spent_at" date NOT NULL,
	"status" text NOT NULL DEFAULT 'submitted',
	"notes" text,
	"created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_expenses_school_spent_idx" ON "erp_expenses" USING btree ("school_id", "spent_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_expenses_status_idx" ON "erp_expenses" USING btree ("school_id", "status");
--> statement-breakpoint
-- CRM: contacts, pipelines, stages, deals
CREATE TABLE IF NOT EXISTS "erp_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"contact_type" text NOT NULL DEFAULT 'lead',
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"student_name" text,
	"student_grade" text,
	"source" text,
	"budget" numeric(12, 2),
	"notes" text,
	"owner_id" integer REFERENCES "erp_employees"("id") ON DELETE SET NULL,
	"created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_contacts_school_type_idx" ON "erp_contacts" USING btree ("school_id", "contact_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_contacts_school_created_idx" ON "erp_contacts" USING btree ("school_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_contacts_owner_idx" ON "erp_contacts" USING btree ("owner_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_pipelines" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_pipelines_school_name_idx" ON "erp_pipelines" USING btree ("school_id", "name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_pipeline_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"pipeline_id" integer NOT NULL REFERENCES "erp_pipelines"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"position" integer NOT NULL DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_pipeline_stages_pipeline_name_idx" ON "erp_pipeline_stages" USING btree ("pipeline_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_pipeline_stages_pipeline_position_idx" ON "erp_pipeline_stages" USING btree ("pipeline_id", "position");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"pipeline_id" integer NOT NULL REFERENCES "erp_pipelines"("id") ON DELETE CASCADE,
	"stage_id" integer NOT NULL REFERENCES "erp_pipeline_stages"("id") ON DELETE CASCADE,
	"contact_id" integer REFERENCES "erp_contacts"("id") ON DELETE SET NULL,
	"title" text NOT NULL,
	"value" numeric(12, 2) NOT NULL DEFAULT '0',
	"probability" integer NOT NULL DEFAULT 0,
	"expected_close_date" date,
	"closed_at" timestamp with time zone,
	"notes" text,
	"owner_id" integer REFERENCES "erp_employees"("id") ON DELETE SET NULL,
	"created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_deals_pipeline_stage_idx" ON "erp_deals" USING btree ("pipeline_id", "stage_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_deals_school_created_idx" ON "erp_deals" USING btree ("school_id", "created_at");
--> statement-breakpoint
-- Finance: fee structures, components, invoices, items, payments
CREATE TABLE IF NOT EXISTS "erp_fee_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"class_level" text,
	"term_id" integer,
	"currency" text NOT NULL DEFAULT 'PKR',
	"total_amount" numeric(12, 2) NOT NULL DEFAULT '0',
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_fee_structures_school_name_idx" ON "erp_fee_structures" USING btree ("school_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_fee_structures_school_active_idx" ON "erp_fee_structures" USING btree ("school_id", "is_active");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_fee_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"fee_structure_id" integer NOT NULL REFERENCES "erp_fee_structures"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_optional" boolean NOT NULL DEFAULT false,
	"position" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_fee_components_structure_idx" ON "erp_fee_components" USING btree ("fee_structure_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"invoice_number" text NOT NULL,
	"student_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
	"fee_structure_id" integer REFERENCES "erp_fee_structures"("id") ON DELETE SET NULL,
	"status" text NOT NULL DEFAULT 'draft',
	"issue_date" date NOT NULL,
	"due_date" date,
	"currency" text NOT NULL DEFAULT 'PKR',
	"subtotal" numeric(12, 2) NOT NULL DEFAULT '0',
	"discount" numeric(12, 2) NOT NULL DEFAULT '0',
	"tax" numeric(12, 2) NOT NULL DEFAULT '0',
	"total" numeric(12, 2) NOT NULL DEFAULT '0',
	"amount_paid" numeric(12, 2) NOT NULL DEFAULT '0',
	"notes" text,
	"created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_invoices_school_number_idx" ON "erp_invoices" USING btree ("school_id", "invoice_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_invoices_school_status_idx" ON "erp_invoices" USING btree ("school_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_invoices_student_idx" ON "erp_invoices" USING btree ("student_user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_invoices_school_due_idx" ON "erp_invoices" USING btree ("school_id", "due_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"invoice_id" integer NOT NULL REFERENCES "erp_invoices"("id") ON DELETE CASCADE,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL DEFAULT '1',
	"unit_price" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"position" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_invoice_items_invoice_idx" ON "erp_invoice_items" USING btree ("invoice_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"invoice_id" integer NOT NULL REFERENCES "erp_invoices"("id") ON DELETE CASCADE,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL DEFAULT 'PKR',
	"method" text NOT NULL DEFAULT 'cash',
	"reference" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"recorded_by" text REFERENCES "user"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_payments_invoice_idx" ON "erp_payments" USING btree ("invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_payments_school_paid_idx" ON "erp_payments" USING btree ("school_id", "paid_at");
--> statement-breakpoint
-- Academics: years, terms, classes, enrollments, subjects, timetable, exams,
-- grades, student attendance
CREATE TABLE IF NOT EXISTS "erp_academic_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_current" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_academic_years_school_name_idx" ON "erp_academic_years" USING btree ("school_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_academic_years_school_current_idx" ON "erp_academic_years" USING btree ("school_id", "is_current");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"academic_year_id" integer NOT NULL REFERENCES "erp_academic_years"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_current" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_terms_year_name_idx" ON "erp_terms" USING btree ("academic_year_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_terms_school_current_idx" ON "erp_terms" USING btree ("school_id", "is_current");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_school_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"academic_year_id" integer NOT NULL REFERENCES "erp_academic_years"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"grade_level" text NOT NULL,
	"section" text,
	"capacity" integer NOT NULL DEFAULT 40,
	"class_teacher_id" integer REFERENCES "erp_employees"("id") ON DELETE SET NULL,
	"room" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_school_classes_year_name_idx" ON "erp_school_classes" USING btree ("academic_year_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_school_classes_school_idx" ON "erp_school_classes" USING btree ("school_id", "grade_level");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"class_id" integer NOT NULL REFERENCES "erp_school_classes"("id") ON DELETE CASCADE,
	"student_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"roll_number" text,
	"status" text NOT NULL DEFAULT 'active',
	"enrolled_at" date NOT NULL,
	"ended_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_enrollments_class_student_idx" ON "erp_enrollments" USING btree ("class_id", "student_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_enrollments_student_idx" ON "erp_enrollments" USING btree ("student_user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_enrollments_school_status_idx" ON "erp_enrollments" USING btree ("school_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_class_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"class_id" integer NOT NULL REFERENCES "erp_school_classes"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"subject_code" text,
	"teacher_id" integer REFERENCES "erp_employees"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_class_subjects_class_name_idx" ON "erp_class_subjects" USING btree ("class_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_class_subjects_teacher_idx" ON "erp_class_subjects" USING btree ("teacher_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_timetable_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"class_id" integer NOT NULL REFERENCES "erp_school_classes"("id") ON DELETE CASCADE,
	"class_subject_id" integer NOT NULL REFERENCES "erp_class_subjects"("id") ON DELETE CASCADE,
	"weekday" text NOT NULL,
	"period_number" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"room" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_timetable_slot_unique_idx" ON "erp_timetable_slots" USING btree ("class_id", "weekday", "period_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_timetable_slots_class_idx" ON "erp_timetable_slots" USING btree ("class_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_timetable_slots_teacher_idx" ON "erp_timetable_slots" USING btree ("class_subject_id", "weekday");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"term_id" integer REFERENCES "erp_terms"("id") ON DELETE SET NULL,
	"class_subject_id" integer NOT NULL REFERENCES "erp_class_subjects"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"exam_date" date NOT NULL,
	"total_marks" integer NOT NULL DEFAULT 100,
	"weight" numeric(5, 2) NOT NULL DEFAULT '1',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_exams_subject_name_idx" ON "erp_exams" USING btree ("class_subject_id", "name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_exams_school_date_idx" ON "erp_exams" USING btree ("school_id", "exam_date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"exam_id" integer NOT NULL REFERENCES "erp_exams"("id") ON DELETE CASCADE,
	"student_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"marks_obtained" numeric(6, 2),
	"remarks" text,
	"graded_by" text REFERENCES "user"("id") ON DELETE SET NULL,
	"graded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_grades_exam_student_idx" ON "erp_grades" USING btree ("exam_id", "student_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_grades_student_idx" ON "erp_grades" USING btree ("student_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_student_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"class_id" integer NOT NULL REFERENCES "erp_school_classes"("id") ON DELETE CASCADE,
	"student_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"attendance_date" date NOT NULL,
	"status" text NOT NULL DEFAULT 'present',
	"notes" text,
	"recorded_by" text REFERENCES "user"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_student_attendance_unique_idx" ON "erp_student_attendance" USING btree ("class_id", "student_user_id", "attendance_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_student_attendance_student_idx" ON "erp_student_attendance" USING btree ("student_user_id", "attendance_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_student_attendance_school_date_idx" ON "erp_student_attendance" USING btree ("school_id", "attendance_date");
--> statement-breakpoint
-- Approvals: policies, requests, voters
CREATE TABLE IF NOT EXISTS "erp_approval_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"request_type" text NOT NULL,
	"description" text,
	"min_approvals" integer NOT NULL DEFAULT 1,
	"approver_employee_ids" integer[],
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_approval_policies_school_type_idx" ON "erp_approval_policies" USING btree ("school_id", "request_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_approval_policies_school_active_idx" ON "erp_approval_policies" USING btree ("school_id", "is_active");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_request_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"policy_id" integer REFERENCES "erp_approval_policies"("id") ON DELETE SET NULL,
	"request_type" text NOT NULL,
	"request_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text NOT NULL DEFAULT 'requested',
	"min_approvals" integer NOT NULL DEFAULT 1,
	"requested_by_employee_id" integer REFERENCES "erp_employees"("id") ON DELETE SET NULL,
	"requested_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_request_approvals_unique_idx" ON "erp_request_approvals" USING btree ("school_id", "request_type", "request_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_request_approvals_school_status_idx" ON "erp_request_approvals" USING btree ("school_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_request_approvals_request_idx" ON "erp_request_approvals" USING btree ("request_type", "request_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_request_approval_voters" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
	"request_approval_id" integer NOT NULL REFERENCES "erp_request_approvals"("id") ON DELETE CASCADE,
	"voter_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"vote" text NOT NULL,
	"comment" text,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "erp_request_approval_voters_unique_idx" ON "erp_request_approval_voters" USING btree ("request_approval_id", "voter_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "erp_request_approval_voters_approval_idx" ON "erp_request_approval_voters" USING btree ("request_approval_id");
