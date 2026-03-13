import type { GeneratorId, MazeComplexity, MazeTopologyId } from '../../../generator';
import type { TranslationKey } from '../../../i18n';
import { MAZE_SIZE } from '../../../constants/maze';
import { createI18nButton } from '../popup-elements';
import { createLabeledNumberInput, createNumberStepperField } from '../popup-inputs';
import { setI18nText } from '../popup-i18n';
import { createRow } from '../popup-rows';
import { createHelpIcon } from '../popup-help';
import { clamp, type GeneratorUiDefinition } from './generate-config';

interface ToggleRowResult {
  row: HTMLLabelElement;
  input: HTMLInputElement;
}

interface GenerateAction {
  generatorId: GeneratorId;
  rows: number;
  cols: number;
  northBias: number;
  randomizeStartEnd: boolean;
  randomizeStartEndLayers: boolean;
  forceDifferentLayers: boolean;
  minConnectorDistance: number;
  minConnectorsPerTransition: number;
  maxConnectorsPerTransition: number;
  noConnectorOnBorder: boolean;
  complexity: MazeComplexity;
}

interface CreateGeneratorRowOptions {
  generator: GeneratorUiDefinition;
  expanded: boolean;
  topology: MazeTopologyId;
  onGenerate: (action: GenerateAction) => Promise<void> | void;
}

function createHelpTooltip(tooltipKey: TranslationKey): HTMLSpanElement {
  const help = document.createElement('span');
  help.className = 'generate-popup__help';

  const icon = createHelpIcon({
    className: 'generate-popup__help-icon',
    ariaLabelKey: tooltipKey,
  });

  const tooltip = document.createElement('div');
  tooltip.className = 'generate-popup__tooltip';

  const tooltipText = document.createElement('p');
  tooltipText.className = 'generate-popup__tooltip-text';
  setI18nText(tooltipText, tooltipKey);

  tooltip.appendChild(tooltipText);
  help.appendChild(icon);
  help.appendChild(tooltip);

  return help;
}

function createLabelWrap(labelKey: TranslationKey, tooltipKey?: TranslationKey): HTMLSpanElement {
  const labelText = document.createElement('span');
  labelText.className = 'generate-popup__select-label-text';
  setI18nText(labelText, labelKey);

  const labelWrap = document.createElement('span');
  labelWrap.className = 'generate-popup__select-label';
  labelWrap.appendChild(labelText);

  if (tooltipKey) {
    labelWrap.appendChild(createHelpTooltip(tooltipKey));
  }

  return labelWrap;
}

function createToggleRow(
  labelKey: TranslationKey,
  checked: boolean,
  disabled: boolean = false
): ToggleRowResult {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'generate-popup__toggle-input';
  input.checked = checked;
  input.disabled = disabled;

  const { row } = createRow({
    label: labelKey,
    control: input,
    className: 'generate-popup__toggle-row',
    labelClassName: 'generate-popup__toggle-label',
  });

  return { row, input };
}

function createNumberInput(
  min: number,
  max: number,
  value: number,
  step: number = 1
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  return input;
}

