const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const appBasePath = configuredBasePath.replace(/\/$/, "");

export function assetUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appBasePath}${normalizedPath}`;
}
