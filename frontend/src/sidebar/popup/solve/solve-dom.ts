import { setI18nText } from '../utils';
import { createRow } from '../popup-rows';
import type { TranslationKey } from '../../../i18n';
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
  insightBox: HTMLDetailsElement;
  insightTitle: HTMLSpanElement;
  insightComplexityValue: HTMLSpanElement;
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

function createInfoValueRow(labelKey: TranslationKey): {
  row: HTMLDivElement;
  value: HTMLSpanElement;
} {
  const value = document.createElement('span');
  value.className = 'solve-popup__value';
  const { row } = createRow({
    label: labelKey,
    control: value,
    className: 'solve-popup__row',
    labelClassName: 'solve-popup__label',
    rowTag: 'div',
  });
  return { row: row as HTMLDivElement, value };
}

function createInsightSection(options: {
  labelKey: TranslationKey;
  value: HTMLElement;
}): HTMLDivElement {
  const section = document.createElement('div');
  section.className = 'solve-popup__insight-section';
  const label = document.createElement('h4');
  label.className = 'solve-popup__insight-label';
  setI18nText(label, options.labelKey);
  section.appendChild(label);
  section.appendChild(options.value);
  return section;
}

export function createSolvePopupDom(
  popupContainer: HTMLElement,
  selectedCategory: SolveAlgorithmCategory
): SolvePopupDomRefs {
  const content = document.createElement('div');
  content.className = 'solve-popup__content';

  const infoBox = document.createElement('section');
  infoBox.className = 'solve-popup__box solve-popup__box--info';

  const { row: topologyRow, value: topologyValue } = createInfoValueRow('solve.topologyDetected');
  infoBox.appendChild(topologyRow);

  const { row: sizeRow, value: sizeValue } = createInfoValueRow('solve.mazeSize');
  infoBox.appendChild(sizeRow);

  const { row: markerRow, value: markerValue } = createInfoValueRow('solve.markers');
  infoBox.appendChild(markerRow);

  const note = document.createElement('p');
  note.className = 'solve-popup__note';
  setI18nText(note, 'solve.autoTopologyNote');
  infoBox.appendChild(note);
  content.appendChild(infoBox);

  const algorithmBox = document.createElement('section');
  algorithmBox.className = 'solve-popup__box solve-popup__box--algorithm';

  const categorySelect = document.createElement('select');
  categorySelect.className = 'solve-popup__select';
  (Object.keys(SOLVE_ALGORITHMS_BY_CATEGORY) as SolveAlgorithmCategory[]).forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    setI18nText(option, CATEGORY_LABEL_KEYS[category]);
    categorySelect.appendChild(option);
  });
  categorySelect.value = selectedCategory;
  const { row: categoryRow } = createRow({
    label: 'solve.algorithmCategory',
    control: categorySelect,
    className: 'solve-popup__row',
    labelClassName: 'solve-popup__label',
  });
  algorithmBox.appendChild(categoryRow);

  const algorithmSelect = document.createElement('select');
  algorithmSelect.className = 'solve-popup__select';
  const { row: algorithmRow } = createRow({
    label: 'solve.algorithm',
    control: algorithmSelect,
    className: 'solve-popup__row',
    labelClassName: 'solve-popup__label',
  });
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
  insightPanel.className = 'solve-popup__insight-panel popup-accordion__panel';

  const insightComplexityValue = document.createElement('span');
  insightComplexityValue.className = 'solve-popup__insight-complexity';
  insightPanel.appendChild(
    createInsightSection({
      labelKey: 'solve.algorithmTimeComplexity',
      value: insightComplexityValue,
    })
  );

  const insightOverviewValue = document.createElement('p');
  insightOverviewValue.className = 'solve-popup__insight-text';
  insightPanel.appendChild(
    createInsightSection({
      labelKey: 'solve.algorithmOverview',
      value: insightOverviewValue,
    })
  );

  const insightProsList = document.createElement('ul');
  insightProsList.className = 'solve-popup__insight-list';
  insightPanel.appendChild(
    createInsightSection({
      labelKey: 'solve.algorithmPros',
      value: insightProsList,
    })
  );

  const insightConsList = document.createElement('ul');
  insightConsList.className = 'solve-popup__insight-list';
  insightPanel.appendChild(
    createInsightSection({
      labelKey: 'solve.algorithmCons',
      value: insightConsList,
    })
  );

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
    insightBox,
    insightTitle,
    insightComplexityValue,
    insightOverviewValue,
    insightProsList,
    insightConsList,
  };
}
