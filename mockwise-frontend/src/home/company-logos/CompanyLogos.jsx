import { useViewport } from '../../hooks/useViewport';
import CompanyLogosDesktop from './CompanyLogosDesktop';
import CompanyLogosMobile from './CompanyLogosMobile';
import '../../styles/CompanyLogos.css';

/**
 * Picks the mobile or desktop company-logos experience from viewport size.
 * Extend each child independently for device-specific features.
 */
export default function CompanyLogos() {
  const { isMobile } = useViewport();

  if (isMobile) {
    return <CompanyLogosMobile />;
  }

  return <CompanyLogosDesktop />;
}
