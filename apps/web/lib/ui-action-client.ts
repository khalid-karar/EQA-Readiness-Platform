export async function postUiAction<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: string; result?: T };
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data.result as T;
}
