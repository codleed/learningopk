-- Add teacher role to user_role enum
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'teacher';

-- Create assignment_type enum
DO $$ BEGIN
    CREATE TYPE "assignment_type" AS ENUM('chapter', 'quiz', 'mock_exam');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create submission_status enum
DO $$ BEGIN
    CREATE TYPE "submission_status" AS ENUM('not_started', 'in_progress', 'submitted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create classrooms table
CREATE TABLE IF NOT EXISTS "classrooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacher_id" text NOT NULL,
	"name" text NOT NULL,
	"board_id" integer NOT NULL,
	"grade" text NOT NULL,
	"invite_code" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classrooms_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint

ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Create classroom_students table
CREATE TABLE IF NOT EXISTS "classroom_students" (
	"id" serial PRIMARY KEY NOT NULL,
	"classroom_id" integer NOT NULL,
	"student_id" text NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "classroom_students_classroom_student_idx" ON "classroom_students" USING btree ("classroom_id","student_id");--> statement-breakpoint
ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_students" ADD CONSTRAINT "classroom_students_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Create assignments table
CREATE TABLE IF NOT EXISTS "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"classroom_id" integer NOT NULL,
	"type" "assignment_type" NOT NULL,
	"target_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp with time zone,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "assignments" ADD CONSTRAINT "assignments_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Create assignment_submissions table
CREATE TABLE IF NOT EXISTS "assignment_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"student_id" text NOT NULL,
	"status" "submission_status" DEFAULT 'not_started' NOT NULL,
	"score" integer,
	"started_at" timestamp with time zone,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "assignment_submissions_assignment_student_idx" ON "assignment_submissions" USING btree ("assignment_id","student_id");--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Create classroom_announcements table
CREATE TABLE IF NOT EXISTS "classroom_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"classroom_id" integer NOT NULL,
	"teacher_id" text NOT NULL,
	"content" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "classroom_announcements" ADD CONSTRAINT "classroom_announcements_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_announcements" ADD CONSTRAINT "classroom_announcements_teacher_id_user_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
