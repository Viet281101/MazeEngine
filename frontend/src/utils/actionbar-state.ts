export type ActionBarOrientation = 'horizontal' | 'vertical';

export const ACTION_BAR_DEFAULT_ORIENTATION: ActionBarOrientation = 'horizontal';
export const ACTION_BAR_STATE_PERSISTENCE_DEFAULT_ENABLED = true;

export const ACTION_BAR_SCALE = {
  MIN: 0.8,
  MAX: 1.4,
  STEP: 0.05,
  DEFAULT: 1,
} as const;

export function normalizeActionBarScale(
  scale: number,
  fallback: number = ACTION_BAR_SCALE.DEFAULT
): number {
  if (!Number.isFinite(scale)) {
    return fallback;
  }
  return Math.min(ACTION_BAR_SCALE.MAX, Math.max(ACTION_BAR_SCALE.MIN, Number(scale.toFixed(2))));
}

export function isActionBarOrientation(value: string | null): value is ActionBarOrientation {
  return value === 'horizontal' || value === 'vertical';
}
