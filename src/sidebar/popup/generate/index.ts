import { Toolbar } from '../../toolbar';
import { generateBinaryTreeMaze } from '../../../generator';
import { subscribeLanguageChange, t, type TranslationKey } from '../../i18n';
import { MAZE_SIZE } from '../../../constants/maze';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts, setI18nText } from '../popup-i18n';
import { createLabeledNumberInput } from '../popup-inputs';
import { createI18nButton } from '../popup-elements';
import './generate.css';

type GeneratorId =
  | 'binaryTree'
  | 'recursiveBacktrack'
  | 'recursiveDivision'
  | 'prim'
  | 'kruskal'
  | 'wilson';

interface GeneratorDefinition {
  id: GeneratorId;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  available: boolean;
}

const GENERATORS: GeneratorDefinition[] = [
  {
    id: 'binaryTree',
    titleKey: 'generate.binaryTree',
    descriptionKey: 'generate.binaryTreeDescription',
    available: true,
  },
  {
    id: 'recursiveBacktrack',
    titleKey: 'generate.recursiveBacktrack',
    descriptionKey: 'generate.recursiveBacktrackDescription',
    available: false,
  },
  {
    id: 'recursiveDivision',
    titleKey: 'generate.recursiveDivision',
    descriptionKey: 'generate.recursiveDivisionDescription',
    available: false,
  },
  {
    id: 'prim',
    titleKey: 'generate.prim',
    descriptionKey: 'generate.primDescription',
    available: false,
  },
  {
    id: 'kruskal',
    titleKey: 'generate.kruskal',
    descriptionKey: 'generate.kruskalDescription',
    available: false,
  },
  {
    id: 'wilson',
    titleKey: 'generate.wilson',
    descriptionKey: 'generate.wilsonDescription',
    available: false,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

class GeneratePopup {
  private popupContainer: HTMLElement;
  private unsubscribeLanguageChange: (() => void) | null = null;

  constructor(toolbar: Toolbar) {
    this.popupContainer = toolbar.createPopupContainerByKey('generatePopup', 'popup.generateMaze');
    this.popupContainer.classList.add('generate-popup');
    this.removeDefaultCanvas();
    this.buildContent();
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
    this.watchContainerRemoval();
  }

  private removeDefaultCanvas(): void {
    const canvas = this.popupContainer.querySelector('canvas');
    if (canvas) {
      canvas.remove();
    }
  }

  private buildContent(): void {
    const content = document.createElement('div');
    content.className = 'generate-popup__content';

    GENERATORS.forEach((generator, index) => {
      const row = this.createGeneratorRow(generator, index === 0);
      content.appendChild(row);
    });

    this.popupContainer.appendChild(content);
    this.applyTranslations();
  }

  private createGeneratorRow(generator: GeneratorDefinition, expanded: boolean): HTMLElement {
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
      generateBtn.addEventListener('click', () => {
        if (isGenerating) {
          return;
        }
        isGenerating = true;
        generateBtn.disabled = true;
        const rows = clamp(rowsInput.input.valueAsNumber || 0, MAZE_SIZE.MIN, MAZE_SIZE.MAX);
        const cols = clamp(colsInput.input.valueAsNumber || 0, MAZE_SIZE.MIN, MAZE_SIZE.MAX);
        const biasPercent = clamp(biasInput?.input.valueAsNumber ?? 50, 0, 100);
        rowsInput.input.valueAsNumber = rows;
        colsInput.input.valueAsNumber = cols;
        if (biasInput) {
          biasInput.input.valueAsNumber = biasPercent;
        }
        requestAnimationFrame(() => {
          try {
            this.generateBinaryTree(rows, cols, biasPercent / 100);
          } finally {
            isGenerating = false;
            generateBtn.disabled = false;
          }
        });
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

  private generateBinaryTree(rows: number, cols: number, northBias: number) {
    const mazeApp = window.mazeApp;
    if (!mazeApp || typeof mazeApp.updateMaze !== 'function') {
      console.warn('mazeApp.updateMaze not available');
      window.alert(t('generate.appUnavailable'));
      return;
    }

    const generated = generateBinaryTreeMaze(rows, cols, { northBias });
    mazeApp.updateMaze(
      generated.maze,
      false,
      {
        start: generated.markers.start,
        end: generated.markers.end,
      },
      {
        preserveCamera: true,
      }
    );
  }

  private applyTranslations() {
    applyI18nTexts(this.popupContainer);
  }

  private watchContainerRemoval(): void {
    watchContainerRemoval(this.popupContainer, () => {
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = null;
      }
    });
  }
}

export function showGeneratePopup(toolbar: Toolbar): void {
  try {
    new GeneratePopup(toolbar);
  } catch (error) {
    console.error('Failed to initialize generate popup:', error);
  }
}
