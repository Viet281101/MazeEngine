import type { MazeTopologyId } from '../../../generator';
import type { MazeAppBridge } from '../../../types/maze';
import { subscribeLanguageChange, t } from '../../i18n';
import { Toolbar } from '../../toolbar';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts, setI18nText } from '../popup-i18n';
import {
  SOLVE_ALGORITHMS_BY_CATEGORY,
  type SolveAlgorithmCategory,
  type SolveAlgorithmDefinition,
} from '../../../solve/solve-catalog';
import { solveSingleLayerMazeWithBfs } from '../../../solve/runtime/single-layer-bfs';
import './solve.css';
const TOOLBAR_POPUP_SHOWN_EVENT = 'toolbar-popup-shown';

function getMazeAppBridge(): MazeAppBridge | null {
  return window.mazeApp ?? null;
}

const CATEGORY_LABEL_KEYS: Record<
  SolveAlgorithmCategory,
  | 'solve.category.classical'
  | 'solve.category.shortestPath'
  | 'solve.category.heuristic'
  | 'solve.category.navigation'
  | 'solve.category.metaheuristic'
> = {
  classical: 'solve.category.classical',
  shortestPath: 'solve.category.shortestPath',
  heuristic: 'solve.category.heuristic',
  navigation: 'solve.category.navigation',
  metaheuristic: 'solve.category.metaheuristic',
};

function detectTopology(mazeData: number[][][]): MazeTopologyId | 'unknown' {
  if (!Array.isArray(mazeData) || mazeData.length === 0) {
    return 'unknown';
  }
  if (mazeData.length > 1) {
    return 'multiLayerRect';
  }

  const firstLayer = mazeData[0];
  if (!Array.isArray(firstLayer) || firstLayer.length === 0 || !Array.isArray(firstLayer[0])) {
    return 'unknown';
  }

  const cols = firstLayer[0].length;
  const isRect = firstLayer.every(row => Array.isArray(row) && row.length === cols);
  return isRect ? 'singleLayerRect' : 'unknown';
}

export function showSolvePopup(toolbar: Toolbar): void {
  try {
    new SolvePopup(toolbar);
  } catch (error) {
    console.error('Failed to initialize solve popup:', error);
  }
}

class SolvePopup {
  private readonly popupContainer: HTMLElement;
  private readonly categorySelect: HTMLSelectElement;
  private readonly algorithmSelect: HTMLSelectElement;
  private readonly topologyValue: HTMLSpanElement;
  private readonly sizeValue: HTMLSpanElement;
  private readonly markerValue: HTMLSpanElement;
  private readonly solveButton: HTMLButtonElement;

  private selectedCategory: SolveAlgorithmCategory = 'shortestPath';
  private selectedAlgorithm: SolveAlgorithmDefinition | null = null;
  private unsubscribeLanguageChange: (() => void) | null = null;
  private readonly popupShownHandler = () => {
    this.refreshMazeInfo();
  };

  constructor(toolbar: Toolbar) {
    this.popupContainer = toolbar.createPopupContainerByKey('solvePopup', 'popup.solvingMaze');
    this.popupContainer.classList.add('solve-popup');
    this.removeDefaultCanvas();

    const refs = this.buildContent();
    this.categorySelect = refs.categorySelect;
    this.algorithmSelect = refs.algorithmSelect;
    this.topologyValue = refs.topologyValue;
    this.sizeValue = refs.sizeValue;
    this.markerValue = refs.markerValue;
    this.solveButton = refs.solveButton;

    this.bindEvents();
    this.refreshMazeInfo();
    this.refreshAlgorithmOptions();
    this.applyTranslations();

    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
    this.watchContainerRemoval();
  }

  private removeDefaultCanvas(): void {
    const canvas = this.popupContainer.querySelector('canvas');
    if (canvas) {
      canvas.remove();
    }
  }

