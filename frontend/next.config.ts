import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Railway fournit parfois un domaine sans schéma : new URL() le refuserait au build.
function normalizeUrl(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, '');
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const publicUrls = {
  NEXT_PUBLIC_SITE_URL: normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL),
  NEXT_PUBLIC_API_URL: normalizeUrl(process.env.NEXT_PUBLIC_API_URL),
};

const nextConfig: NextConfig = {
  env: Object.fromEntries(Object.entries(publicUrls).filter(([, value]) => value)) as Record<string, string>,
  turbopack: {
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  },
};

export default nextConfig;
