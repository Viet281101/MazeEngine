export const UI_BREAKPOINTS = {
  MOBILE: 800,
} as const;

export const PREVIEW_WINDOW = {
  DEFAULT_WIDTH: 300,
  DEFAULT_HEIGHT: 320,
} as const;

export const MAZE_POPUP_ACCORDION = {
  PANEL_PADDING: {
    TOP: 10,
    BOTTOM: 12,
    HORIZONTAL: 12,
  },
  OPEN_DURATION_MS: 420,
  CLOSE_DURATION_MS: 320,
  OPEN_EASING: 'cubic-bezier(0.2, 0.85, 0.2, 1)',
  CLOSE_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;
