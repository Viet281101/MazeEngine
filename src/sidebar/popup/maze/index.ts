import { Toolbar } from '../../toolbar';
import { subscribeLanguageChange, t, type TranslationKey } from '../../i18n';
import './maze.css';

type ToolMode = 'pen' | 'eraser' | 'start' | 'end';

interface CellPos {
  row: number;
  col: number;
}

interface MazePopupState {
  rows: number;
  cols: number;
  grid: number[][];
  start: CellPos | null;
  end: CellPos | null;
  tool: ToolMode;
  cellSize: number;
  scale: number;
  minScale: number;
  maxScale: number;
  offsetX: number;
  offsetY: number;
  isPanning: boolean;
  isDrawing: boolean;
  lastX: number;
  lastY: number;
}

class MazePopup {
  private toolbar: Toolbar;
  private popupContainer: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: MazePopupState;
  private rowsInput: HTMLInputElement;
  private colsInput: HTMLInputElement;
  private toolButtons: Record<ToolMode, HTMLButtonElement>;

  private createBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private applyBtn: HTMLButtonElement;
  private loadBtn: HTMLButtonElement;

  private onMouseDown: (e: MouseEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onMouseUp: () => void;
  private onMouseLeave: () => void;
  private onWheel: (e: WheelEvent) => void;
  private onContextMenu: (e: MouseEvent) => void;
  private unsubscribeLanguageChange: (() => void) | null = null;

  constructor(toolbar: Toolbar) {
    this.toolbar = toolbar;
    this.popupContainer = this.toolbar.createPopupContainerByKey('mazePopup', 'popup.customMaze');
    this.popupContainer.classList.add('maze-popup');

    const canvas = this.popupContainer.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error('Maze popup canvas not found');
    }
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    if (!ctx) {
      throw new Error('Failed to get 2D context for maze popup');
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.canvas.classList.add('maze-popup__canvas');
    this.canvas.width = 330;
    this.canvas.height = 330;

    const ui = this.buildControls();
    this.popupContainer.insertBefore(ui.controls, this.canvas);
    this.popupContainer.insertBefore(ui.applySection, this.canvas.nextSibling);
    this.rowsInput = ui.rowsInput;
    this.colsInput = ui.colsInput;
    this.toolButtons = ui.toolButtons;
    this.createBtn = ui.createBtn;
    this.clearBtn = ui.clearBtn;
    this.applyBtn = ui.applyBtn;
    this.loadBtn = ui.loadBtn;

    this.state = {
      rows: this.rowsInput.valueAsNumber,
      cols: this.colsInput.valueAsNumber,
      grid: [],
      start: null,
      end: null,
      tool: 'pen',
      cellSize: 22,
      scale: 1,
      minScale: 0.35,
      maxScale: 6,
      offsetX: 0,
      offsetY: 0,
      isPanning: false,
      isDrawing: false,
      lastX: 0,
      lastY: 0,
    };

    this.onMouseDown = e => this.handleMouseDown(e);
    this.onMouseMove = e => this.handleMouseMove(e);
    this.onMouseUp = () => this.handleMouseUp();
    this.onMouseLeave = () => this.handleMouseLeave();
    this.onWheel = e => this.handleWheel(e);
    this.onContextMenu = e => e.preventDefault();

    this.bindEvents();
    this.unsubscribeLanguageChange = subscribeLanguageChange(() => this.applyTranslations());
    this.watchContainerRemoval();
    this.applyTranslations();
    this.setTool('pen');
    this.rebuild(this.state.rows, this.state.cols);
  }

  private buildControls() {
    const controls = document.createElement('div');
    controls.className = 'maze-popup__controls';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'maze-popup__section-title';
    setI18nText(sectionTitle, 'maze.singleLayerCustom');
    controls.appendChild(sectionTitle);

    const sizeSection = document.createElement('div');
    sizeSection.className = 'maze-popup__section';

    const rowsInput = createNumberInput('maze.rows', 5, 80, 12);
    const colsInput = createNumberInput('maze.cols', 5, 80, 12);
    const createBtn = createButton('maze.create', 'maze-popup__btn');
    const loadBtn = createButton('maze.loadCurrentMaze', 'maze-popup__btn');

    sizeSection.appendChild(rowsInput.wrapper);
    sizeSection.appendChild(colsInput.wrapper);
    sizeSection.appendChild(createBtn);
    sizeSection.appendChild(loadBtn);

    const toolSection = document.createElement('div');
    toolSection.className = 'maze-popup__section';

    const penBtn = createButton('maze.pen', 'maze-popup__tool');
    const eraserBtn = createButton('maze.eraser', 'maze-popup__tool');
    const startBtn = createButton('maze.start', 'maze-popup__tool');
    const endBtn = createButton('maze.end', 'maze-popup__tool');

    toolSection.appendChild(penBtn);
    toolSection.appendChild(eraserBtn);
    toolSection.appendChild(startBtn);
    toolSection.appendChild(endBtn);

    const actionSection = document.createElement('div');
    actionSection.className = 'maze-popup__section';

    const clearBtn = createButton('maze.clear', 'maze-popup__btn');
    actionSection.appendChild(clearBtn);

    const applySection = document.createElement('div');
    applySection.className = 'maze-popup__section maze-popup__section--apply';
    const applyBtn = createButton('maze.apply', 'maze-popup__btn maze-popup__btn--primary');
    applySection.appendChild(applyBtn);

    controls.appendChild(sizeSection);
    controls.appendChild(toolSection);
    controls.appendChild(actionSection);
    return {
      controls,
      applySection,
      rowsInput: rowsInput.input,
      colsInput: colsInput.input,
      createBtn,
      loadBtn,
      clearBtn,
      applyBtn,
      toolButtons: {
        pen: penBtn,
        eraser: eraserBtn,
        start: startBtn,
        end: endBtn,
      } as Record<ToolMode, HTMLButtonElement>,
    };
  }

  private bindEvents() {
    this.createBtn.addEventListener('click', () => this.handleCreate());
    this.loadBtn.addEventListener('click', () => this.handleLoadCurrent());
    this.clearBtn.addEventListener('click', () => this.handleClear());
    this.applyBtn.addEventListener('click', () => this.handleApply());

    this.toolButtons.pen.addEventListener('click', () => this.setTool('pen'));
    this.toolButtons.eraser.addEventListener('click', () => this.setTool('eraser'));
    this.toolButtons.start.addEventListener('click', () => this.setTool('start'));
    this.toolButtons.end.addEventListener('click', () => this.setTool('end'));

    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private applyTranslations() {
    const i18nElements = this.popupContainer.querySelectorAll<HTMLElement>('[data-i18n-key]');
    i18nElements.forEach(element => {
      const key = element.getAttribute('data-i18n-key');
      if (key) {
        element.textContent = t(key as TranslationKey);
      }
    });
  }

  private watchContainerRemoval() {
    const observer = new MutationObserver(() => {
      if (!document.body.contains(this.popupContainer)) {
        if (this.unsubscribeLanguageChange) {
          this.unsubscribeLanguageChange();
          this.unsubscribeLanguageChange = null;
        }
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private setTool(tool: ToolMode) {
    this.state.tool = tool;
    Object.entries(this.toolButtons).forEach(([key, btn]) => {
      if (key === tool) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    });
  }

  private initGrid(rows: number, cols: number) {
    const grid: number[][] = [];
    for (let r = 0; r < rows; r += 1) {
      const row: number[] = [];
      for (let c = 0; c < cols; c += 1) {
        const isBorder = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
        row.push(isBorder ? 1 : 0);
      }
      grid.push(row);
    }
    return grid;
  }

  private resetView() {
    const gridWidth = this.state.cols * this.state.cellSize;
    const gridHeight = this.state.rows * this.state.cellSize;
    const scale = 1;
    this.state.scale = scale;
    this.state.offsetX = (this.canvas.width - gridWidth * scale) / 2;
    this.state.offsetY = (this.canvas.height - gridHeight * scale) / 2;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private draw() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#33566b';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.state.offsetX, this.state.offsetY);
    this.ctx.scale(this.state.scale, this.state.scale);

    const gridWidth = this.state.cols * this.state.cellSize;
    const gridHeight = this.state.rows * this.state.cellSize;

    this.ctx.fillStyle = '#e6e6e6';
    this.ctx.fillRect(0, 0, gridWidth, gridHeight);

    this.ctx.fillStyle = '#333';
    for (let r = 0; r < this.state.rows; r += 1) {
      for (let c = 0; c < this.state.cols; c += 1) {
        if (this.state.grid[r][c] === 1) {
          this.ctx.fillRect(
            c * this.state.cellSize,
            r * this.state.cellSize,
            this.state.cellSize,
            this.state.cellSize
          );
        }
      }
    }

    if (this.state.start) {
      this.ctx.fillStyle = 'rgba(0, 200, 120, 0.85)';
      this.ctx.fillRect(
        this.state.start.col * this.state.cellSize,
        this.state.start.row * this.state.cellSize,
        this.state.cellSize,
        this.state.cellSize
      );
    }

    if (this.state.end) {
      this.ctx.fillStyle = 'rgba(220, 60, 60, 0.85)';
      this.ctx.fillRect(
        this.state.end.col * this.state.cellSize,
        this.state.end.row * this.state.cellSize,
        this.state.cellSize,
        this.state.cellSize
      );
    }

    this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    this.ctx.lineWidth = 1 / this.state.scale;
    for (let c = 0; c <= this.state.cols; c += 1) {
      const x = c * this.state.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, gridHeight);
      this.ctx.stroke();
    }
    for (let r = 0; r <= this.state.rows; r += 1) {
      const y = r * this.state.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(gridWidth, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private getCellFromEvent(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.state.offsetX) / this.state.scale;
    const y = (e.clientY - rect.top - this.state.offsetY) / this.state.scale;
    const col = Math.floor(x / this.state.cellSize);
    const row = Math.floor(y / this.state.cellSize);
    if (row < 0 || col < 0 || row >= this.state.rows || col >= this.state.cols) {
      return null;
    }
    return { row, col };
  }

  private applyToolAt(pos: CellPos | null) {
    if (!pos) return;
    const { row, col } = pos;
    if (this.state.tool === 'pen') {
      this.state.grid[row][col] = 1;
    } else if (this.state.tool === 'eraser') {
      this.state.grid[row][col] = 0;
      if (this.state.start && this.state.start.row === row && this.state.start.col === col) {
        this.state.start = null;
      }
      if (this.state.end && this.state.end.row === row && this.state.end.col === col) {
        this.state.end = null;
      }
    } else if (this.state.tool === 'start') {
      this.state.grid[row][col] = 0;
      this.state.start = { row, col };
    } else if (this.state.tool === 'end') {
      this.state.grid[row][col] = 0;
      this.state.end = { row, col };
    }
    this.draw();
  }

  private rebuild(rows: number, cols: number) {
    this.state.rows = rows;
    this.state.cols = cols;
    this.state.grid = this.initGrid(rows, cols);
    this.state.start = null;
    this.state.end = null;
    this.resetView();
    this.draw();
  }

  private handleCreate() {
    const rows = this.clamp(this.rowsInput.valueAsNumber || 0, 5, 80);
    const cols = this.clamp(this.colsInput.valueAsNumber || 0, 5, 80);
    this.rowsInput.valueAsNumber = rows;
    this.colsInput.valueAsNumber = cols;
    this.rebuild(rows, cols);
  }

  private handleClear() {
    this.state.grid = this.initGrid(this.state.rows, this.state.cols);
    this.state.start = null;
    this.state.end = null;
    this.draw();
  }

  private handleLoadCurrent() {
    const mazeApp = (window as any).mazeApp;
    if (!mazeApp || typeof mazeApp.getMazeData !== 'function') {
      console.warn('mazeApp.getMazeData not available');
      return;
    }
    const data = mazeApp.getMazeData();
    const markers =
      mazeApp && typeof mazeApp.getMazeMarkers === 'function' ? mazeApp.getMazeMarkers() : null;
    if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0])) {
      console.warn('No maze data available to load');
      return;
    }
    if (data.length !== 1) {
      console.warn('Current maze is not single-layer. Load is blocked.');
      window.alert(t('maze.singleLayerOnlyAlert'));
      return;
    }
    const layer = data[0];
    if (!layer || layer.length === 0 || !Array.isArray(layer[0])) {
      console.warn('Maze layer is empty');
      return;
    }

    const rows = layer.length;
    const cols = layer[0].length;
    const nextRows = this.clamp(rows, 5, 80);
    const nextCols = this.clamp(cols, 5, 80);
    if (rows !== nextRows || cols !== nextCols) {
      console.warn('Maze size exceeds popup limits, data will be clamped');
    }

    const reversed = layer.slice().reverse();
    const grid: number[][] = [];
    for (let r = 0; r < nextRows; r += 1) {
      const row: number[] = [];
      const srcRow = reversed[r] ?? [];
      for (let c = 0; c < nextCols; c += 1) {
        const cell = srcRow[c] ?? 1;
        row.push(cell === 0 ? 0 : 1);
      }
      grid.push(row);
    }

    this.state.rows = nextRows;
    this.state.cols = nextCols;
    this.state.grid = grid;
    this.state.start = null;
    this.state.end = null;
    if (markers) {
      if (markers.start) {
        const popupStartRow = nextRows - 1 - markers.start.row;
        if (
          popupStartRow >= 0 &&
          popupStartRow < nextRows &&
          markers.start.col >= 0 &&
          markers.start.col < nextCols
        ) {
          this.state.start = { row: popupStartRow, col: markers.start.col };
        }
      }
      if (markers.end) {
        const popupEndRow = nextRows - 1 - markers.end.row;
        if (
          popupEndRow >= 0 &&
          popupEndRow < nextRows &&
          markers.end.col >= 0 &&
          markers.end.col < nextCols
        ) {
          this.state.end = { row: popupEndRow, col: markers.end.col };
        }
      }
    }
    this.rowsInput.valueAsNumber = nextRows;
    this.colsInput.valueAsNumber = nextCols;
    this.resetView();
    this.draw();
  }

  private handleApply() {
    const mazeData = [this.state.grid.map(row => row.slice()).reverse()];
    const mazeApp = (window as any).mazeApp;
    if (!mazeApp || typeof mazeApp.updateMaze !== 'function') {
      console.warn('mazeApp.updateMaze not available');
      return;
    }
    const start = this.state.start
      ? { row: this.state.rows - 1 - this.state.start.row, col: this.state.start.col }
      : null;
    const end = this.state.end
      ? { row: this.state.rows - 1 - this.state.end.row, col: this.state.end.col }
      : null;
    mazeApp.updateMaze(mazeData, false, {
      start,
      end,
    });
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button === 2) {
      this.state.isPanning = true;
      this.state.lastX = e.clientX;
      this.state.lastY = e.clientY;
      return;
    }
    if (e.button === 0) {
      this.state.isDrawing = true;
      this.applyToolAt(this.getCellFromEvent(e));
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.state.isPanning) {
      const dx = e.clientX - this.state.lastX;
      const dy = e.clientY - this.state.lastY;
      this.state.lastX = e.clientX;
      this.state.lastY = e.clientY;
      this.state.offsetX += dx;
      this.state.offsetY += dy;
      this.draw();
      return;
    }
    if (this.state.isDrawing) {
      this.applyToolAt(this.getCellFromEvent(e));
    }
  }

  private handleMouseUp() {
    this.state.isPanning = false;
    this.state.isDrawing = false;
  }

  private handleMouseLeave() {
    this.state.isPanning = false;
    this.state.isDrawing = false;
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = Math.exp(-e.deltaY * 0.0015);
    const nextScale = this.clamp(
      this.state.scale * zoomFactor,
      this.state.minScale,
      this.state.maxScale
    );

    const worldX = (mouseX - this.state.offsetX) / this.state.scale;
    const worldY = (mouseY - this.state.offsetY) / this.state.scale;

    this.state.scale = nextScale;
    this.state.offsetX = mouseX - worldX * this.state.scale;
    this.state.offsetY = mouseY - worldY * this.state.scale;
    this.draw();
  }
}

/**
 * Show maze popup - Custom maze editor
 */
export function showMazePopup(toolbar: Toolbar): void {
  try {
    new MazePopup(toolbar);
  } catch (error) {
    console.error('Failed to initialize maze popup:', error);
  }
}

function createNumberInput(labelKey: TranslationKey, min: number, max: number, value: number) {
  const wrapper = document.createElement('label');
  wrapper.className = 'maze-popup__input';

  const span = document.createElement('span');
  setI18nText(span, labelKey);

  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);

  wrapper.appendChild(span);
  wrapper.appendChild(input);

  return { wrapper, input };
}

function createButton(textKey: TranslationKey, className: string) {
  const btn = document.createElement('button');
  btn.type = 'button';
  setI18nText(btn, textKey);
  btn.className = className;
  return btn;
}

function setI18nText(element: HTMLElement, key: TranslationKey) {
  element.setAttribute('data-i18n-key', key);
  element.textContent = t(key);
}
