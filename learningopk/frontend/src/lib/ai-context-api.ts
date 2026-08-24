const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export type AiContextData = {
  weakTopics: string[];
  strongTopics: string[];
  preferredExplanationStyle: string;
  lastConceptsDiscussed: string[];
  updatedAt: string | null;
};

export type AiContextResponse = {
  data: AiContextData;
};

export async function getAiContext(cookieHeader?: string): Promise<AiContextData> {
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const response = await fetch(`${backendUrl}/api/ai/context`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch AI context: ${response.status}`);
  }

  const json = (await response.json()) as AiContextResponse;
  return json.data;
}

export async function updateAiContext(update: {
  preferredExplanationStyle?: string;
  weakTopics?: string[];
  strongTopics?: string[];
}): Promise<AiContextData> {
  const response = await fetch(`${backendUrl}/api/ai/context`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    throw new Error(`Failed to update AI context: ${response.status}`);
  }

  const json = (await response.json()) as AiContextResponse;
  return json.data;
}

export async function removeWeakTopic(topic: string): Promise<void> {
  const response = await fetch(
    `${backendUrl}/api/ai/context/weak-topics/${encodeURIComponent(topic)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove weak topic: ${response.status}`);
  }
}

export async function removeStrongTopic(topic: string): Promise<void> {
  const response = await fetch(
    `${backendUrl}/api/ai/context/strong-topics/${encodeURIComponent(topic)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove strong topic: ${response.status}`);
  }
}
