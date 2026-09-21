import { COMPANY_LOGOS } from './companyLogosData';

/**
 * Laptop / desktop company logos view.
 * Add desktop-only interactions or layout here.
 */
export default function CompanyLogosDesktop() {
  return (
    <section
      className="company-logos company-logos--desktop"
      aria-label="Company logos, desktop"
    >
      <h3 className="company-logos-heading text-white text-center mb-3">
        Simulate the real interview, get hired at leading companies
      </h3>
      <div className="company-logo-container" role="list" aria-label="Companies">
        {COMPANY_LOGOS.map((logo) => (
          <div key={logo.src} className="logo-item" role="listitem">
            <img
              src={logo.src}
              alt={logo.alt}
              className="logo-img"
              width={120}
              height={60}
              decoding="async"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
