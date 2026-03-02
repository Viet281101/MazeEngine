/**
 * Runs cleanup once a popup container is removed from the DOM tree.
 */
export function watchContainerRemoval(
  container: HTMLElement,
  onRemoved: () => void
): MutationObserver {
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      observer.disconnect();
      onRemoved();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
