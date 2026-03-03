import { setI18nText } from '../popup-i18n';
import {
  SOLVE_ALGORITHMS_BY_CATEGORY,
  type SolveAlgorithmCategory,
} from '../../../solve/solve-catalog';

export interface SolvePopupDomRefs {
  categorySelect: HTMLSelectElement;
  algorithmSelect: HTMLSelectElement;
  topologyValue: HTMLSpanElement;
  sizeValue: HTMLSpanElement;
  markerValue: HTMLSpanElement;
  solveButton: HTMLButtonElement;
  insightTitle: HTMLSpanElement;
  insightOverviewValue: HTMLParagraphElement;
  insightProsList: HTMLUListElement;
  insightConsList: HTMLUListElement;
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

export function createSolvePopupDom(
  popupContainer: HTMLElement,
  selectedCategory: SolveAlgorithmCategory
): SolvePopupDomRefs {
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
  categorySelect.value = selectedCategory;
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

  const insightBox = document.createElement('details');
  insightBox.className = 'solve-popup__box solve-popup__box--insight';
  insightBox.open = true;

  const insightSummary = document.createElement('summary');
  insightSummary.className = 'solve-popup__summary';
  const insightTitle = document.createElement('span');
  insightTitle.className = 'solve-popup__summary-title';
  insightSummary.appendChild(insightTitle);
  insightBox.appendChild(insightSummary);

  const insightPanel = document.createElement('div');
  insightPanel.className = 'solve-popup__insight-panel';

  const overviewSection = document.createElement('div');
  overviewSection.className = 'solve-popup__insight-section';
  const overviewLabel = document.createElement('h4');
  overviewLabel.className = 'solve-popup__insight-label';
  setI18nText(overviewLabel, 'solve.algorithmOverview');
  const insightOverviewValue = document.createElement('p');
  insightOverviewValue.className = 'solve-popup__insight-text';
  overviewSection.appendChild(overviewLabel);
  overviewSection.appendChild(insightOverviewValue);
  insightPanel.appendChild(overviewSection);

  const prosSection = document.createElement('div');
  prosSection.className = 'solve-popup__insight-section';
  const prosLabel = document.createElement('h4');
  prosLabel.className = 'solve-popup__insight-label';
  setI18nText(prosLabel, 'solve.algorithmPros');
  const insightProsList = document.createElement('ul');
  insightProsList.className = 'solve-popup__insight-list';
  prosSection.appendChild(prosLabel);
  prosSection.appendChild(insightProsList);
  insightPanel.appendChild(prosSection);

  const consSection = document.createElement('div');
  consSection.className = 'solve-popup__insight-section';
  const consLabel = document.createElement('h4');
  consLabel.className = 'solve-popup__insight-label';
  setI18nText(consLabel, 'solve.algorithmCons');
  const insightConsList = document.createElement('ul');
  insightConsList.className = 'solve-popup__insight-list';
  consSection.appendChild(consLabel);
  consSection.appendChild(insightConsList);
  insightPanel.appendChild(consSection);

  insightBox.appendChild(insightPanel);
  content.appendChild(insightBox);

  const actionRow = document.createElement('div');
  actionRow.className = 'solve-popup__action-row';
  const solveButton = document.createElement('button');
  solveButton.type = 'button';
  solveButton.className = 'solve-popup__btn';
  solveButton.disabled = true;
  setI18nText(solveButton, 'solve.solveButton');
  actionRow.appendChild(solveButton);
  content.appendChild(actionRow);

  popupContainer.appendChild(content);
  return {
    categorySelect,
    algorithmSelect,
    topologyValue,
    sizeValue,
    markerValue,
    solveButton,
    insightTitle,
    insightOverviewValue,
    insightProsList,
    insightConsList,
  };
}
