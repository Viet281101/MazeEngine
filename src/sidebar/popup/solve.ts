import { Toolbar } from '../toolbar';

export function showSolvePopup(toolbar: Toolbar) {
  const popupContainer = toolbar.createPopupContainerByKey('solvePopup', 'popup.solvingMaze');
  const popup = popupContainer.querySelector('canvas') as HTMLCanvasElement;
  const ctx = popup.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(0, 0, popup.width, popup.height);
  }
}
