import type { GeneratorId, MazeComplexity, MazeTopologyId, ShaftDensity } from '../../../generator';
import { Toolbar } from '../../toolbar';
import { subscribeLanguageChange } from '../../../i18n';
import { watchContainerRemoval } from '../popup-lifecycle';
import { applyI18nTexts, setI18nText } from '../popup-i18n';
import { createLabeledNumberInput } from '../popup-inputs';
import {
  clamp,
  getGeneratorUiDefinitions,
  TOPOLOGIES,
  TOPOLOGY_LAYER_LIMITS,
} from './generate-config';
import { createGeneratorRow } from './generator-row';
import { disposeGenerationRunner, runGeneration } from './generate-runner';
import './generate.css';

class GeneratePopup {
  private popupContainer: HTMLElement;
  private listContainer: HTMLDivElement | null = null;
  private topologyParamsContainer: HTMLDivElement | null = null;
  private readonly topologyPanels = new Map<MazeTopologyId, HTMLDivElement>();
  private activeTopology: MazeTopologyId = 'singleLayerRect';
  private topologyParams: {
    layers: number;
    shaftDensity: ShaftDensity;
  } = {
    layers: TOPOLOGY_LAYER_LIMITS.defaultValue,
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
      min: TOPOLOGY_LAYER_LIMITS.min,
      max: TOPOLOGY_LAYER_LIMITS.max,
      value: this.topologyParams.layers,
      wrapperClassName: 'generate-popup__input',
    });
    layersInput.input.addEventListener('change', () => {
      this.topologyParams.layers = clamp(
        layersInput.input.valueAsNumber || TOPOLOGY_LAYER_LIMITS.defaultValue,
        TOPOLOGY_LAYER_LIMITS.min,
        TOPOLOGY_LAYER_LIMITS.max
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
      this.applyConnectorDefaultsForActivePanel();
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

    const activePanel = this.getOrCreateTopologyPanel(this.activeTopology);
    const isOnlyActivePanelMounted =
      this.listContainer.childElementCount === 1 &&
      this.listContainer.firstElementChild === activePanel;
    if (!isOnlyActivePanelMounted) {
      this.listContainer.replaceChildren(activePanel);
    }
    this.applyConnectorDefaultsForActivePanel();
  }

  private getConnectorDefaultsByDensity(density: ShaftDensity): {
    min: number;
    max: number;
  } {
    switch (density) {
      case 'sparse':
        return { min: 1, max: 3 };
      case 'dense':
        return { min: 2, max: 8 };
      case 'normal':
      default:
        return { min: 1, max: 5 };
    }
  }

  private applyConnectorDefaultsForActivePanel(): void {
    if (!this.listContainer || this.activeTopology !== 'multiLayerRect') {
      return;
    }
    const panel = this.getOrCreateTopologyPanel(this.activeTopology);
    if (!panel) {
      return;
    }
    const defaults = this.getConnectorDefaultsByDensity(this.topologyParams.shaftDensity);

    const minInputs = panel.querySelectorAll<HTMLInputElement>('input[data-connector-limit="min"]');
    minInputs.forEach(input => {
      if (input.dataset.userEdited === 'true') {
        return;
      }
      if (input.dataset.connectorSource === 'complexity') {
        return;
      }
      input.value = String(defaults.min);
    });

    const maxInputs = panel.querySelectorAll<HTMLInputElement>('input[data-connector-limit="max"]');
    maxInputs.forEach(input => {
      if (input.dataset.userEdited === 'true') {
        return;
      }
      if (input.dataset.connectorSource === 'complexity') {
        return;
      }
      input.value = String(defaults.max);
    });
  }

  private getOrCreateTopologyPanel(topology: MazeTopologyId): HTMLDivElement {
    const cached = this.topologyPanels.get(topology);
    if (cached) {
      return cached;
    }

    const panel = document.createElement('div');
    panel.className = 'generate-popup__generator-topology-panel';

    const generators = getGeneratorUiDefinitions(topology);
    if (generators.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'generate-popup__empty';
      setI18nText(empty, 'generate.noGeneratorsForTopology');
      panel.appendChild(empty);
    } else {
      generators.forEach((generator, index) => {
        const row = createGeneratorRow({
          generator,
          expanded: index === 0,
          topology,
          onGenerate: action =>
            this.generateById(
              topology,
              action.generatorId,
              action.rows,
              action.cols,
              action.northBias,
              action.randomizeStartEnd,
              action.randomizeStartEndLayers,
              action.forceDifferentLayers,
              action.minConnectorDistance,
              action.minConnectorsPerTransition,
              action.maxConnectorsPerTransition,
              action.noConnectorOnBorder,
              action.complexity
            ),
        });
        panel.appendChild(row);
      });
    }

    this.topologyPanels.set(topology, panel);
    return panel;
  }

  private async generateById(
    topology: MazeTopologyId,
    generatorId: GeneratorId,
    rows: number,
    cols: number,
    northBias: number,
    randomizeStartEnd: boolean,
    randomizeStartEndLayers: boolean,
    forceDifferentLayers: boolean,
    minConnectorDistance: number,
    minConnectorsPerTransition: number,
    maxConnectorsPerTransition: number,
    noConnectorOnBorder: boolean,
    complexity: MazeComplexity
  ): Promise<void> {
    await runGeneration({
      generatorId,
      topology,
      rows,
      cols,
      northBias,
      randomizeStartEnd,
      randomizeStartEndLayers,
      forceDifferentLayers,
      minConnectorDistance,
      minConnectorsPerTransition,
      maxConnectorsPerTransition,
      noConnectorOnBorder,
      complexity,
      multiLayerParams: {
        layers: clamp(
          this.topologyParams.layers,
          TOPOLOGY_LAYER_LIMITS.min,
          TOPOLOGY_LAYER_LIMITS.max
        ),
        shaftDensity: this.topologyParams.shaftDensity,
      },
    });
  }

  private applyTranslations(): void {
    applyI18nTexts(this.popupContainer);
    this.topologyPanels.forEach(panel => {
      applyI18nTexts(panel);
    });
  }

  private watchContainerRemoval(): void {
    watchContainerRemoval(this.popupContainer, () => {
      if (this.unsubscribeLanguageChange) {
        this.unsubscribeLanguageChange();
        this.unsubscribeLanguageChange = null;
      }
      disposeGenerationRunner();
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
