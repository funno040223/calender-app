export function updateQuery(params: Record<string, string>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  window.history.replaceState(null, "", url);
}

export function selectedDate(raw: string | null, fallback: string) {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw) || !Number.isFinite(Date.parse(raw))) return fallback;
  return new Date(raw).toISOString().slice(0, 10) === raw ? raw : fallback;
}
