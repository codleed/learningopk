ALTER TABLE "subjects" DROP CONSTRAINT "subjects_board_class_id_board_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "problem_markdown" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "solution_code" text;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_board_class_id_board_classes_id_fk" FOREIGN KEY ("board_class_id") REFERENCES "public"."board_classes"("id") ON DELETE cascade ON UPDATE no action;