import type { Scraper, ScraperResult, ScrapedRegulation } from "./types";

/**
 * Federal regulation scraper.
 * Covers SBA guidelines, IRS requirements, and key federal permits/registrations.
 */
export class FederalScraper implements Scraper {
  name = "United States Federal";

  async scrape(): Promise<ScraperResult> {
    const regulations = this.getRegulations();
    return {
      jurisdictionLevel: "federal",
      state: null,
      county: null,
      city: null,
      regulations,
    };
  }

  private getRegulations(): ScrapedRegulation[] {
    return [
      {
        title: "Federal Employer Identification Number (EIN)",
        sectionCode: "26 USC 6109",
        content: `An Employer Identification Number (EIN), also known as a Federal Tax Identification Number, is issued by the Internal Revenue Service (IRS). An EIN is required for businesses that: (1) Have employees, (2) Operate as a corporation, partnership, or multi-member LLC, (3) File excise, alcohol, tobacco, or firearms tax returns, (4) Withhold taxes on income paid to non-resident aliens, (5) Have a Keogh plan, (6) Are involved with trusts, estates, real estate mortgage investment conduits, nonprofits, farmers' cooperatives, or plan administrators. Application: Apply online at IRS.gov using Form SS-4 (immediate issuance during business hours), by fax (4 business days), or by mail (4-5 weeks). There is no fee. The EIN is permanent and does not need to be renewed. You must designate a "responsible party" who has a valid SSN or ITIN. Limit: one EIN per responsible party per day for online applications.`,
        summary: "Most businesses need a free EIN from the IRS. Apply online for immediate issuance.",
        category: "federal_requirements",
        subcategory: "ein",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers",
        effectiveDate: null,
      },
      {
        title: "Federal Business Tax Obligations",
        sectionCode: "26 USC",
        content: `All businesses in the United States have federal tax obligations administered by the IRS. Key requirements by entity type: (1) Sole Proprietorship: Report business income/loss on Schedule C with Form 1040. Self-employment tax (15.3% on net earnings) via Schedule SE. Estimated quarterly tax payments if expected tax liability exceeds $1,000. (2) LLC (single member): Same as sole proprietorship unless electing corporate taxation. (3) LLC (multi-member)/Partnership: File Form 1065 (information return). Issue Schedule K-1 to each partner/member. Partners pay self-employment tax. (4) Corporation (C-Corp): File Form 1120. Corporate tax rate is 21% flat. Dividends taxed again to shareholders (double taxation). (5) S-Corporation: File Form 1120-S. Income passes through to shareholders on K-1. Shareholders who work in the business must receive reasonable salary (subject to payroll taxes). All employers must: Withhold federal income tax and FICA from employee wages, file Form 941 (quarterly), file Form 940 (annual FUTA), provide W-2s to employees by January 31, provide 1099-NEC to contractors paid $600+.`,
        summary: "All businesses have federal tax obligations. Filing requirements vary by entity type.",
        category: "federal_requirements",
        subcategory: "taxation",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.irs.gov/businesses/small-businesses-self-employed/business-taxes",
        effectiveDate: null,
      },
      {
        title: "Federal OSHA Workplace Safety Requirements",
        sectionCode: "29 USC 651",
        content: `The Occupational Safety and Health Act of 1970 requires employers to provide a workplace free from recognized hazards likely to cause death or serious physical harm. Key requirements: (1) Comply with OSHA standards applicable to your industry (found in 29 CFR 1910 for general industry, 29 CFR 1926 for construction), (2) Display the OSHA "Job Safety and Health - It's the Law" poster in a conspicuous location, (3) Report work-related fatalities within 8 hours and inpatient hospitalizations, amputations, or losses of an eye within 24 hours, (4) Maintain OSHA 300 Log of work-related injuries/illnesses (employers with 11+ employees in most industries), (5) Provide required personal protective equipment (PPE) at no cost to employees, (6) Provide safety training in a language employees understand, (7) Do not retaliate against employees who report safety concerns. Exemptions: Employers with 10 or fewer employees are exempt from routine inspections (but not from standards compliance). State-plan states (like California and Nevada) operate their own OSHA programs that must be at least as effective as federal OSHA. Penalties: Up to $16,131 per serious violation, up to $161,323 per willful/repeat violation.`,
        summary: "Employers must provide safe workplaces per OSHA standards. Post required poster. Report serious injuries.",
        category: "federal_requirements",
        subcategory: "workplace_safety",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.osha.gov/employers",
        effectiveDate: null,
      },
      {
        title: "Federal ADA Compliance for Businesses",
        sectionCode: "42 USC 12101",
        content: `The Americans with Disabilities Act (ADA) prohibits discrimination against individuals with disabilities. Title I (Employment): Employers with 15+ employees must provide reasonable accommodations to qualified employees with disabilities unless it causes undue hardship. Title III (Public Accommodations): All businesses open to the public must remove architectural barriers in existing buildings where readily achievable, ensure new construction and alterations comply with ADA Standards for Accessible Design, and provide auxiliary aids and services for effective communication with customers who have disabilities. Key physical accessibility requirements: Accessible parking (minimum 1 space per 25 parking spaces), accessible entrances, accessible restrooms, accessible routes through the business, and accessible service counters (maximum 36 inches high for at least one portion). Website accessibility: While not explicitly codified in the ADA, DOJ guidance and court precedents increasingly require that business websites be accessible to people with disabilities (WCAG 2.1 AA compliance recommended). Tax incentives: Small businesses (revenue under $1M or fewer than 30 employees) can claim the Disabled Access Credit (Form 8826, up to $5,000/year) and the Barrier Removal Tax Deduction (up to $15,000/year). Enforcement: Private lawsuits and DOJ enforcement actions. Statutory damages of $55,000-$110,000 per violation.`,
        summary: "Businesses with 15+ employees must accommodate disabled workers. All public businesses need physical accessibility.",
        category: "federal_requirements",
        subcategory: "ada_compliance",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.ada.gov/topics/intro-to-ada/",
        effectiveDate: null,
      },
      {
        title: "Federal Trademark Registration",
        sectionCode: "15 USC 1051",
        content: `While not required, federal trademark registration with the USPTO provides significant legal benefits including: nationwide constructive notice of ownership, federal court jurisdiction, use of the registration symbol, and basis for international registration. Application process: (1) Search the USPTO Trademark Electronic Search System (TESS) to verify availability, (2) File an application through the Trademark Electronic Application System (TEAS) - Standard form ($350 per class) or Plus form ($250 per class, requires selecting from pre-approved descriptions), (3) USPTO examiner reviews application (approximately 3-4 months), (4) If approved, mark is published for 30-day opposition period, (5) If no opposition, registration issues (use-based) or Notice of Allowance issues (intent-to-use, then 6 months to file Statement of Use). Maintenance: File Declaration of Use (Section 8) between years 5-6, renewal every 10 years (Section 9). Failure to maintain results in cancellation. Common law trademark rights exist without registration but are limited to the geographic area of use.`,
        summary: "Federal trademark registration is optional but provides nationwide protection. $250-350 per class via USPTO.",
        category: "federal_requirements",
        subcategory: "intellectual_property",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.uspto.gov/trademarks/basics/apply",
        effectiveDate: null,
      },
      {
        title: "SBA Small Business Size Standards",
        sectionCode: "13 CFR 121",
        content: `The U.S. Small Business Administration (SBA) establishes size standards that define whether a business qualifies as "small" for purposes of federal contracting preferences, SBA loan programs, and other federal small business programs. Size standards vary by industry using NAICS codes and are measured by either: (1) Average annual receipts over the past 5 years (most industries: $750,000 to $47.0 million depending on NAICS code), or (2) Number of employees (manufacturing and mining: typically 500-1,500 employees). Key SBA programs: SBA 7(a) loans (up to $5 million), SBA 504 loans (up to $5.5 million for real estate/equipment), SBA Microloans (up to $50,000), SBIR/STTR grants for R&D. Federal contracting: The government has a goal to award 23% of prime contract dollars to small businesses. Set-aside programs include 8(a) Business Development for socially/economically disadvantaged, HUBZone, Women-Owned Small Business (WOSB), and Service-Disabled Veteran-Owned Small Business (SDVOSB). Registration: Businesses must register in SAM.gov to receive federal contracts.`,
        summary: "SBA size standards determine small business eligibility for loans, grants, and federal contracting preferences.",
        category: "federal_requirements",
        subcategory: "sba_programs",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.sba.gov/federal-contracting/contracting-guide/size-standards",
        effectiveDate: null,
      },
    ];
  }
}
