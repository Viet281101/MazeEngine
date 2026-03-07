import { subscribeLanguageChange, t } from '../../i18n';
import { Toolbar } from '../../toolbar';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts } from '../popup-i18n';
import {
  type SolveAlgorithmCategory,
  type SolveAlgorithmDefinition,
} from '../../../solve/solve-catalog';
import { createSolvePopupDom } from './solve-dom';
import {
  detectTopology,
  getMazeAppBridge,
  runMazeSolve,
  type SolveRunResult,
} from './solve-runtime';
import { getMazeDataFromApp, getMazeMarkersFromApp } from '../popup-maze-app-bridge';
import {
  createMazeInfoSnapshot,
  findAlgorithmById,
  getAlgorithmInsight,
  getAlgorithmsForCategory,
} from './solve-view-model';
import './solve.css';

const TOOLBAR_POPUP_SHOWN_EVENT = 'toolbar-popup-shown';

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
  private readonly insightTitle: HTMLSpanElement;
  private readonly insightComplexityValue: HTMLSpanElement;
  private readonly insightOverviewValue: HTMLParagraphElement;
  private readonly insightProsList: HTMLUListElement;
  private readonly insightConsList: HTMLUListElement;

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

    const refs = createSolvePopupDom(this.popupContainer, this.selectedCategory);
    this.categorySelect = refs.categorySelect;
    this.algorithmSelect = refs.algorithmSelect;
    this.topologyValue = refs.topologyValue;
    this.sizeValue = refs.sizeValue;
    this.markerValue = refs.markerValue;
    this.solveButton = refs.solveButton;
    this.insightTitle = refs.insightTitle;
    this.insightComplexityValue = refs.insightComplexityValue;
    this.insightOverviewValue = refs.insightOverviewValue;
    this.insightProsList = refs.insightProsList;
    this.insightConsList = refs.insightConsList;

    this.bindEvents();
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

  private bindEvents(): void {
    this.popupContainer.addEventListener(TOOLBAR_POPUP_SHOWN_EVENT, this.popupShownHandler);

    this.categorySelect.addEventListener('change', () => {
      this.selectedCategory = this.categorySelect.value as SolveAlgorithmCategory;
      this.refreshAlgorithmOptions();
    });

    this.algorithmSelect.addEventListener('change', () => {
      this.selectedAlgorithm = this.getSelectedAlgorithmById(this.algorithmSelect.value);
      this.renderAlgorithmInsight();
      this.updateSolveButtonState();
    });

    this.solveButton.addEventListener('click', () => {
      if (!this.selectedAlgorithm) {
        return;
      }

      const result = runMazeSolve(this.selectedAlgorithm.id);
      this.handleSolveResult(result);
    });
  }

  private handleSolveResult(result: SolveRunResult): void {
    if (result.status === 'unsupportedTopology') {
      window.alert(t('solve.unsupportedTopologyAlert'));
      return;
    }
    if (result.status === 'noPath') {
      window.alert(t('solve.noPathFound'));
    }
  }

  private refreshMazeInfo(): void {
    const mazeApp = getMazeAppBridge();
    const mazeData = getMazeDataFromApp(mazeApp);
    const markers = getMazeMarkersFromApp(mazeApp);

    const topology = detectTopology(mazeData);
    const snapshot = createMazeInfoSnapshot(topology, mazeData, markers);
    this.topologyValue.textContent =
      topology === 'unknown' ? t('solve.topology.unknown') : t(`generate.topology.${topology}`);

    this.sizeValue.textContent =
      snapshot.rows > 0 && snapshot.cols > 0 && snapshot.layers > 0
        ? `${snapshot.rows} x ${snapshot.cols} x ${snapshot.layers}`
        : t('solve.mazeUnavailable');
    this.markerValue.textContent = t(snapshot.markerStatusKey);
    this.updateSolveButtonState(snapshot.hasReadyMarkers);
  }

  private refreshAlgorithmOptions(): void {
    this.algorithmSelect.textContent = '';
    const algorithms = getAlgorithmsForCategory(this.selectedCategory);
    const optionsFragment = document.createDocumentFragment();
    algorithms.forEach(algorithm => {
      const option = document.createElement('option');
      option.value = algorithm.id;
      option.textContent = algorithm.label;
      optionsFragment.appendChild(option);
    });
    this.algorithmSelect.appendChild(optionsFragment);

    this.selectedAlgorithm = algorithms[0] ?? null;
    if (this.selectedAlgorithm) {
      this.algorithmSelect.value = this.selectedAlgorithm.id;
    }
    this.renderAlgorithmInsight();
    this.updateSolveButtonState();
  }

  private getSelectedAlgorithmById(id: string): SolveAlgorithmDefinition | null {
    return findAlgorithmById(this.selectedCategory, id);
  }

  private hasReadyMarkers(): boolean {
    const mazeApp = getMazeAppBridge();
    const markers = getMazeMarkersFromApp(mazeApp);
    return !!markers?.start && !!markers?.end;
  }

  private updateSolveButtonState(hasMarkersOverride?: boolean): void {
    const hasMarkers = hasMarkersOverride ?? this.hasReadyMarkers();
    this.solveButton.disabled = !hasMarkers || !this.selectedAlgorithm;
  }

  private renderAlgorithmInsight(): void {
    this.insightTitle.textContent = this.selectedAlgorithm?.label ?? t('solve.algorithm');
    const insight = getAlgorithmInsight(this.selectedCategory, this.selectedAlgorithm);
    this.insightComplexityValue.textContent = insight.timeComplexity;
    this.insightOverviewValue.textContent = insight.overview;

    this.insightProsList.textContent = '';
    const prosFragment = document.createDocumentFragment();
    insight.pros.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      prosFragment.appendChild(li);
    });
    this.insightProsList.appendChild(prosFragment);

    this.insightConsList.textContent = '';
    const consFragment = document.createDocumentFragment();
    insight.cons.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      consFragment.appendChild(li);
    });
    this.insightConsList.appendChild(consFragment);
  }

  private applyTranslations(): void {
    applyI18nTexts(this.popupContainer);
    this.renderAlgorithmInsight();
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
