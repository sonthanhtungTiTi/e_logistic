import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * useFocusTrap — Giữ focus bên trong container khi active.
 * Dùng cho: Drawer mobile, Modal, Dialog.
 *
 * @param active - true khi drawer/modal đang mở
 * @returns ref gắn vào container element
 *
 * @example
 * const drawerRef = useFocusTrap(isOpen);
 * <div ref={drawerRef} role="dialog" aria-modal="true">...</div>
 */
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => !el.closest('[aria-hidden="true"]'));

    if (focusable.length === 0) return;

    // Focus phần tử đầu tiên khi mở
    const previouslyFocused = document.activeElement as HTMLElement | null;
    focusable[0].focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: nếu đang ở đầu → nhảy về cuối
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: nếu đang ở cuối → nhảy về đầu
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Trả focus về element trước khi mở drawer/modal
      previouslyFocused?.focus();
    };
  }, [active]);

  return containerRef;
}
