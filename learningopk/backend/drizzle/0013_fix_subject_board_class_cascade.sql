ALTER TABLE "subjects" DROP CONSTRAINT "subjects_board_class_id_board_classes_id_fk";

ALTER TABLE "subjects"
ADD CONSTRAINT "subjects_board_class_id_board_classes_id_fk"
FOREIGN KEY ("board_class_id")
REFERENCES "public"."board_classes"("id")
ON DELETE cascade
ON UPDATE no action;
