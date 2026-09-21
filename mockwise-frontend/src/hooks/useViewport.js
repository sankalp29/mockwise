import { MEDIA } from './breakpoints';
import { useMediaQuery } from './useMediaQuery';

/**
 * Viewport mode for branching mobile vs laptop/desktop UI.
 *
 * @returns {{ isMobile: boolean, isDesktop: boolean, mode: 'mobile' | 'desktop' }}
 *
 * @example
 * const { isMobile, mode } = useViewport();
 * if (isMobile) return <MobileView />;
 * return <DesktopView />;
 */
export function useViewport() {
  const isMobile = useMediaQuery(MEDIA.mobile, false);

  return {
    isMobile,
    isDesktop: !isMobile,
    mode: isMobile ? 'mobile' : 'desktop',
  };
}
