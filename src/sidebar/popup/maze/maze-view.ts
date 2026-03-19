import { MAZE_SIZE } from '../../../constants/maze';
import { getIconPath } from '../../../constants/assets';
import type { TranslationKey } from '../../../i18n';
import {
  createI18nButton,
  createLabeledNumberInput,
  setI18nAriaLabel,
  setI18nText,
  setI18nTitle,
} from '../utils';
import type { MazePopupViewBundle, MazePopupViewRefs, ToolMode } from './types';

const PLACEHOLDER_MAZE_TYPE_KEYS: TranslationKey[] = [
  'maze.hexagonalCustom',
  'maze.triangularCustom',
  'maze.circularCustom',
];

export function buildMazePopupView(canvas: HTMLCanvasElement): MazePopupViewBundle {
  const content = document.createElement('div');
  content.className = 'maze-popup__content';
  const accordionRows: HTMLDetailsElement[] = [];

  const singleLayer = createMazeEditorRow('maze.singleLayerCustom', canvas, true, false);
  content.appendChild(singleLayer.row);
  accordionRows.push(singleLayer.row);

  const multiCanvas = document.createElement('canvas');
  multiCanvas.width = canvas.width || 330;
  multiCanvas.height = canvas.height || 330;
  const multiLayer = createMazeEditorRow('maze.multiLayerCustom', multiCanvas, false, true);
  content.appendChild(multiLayer.row);
  accordionRows.push(multiLayer.row);

  PLACEHOLDER_MAZE_TYPE_KEYS.forEach(titleKey => {
    content.appendChild(createPlaceholderMazeTypeRow(titleKey));
  });

  return {
    controls: content,
    accordionRows,
    singleLayerRow: singleLayer.row,
    multiLayerRow: multiLayer.row,
    singleLayer: singleLayer.refs,
    multiLayer: {
      refs: multiLayer.refs,
      canvas: multiCanvas,
    },
  };
}