export function createGeneratorRow(options: CreateGeneratorRowOptions): HTMLElement {
  const { generator, expanded, topology, onGenerate } = options;
  const isMultiLayer = topology === 'multiLayerRect';
  const details = document.createElement('details');
  details.className = 'generate-popup__row';
  details.open = expanded;

  const summary = document.createElement('summary');
  summary.className = 'generate-popup__summary';

  const title = document.createElement('span');
  title.className = 'generate-popup__title';
  setI18nText(title, generator.titleKey);

  const badge = document.createElement('span');
  badge.className = generator.available
    ? 'generate-popup__badge generate-popup__badge--available'
    : 'generate-popup__badge generate-popup__badge--coming';
  setI18nText(badge, generator.available ? 'generate.available' : 'generate.comingSoon');

  summary.appendChild(title);
  summary.appendChild(badge);
  details.appendChild(summary);

  const panel = document.createElement('div');
  panel.className = 'generate-popup__panel';

  const description = document.createElement('p');
  description.className = 'generate-popup__description';
  setI18nText(description, generator.descriptionKey);
  panel.appendChild(description);

  const sizeRow = document.createElement('div');
  sizeRow.className = 'generate-popup__size-row';

  const rowsInput = createLabeledNumberInput({
    labelKey: 'generate.rows',
    min: MAZE_SIZE.MIN,
    max: MAZE_SIZE.MAX,
    value: MAZE_SIZE.DEFAULT_GENERATE,
    wrapperClassName: 'generate-popup__input',
  });
  const colsInput = createLabeledNumberInput({
    labelKey: 'generate.cols',
    min: MAZE_SIZE.MIN,
    max: MAZE_SIZE.MAX,
    value: MAZE_SIZE.DEFAULT_GENERATE,
    wrapperClassName: 'generate-popup__input',
  });
  sizeRow.appendChild(rowsInput.wrapper);
  sizeRow.appendChild(colsInput.wrapper);

  const biasInput =
    generator.id === 'binaryTree'
      ? createLabeledNumberInput({
          labelKey: 'generate.bias',
          min: 0,
          max: 100,
          value: 50,
          wrapperClassName: 'generate-popup__input',
        })
      : null;
  if (biasInput) {
    sizeRow.appendChild(biasInput.wrapper);
  }
  panel.appendChild(sizeRow);

  let randomizeInput: HTMLInputElement | null = null;
  let randomizeLayersInput: HTMLInputElement | null = null;
  let forceDifferentLayersInput: HTMLInputElement | null = null;
  let minConnectorInput: HTMLInputElement | null = null;
  let minConnectorCountInput: HTMLInputElement | null = null;
  let maxConnectorCountInput: HTMLInputElement | null = null;
  let noConnectorBorderInput: HTMLInputElement | null = null;
  let complexitySelect: HTMLSelectElement | null = null;
  if (generator.id === 'binaryTree') {
    const moreSetup = document.createElement('details');
    moreSetup.className = 'generate-popup__more';

    const moreSummary = document.createElement('summary');
    moreSummary.className = 'generate-popup__more-summary';

    const moreTitle = document.createElement('span');
    moreTitle.className = 'generate-popup__more-title';
    setI18nText(moreTitle, 'generate.moreSetup');

    moreSummary.appendChild(moreTitle);
    moreSetup.appendChild(moreSummary);

    const morePanel = document.createElement('div');
    morePanel.className = 'generate-popup__more-panel';

    const randomizeRow = createToggleRow('generate.randomizeStartEnd', false);
    randomizeInput = randomizeRow.input;
    morePanel.appendChild(randomizeRow.row);

    if (isMultiLayer) {
      const randomizeLayersRow = createToggleRow('generate.randomizeStartEndLayers', false, true);
      randomizeLayersInput = randomizeLayersRow.input;
      morePanel.appendChild(randomizeLayersRow.row);

      const forceDifferentRow = createToggleRow('generate.forceDifferentLayers', true);
      forceDifferentLayersInput = forceDifferentRow.input;
      morePanel.appendChild(forceDifferentRow.row);

      const noBorderRow = createToggleRow('generate.noConnectorOnBorder', true);
      noConnectorBorderInput = noBorderRow.input;
      morePanel.appendChild(noBorderRow.row);

      randomizeInput.addEventListener('change', () => {
        if (!randomizeLayersInput) {
          return;
        }
        randomizeLayersInput.disabled = !randomizeInput?.checked;
        if (randomizeLayersInput.disabled) {
          randomizeLayersInput.checked = false;
        }
      });

      minConnectorInput = createNumberInput(1, 6, 2);
      const minConnectorField = createNumberStepperField(minConnectorInput);
      minConnectorField.classList.add('generate-popup__number-field');
      const { row: minConnectorRow } = createRow({
        label: createLabelWrap(
          'generate.minConnectorDistance',
          'generate.minConnectorDistanceNote'
        ),
        control: minConnectorField,
        className: 'generate-popup__select-row',
      });
      morePanel.appendChild(minConnectorRow);

      minConnectorCountInput = createNumberInput(0, 8, 1);
      minConnectorCountInput.dataset.connectorLimit = 'min';
      minConnectorCountInput.addEventListener('input', () => {
        minConnectorCountInput?.setAttribute('data-user-edited', 'true');
      });
      const minConnectorCountField = createNumberStepperField(minConnectorCountInput);
      minConnectorCountField.classList.add('generate-popup__number-field');
      const { row: minCountRow } = createRow({
        label: createLabelWrap(
          'generate.minConnectorsPerTransition',
          'generate.minConnectorsPerTransitionNote'
        ),
        control: minConnectorCountField,
        className: 'generate-popup__select-row',
      });
      morePanel.appendChild(minCountRow);

      maxConnectorCountInput = createNumberInput(0, 8, 8);
      maxConnectorCountInput.dataset.connectorLimit = 'max';
      maxConnectorCountInput.addEventListener('input', () => {
        maxConnectorCountInput?.setAttribute('data-user-edited', 'true');
      });
      const maxConnectorCountField = createNumberStepperField(maxConnectorCountInput);
      maxConnectorCountField.classList.add('generate-popup__number-field');
      const { row: maxCountRow } = createRow({
        label: createLabelWrap(
          'generate.maxConnectorsPerTransition',
          'generate.maxConnectorsPerTransitionNote'
        ),
        control: maxConnectorCountField,
        className: 'generate-popup__select-row',
      });
      morePanel.appendChild(maxCountRow);
    }

    const complexityLabelWrap = createLabelWrap(
      'generate.complexity',
      isMultiLayer ? 'generate.complexityNote' : undefined
    );

    const complexitySelectEl = document.createElement('select');
    complexitySelectEl.className = 'generate-popup__select';

    (['low', 'normal', 'high'] as MazeComplexity[]).forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      setI18nText(option, `generate.complexity.${value}`);
      complexitySelectEl.appendChild(option);
    });
    complexitySelectEl.value = 'normal';
    complexitySelect = complexitySelectEl;

    const applyConnectorDefaultsFromComplexity = (value: MazeComplexity) => {
      if (!minConnectorCountInput || !maxConnectorCountInput) {
        return;
      }
      const defaults =
        value === 'low'
          ? { min: 1, max: 2 }
          : value === 'high'
            ? { min: 4, max: 8 }
            : { min: 2, max: 5 };

      if (minConnectorCountInput.dataset.userEdited !== 'true') {
        minConnectorCountInput.value = String(defaults.min);
      }
      if (maxConnectorCountInput.dataset.userEdited !== 'true') {
        maxConnectorCountInput.value = String(defaults.max);
      }
      if (value === 'normal') {
        delete minConnectorCountInput.dataset.connectorSource;
        delete maxConnectorCountInput.dataset.connectorSource;
      } else {
        minConnectorCountInput.dataset.connectorSource = 'complexity';
        maxConnectorCountInput.dataset.connectorSource = 'complexity';
      }
    };

    const { row: complexityRow } = createRow({
      label: complexityLabelWrap,
      control: complexitySelectEl,
      className: 'generate-popup__select-row',
    });
    morePanel.appendChild(complexityRow);

    if (isMultiLayer) {
      applyConnectorDefaultsFromComplexity(complexitySelectEl.value as MazeComplexity);
      complexitySelectEl.addEventListener('change', () => {
        applyConnectorDefaultsFromComplexity(complexitySelectEl.value as MazeComplexity);
      });
    }

    moreSetup.appendChild(morePanel);
    panel.appendChild(moreSetup);
  }

  const actionRow = document.createElement('div');
  actionRow.className = 'generate-popup__action-row';

  const generateBtn = createI18nButton({
    textKey: 'generate.generateButton',
    className: 'generate-popup__btn',
  });
  actionRow.appendChild(generateBtn);

  const hint = document.createElement('span');
  hint.className = 'generate-popup__hint';
  setI18nText(hint, generator.available ? 'generate.sizeHint' : 'generate.comingSoon');
  actionRow.appendChild(hint);

  panel.appendChild(actionRow);
  details.appendChild(panel);

  if (generator.available) {
    let isGenerating = false;
    generateBtn.addEventListener('click', async () => {
      if (isGenerating) {
        return;
      }
      isGenerating = true;
      generateBtn.disabled = true;
      generateBtn.classList.add('generate-popup__btn--loading');
      generateBtn.setAttribute('aria-busy', 'true');
      setI18nText(generateBtn, 'generate.generatingButton');

      const rows = clamp(rowsInput.input.valueAsNumber || 0, MAZE_SIZE.MIN, MAZE_SIZE.MAX);
      const cols = clamp(colsInput.input.valueAsNumber || 0, MAZE_SIZE.MIN, MAZE_SIZE.MAX);
      const biasPercent = clamp(biasInput?.input.valueAsNumber ?? 50, 0, 100);
      const minConnectorDistance = clamp(minConnectorInput?.valueAsNumber ?? 2, 1, 6);
      const minConnectorsPerTransition = clamp(minConnectorCountInput?.valueAsNumber ?? 1, 0, 8);
      const maxConnectorsPerTransition = clamp(maxConnectorCountInput?.valueAsNumber ?? 8, 0, 8);
      rowsInput.input.valueAsNumber = rows;
      colsInput.input.valueAsNumber = cols;
      if (biasInput) {
        biasInput.input.valueAsNumber = biasPercent;
      }
      if (minConnectorInput) {
        minConnectorInput.valueAsNumber = minConnectorDistance;
      }
      if (minConnectorCountInput) {
        minConnectorCountInput.valueAsNumber = minConnectorsPerTransition;
      }
      if (maxConnectorCountInput) {
        maxConnectorCountInput.valueAsNumber = maxConnectorsPerTransition;
      }

      await new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve());
      });

      try {
        await onGenerate({
          generatorId: generator.id,
          rows,
          cols,
          northBias: biasPercent / 100,
          randomizeStartEnd: randomizeInput?.checked ?? false,
          randomizeStartEndLayers: randomizeLayersInput?.checked ?? false,
          forceDifferentLayers: forceDifferentLayersInput?.checked ?? true,
          minConnectorDistance,
          minConnectorsPerTransition,
          maxConnectorsPerTransition,
          noConnectorOnBorder: noConnectorBorderInput?.checked ?? true,
          complexity: (complexitySelect?.value as MazeComplexity) ?? 'normal',
        });
      } finally {
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.classList.remove('generate-popup__btn--loading');
        generateBtn.removeAttribute('aria-busy');
        setI18nText(generateBtn, 'generate.generateButton');
      }
    });
  } else {
    rowsInput.input.disabled = true;
    colsInput.input.disabled = true;
    if (biasInput) {
      biasInput.input.disabled = true;
    }
    if (randomizeInput) {
      randomizeInput.disabled = true;
    }
    if (randomizeLayersInput) {
      randomizeLayersInput.disabled = true;
    }
    if (forceDifferentLayersInput) {
      forceDifferentLayersInput.disabled = true;
    }
    if (minConnectorInput) {
      minConnectorInput.disabled = true;
    }
    if (minConnectorCountInput) {
      minConnectorCountInput.disabled = true;
    }
    if (maxConnectorCountInput) {
      maxConnectorCountInput.disabled = true;
    }
    if (noConnectorBorderInput) {
      noConnectorBorderInput.disabled = true;
    }
    if (complexitySelect) {
      complexitySelect.disabled = true;
    }
    generateBtn.disabled = true;
  }

  return details;
}
