import * as dat from 'dat.gui';
import type { MazeController } from './maze';
import { subscribeLanguageChange, t, type TranslationKey } from './i18n';
import { UI_BREAKPOINTS } from './constants/ui';

export interface GUISettings {
  backgroundColor: string;
  wallColor: string;
  floorColor: string;
  wallOpacity: number;
  floorOpacity: number;
  showEdges: boolean;
  showDebug: boolean;
  showPreview: boolean;
}

interface GUIConfig {
  scale?: number;
  mobileBreakpoint?: number;
  autoHide?: boolean;
  initialSettings?: Partial<GUISettings>;
  onSettingChange?: <K extends keyof GUISettings>(key: K, value: GUISettings[K]) => void;
}

type LiveVisualSettingKey =
  | 'backgroundColor'
  | 'wallColor'
  | 'floorColor'
  | 'wallOpacity'
  | 'floorOpacity';

/**
 * GUIController - Manage dat.GUI interface
 * Responsive & auto hide on mobile
 */
export class GUIController {
  private gui: dat.GUI;
  public settings: GUISettings;
  private mazeController: MazeController;

  // Configuration
  private readonly mobileBreakpoint: number;
  private readonly guiScale: number;
  private readonly autoHide: boolean;

  // Controllers - Fixed type
  private controllers: Map<string, any> = new Map();
  private controllerLabelKeys: Partial<Record<keyof GUISettings, TranslationKey>> = {};
  private unsubscribeLanguageChange: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private pendingVisualUpdates: Partial<Pick<GUISettings, LiveVisualSettingKey>> = {};
  private flushVisualUpdatesRafId: number | null = null;
  private readonly onSettingChange?: <K extends keyof GUISettings>(
    key: K,
    value: GUISettings[K]
  ) => void;

  constructor(mazeController: MazeController, config: GUIConfig = {}) {
    this.mazeController = mazeController;

    // Apply config with defaults
    this.mobileBreakpoint = config.mobileBreakpoint ?? UI_BREAKPOINTS.MOBILE;
    this.guiScale = config.scale ?? 1.4;
    this.autoHide = config.autoHide ?? true;
    this.onSettingChange = config.onSettingChange;

    // Default settings
    this.settings = {
      backgroundColor: '#999999',
      wallColor: '#808080',
      floorColor: '#C0C0C0',
      wallOpacity: 1.0,
      floorOpacity: 1.0,
      showEdges: true,
      showDebug: true,
      showPreview: true,
    };
    Object.assign(this.settings, config.initialSettings);

    this.gui = new dat.GUI();
    this.initializeGUI();
    this.refreshTranslations();
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.refreshTranslations());

