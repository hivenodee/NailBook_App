const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function api<T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.error?.message || "Request failed");
  }

  return json.data;
}
