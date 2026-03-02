import { Toolbar } from '../../toolbar';
import {
  executeGenerator,
  getGeneratorsForTopology,
  type GeneratorDefinition,
  type GeneratorId,
  type MazeTopologyId,
  type ShaftDensity,
} from '../../../generator';
import { subscribeLanguageChange, t, type TranslationKey } from '../../i18n';
import { MAZE_SIZE } from '../../../constants/maze';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts, setI18nText } from '../popup-i18n';
import { createLabeledNumberInput } from '../popup-inputs';
import { createI18nButton } from '../popup-elements';
import './generate.css';

interface GeneratorUiDefinition extends GeneratorDefinition {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}

const TOPOLOGIES: readonly MazeTopologyId[] = [
  'singleLayerRect',
  'multiLayerRect',
  'hexagonal',
  'triangular',
  'circular',
];

const GENERATOR_I18N: Record<
  GeneratorId,
  { titleKey: TranslationKey; descriptionKey: TranslationKey }
> = {
  binaryTree: {
    titleKey: 'generate.binaryTree',
    descriptionKey: 'generate.binaryTreeDescription',
  },
  recursiveBacktrack: {
    titleKey: 'generate.recursiveBacktrack',
    descriptionKey: 'generate.recursiveBacktrackDescription',
  },
  recursiveDivision: {
    titleKey: 'generate.recursiveDivision',
    descriptionKey: 'generate.recursiveDivisionDescription',
  },
  prim: {
    titleKey: 'generate.prim',
    descriptionKey: 'generate.primDescription',
  },
  kruskal: {
    titleKey: 'generate.kruskal',
    descriptionKey: 'generate.kruskalDescription',
  },
  wilson: {
    titleKey: 'generate.wilson',
    descriptionKey: 'generate.wilsonDescription',
  },
};

