import { useState, useEffect } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

interface BreakpointResult {
  breakpoint: Breakpoint;
  isMobile: boolean;   // < 768px
  isTablet: boolean;   // 768px - 1023px
  isDesktop: boolean;  // >= 1024px
  width: number;
}

/**
 * Hook trả về breakpoint hiện tại dựa trên viewport width.
 * Dùng để JS-conditional render (card vs table, split-panel, v.v.)
 * KHÔNG thay thế Tailwind CSS classes cho styling thuần.
 *
 * Breakpoints khớp Tailwind v4:
 *   sm: 640px | md: 768px | lg: 1024px | xl: 1280px
 */
export function useBreakpoint(): BreakpointResult {
  const getBreakpoint = (w: number): Breakpoint => {
    if (w >= 1280) return 'xl';
    if (w >= 1024) return 'lg';
    if (w >= 768) return 'md';
    return 'sm';
  };

  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => setWidth(window.innerWidth);
    // Dùng ResizeObserver nếu có (chính xác hơn), fallback về resize event
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => setWidth(window.innerWidth));
      ro.observe(document.documentElement);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);

  const breakpoint = getBreakpoint(width);

  return {
    breakpoint,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    width,
  };
}
