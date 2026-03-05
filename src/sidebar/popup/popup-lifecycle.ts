/**
 * Runs cleanup once a popup container is removed from the DOM tree.
 */
export function watchContainerRemoval(container: HTMLElement, onRemoved: () => void): () => void {
  let isDisposed = false;

  const dispose = () => {
    if (isDisposed) {
      return;
    }
    isDisposed = true;
    observer.disconnect();
  };

  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      dispose();
      onRemoved();
    }
  });

  // If the caller registers after the node is already detached, run cleanup immediately.
  if (!document.body.contains(container)) {
    dispose();
    onRemoved();
    return dispose;
  }

  observer.observe(document.body, { childList: true, subtree: true });
  return dispose;
}