function createMazeEditorRow(
  titleKey: TranslationKey,
  canvas: HTMLCanvasElement,
  isOpen: boolean,
  showStairs: boolean
): { row: HTMLDetailsElement; refs: MazePopupViewRefs } {
  const editorRow = document.createElement('details');
  editorRow.className = 'maze-popup__row';
  editorRow.open = isOpen;

  const summary = document.createElement('summary');
  summary.className = 'maze-popup__summary';

  const sectionTitle = document.createElement('span');
  sectionTitle.className = 'maze-popup__title';
  setI18nText(sectionTitle, titleKey);
  summary.appendChild(sectionTitle);
  editorRow.appendChild(summary);

  const panel = document.createElement('div');
  panel.className = 'maze-popup__panel popup-accordion__panel';
  const panelBody = document.createElement('div');
  panelBody.className = 'maze-popup__panel-body';
  panel.appendChild(panelBody);

  const sizeSection = document.createElement('div');
  sizeSection.className = 'maze-popup__section';

  const rowsInput = createLabeledNumberInput({
    labelKey: 'maze.rows',
    min: MAZE_SIZE.MIN,
    max: MAZE_SIZE.MAX,
    value: MAZE_SIZE.DEFAULT_CUSTOM_EDITOR,
    wrapperClassName: 'maze-popup__input',
  });
  const colsInput = createLabeledNumberInput({
    labelKey: 'maze.cols',
    min: MAZE_SIZE.MIN,
    max: MAZE_SIZE.MAX,
    value: MAZE_SIZE.DEFAULT_CUSTOM_EDITOR,
    wrapperClassName: 'maze-popup__input',
  });

  const createBtn = createI18nButton({ textKey: 'maze.create', className: 'maze-popup__btn' });
  const loadBtn = createI18nButton({
    textKey: 'maze.loadCurrentMaze',
    className: 'maze-popup__btn',
  });

  sizeSection.appendChild(rowsInput.wrapper);
  sizeSection.appendChild(colsInput.wrapper);
  sizeSection.appendChild(createBtn);
  sizeSection.appendChild(loadBtn);

  const toolSection = document.createElement('div');
  toolSection.className = 'maze-popup__section';

  const penBtn = createIconToolButton('maze.pen', 'pen.png');
  const eraserBtn = createIconToolButton('maze.eraser', 'erase.png');
  const startBtn = createIconToolButton('maze.start', 'start.png');
  const endBtn = createIconToolButton('maze.end', 'end.png');
  const clearBtn = createIconToolButton('maze.clear', 'trash.png');

  toolSection.appendChild(penBtn);
  toolSection.appendChild(eraserBtn);
  toolSection.appendChild(startBtn);
  toolSection.appendChild(endBtn);
  toolSection.appendChild(clearBtn);

  const applySection = document.createElement('div');
  applySection.className = 'maze-popup__section maze-popup__section--apply';
  const applyBtn = createI18nButton({
    textKey: 'maze.apply',
    className: 'maze-popup__btn maze-popup__btn--primary',
  });
  applySection.appendChild(applyBtn);

  canvas.classList.add('maze-popup__canvas');

  panelBody.appendChild(sizeSection);
  panelBody.appendChild(toolSection);
  if (showStairs) {
    const stairsSection = document.createElement('div');
    stairsSection.className = 'maze-popup__section maze-popup__section--stairs';

    const stairsLabel = document.createElement('span');
    stairsLabel.className = 'maze-popup__section-label';
    setI18nText(stairsLabel, 'maze.stairs');

    const stairsNorthBtn = createI18nButton({
      textKey: 'maze.stairsNorth',
      className: 'maze-popup__btn',
    });
    const stairsEastBtn = createI18nButton({
      textKey: 'maze.stairsEast',
      className: 'maze-popup__btn',
    });
    const stairsSouthBtn = createI18nButton({
      textKey: 'maze.stairsSouth',
      className: 'maze-popup__btn',
    });
    const stairsWestBtn = createI18nButton({
      textKey: 'maze.stairsWest',
      className: 'maze-popup__btn',
    });

    stairsSection.appendChild(stairsLabel);
    stairsSection.appendChild(stairsNorthBtn);
    stairsSection.appendChild(stairsEastBtn);
    stairsSection.appendChild(stairsSouthBtn);
    stairsSection.appendChild(stairsWestBtn);

    panelBody.appendChild(stairsSection);
  }
  panelBody.appendChild(canvas);
  panelBody.appendChild(applySection);
  editorRow.appendChild(panel);

  return {
    row: editorRow,
    refs: {
      rowsInput: rowsInput.input,
      colsInput: colsInput.input,
      createBtn,
      loadBtn,
      clearBtn,
      applyBtn,
      toolButtons: {
        pen: penBtn,
        eraser: eraserBtn,
        start: startBtn,
        end: endBtn,
      } as Record<ToolMode, HTMLButtonElement>,
    },
  };
}

function createIconToolButton(textKey: TranslationKey, iconFile: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'maze-popup__tool';
  setI18nAriaLabel(button, textKey);
  setI18nTitle(button, textKey);

  const icon = document.createElement('img');
  icon.className = 'maze-popup__tool-icon';
  icon.src = getIconPath(iconFile);
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');

  const tooltip = document.createElement('span');
  tooltip.className = 'maze-popup__tool-tooltip';
  setI18nText(tooltip, textKey);

  button.appendChild(icon);
  button.appendChild(tooltip);
  return button;
}

function createPlaceholderMazeTypeRow(titleKey: TranslationKey): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'maze-popup__row maze-popup__row--placeholder';

  const summary = document.createElement('div');
  summary.className = 'maze-popup__summary maze-popup__summary--disabled';
  summary.setAttribute('aria-disabled', 'true');

  const title = document.createElement('span');
  title.className = 'maze-popup__title';
  setI18nText(title, titleKey);

  const badge = document.createElement('span');
  badge.className = 'maze-popup__badge maze-popup__badge--coming';
  setI18nText(badge, 'generate.comingSoon');

  summary.appendChild(title);
  summary.appendChild(badge);
  row.appendChild(summary);

  return row;
}
