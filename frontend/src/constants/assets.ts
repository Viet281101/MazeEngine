function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function resolvePublicAssetPath(relativePath: string): string {
  const normalizedBaseUrl = normalizeBaseUrl(import.meta.env.BASE_URL);
  const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function getIconPath(fileName: string): string {
  return resolvePublicAssetPath(`icon/${fileName}`);
}