    if (this.autoHide) {
      this.setupResponsiveness();
    }
  }

  /**
   * Initialize GUI controls
   */
  private initializeGUI(): void {
    this.styleGUIContainer();
    this.addColorControls();
    this.addOpacityControls();
  }

  /**
   * Style GUI container
   */
  private styleGUIContainer(): void {
    const guiContainer = this.gui.domElement.parentElement;
    if (!guiContainer) return;

    guiContainer.classList.add('scaled-gui');
    Object.assign(guiContainer.style, {
      zIndex: '1000',
      right: '-20px',
      transformOrigin: 'top right',
      transform: `scale(${this.guiScale})`,
    });
  }

  /**
   * Add color controls
   */
  private addColorControls(): void {
    // Background color
    const bgController = this.gui.addColor(this.settings, 'backgroundColor');
    this.setControllerLabel(bgController, 'gui.backgroundColor');
    bgController.onChange((value: string) => {
      this.queueVisualUpdate('backgroundColor', value);
    });
    this.controllers.set('backgroundColor', bgController);
    this.controllerLabelKeys.backgroundColor = 'gui.backgroundColor';

    // Wall color
    const wallColorController = this.gui.addColor(this.settings, 'wallColor');
    this.setControllerLabel(wallColorController, 'gui.wallColor');
    wallColorController.onChange((value: string) => {
      this.queueVisualUpdate('wallColor', value);
    });
    this.controllers.set('wallColor', wallColorController);
    this.controllerLabelKeys.wallColor = 'gui.wallColor';

    // Floor color
    const floorColorController = this.gui.addColor(this.settings, 'floorColor');
    this.setControllerLabel(floorColorController, 'gui.floorColor');
    floorColorController.onChange((value: string) => {
      this.queueVisualUpdate('floorColor', value);
    });
    this.controllers.set('floorColor', floorColorController);
    this.controllerLabelKeys.floorColor = 'gui.floorColor';
  }

  /**
   * Add opacity controls
   */
  private addOpacityControls(): void {
    // Wall opacity
    const wallOpacityController = this.gui.add(this.settings, 'wallOpacity', 0, 1, 0.01);
    this.setControllerLabel(wallOpacityController, 'gui.wallOpacity');
    wallOpacityController.onChange((value: number) => {
      this.queueVisualUpdate('wallOpacity', value);
    });
    this.controllers.set('wallOpacity', wallOpacityController);
    this.controllerLabelKeys.wallOpacity = 'gui.wallOpacity';

    // Floor opacity
    const floorOpacityController = this.gui.add(this.settings, 'floorOpacity', 0, 1, 0.01);
    this.setControllerLabel(floorOpacityController, 'gui.floorOpacity');
    floorOpacityController.onChange((value: number) => {
      this.queueVisualUpdate('floorOpacity', value);
    });
    this.controllers.set('floorOpacity', floorOpacityController);
    this.controllerLabelKeys.floorOpacity = 'gui.floorOpacity';
  }

  public refreshTranslations(): void {
    (Object.keys(this.controllerLabelKeys) as Array<keyof GUISettings>).forEach(key => {
      const controller = this.controllers.get(key);
      const labelKey = this.controllerLabelKeys[key];
      if (controller && labelKey) {
        this.setControllerLabel(controller, labelKey);
      }
    });
  }

  private setControllerLabel(controller: any, labelKey: TranslationKey): void {
    if (controller && typeof controller.name === 'function') {
      controller.name(t(labelKey));
    }
  }

  /**
   * Setup responsive behavior
   */
  private setupResponsiveness(): void {
    this.updateGUIVisibility();
    if (!this.resizeHandler) {
      this.resizeHandler = () => this.updateGUIVisibility();
      window.addEventListener('resize', this.resizeHandler);
    }
  }

  /**
   * Update GUI visibility based on window size
   */
  private updateGUIVisibility(): void {
    if (!this.gui.domElement) return;

    const isVisible = window.innerWidth > this.mobileBreakpoint;
    this.gui.domElement.style.display = isVisible ? 'block' : 'none';
  }

  /**
   * Public method to check window size
   */
  public checkWindowSize(): void {
    if (this.autoHide) {
      this.updateGUIVisibility();
    }
  }

  /**
   * Update 1 setting programmatically
   */
  public updateSetting<K extends keyof GUISettings>(key: K, value: GUISettings[K]): void {
    this.settings[key] = value;

    const controller = this.controllers.get(key);
    if (controller && controller.updateDisplay) {
      controller.updateDisplay();
    }
  }

  private notifySettingChange<K extends keyof GUISettings>(key: K, value: GUISettings[K]): void {
    if (this.onSettingChange) {
      this.onSettingChange(key, value);
    }
  }

  private queueVisualUpdate<K extends LiveVisualSettingKey>(key: K, value: GUISettings[K]): void {
    this.pendingVisualUpdates[key] = value;
    if (this.flushVisualUpdatesRafId !== null) {
      return;
    }
    this.flushVisualUpdatesRafId = window.requestAnimationFrame(() => {
      this.flushVisualUpdatesRafId = null;
      this.flushVisualUpdates();
    });
  }

  private flushVisualUpdates(): void {
    const pending = this.pendingVisualUpdates;
    this.pendingVisualUpdates = {};

    if (pending.backgroundColor !== undefined) {
      this.mazeController.setBackgroundColor(pending.backgroundColor);
      this.notifySettingChange('backgroundColor', pending.backgroundColor);
    }
    if (pending.wallColor !== undefined) {
      this.mazeController.updateWallColor(pending.wallColor);
      this.notifySettingChange('wallColor', pending.wallColor);
    }
    if (pending.floorColor !== undefined) {
      this.mazeController.updateFloorColor(pending.floorColor);
      this.notifySettingChange('floorColor', pending.floorColor);
    }
    if (pending.wallOpacity !== undefined) {
      this.mazeController.updateWallOpacity(pending.wallOpacity);
      this.notifySettingChange('wallOpacity', pending.wallOpacity);
    }
    if (pending.floorOpacity !== undefined) {
      this.mazeController.updateFloorOpacity(pending.floorOpacity);
      this.notifySettingChange('floorOpacity', pending.floorOpacity);
    }
  }

  /**
   * Enable/disable a controller input
   */
  public setControllerEnabled<K extends keyof GUISettings>(
    key: K,
    enabled: boolean,
    tooltip?: string
  ): void {
    const controller = this.controllers.get(key);
    if (!controller || !controller.domElement) return;
    const domElement = controller.domElement as HTMLElement;
    const input = domElement.querySelector('input, select, button') as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLButtonElement
      | null;
    if (input) {
      input.disabled = !enabled;
    }
    if (tooltip) {
      domElement.setAttribute('title', tooltip);
    } else {
      domElement.removeAttribute('title');
    }
    domElement.classList.toggle('is-disabled', !enabled);
  }

  /**
   * Show/hide GUI
   */
  public setVisible(visible: boolean): void {
    if (this.gui.domElement) {
      this.gui.domElement.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Destroy GUI
   */
  public destroy(): void {
    if (this.flushVisualUpdatesRafId !== null) {
      window.cancelAnimationFrame(this.flushVisualUpdatesRafId);
      this.flushVisualUpdatesRafId = null;
    }
    this.pendingVisualUpdates = {};

    // Clear controllers map
    this.controllers.clear();

    // Remove GUI from DOM
    if (this.gui && this.gui.domElement) {
      const guiContainer = this.gui.domElement.parentElement;
      if (guiContainer && guiContainer.parentElement) {
        guiContainer.parentElement.removeChild(guiContainer);
      }
    }
    if (this.unsubscribeLanguageChange) {
      this.unsubscribeLanguageChange();
      this.unsubscribeLanguageChange = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }
}
