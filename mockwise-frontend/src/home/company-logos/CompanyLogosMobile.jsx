import { COMPANY_LOGOS } from './companyLogosData';

/**
 * Mobile company logos view.
 * Add mobile-only interactions or layout here (scroll, carousel, etc.).
 */
export default function CompanyLogosMobile() {
  return (
    <section
      className="company-logos company-logos--mobile"
      aria-label="Company logos, mobile"
    >
      <h3 className="company-logos-heading text-white text-center mb-3">
        Simulate the real interview, get hired at leading companies
      </h3>
      <div
        className="company-logo-container"
        role="list"
        aria-label="Companies"
      >
        {COMPANY_LOGOS.map((logo) => (
          <div key={logo.src} className="logo-item" role="listitem">
            <img
              src={logo.src}
              alt={logo.alt}
              className="logo-img"
              width={96}
              height={48}
              decoding="async"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
