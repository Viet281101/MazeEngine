/**
 * Removes the default toolbar canvas from a popup container
 * so custom popup content can be mounted in its place.
 */
export function removePopupDefaultCanvas(popupContainer: HTMLElement): void {
  const canvas = popupContainer.querySelector('canvas');
  if (canvas) {
    canvas.remove();
  }
}
