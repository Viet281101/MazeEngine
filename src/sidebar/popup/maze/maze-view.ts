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
const MULTI_LAYER_COUNT_LIMITS = {
  min: 2,
  max: 30,
  defaultValue: 3,
} as const;

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
  const layersInput = showStairs
    ? createLabeledNumberInput({
        labelKey: 'generate.layers',
        min: MULTI_LAYER_COUNT_LIMITS.min,
        max: MULTI_LAYER_COUNT_LIMITS.max,
        value: MULTI_LAYER_COUNT_LIMITS.defaultValue,
        wrapperClassName: 'maze-popup__input',
      })
    : null;

  const createBtn = createI18nButton({ textKey: 'maze.create', className: 'maze-popup__btn' });
  const loadBtn = createI18nButton({
    textKey: 'maze.loadCurrentMaze',
    className: 'maze-popup__btn',
  });

  sizeSection.appendChild(rowsInput.wrapper);
  sizeSection.appendChild(colsInput.wrapper);
  if (layersInput) {
    sizeSection.appendChild(layersInput.wrapper);
  }
  sizeSection.appendChild(createBtn);
  sizeSection.appendChild(loadBtn);

  const toolSection = document.createElement('div');
  toolSection.className = 'maze-popup__section maze-popup__section--tools';

  const penBtn = createIconToolButton('maze.pen', 'pen.png');
  const eraserBtn = createIconToolButton('maze.eraser', 'erase.png');
  const startBtn = createIconToolButton('maze.start', 'start.png');
  const endBtn = createIconToolButton('maze.end', 'end.png');
  let staircaseBtn: HTMLButtonElement | null = null;
  const clearBtn = createIconToolButton('maze.clear', 'trash.png');

  toolSection.appendChild(penBtn);
  toolSection.appendChild(eraserBtn);
  toolSection.appendChild(startBtn);
  toolSection.appendChild(endBtn);
  if (showStairs) {
    staircaseBtn = createIconToolButton('maze.stairs', 'staircase.png');
    staircaseBtn.classList.add('maze-popup__tool--staircase');
    staircaseBtn.setAttribute('aria-expanded', 'false');
    toolSection.appendChild(staircaseBtn);
  }
  toolSection.appendChild(clearBtn);

  const applySection = document.createElement('div');
  applySection.className = 'maze-popup__section maze-popup__section--apply';
  const applyBtn = createI18nButton({
    textKey: 'maze.apply',
    className: 'maze-popup__btn maze-popup__btn--primary',
  });
  applySection.appendChild(applyBtn);

  canvas.classList.add('maze-popup__canvas');
  const canvasShell = document.createElement('div');
  canvasShell.className = 'maze-popup__canvas-shell';
  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'maze-popup__canvas-wrap';
  canvasWrapper.appendChild(canvas);
  const layerTabsBar = document.createElement('div');
  layerTabsBar.className = 'maze-popup__layer-tabs-bar';
  layerTabsBar.hidden = !showStairs;
  const layerTabsPrevBtn = document.createElement('button');
  layerTabsPrevBtn.type = 'button';
  layerTabsPrevBtn.className = 'maze-popup__layer-tabs-nav';
  layerTabsPrevBtn.textContent = '‹';
  setI18nAriaLabel(layerTabsPrevBtn, 'maze.layerTabsScrollLeft');
  setI18nTitle(layerTabsPrevBtn, 'maze.layerTabsScrollLeft');
  const layerTabsSection = document.createElement('div');
  layerTabsSection.className = 'maze-popup__layer-tabs';
  const layerTabsNextBtn = document.createElement('button');
  layerTabsNextBtn.type = 'button';
  layerTabsNextBtn.className = 'maze-popup__layer-tabs-nav';
  layerTabsNextBtn.textContent = '›';
  setI18nAriaLabel(layerTabsNextBtn, 'maze.layerTabsScrollRight');
  setI18nTitle(layerTabsNextBtn, 'maze.layerTabsScrollRight');
  layerTabsBar.appendChild(layerTabsPrevBtn);
  layerTabsBar.appendChild(layerTabsSection);
  layerTabsBar.appendChild(layerTabsNextBtn);
  canvasShell.appendChild(layerTabsBar);
  canvasShell.appendChild(canvasWrapper);

  panelBody.appendChild(sizeSection);
  panelBody.appendChild(toolSection);
  let stairsOverlay: HTMLDivElement | undefined;
  let stairsDirectionShell: HTMLDivElement | undefined;
  let stairsNavigateIcon: HTMLImageElement | undefined;
  let stairsRotateLeftBtn: HTMLButtonElement | undefined;
  let stairsRotateRightBtn: HTMLButtonElement | undefined;
  let stairsConfirmBtn: HTMLButtonElement | undefined;
  if (showStairs) {
    stairsOverlay = document.createElement('div');
    const overlayEl = stairsOverlay;
    overlayEl.className = 'maze-popup__stairs-overlay';
    overlayEl.hidden = true;

    const stairsLabel = document.createElement('span');
    stairsLabel.className = 'maze-popup__section-label';
    setI18nText(stairsLabel, 'maze.stairsDirection');
    overlayEl.appendChild(stairsLabel);

    const stairsPicker = document.createElement('div');
    stairsPicker.className = 'maze-popup__stairs-picker';
    const stairsVisual = document.createElement('div');
    stairsVisual.className = 'maze-popup__stairs-visual';

    const stairPreviewImg = document.createElement('img');
    stairPreviewImg.className = 'maze-popup__stairs-preview-icon';
    stairPreviewImg.src = getIconPath('staircase.png');
    stairPreviewImg.alt = '';
    stairPreviewImg.setAttribute('aria-hidden', 'true');

    const directionShell = document.createElement('div');
    directionShell.className = 'maze-popup__stairs-direction-shell';
    stairsDirectionShell = directionShell;

    const directionImg = document.createElement('img');
    directionImg.className = 'maze-popup__stairs-direction-icon';
    directionImg.src = getIconPath('direction.png');
    directionImg.alt = '';
    directionImg.setAttribute('aria-hidden', 'true');

    stairsNavigateIcon = document.createElement('img');
    stairsNavigateIcon.className = 'maze-popup__stairs-navigate-icon';
    stairsNavigateIcon.src = getIconPath('navigate.png');
    stairsNavigateIcon.alt = '';
    stairsNavigateIcon.setAttribute('aria-hidden', 'true');

    directionShell.appendChild(directionImg);
    directionShell.appendChild(stairsNavigateIcon);

    const controls = document.createElement('div');
    controls.className = 'maze-popup__stairs-controls';

    stairsRotateLeftBtn = document.createElement('button');
    stairsRotateLeftBtn.type = 'button';
    stairsRotateLeftBtn.className = 'maze-popup__btn maze-popup__btn--small';
    setI18nAriaLabel(stairsRotateLeftBtn, 'maze.stairsRotateLeft');
    setI18nTitle(stairsRotateLeftBtn, 'maze.stairsRotateLeft');
    const rotateLeftIcon = document.createElement('img');
    rotateLeftIcon.className = 'maze-popup__stairs-rotate-icon';
    rotateLeftIcon.src = getIconPath('rotate_left.png');
    rotateLeftIcon.alt = '';
    rotateLeftIcon.setAttribute('aria-hidden', 'true');
    stairsRotateLeftBtn.appendChild(rotateLeftIcon);

    stairsRotateRightBtn = document.createElement('button');
    stairsRotateRightBtn.type = 'button';
    stairsRotateRightBtn.className = 'maze-popup__btn maze-popup__btn--small';
    setI18nAriaLabel(stairsRotateRightBtn, 'maze.stairsRotateRight');
    setI18nTitle(stairsRotateRightBtn, 'maze.stairsRotateRight');
    const rotateRightIcon = document.createElement('img');
    rotateRightIcon.className = 'maze-popup__stairs-rotate-icon';
    rotateRightIcon.src = getIconPath('rotate_right.png');
    rotateRightIcon.alt = '';
    rotateRightIcon.setAttribute('aria-hidden', 'true');
    stairsRotateRightBtn.appendChild(rotateRightIcon);

    stairsConfirmBtn = document.createElement('button');
    stairsConfirmBtn.type = 'button';
    stairsConfirmBtn.className = 'maze-popup__btn maze-popup__btn--primary';
    setI18nText(stairsConfirmBtn, 'maze.stairsConfirm');

    controls.appendChild(stairsRotateLeftBtn);
    controls.appendChild(stairsRotateRightBtn);
    controls.appendChild(stairsConfirmBtn);
    stairsVisual.appendChild(stairPreviewImg);
    stairsVisual.appendChild(directionShell);
    stairsPicker.appendChild(stairsVisual);
    stairsPicker.appendChild(controls);
    overlayEl.appendChild(stairsPicker);

    if (staircaseBtn) {
      staircaseBtn.addEventListener('click', () => {
        const shouldOpen = overlayEl.hidden;
        overlayEl.hidden = !shouldOpen;
        staircaseBtn.classList.toggle('is-open', shouldOpen);
        staircaseBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
      });
    }
    canvasWrapper.appendChild(overlayEl);
  }
  panelBody.appendChild(canvasShell);
  panelBody.appendChild(applySection);
  editorRow.appendChild(panel);

  return {
    row: editorRow,
    refs: {
      rowsInput: rowsInput.input,
      colsInput: colsInput.input,
      layersInput: layersInput?.input,
      layerTabsContainer: showStairs ? layerTabsSection : undefined,
      layerTabsPrevBtn: showStairs ? layerTabsPrevBtn : undefined,
      layerTabsNextBtn: showStairs ? layerTabsNextBtn : undefined,
      stairsBtn: staircaseBtn ?? undefined,
      stairsOverlay,
      stairsDirectionShell,
      stairsNavigateIcon,
      stairsRotateLeftBtn,
      stairsRotateRightBtn,
      stairsConfirmBtn,
      createBtn,
      loadBtn,
      clearBtn,
      applyBtn,
      toolButtons: {
        pen: penBtn,
        eraser: eraserBtn,
        start: startBtn,
        end: endBtn,
      } as Record<Exclude<ToolMode, 'stairs'>, HTMLButtonElement>,
    },
  };
}

function createIconToolButton(textKey: TranslationKey, iconFile: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'maze-popup__tool';
  setI18nAriaLabel(button, textKey);
  button.removeAttribute('title');

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
