import type { TranslationKey } from './i18n';

export type PopupType = 'maze' | 'generate' | 'solve' | 'tutorial' | 'settings';

export interface ToolButton {
  type: PopupType;
  nameKey: TranslationKey;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image?: HTMLImageElement;
}

interface PopupDescriptor {
  nameKey: TranslationKey;
  icon: string;
}

export const TOOLBAR_WIDTH_DESKTOP = 50;
export const TOOLBAR_HEIGHT_MOBILE = 50;
export const BUTTON_SIZE = 36;
export const BUTTON_SPACING = 60;
export const BUTTON_BORDER_PADDING = 5;
export const BUTTON_ICON_OFFSET = 2;
export const POPUP_CANVAS_WIDTH = 370;
export const POPUP_CANVAS_HEIGHT = 4000;

export const POPUP_ORDER: PopupType[] = ['maze', 'generate', 'solve', 'tutorial', 'settings'];

const POPUP_DESCRIPTORS: Record<PopupType, PopupDescriptor> = {
  maze: {
    nameKey: 'toolbar.customMaze',
    icon: '/MazeSolver3D/icon/maze.png',
  },
  generate: {
    nameKey: 'toolbar.generateMaze',
    icon: '/MazeSolver3D/icon/generate_maze.png',
  },
  solve: {
    nameKey: 'toolbar.solvingMaze',
    icon: '/MazeSolver3D/icon/solving_maze.png',
  },
  tutorial: {
    nameKey: 'toolbar.tutorial',
    icon: '/MazeSolver3D/icon/question.png',
  },
  settings: {
    nameKey: 'toolbar.settings',
    icon: '/MazeSolver3D/icon/setting.png',
  },
};

export function createToolbarButtons(): ToolButton[] {
  return POPUP_ORDER.map(type => {
    const descriptor = POPUP_DESCRIPTORS[type];
    return {
      type,
      nameKey: descriptor.nameKey,
      icon: descriptor.icon,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  });
}
