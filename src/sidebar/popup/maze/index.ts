import { Toolbar } from '../../toolbar';
import { subscribeLanguageChange } from '../../../i18n';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts } from '../popup-i18n';
import { MazeEditorController } from './maze-editor';
import { buildMazePopupView } from './maze-view';
import './maze.css';

class MazePopup {
  private readonly popupContainer: HTMLElement;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private editor: MazeEditorController | null = null;

  constructor(toolbar: Toolbar) {
    this.popupContainer = toolbar.createPopupContainerByKey('mazePopup', 'popup.customMaze');
    this.popupContainer.classList.add('maze-popup');

    const canvas = this.popupContainer.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error('Maze popup canvas not found');
    }
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    if (!ctx) {
      throw new Error('Failed to get 2D context for maze popup');
    }

    canvas.classList.add('maze-popup__canvas');
    canvas.width = 330;
    canvas.height = 330;

    const viewRefs = buildMazePopupView(canvas);
    this.popupContainer.appendChild(viewRefs.controls);

    this.editor = new MazeEditorController(canvas, ctx, viewRefs);
    this.editor.initialize();

    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
    this.watchContainerRemoval();
    this.applyTranslations();
  }

  private applyTranslations(): void {
    applyI18nTexts(this.popupContainer);
  }

  private watchContainerRemoval(): void {
    watchContainerRemoval(this.popupContainer, () => {
      if (this.editor) {
        this.editor.destroy();
      }
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = null;
      }
      this.editor = null;
    });
  }
}

/**
 * Show maze popup - Custom maze editor
 */
export function showMazePopup(toolbar: Toolbar): void {
  try {
    new MazePopup(toolbar);
  } catch (error) {
    console.error('Failed to initialize maze popup:', error);
  }
}
