const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type ChapterVisitEvent = {
  eventType: "chapter_visit";
  chapterId: number;
};

type SummaryReadEvent = {
  eventType: "summary_read";
  chapterId: number;
};

type SubpartReadEvent = {
  eventType: "subpart_read";
  chapterId: number;
  subpartId: number;
};

type ExerciseViewEvent = {
  eventType: "exercise_view";
  chapterId: number;
};

type FlashcardCompleteEvent = {
  eventType: "flashcard_complete";
  chapterId: number;
};

export type ProgressClientEvent =
  | ChapterVisitEvent
  | SummaryReadEvent
  | SubpartReadEvent
  | ExerciseViewEvent
  | FlashcardCompleteEvent;

type ProgressClientResponse = {
  error?: string;
};

const isDev = process.env.NODE_ENV !== "production";

export const trackProgressEvent = async (event: ProgressClientEvent): Promise<boolean> => {
  try {
    const response = await fetch(`${backendUrl}/api/progress/events`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ProgressClientResponse | null;
      if (response.status === 401) {
        return false;
      }
      if (isDev && payload?.error) {
        console.error(payload.error);
      }
      return false;
    }

    return true;
  } catch {
    return false;
  }
};
