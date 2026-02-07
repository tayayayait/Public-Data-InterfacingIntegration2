/**
 * Remove a host-injected floating badge (often a heart chip).
 * Some variants render inside a shadow root, so we proactively
 * remove any matching host elements and keep watching briefly.
 */
const BADGE_SELECTORS = [
  '#lovable-badge',
  '[id^="lovable-badge"]',
  '[id*="lovable-badge"]',
  '.lovable-badge',
  '[class*="lovable-badge"]',
  '[data-lovable-badge]',
  '[data-testid="lovable-badge"]',
  '[data-testid*="lovable"]',
  'a[href*="lovable.dev"]',
  'a[href*="lovable.app"]',
  'iframe[src*="lovable.dev"]',
  'iframe[src*="lovable.app"]',
  'div[id*="lovable"]',
  'div[class*="lovable"]',
  'button[id*="lovable"]',
  'button[class*="lovable"]',
  'span[id*="lovable"]',
  'span[class*="lovable"]',
];

const isBadgeHostNode = (node: Element): boolean => {
  const id = (node.id || '').toLowerCase();
  const className = (typeof node.className === 'string' ? node.className : '').toLowerCase();
  return id.includes('lovable') || className.includes('lovable');
};

const removeInjectedBadges = (): number => {
  if (typeof document === 'undefined') return 0;

  let removed = 0;

  BADGE_SELECTORS.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.remove();
      removed += 1;
    });
  });

  // Handle shadow DOM hosts by removing the host element itself.
  document.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (isBadgeHostNode(el) && (el.shadowRoot || el.getAttribute('style')?.includes('position: fixed'))) {
      el.remove();
      removed += 1;
    }
  });

  return removed;
};

export const initInjectedBadgeBlocker = () => {
  if (typeof document === 'undefined') return;

  removeInjectedBadges();

  const observer = new MutationObserver(() => {
    const removed = removeInjectedBadges();
    // Disconnect after first successful removal to avoid needless overhead.
    if (removed > 0) {
      observer.disconnect();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Failsafe: stop observing after a short window to prevent long-running observers.
  window.setTimeout(() => observer.disconnect(), 15000);
};
