import type { GeneratorId } from '../../../generator';
import { MAZE_SIZE } from '../../../constants/maze';
import { createI18nButton } from '../popup-elements';
import { createLabeledNumberInput } from '../popup-inputs';
import { setI18nText } from '../popup-i18n';
import { clamp, type GeneratorUiDefinition } from './generate-config';

interface GenerateAction {
  generatorId: GeneratorId;
  rows: number;
  cols: number;
  northBias: number;
}

interface CreateGeneratorRowOptions {
  generator: GeneratorUiDefinition;
  expanded: boolean;
  onGenerate: (action: GenerateAction) => Promise<void> | void;
}

export function createGeneratorRow(options: CreateGeneratorRowOptions): HTMLElement {
  const { generator, expanded, onGenerate } = options;
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
      rowsInput.input.valueAsNumber = rows;
      colsInput.input.valueAsNumber = cols;
      if (biasInput) {
        biasInput.input.valueAsNumber = biasPercent;
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
    generateBtn.disabled = true;
  }

  return details;
}
