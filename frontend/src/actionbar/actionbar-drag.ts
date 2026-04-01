export class ActionBarDragController {
  private readonly root: HTMLDivElement;
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

  constructor(root: HTMLDivElement) {
    this.root = root;
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
    const rect = this.root.getBoundingClientRect();
    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(0, window.innerHeight - rect.height);
    this.windowX = Math.max(0, Math.min(this.windowX, maxX));
    this.windowY = Math.max(0, Math.min(this.windowY, maxY));
    this.applyPosition();
  }

  private applyPosition(): void {
    this.root.style.left = `${this.windowX}px`;
    this.root.style.top = `${this.windowY}px`;
  }
}