  private buildContent(): {
    categorySelect: HTMLSelectElement;
    algorithmSelect: HTMLSelectElement;
    topologyValue: HTMLSpanElement;
    sizeValue: HTMLSpanElement;
    markerValue: HTMLSpanElement;
    solveButton: HTMLButtonElement;
  } {
    const content = document.createElement('div');
    content.className = 'solve-popup__content';
    const infoBox = document.createElement('section');
    infoBox.className = 'solve-popup__box solve-popup__box--info';

    const topologyRow = document.createElement('div');
    topologyRow.className = 'solve-popup__row';
    const topologyLabel = document.createElement('span');
    topologyLabel.className = 'solve-popup__label';
    setI18nText(topologyLabel, 'solve.topologyDetected');
    const topologyValue = document.createElement('span');
    topologyValue.className = 'solve-popup__value';
    topologyRow.appendChild(topologyLabel);
    topologyRow.appendChild(topologyValue);
    infoBox.appendChild(topologyRow);

    const sizeRow = document.createElement('div');
    sizeRow.className = 'solve-popup__row';
    const sizeLabel = document.createElement('span');
    sizeLabel.className = 'solve-popup__label';
    setI18nText(sizeLabel, 'solve.mazeSize');
    const sizeValue = document.createElement('span');
    sizeValue.className = 'solve-popup__value';
    sizeRow.appendChild(sizeLabel);
    sizeRow.appendChild(sizeValue);
    infoBox.appendChild(sizeRow);

    const markerRow = document.createElement('div');
    markerRow.className = 'solve-popup__row';
    const markerLabel = document.createElement('span');
    markerLabel.className = 'solve-popup__label';
    setI18nText(markerLabel, 'solve.markers');
    const markerValue = document.createElement('span');
    markerValue.className = 'solve-popup__value';
    markerRow.appendChild(markerLabel);
    markerRow.appendChild(markerValue);
    infoBox.appendChild(markerRow);

    const note = document.createElement('p');
    note.className = 'solve-popup__note';
    setI18nText(note, 'solve.autoTopologyNote');
    infoBox.appendChild(note);
    content.appendChild(infoBox);

    const algorithmBox = document.createElement('section');
    algorithmBox.className = 'solve-popup__box solve-popup__box--algorithm';

    const categoryRow = document.createElement('label');
    categoryRow.className = 'solve-popup__row';
    const categoryLabel = document.createElement('span');
    categoryLabel.className = 'solve-popup__label';
    setI18nText(categoryLabel, 'solve.algorithmCategory');
    const categorySelect = document.createElement('select');
    categorySelect.className = 'solve-popup__select';
    (Object.keys(SOLVE_ALGORITHMS_BY_CATEGORY) as SolveAlgorithmCategory[]).forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      setI18nText(option, CATEGORY_LABEL_KEYS[category]);
      categorySelect.appendChild(option);
    });
    categorySelect.value = this.selectedCategory;
    categoryRow.appendChild(categoryLabel);
    categoryRow.appendChild(categorySelect);
    algorithmBox.appendChild(categoryRow);

    const algorithmRow = document.createElement('label');
    algorithmRow.className = 'solve-popup__row';
    const algorithmLabel = document.createElement('span');
    algorithmLabel.className = 'solve-popup__label';
    setI18nText(algorithmLabel, 'solve.algorithm');
    const algorithmSelect = document.createElement('select');
    algorithmSelect.className = 'solve-popup__select';
    algorithmRow.appendChild(algorithmLabel);
    algorithmRow.appendChild(algorithmSelect);
    algorithmBox.appendChild(algorithmRow);
    content.appendChild(algorithmBox);

    const actionRow = document.createElement('div');
    actionRow.className = 'solve-popup__action-row';
    const solveButton = document.createElement('button');
    solveButton.type = 'button';
    solveButton.className = 'solve-popup__btn';
    solveButton.disabled = true;
    setI18nText(solveButton, 'solve.solveButton');
    actionRow.appendChild(solveButton);
    content.appendChild(actionRow);

    this.popupContainer.appendChild(content);
    return { categorySelect, algorithmSelect, topologyValue, sizeValue, markerValue, solveButton };
  }

  private bindEvents(): void {
    this.popupContainer.addEventListener(TOOLBAR_POPUP_SHOWN_EVENT, this.popupShownHandler);

    this.categorySelect.addEventListener('change', () => {
      this.selectedCategory = this.categorySelect.value as SolveAlgorithmCategory;
      this.refreshAlgorithmOptions();
    });

    this.algorithmSelect.addEventListener('change', () => {
      this.selectedAlgorithm = this.getSelectedAlgorithmById(this.algorithmSelect.value);
      this.updateSolveButtonState();
    });

    this.solveButton.addEventListener('click', () => {
      if (!this.selectedAlgorithm) {
        return;
      }
      const mazeApp = getMazeAppBridge();
      if (!mazeApp) {
        return;
      }

      const mazeData = mazeApp.getMazeData();
      const markers = mazeApp.getMazeMarkers();
      const topology = detectTopology(mazeData);

      if (topology !== 'singleLayerRect') {
        mazeApp.clearSolutionPath();
        window.alert(t('solve.singleLayerOnlyAlert'));
        return;
      }

      if (!markers?.start || !markers?.end || mazeData.length === 0) {
        mazeApp.clearSolutionPath();
        return;
      }

      const layer = mazeData[0];
      const path = solveSingleLayerMazeWithBfs(layer, markers.start, markers.end);
      if (!path) {
        mazeApp.clearSolutionPath();
        window.alert(t('solve.noPathFound'));
        return;
      }

      mazeApp.setSolutionPath(path);
      console.info(
        `[solve] Solved with BFS runtime (selected: ${this.selectedAlgorithm.id}) path length=${path.length}`
      );
    });
  }

  private refreshMazeInfo(): void {
    const mazeApp = getMazeAppBridge();
    const mazeData =
      mazeApp && typeof mazeApp.getMazeData === 'function' ? mazeApp.getMazeData() : [];
    const markers =
      mazeApp && typeof mazeApp.getMazeMarkers === 'function' ? mazeApp.getMazeMarkers() : null;

    const topology = detectTopology(mazeData);
    const topologyText =
      topology === 'unknown' ? t('solve.topology.unknown') : t(`generate.topology.${topology}`);
    this.topologyValue.textContent = topologyText;

    const firstLayer = mazeData[0];
    const rows = firstLayer?.length ?? 0;
    const cols = firstLayer?.[0]?.length ?? 0;
    const layers = mazeData.length;
    this.sizeValue.textContent =
      rows > 0 && cols > 0 && layers > 0
        ? `${rows} x ${cols} x ${layers}`
        : t('solve.mazeUnavailable');

    const hasStart = !!markers?.start;
    const hasEnd = !!markers?.end;
    if (hasStart && hasEnd) {
      this.markerValue.textContent = t('solve.markers.ready');
    } else if (!hasStart && !hasEnd) {
      this.markerValue.textContent = t('solve.markers.missingBoth');
    } else if (!hasStart) {
      this.markerValue.textContent = t('solve.markers.missingStart');
    } else {
      this.markerValue.textContent = t('solve.markers.missingEnd');
    }

    this.updateSolveButtonState();
  }

  private refreshAlgorithmOptions(): void {
    this.algorithmSelect.textContent = '';
    const algorithms = SOLVE_ALGORITHMS_BY_CATEGORY[this.selectedCategory];
    algorithms.forEach(algorithm => {
      const option = document.createElement('option');
      option.value = algorithm.id;
      option.textContent = algorithm.label;
      this.algorithmSelect.appendChild(option);
    });

    this.selectedAlgorithm = algorithms[0] ?? null;
    if (this.selectedAlgorithm) {
      this.algorithmSelect.value = this.selectedAlgorithm.id;
    }
    this.updateSolveButtonState();
  }

  private getSelectedAlgorithmById(id: string): SolveAlgorithmDefinition | null {
    const algorithms = SOLVE_ALGORITHMS_BY_CATEGORY[this.selectedCategory];
    return algorithms.find(algorithm => algorithm.id === id) ?? null;
  }

  private updateSolveButtonState(): void {
    const mazeApp = getMazeAppBridge();
    const markers =
      mazeApp && typeof mazeApp.getMazeMarkers === 'function' ? mazeApp.getMazeMarkers() : null;
    const hasMarkers = !!markers?.start && !!markers?.end;
    this.solveButton.disabled = !hasMarkers || !this.selectedAlgorithm;
  }

  private applyTranslations(): void {
    applyI18nTexts(this.popupContainer);
    this.refreshMazeInfo();
  }

  private watchContainerRemoval(): void {
    watchContainerRemoval(this.popupContainer, () => {
      this.popupContainer.removeEventListener(TOOLBAR_POPUP_SHOWN_EVENT, this.popupShownHandler);
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = null;
      }
    });
  }
}