function getGeneratorUiDefinitions(topology: MazeTopologyId): readonly GeneratorUiDefinition[] {
  return getGeneratorsForTopology(topology).map(generator => ({
    ...generator,
    titleKey: GENERATOR_I18N[generator.id].titleKey,
    descriptionKey: GENERATOR_I18N[generator.id].descriptionKey,
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

class GeneratePopup {
  private static readonly TOPOLOGY_LAYERS_MIN = 2;
  private static readonly TOPOLOGY_LAYERS_MAX = 30;
  private static readonly TOPOLOGY_LAYERS_DEFAULT = 3;

  private popupContainer: HTMLElement;
  private listContainer: HTMLDivElement | null = null;
  private topologyParamsContainer: HTMLDivElement | null = null;
  private activeTopology: MazeTopologyId = 'singleLayerRect';
  private topologyParams: {
    layers: number;
    shaftDensity: ShaftDensity;
  } = {
    layers: GeneratePopup.TOPOLOGY_LAYERS_DEFAULT,
    shaftDensity: 'normal',
  };
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

    const topologyRow = document.createElement('div');
    topologyRow.className = 'generate-popup__topology-row';

    const topologyLabel = document.createElement('span');
    topologyLabel.className = 'generate-popup__topology-label';
    setI18nText(topologyLabel, 'generate.topology');
    topologyRow.appendChild(topologyLabel);

    const topologySelect = document.createElement('select');
    topologySelect.className = 'generate-popup__topology-select';
    TOPOLOGIES.forEach(topology => {
      const option = document.createElement('option');
      option.value = topology;
      setI18nText(option, `generate.topology.${topology}`);
      topologySelect.appendChild(option);
    });
    topologySelect.value = this.activeTopology;
    topologySelect.addEventListener('change', () => {
      this.activeTopology = topologySelect.value as MazeTopologyId;
      this.renderTopologyParams();
      this.renderGeneratorRows();
    });
    topologyRow.appendChild(topologySelect);
    content.appendChild(topologyRow);

    const topologyParamsContainer = document.createElement('div');
    topologyParamsContainer.className = 'generate-popup__topology-params';
    this.topologyParamsContainer = topologyParamsContainer;
    content.appendChild(topologyParamsContainer);

    const list = document.createElement('div');
    list.className = 'generate-popup__generator-list';
    this.listContainer = list;
    content.appendChild(list);

    this.popupContainer.appendChild(content);
    this.renderTopologyParams();
    this.renderGeneratorRows();
    this.applyTranslations();
  }

  private renderTopologyParams(): void {
    if (!this.topologyParamsContainer) {
      return;
    }
    this.topologyParamsContainer.textContent = '';

    if (this.activeTopology !== 'multiLayerRect') {
      return;
    }

    const label = document.createElement('div');
    label.className = 'generate-popup__topology-params-label';
    setI18nText(label, 'generate.topologyParams');
    this.topologyParamsContainer.appendChild(label);

    const row = document.createElement('div');
    row.className = 'generate-popup__size-row';

    const layersInput = createLabeledNumberInput({
      labelKey: 'generate.layers',
      min: GeneratePopup.TOPOLOGY_LAYERS_MIN,
      max: GeneratePopup.TOPOLOGY_LAYERS_MAX,
      value: this.topologyParams.layers,
      wrapperClassName: 'generate-popup__input',
    });
    layersInput.input.addEventListener('change', () => {
      this.topologyParams.layers = clamp(
        layersInput.input.valueAsNumber || GeneratePopup.TOPOLOGY_LAYERS_DEFAULT,
        GeneratePopup.TOPOLOGY_LAYERS_MIN,
        GeneratePopup.TOPOLOGY_LAYERS_MAX
      );
      layersInput.input.valueAsNumber = this.topologyParams.layers;
    });

    row.appendChild(layersInput.wrapper);

    const shaftDensityWrap = document.createElement('label');
    shaftDensityWrap.className = 'generate-popup__input';
    const shaftDensityLabel = document.createElement('span');
    setI18nText(shaftDensityLabel, 'generate.shaftDensity');
    const shaftDensitySelect = document.createElement('select');
    shaftDensitySelect.className = 'generate-popup__topology-select';
    (['sparse', 'normal', 'dense'] as const).forEach(density => {
      const option = document.createElement('option');
      option.value = density;
      setI18nText(option, `generate.shaftDensity.${density}`);
      shaftDensitySelect.appendChild(option);
    });
    shaftDensitySelect.value = this.topologyParams.shaftDensity;
    shaftDensitySelect.addEventListener('change', () => {
      this.topologyParams.shaftDensity = shaftDensitySelect.value as ShaftDensity;
    });
    shaftDensityWrap.appendChild(shaftDensityLabel);
    shaftDensityWrap.appendChild(shaftDensitySelect);
    row.appendChild(shaftDensityWrap);

    this.topologyParamsContainer.appendChild(row);
  }

  private renderGeneratorRows(): void {
    if (!this.listContainer) {
      return;
    }
    this.listContainer.textContent = '';

    const generators = getGeneratorUiDefinitions(this.activeTopology);
    if (generators.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'generate-popup__empty';
      setI18nText(empty, 'generate.noGeneratorsForTopology');
      this.listContainer.appendChild(empty);
      return;
    }

    generators.forEach((generator, index) => {
      const row = this.createGeneratorRow(generator, index === 0);
      this.listContainer?.appendChild(row);
    });
  }

  private createGeneratorRow(generator: GeneratorUiDefinition, expanded: boolean): HTMLElement {
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
            this.generateById(generator.id, rows, cols, biasPercent / 100);
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

  private generateById(generatorId: GeneratorId, rows: number, cols: number, northBias: number) {
    const mazeApp = window.mazeApp;
    if (!mazeApp || typeof mazeApp.updateMaze !== 'function') {
      console.warn('mazeApp.updateMaze not available');
      window.alert(t('generate.appUnavailable'));
      return;
    }

    const generated = executeGenerator(generatorId, this.activeTopology, {
      rows,
      cols,
      params: { northBias },
      topologyParams:
        this.activeTopology === 'multiLayerRect'
          ? {
              layers: clamp(
                this.topologyParams.layers,
                GeneratePopup.TOPOLOGY_LAYERS_MIN,
                GeneratePopup.TOPOLOGY_LAYERS_MAX
              ),
              shaftDensity: this.topologyParams.shaftDensity,
            }
          : undefined,
    });
    if (!generated) {
      console.warn(
        `Generator "${generatorId}" is unavailable for topology "${this.activeTopology}"`
      );
      return;
    }
    mazeApp.updateMaze(
      generated.maze,
      this.activeTopology === 'multiLayerRect',
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
