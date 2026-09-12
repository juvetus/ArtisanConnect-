const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function resolveMediaUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url}`;
}
