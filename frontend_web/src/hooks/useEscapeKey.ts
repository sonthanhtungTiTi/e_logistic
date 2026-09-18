import { useEffect } from 'react';

/**
 * useEscapeKey — Gọi callback khi user nhấn phím ESC.
 * Dùng cho: Đóng drawer, modal, dropdown khi nhấn ESC.
 *
 * @param active   - Chỉ lắng nghe khi active = true
 * @param onEscape - Callback được gọi khi ESC được nhấn
 *
 * @example
 * useEscapeKey(isDrawerOpen, () => setIsDrawerOpen(false));
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape]);
}
