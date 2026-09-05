export type CurriculumFormTab = "board" | "class" | "subject" | "chapter" | "exercise";
export type EntityModeTab = "add" | "manage";
export type ChapterModeTab = "add" | "edit";
export type ExerciseType = "short" | "mcq" | "long" | "numerical" | "fill_in_blanks";
export type ExerciseDifficulty = "easy" | "medium" | "hard";

export type ClassOption = {
  id: number;
  boardId: number;
  boardName: string;
  name: string;
  label: string;
};

export type SubjectOption = {
  id: number;
  label: string;
};

export type ChapterOption = {
  id: number;
  subjectName: string;
  chapterNumber: number;
  title: string;
  label: string;
};

export type SectionCommonProps = {
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  refreshTree: () => Promise<void>;
};
