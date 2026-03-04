import { MAZE_SIZE } from '../../../constants/maze';
import { getIconPath } from '../../../constants/assets';
import type { TranslationKey } from '../../i18n';
import { createI18nButton } from '../popup-elements';
import { setI18nAriaLabel, setI18nText, setI18nTitle } from '../popup-i18n';
import { createLabeledNumberInput } from '../popup-inputs';
import type { MazePopupViewRefs, ToolMode } from './types';

const PLACEHOLDER_MAZE_TYPE_KEYS: TranslationKey[] = [
  'maze.multiLayerCustom',
  'maze.hexagonalCustom',
  'maze.triangularCustom',
  'maze.circularCustom',
];

export function buildMazePopupView(canvas: HTMLCanvasElement): MazePopupViewRefs {
  const content = document.createElement('div');
  content.className = 'maze-popup__content';

  const editorRow = document.createElement('details');
  editorRow.className = 'maze-popup__row';
  editorRow.open = true;

  const summary = document.createElement('summary');
  summary.className = 'maze-popup__summary';

  const sectionTitle = document.createElement('span');
  sectionTitle.className = 'maze-popup__title';
  setI18nText(sectionTitle, 'maze.singleLayerCustom');
  summary.appendChild(sectionTitle);
  editorRow.appendChild(summary);

  const panel = document.createElement('div');
  panel.className = 'maze-popup__panel';

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

  panel.appendChild(sizeSection);
  panel.appendChild(toolSection);
  panel.appendChild(canvas);
  panel.appendChild(applySection);
  editorRow.appendChild(panel);
  content.appendChild(editorRow);

  PLACEHOLDER_MAZE_TYPE_KEYS.forEach(titleKey => {
    content.appendChild(createPlaceholderMazeTypeRow(titleKey));
  });

  return {
    controls: content,
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

function createPlaceholderMazeTypeRow(titleKey: TranslationKey): HTMLElement {
  const row = document.createElement('details');
  row.className = 'maze-popup__row maze-popup__row--placeholder';

  const summary = document.createElement('summary');
  summary.className = 'maze-popup__summary';

  const title = document.createElement('span');
  title.className = 'maze-popup__title';
  setI18nText(title, titleKey);

  summary.appendChild(title);
  row.appendChild(summary);

  const panel = document.createElement('div');
  panel.className = 'maze-popup__panel maze-popup__panel--placeholder';
  panel.setAttribute('aria-hidden', 'true');
  row.appendChild(panel);

  return row;
}
