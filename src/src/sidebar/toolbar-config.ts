import type { TranslationKey } from '../i18n';
import { getIconPath } from '../constants/assets';

export type PopupType = 'maze' | 'generate' | 'solve' | 'account' | 'tutorial' | 'settings';

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
// Keep a tall canvas to preserve existing popup rendering behavior.
export const POPUP_CANVAS_HEIGHT = 4000;
export const POPUP_TOP_MOBILE = '50px';
export const POPUP_TOP_DESKTOP = '0';
export const POPUP_LEFT_MOBILE = '50%';
export const POPUP_LEFT_DESKTOP = '238px';
export const POPUP_CONTROL_TOP_MOBILE = '56px';
export const POPUP_CONTROL_TOP_DESKTOP = '10px';
export const POPUP_CONTROL_CLOSE_LEFT_MOBILE = 'calc(50% + 160px)';
export const POPUP_CONTROL_CLOSE_LEFT_DESKTOP = '400px';
export const POPUP_CONTROL_HIDE_LEFT_MOBILE = 'calc(50% + 120px)';
export const POPUP_CONTROL_HIDE_LEFT_DESKTOP = '360px';

const POPUP_ORDER: PopupType[] = ['account', 'maze', 'generate', 'solve', 'tutorial', 'settings'];

const POPUP_DESCRIPTORS: Record<PopupType, PopupDescriptor> = {
  maze: {
    nameKey: 'toolbar.customMaze',
    icon: getIconPath('maze.png'),
  },
  generate: {
    nameKey: 'toolbar.generateMaze',
    icon: getIconPath('generate_maze.png'),
  },
  solve: {
    nameKey: 'toolbar.solvingMaze',
    icon: getIconPath('solving_maze.png'),
  },
  account: {
    nameKey: 'toolbar.account',
    icon: getIconPath('customer.png'),
  },
  tutorial: {
    nameKey: 'toolbar.tutorial',
    icon: getIconPath('question.png'),
  },
  settings: {
    nameKey: 'toolbar.settings',
    icon: getIconPath('setting.png'),
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
