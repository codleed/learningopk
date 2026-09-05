const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export type StudentNote = {
  id: number;
  title: string;
  content: string;
  subjectId: number | null;
  chapterId: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  subjectName: string | null;
  chapterTitle: string | null;
};

type NotesQuery = {
  subjectId?: number;
  chapterId?: number;
  q?: string;
};

type CreateNoteInput = {
  title: string;
  content: string;
  subjectId?: number | null;
  chapterId?: number | null;
  tags?: string[];
};

type UpdateNoteInput = {
  title?: string;
  content?: string;
  subjectId?: number | null;
  chapterId?: number | null;
  tags?: string[];
};

export async function getNotes(query?: NotesQuery): Promise<StudentNote[]> {
  const params = new URLSearchParams();
  if (query?.subjectId) params.set("subjectId", String(query.subjectId));
  if (query?.chapterId) params.set("chapterId", String(query.chapterId));
  if (query?.q) params.set("q", query.q);

  const url = `${backendUrl}/api/notes${params.size > 0 ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch notes: ${response.status}`);
  }

  const json = (await response.json()) as { data: StudentNote[] };
  return json.data;
}

export async function getNotesServer(
  cookieHeader: string,
  query?: NotesQuery
): Promise<StudentNote[]> {
  const params = new URLSearchParams();
  if (query?.subjectId) params.set("subjectId", String(query.subjectId));
  if (query?.chapterId) params.set("chapterId", String(query.chapterId));
  if (query?.q) params.set("q", query.q);

  const url = `${backendUrl}/api/notes${params.size > 0 ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch notes: ${response.status}`);
  }

  const json = (await response.json()) as { data: StudentNote[] };
  return json.data;
}

export async function createNote(input: CreateNoteInput): Promise<StudentNote> {
  const response = await fetch(`${backendUrl}/api/notes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to create note: ${response.status}`);
  }

  const json = (await response.json()) as { data: StudentNote };
  return json.data;
}

export async function updateNote(id: number, input: UpdateNoteInput): Promise<StudentNote> {
  const response = await fetch(`${backendUrl}/api/notes/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Failed to update note: ${response.status}`);
  }

  const json = (await response.json()) as { data: StudentNote };
  return json.data;
}

export async function deleteNote(id: number): Promise<void> {
  const response = await fetch(`${backendUrl}/api/notes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete note: ${response.status}`);
  }
}
