import keyMouseIcons from './key-mouse-icons.json';

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

export type KeyMouseIconName = keyof typeof keyMouseIcons;
export type KeyMouseFrameName = 'base' | 'pressed';

type KeyMouseIconMap = Record<KeyMouseIconName, { base: string; pressed?: string }>;

export const KEY_MOUSE_ICONS: KeyMouseIconMap = keyMouseIcons as KeyMouseIconMap;

export function getKeyMouseIconPath(
  iconName: KeyMouseIconName,
  frame: KeyMouseFrameName = 'base'
): string | null {
  const icon = KEY_MOUSE_ICONS[iconName];
  const fileName = frame === 'pressed' ? (icon.pressed ?? null) : icon.base;
  if (!fileName) {
    return null;
  }
  return getIconPath(`key&mouse/${fileName}`);
}
