import { Toolbar } from '../../toolbar';
import { subscribeLanguageChange } from '../../../i18n';
import { watchContainerRemoval } from '../popup-lifecycle';
import { getMazeAppBridge } from '../popup-maze-app-bridge';
import { applyI18nTexts, setupAccordionGroup, setupAnimatedDetails } from '../utils';
import { MazeEditorController } from './maze-editor';
import { buildMazePopupView } from './maze-view';
import './maze.css';

const TOOLBAR_POPUP_SHOWN_EVENT = 'toolbar-popup-shown';

class MazePopup {
  private readonly popupContainer: HTMLElement;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private editor: MazeEditorController | null = null;
  private multiLayerEditor: MazeEditorController | null = null;
  private readonly accordionRows: HTMLDetailsElement[];
  private readonly disposers: Array<() => void> = [];
  private readonly popupShownHandler = () => {
    this.bindAccordionBehavior();
  };

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

    const viewBundle = buildMazePopupView(canvas);
    this.popupContainer.appendChild(viewBundle.controls);
    this.accordionRows = viewBundle.accordionRows;

    this.editor = new MazeEditorController(canvas, ctx, viewBundle.singleLayer);
    this.editor.initialize();

    if (viewBundle.multiLayer) {
      const multiCanvas = viewBundle.multiLayer.canvas;
      const multiCtx = multiCanvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
      });
      if (!multiCtx) {
        throw new Error('Failed to get 2D context for multi-layer maze popup');
      }
      viewBundle.multiLayer.refs.applyBtn.disabled = true;
      viewBundle.multiLayer.refs.loadBtn.disabled = true;
      this.multiLayerEditor = new MazeEditorController(
        multiCanvas,
        multiCtx,
        viewBundle.multiLayer.refs
      );
      this.multiLayerEditor.initialize();
    }

    this.popupContainer.addEventListener(TOOLBAR_POPUP_SHOWN_EVENT, this.popupShownHandler);
    this.bindAccordionBehavior();

    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
    this.watchContainerRemoval();
    this.applyTranslations();
  }

  private bindAccordionBehavior(): void {
    this.disposers.splice(0).forEach(dispose => dispose());
    if (this.accordionRows.length === 0) {
      return;
    }

    const mazeApp = getMazeAppBridge();
    const allowMultiplePanels =
      mazeApp && typeof mazeApp.isAllowMultipleMazePopupPanelsEnabled === 'function'
        ? mazeApp.isAllowMultipleMazePopupPanelsEnabled()
        : false;

    if (allowMultiplePanels) {
      this.accordionRows.forEach(row => {
        this.disposers.push(setupAnimatedDetails(row));
      });
      return;
    }

    this.disposers.push(setupAccordionGroup(this.accordionRows));
  }

  private applyTranslations(): void {
    applyI18nTexts(this.popupContainer);
  }

  private watchContainerRemoval(): void {
    watchContainerRemoval(this.popupContainer, () => {
      this.popupContainer.removeEventListener(TOOLBAR_POPUP_SHOWN_EVENT, this.popupShownHandler);
      this.disposers.splice(0).forEach(dispose => dispose());
      if (this.editor) {
        this.editor.destroy();
      }
      if (this.multiLayerEditor) {
        this.multiLayerEditor.destroy();
      }
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = null;
      }
      this.editor = null;
      this.multiLayerEditor = null;
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
