const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8007";

export type Difficulty = "eli5" | "standard" | "academia";
export type InferenceBackend = "ollama" | "groq" | "cerebras" | "gemini" | "openrouter" | "cloud";
export type PipelineMode = "langgraph" | "langflow";

export interface Profile {
  id: string;
  name: string;
}

export async function getProfiles(): Promise<Profile[]> {
  const res = await fetch(`${BASE}/profiles`);
  if (!res.ok) throw new Error("Failed to fetch profiles");
  return res.json();
}

export async function createProfile(name: string): Promise<Profile> {
  const res = await fetch(`${BASE}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create profile");
  return res.json();
}

export async function getInference(): Promise<{ backend: InferenceBackend }> {
  const res = await fetch(`${BASE}/settings/inference`);
  if (!res.ok) throw new Error("Failed to fetch inference setting");
  return res.json();
}

export async function setInference(backend: InferenceBackend): Promise<void> {
  await fetch(`${BASE}/settings/inference`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backend }),
  });
}

export async function getPipelineMode(): Promise<{ mode: PipelineMode }> {
  const res = await fetch(`${BASE}/settings/pipeline`);
  if (!res.ok) throw new Error("Failed to fetch pipeline mode");
  return res.json();
}

export async function setPipelineMode(mode: PipelineMode): Promise<void> {
  await fetch(`${BASE}/settings/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

export function askStream(query: string, profileId: string, difficulty: Difficulty): EventSource {
  const url = new URL(`${BASE}/ask`);
  url.searchParams.set("q", query);
  url.searchParams.set("profile_id", profileId);
  url.searchParams.set("difficulty", difficulty);
  return new EventSource(url.toString());
}
