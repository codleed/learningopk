"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMockExam,
  getQuizQuestions,
  type MockExamDetail,
  type QuizQuestion
} from "@/lib/mock-exams-api";

interface MockExamSolutionsClientProps {
  examId: number;
}

const optionLabels: Record<string, string> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D"
};

export function MockExamSolutionsClient({ examId }: MockExamSolutionsClientProps) {
  const [exam, setExam] = useState<MockExamDetail | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [examData, questionsData] = await Promise.all([
          getMockExam(examId),
          getQuizQuestions(examId)
        ]);
        setExam(examData);
        setQuestions(questionsData);
      } catch (err: any) {
        console.error("Failed to load mock exam solutions:", err);
        const errorMessage = err?.message || "Failed to load solutions. Please try again.";

        // Check for access denied (403) - solutions only available after completion
        if (errorMessage.includes("403") || errorMessage.includes("EXAM_NOT_COMPLETED")) {
          setError("Solutions are only available after you complete the exam. Please attempt the mock exam first.");
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [examId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading solutions...</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    const isAccessDenied = error?.includes("Solutions are only available after you complete");

    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error || "Exam not found"}</p>
        {isAccessDenied && exam ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Complete the exam to view solutions and check your answers.
            </p>
            <Link href={`/past-papers/${examId}/attempt`}>
              <Button>Attempt Exam</Button>
            </Link>
          </div>
        ) : (
          <Link href="/past-papers">
            <Button variant="outline">Back to Past Papers</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/past-papers"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
          >
            ← Back to Past Papers
          </Link>
          <h1 className="text-2xl font-bold">{exam.title}</h1>
          <p className="text-muted-foreground">
            {exam.year} • {exam.boardName} • Grade {exam.grade} • {exam.subjectName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Marks: {exam.totalMarks}</p>
          <p className="text-sm text-muted-foreground">Duration: {exam.durationMinutes} min</p>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-base font-medium">
                  Question {index + 1}
                  {question.chapterTitle && (
                    <span className="text-muted-foreground font-normal ml-2">
                      (Chapter {question.chapterNumber}: {question.chapterTitle})
                    </span>
                  )}
                </CardTitle>
                <span className="text-sm text-muted-foreground shrink-0">
                  {question.marks} mark{question.marks > 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{question.question}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {["a", "b", "c", "d"].map((option) => {
                  const isCorrect = question.correctOption === option;
                  const optionKey = `option${option.charAt(0).toUpperCase() + option.slice(1)}` as keyof QuizQuestion;
                  const optionText = question[optionKey] as string;

                  return (
                    <div
                      key={option}
                      className={`p-3 rounded-lg border ${
                        isCorrect
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-muted/50 border-muted"
                      }`}
                    >
                      <span className="font-medium mr-2">{optionLabels[option]}.</span>
                      {optionText}
                      {isCorrect && (
                        <span className="ml-2 text-green-500 text-sm font-medium">✓ Correct</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {question.explanation && (
                <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                    Explanation:
                  </p>
                  <p className="text-sm text-muted-foreground">{question.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No questions available for this exam.</p>
        </div>
      )}
    </div>
  );
}
