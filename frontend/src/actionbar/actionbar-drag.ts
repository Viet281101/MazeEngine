interface ActionBarDragControllerOptions {
  onPositionChange?: (position: { x: number; y: number } | null) => void;
}

export class ActionBarDragController {
  private readonly root: HTMLDivElement;
  private readonly onPositionChange: (position: { x: number; y: number } | null) => void;
  private isDragging: boolean = false;
  private draggingPointerId: number | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private windowX: number = 0;
  private windowY: number = 0;
  private isCustomPositioned: boolean = false;
  private readonly onPointerMoveHandler: (event: PointerEvent) => void;
  private readonly onPointerUpHandler: (event: PointerEvent) => void;
  private readonly onPointerDownHandler: (event: PointerEvent) => void;
  private readonly onSelectStartHandler: (event: Event) => void;
  private readonly onResizeHandler: () => void;

  constructor(root: HTMLDivElement, options: ActionBarDragControllerOptions = {}) {
    this.root = root;
    this.onPositionChange = options.onPositionChange ?? (() => {});
    this.onPointerMoveHandler = event => this.onPointerMove(event);
    this.onPointerUpHandler = event => this.onPointerUp(event);
    this.onPointerDownHandler = event => this.onPointerDown(event);
    this.onSelectStartHandler = event => event.preventDefault();
    this.onResizeHandler = () => this.onWindowResize();
    this.bindEvents();
  }

  public destroy(): void {
    this.root.removeEventListener('pointerdown', this.onPointerDownHandler);
    this.root.removeEventListener('selectstart', this.onSelectStartHandler);
    this.detachDragListeners();
    window.removeEventListener('resize', this.onResizeHandler);
  }

  public constrainToViewport(): void {
    if (!this.isCustomPositioned) {
      return;
    }
    this.clampPositionToViewport();
  }

  public setCustomPosition(position: { x: number; y: number } | null): void {
    if (!position) {
      this.isCustomPositioned = false;
      this.root.style.left = '';
      this.root.style.top = '';
      this.root.style.bottom = '';
      this.root.style.transform = '';
      this.emitPositionChange();
      return;
    }

    this.isCustomPositioned = true;
    this.windowX = position.x;
    this.windowY = position.y;
    this.root.style.bottom = 'auto';
    this.root.style.transform = 'none';
    this.clampPositionToViewport();
    this.emitPositionChange();
  }

  public getCustomPosition(): { x: number; y: number } | null {
    if (!this.isCustomPositioned) {
      return null;
    }
    return {
      x: this.windowX,
      y: this.windowY,
    };
  }

  public repositionAfterLayoutChange(previousRect: DOMRect): void {
    if (!this.isCustomPositioned) {
      return;
    }

    const currentRect = this.root.getBoundingClientRect();
    const nextX = this.computeAnchoredPosition(
      previousRect.left,
      previousRect.right,
      previousRect.width,
      currentRect.width,
      window.innerWidth
    );
    const nextY = this.computeAnchoredPosition(
      previousRect.top,
      previousRect.bottom,
      previousRect.height,
      currentRect.height,
      window.innerHeight
    );

    this.windowX = nextX;
    this.windowY = nextY;
    this.clampPositionToViewport();
  }

  private bindEvents(): void {
    this.root.addEventListener('pointerdown', this.onPointerDownHandler);
    this.root.addEventListener('selectstart', this.onSelectStartHandler);
    window.addEventListener('resize', this.onResizeHandler);
  }

  private onPointerDown(event: PointerEvent): void {
    if (!event.isPrimary) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    if (event.target instanceof Element && event.target.closest('button, select, option')) {
      return;
    }

    this.ensureCustomPositioned();
    this.isDragging = true;
    this.draggingPointerId = event.pointerId;
    this.dragStartX = event.clientX - this.windowX;
    this.dragStartY = event.clientY - this.windowY;
    this.root.classList.add('is-dragging');
    event.preventDefault();
    this.attachDragListeners();
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) {
      return;
    }
    if (this.draggingPointerId !== null && event.pointerId !== this.draggingPointerId) {
      return;
    }

    const rect = this.root.getBoundingClientRect();
    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(0, window.innerHeight - rect.height);

    this.windowX = Math.max(0, Math.min(event.clientX - this.dragStartX, maxX));
    this.windowY = Math.max(0, Math.min(event.clientY - this.dragStartY, maxY));
    this.applyPosition();
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.draggingPointerId !== null && event.pointerId !== this.draggingPointerId) {
      return;
    }
    if (!this.isDragging) {
      this.detachDragListeners();
      return;
    }
    this.isDragging = false;
    this.draggingPointerId = null;
    this.root.classList.remove('is-dragging');
    this.detachDragListeners();
    this.emitPositionChange();
  }

  private attachDragListeners(): void {
    document.addEventListener('pointermove', this.onPointerMoveHandler);
    document.addEventListener('pointerup', this.onPointerUpHandler);
    document.addEventListener('pointercancel', this.onPointerUpHandler);
  }

  private detachDragListeners(): void {
    document.removeEventListener('pointermove', this.onPointerMoveHandler);
    document.removeEventListener('pointerup', this.onPointerUpHandler);
    document.removeEventListener('pointercancel', this.onPointerUpHandler);
  }

  private ensureCustomPositioned(): void {
    if (this.isCustomPositioned) {
      return;
    }
    const rect = this.root.getBoundingClientRect();
    this.windowX = rect.left;
    this.windowY = rect.top;
    this.root.style.left = `${this.windowX}px`;
    this.root.style.top = `${this.windowY}px`;
    this.root.style.bottom = 'auto';
    this.root.style.transform = 'none';
    this.isCustomPositioned = true;
  }

  private onWindowResize(): void {
    if (!this.isCustomPositioned) {
      return;
    }
    this.clampPositionToViewport();
  }

  private clampPositionToViewport(): void {
    const rect = this.root.getBoundingClientRect();
    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(0, window.innerHeight - rect.height);
    this.windowX = Math.max(0, Math.min(this.windowX, maxX));
    this.windowY = Math.max(0, Math.min(this.windowY, maxY));
    this.applyPosition();
  }

  private computeAnchoredPosition(
    start: number,
    end: number,
    previousSize: number,
    currentSize: number,
    viewportSize: number
  ): number {
    const EDGE_THRESHOLD = 24;
    const startGap = start;
    const endGap = Math.max(0, viewportSize - end);
    const previousCenter = start + previousSize / 2;

    if (endGap <= EDGE_THRESHOLD) {
      return viewportSize - endGap - currentSize;
    }
    if (startGap <= EDGE_THRESHOLD) {
      return startGap;
    }
    return previousCenter - currentSize / 2;
  }

  private applyPosition(): void {
    this.root.style.left = `${this.windowX}px`;
    this.root.style.top = `${this.windowY}px`;
  }

  private emitPositionChange(): void {
    this.onPositionChange(this.getCustomPosition());
  }
}
