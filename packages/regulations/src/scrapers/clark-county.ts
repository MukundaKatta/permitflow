import type { Scraper, ScraperResult, ScrapedRegulation } from "./types";

/**
 * Clark County, Nevada regulation scraper.
 * Covers business licensing, zoning, health permits, and construction permits
 * for the Las Vegas metropolitan area (unincorporated Clark County).
 *
 * Sources:
 * - Clark County Business License: https://www.clarkcountynv.gov/government/departments/business_license/
 * - Clark County Code Title 6 (Business Licenses) and Title 30 (Zoning)
 */
export class ClarkCountyScraper implements Scraper {
  name = "Clark County, NV";

  async scrape(): Promise<ScraperResult> {
    // In production, this would fetch and parse live HTML from Clark County's website.
    // We include comprehensive static regulation data that covers the major permit
    // categories businesses need in Clark County, based on actual county code.
    const regulations = this.getRegulations();

    return {
      jurisdictionLevel: "county",
      state: "NV",
      county: "Clark",
      city: null,
      regulations,
    };
  }

  private getRegulations(): ScrapedRegulation[] {
    return [
      // === BUSINESS LICENSE ===
      {
        title: "Clark County General Business License Requirement",
        sectionCode: "CC 6.04.010",
        content: `All persons conducting business within unincorporated Clark County must obtain a business license from the Clark County Department of Business License before commencing operations. This applies to all business types including retail, wholesale, services, construction, and professional practices. The application requires: (1) Completed business license application form, (2) Valid government-issued photo ID, (3) Social Security Number or Federal EIN, (4) State of Nevada Business License (from Nevada Secretary of State), (5) Fictitious Name Certificate if operating under a DBA, (6) Articles of Incorporation/Organization for LLCs and corporations, (7) Professional licenses if applicable, (8) Zoning approval verification. Application fee is $500 for most business categories. Processing time is typically 2-4 weeks. Licenses must be renewed annually by the anniversary date of issuance. Late renewal incurs a penalty of 10% per month up to 100% of the license fee. Business license must be displayed prominently at the place of business.`,
        summary: "All businesses in unincorporated Clark County require a general business license before operating. Annual renewal required.",
        category: "business_license",
        subcategory: "general",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.clarkcountynv.gov/government/departments/business_license/index.php",
        effectiveDate: null,
      },
      {
        title: "Clark County Home-Based Business License",
        sectionCode: "CC 6.04.090",
        content: `Home occupations in unincorporated Clark County are permitted provided they comply with residential zoning restrictions. Requirements: (1) Must be clearly incidental and secondary to the residential use of the property, (2) No external evidence of the business operation (no signage, commercial vehicles, or client visits in excess of 8 per day), (3) Business may not occupy more than 25% of the dwelling's floor area, (4) No employees working at the home location other than family members residing at the address, (5) No storage of hazardous materials, (6) No manufacturing or assembly processes that create noise, odor, vibration, or electrical interference, (7) Must have a valid home occupation permit in addition to the business license, (8) Deliveries limited to standard residential parcel services. Application fee for home occupation permit is $200 in addition to the standard business license fee. HOA restrictions may apply separately.`,
        summary: "Home-based businesses need both a business license and home occupation permit. Strict residential character requirements.",
        category: "business_license",
        subcategory: "home_occupation",
        applicableIndustries: ["professional_services", "consulting", "technology", "creative_services"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.clarkcountynv.gov/government/departments/business_license/home_based_businesses.php",
        effectiveDate: null,
      },
      // === HEALTH PERMITS ===
      {
        title: "Clark County Health District Food Establishment Permit",
        sectionCode: "SNHD Reg 1",
        content: `All food establishments operating in Clark County must obtain a Health Permit from the Southern Nevada Health District (SNHD) prior to opening. Food establishments include restaurants, food trucks, catering operations, bakeries, mobile food vendors, and any business that stores, prepares, packages, serves, or sells food for human consumption. Requirements: (1) Submit completed Health Permit Application, (2) Provide detailed floor plan showing food preparation areas, handwashing stations, refrigeration, and ventilation, (3) Complete a pre-operational inspection with zero critical violations, (4) Obtain a Certified Food Safety Manager certification (must have at least one per establishment, certified through an ANSI-accredited program), (5) All food handlers must have a Southern Nevada Food Handler Card ($40, valid for 3 years), (6) Comply with SNHD Regulations Chapter 1-16 governing food establishments. Permit fees: Full-service restaurant $665/year, Limited food service $475/year, Mobile food vendor $500/year. Health permits must be renewed annually. Establishments are subject to routine unannounced inspections at least twice per year. Inspection grades are posted publicly.`,
        summary: "Food businesses need SNHD Health Permit, certified food safety manager, and food handler cards for all employees.",
        category: "health_permit",
        subcategory: "food_establishment",
        applicableIndustries: ["restaurant", "food_service", "catering", "food_truck", "bakery", "grocery"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.southernnevadahealthdistrict.org/permits-and-regulations/food-establishment-permits/",
        effectiveDate: null,
      },
      {
        title: "Southern Nevada Health District Food Handler Card",
        sectionCode: "SNHD Reg 3.010",
        content: `All persons who work in a food establishment in Clark County and handle food, food equipment, or utensils must obtain a Food Handler Safety Training Card from the Southern Nevada Health District within 30 days of employment. The card requires: (1) Completion of an approved food handler training course covering foodborne illness prevention, personal hygiene, temperature control, cross-contamination prevention, and cleaning/sanitizing procedures, (2) Passing a written examination with a score of 70% or higher, (3) Payment of the $40 fee. Cards are valid for 3 years from the date of issuance and must be kept on the person during working hours or available at the establishment. Failure to obtain or maintain valid food handler cards results in fines starting at $250 per violation per employee. Establishments may be subject to closure if a significant number of employees lack valid cards.`,
        summary: "All food handlers must obtain SNHD Food Handler Card within 30 days of employment. $40 fee, valid 3 years.",
        category: "health_permit",
        subcategory: "food_handler",
        applicableIndustries: ["restaurant", "food_service", "catering", "food_truck", "bakery", "grocery"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.southernnevadahealthdistrict.org/food-handler-cards/",
        effectiveDate: null,
      },
      // === LIQUOR LICENSE ===
      {
        title: "Clark County Liquor License",
        sectionCode: "CC 8.20.010",
        content: `Any establishment that sells, serves, or distributes alcoholic beverages in unincorporated Clark County must obtain a liquor license from the Clark County Department of Business License, Liquor Division. License categories: (1) Tavern License - for establishments where alcohol sales are the primary business ($5,000/year), (2) Restaurant Liquor License - for restaurants where food service is the primary business and alcohol is incidental ($3,000/year), (3) Package Store License - for retail sale of sealed alcoholic beverages for off-premises consumption ($2,500/year), (4) Beer and Wine License - limited to beer and wine sales only ($1,500/year), (5) Catering License - for licensed caterers serving at events ($2,000/year). Requirements: (1) Background investigation of all owners, officers, and managers ($500 non-refundable investigation fee), (2) No felony convictions related to moral turpitude, (3) TAM (Techniques of Alcohol Management) card required for all employees who serve or sell alcohol ($15, valid 4 years), (4) Compliance with distance restrictions: minimum 300 feet from schools, churches, and hospitals, (5) Zoning verification, (6) SNHD health permit if food is served, (7) Hours of service: may serve alcohol from 24 hours (bars) or during operating hours (restaurants). Application processing takes 6-8 weeks. Liquor licenses are renewed annually. License transfers to new owners require a new application and background check.`,
        summary: "Alcohol sales require a Clark County liquor license with background investigation. Multiple license categories available.",
        category: "liquor_license",
        subcategory: "general",
        applicableIndustries: ["restaurant", "bar", "nightclub", "hotel", "convenience_store", "grocery", "catering"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.clarkcountynv.gov/government/departments/business_license/liquor_licenses.php",
        effectiveDate: null,
      },
      // === BUILDING & CONSTRUCTION ===
      {
        title: "Clark County Building Permit Requirements",
        sectionCode: "CC 22.02.010",
        content: `A building permit from the Clark County Department of Building and Fire Prevention is required before commencing any construction, alteration, repair, demolition, or change of occupancy of any building or structure in unincorporated Clark County. This includes tenant improvements for new businesses, signage installation, and changes to building systems (electrical, plumbing, mechanical). Permit process: (1) Submit construction documents prepared by a licensed Nevada professional engineer or architect (for commercial projects), (2) Submit a completed building permit application with project valuation, (3) Pay plan review fees (based on project valuation, minimum $150), (4) Obtain plan approval from Building, Fire, and Health departments, (5) Receive building permit before starting work, (6) Schedule and pass all required inspections during construction, (7) Obtain a Certificate of Occupancy or Final Inspection sign-off before occupying the space. Commercial tenant improvements typically require: architectural plans, mechanical plans, electrical plans, plumbing plans, Title 24 energy compliance, ADA compliance documentation, and fire protection plans. Processing time: 2-6 weeks for plan review depending on complexity. Permits expire 180 days after issuance if work has not commenced. Working without a permit is a misdemeanor with fines starting at double the permit fee.`,
        summary: "Building permits required for any construction, renovation, or tenant improvement. Plans must be reviewed and approved.",
        category: "building_permit",
        subcategory: "general",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.clarkcountynv.gov/government/departments/building___fire_prevention/index.php",
        effectiveDate: null,
      },
      // === SIGNAGE ===
      {
        title: "Clark County Sign Permit",
        sectionCode: "CC 30.64.010",
        content: `All permanent signs in unincorporated Clark County require a sign permit from the Department of Building and Fire Prevention, and must comply with Title 30 (Unified Development Code) sign regulations. Requirements: (1) Submit sign permit application with detailed drawings showing dimensions, materials, illumination method, and installation details, (2) Provide site plan showing sign placement relative to property lines, buildings, and rights-of-way, (3) Structural calculations for freestanding signs over 6 feet tall (prepared by licensed engineer), (4) Electrical permit if sign is illuminated, (5) Landlord authorization if not the property owner. Sign restrictions vary by zoning district: Commercial zones typically allow wall signs up to 1.5 sq ft per linear foot of building frontage, and one freestanding sign up to 24 feet tall. Monument signs are limited to 8 feet in height. Prohibited signs include: flashing signs, animated signs (with exceptions), roof signs, and signs that obstruct traffic visibility. Temporary signs (banners, A-frames) are limited to 60 days per year. Permit fees: $100 for wall signs, $200 for freestanding signs. Non-permitted signs are subject to removal and fines of $100-500 per day.`,
        summary: "Permanent signs need a permit. Sizes regulated by zoning district. Temporary signs limited to 60 days/year.",
        category: "sign_permit",
        subcategory: "general",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.clarkcountynv.gov/government/departments/building___fire_prevention/permits.php",
        effectiveDate: null,
      },
      // === FIRE PREVENTION ===
      {
        title: "Clark County Fire Prevention Permit",
        sectionCode: "CC 13.04.010",
        content: `Businesses that present fire hazards or require fire protection systems must obtain a Fire Prevention Permit from the Clark County Fire Department. Categories requiring fire permits: (1) Assembly occupancies (restaurants seating 50+, event venues, churches, theaters), (2) Businesses using or storing hazardous materials, flammable liquids, or compressed gases, (3) Businesses with commercial cooking operations (requiring fire suppression systems), (4) High-rise buildings (75+ feet), (5) Businesses operating places of assembly, (6) Cannabis establishments, (7) Any business with automatic fire sprinkler or fire alarm systems. Requirements: Fire safety plan, fire sprinkler system inspection reports (annual), fire alarm system inspection reports (annual), kitchen hood suppression system inspection (semi-annual), emergency evacuation plan, occupancy load calculation, and fire extinguisher placement plan. Annual inspection required. Permit fee: $150-500 depending on occupancy type. Violations can result in immediate closure orders.`,
        summary: "Restaurants, assembly venues, and businesses with fire hazards need Clark County fire prevention permits.",
        category: "fire_permit",
        subcategory: "general",
        applicableIndustries: ["restaurant", "bar", "nightclub", "hotel", "event_venue", "manufacturing", "cannabis"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.clarkcountynv.gov/government/departments/fire/fire_prevention/index.php",
        effectiveDate: null,
      },
      // === ZONING ===
      {
        title: "Clark County Zoning and Land Use Compliance",
        sectionCode: "CC 30.08.010",
        content: `All businesses must verify zoning compliance before applying for a business license in unincorporated Clark County. The Clark County Comprehensive Planning Department administers the Unified Development Code (Title 30). Key requirements: (1) Business use must be permitted in the applicable zoning district (check the Clark County zoning map and Title 30 use tables), (2) Conditional Use Permits (CUP) required for certain uses not permitted by right, (3) Business License Zoning Review required as part of the business license application, (4) Special requirements apply for: home occupations, outdoor storage/display, drive-through facilities, auto-related businesses, cannabis establishments, and adult-oriented businesses. Common zoning districts: C-1 (Local Business), C-2 (General Commercial), C-P (Office Professional), M-1 (Light Manufacturing), M-2 (General Industrial). Processing: Zoning verification is typically completed within 3-5 business days as part of the business license review. CUP applications require a public hearing before the Board of County Commissioners (processing time: 3-6 months, fee: $6,500). Variances from code requirements follow a similar public hearing process.`,
        summary: "Business use must comply with zoning district regulations. Some uses require Conditional Use Permits with public hearings.",
        category: "zoning",
        subcategory: "general",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.clarkcountynv.gov/government/departments/comprehensive_planning/index.php",
        effectiveDate: null,
      },
      // === STATE OF NEVADA REQUIREMENTS ===
      {
        title: "Nevada State Business License",
        sectionCode: "NRS 76.100",
        content: `All businesses operating in Nevada must obtain a State Business License from the Nevada Secretary of State before commencing operations. This is required in addition to any local (county/city) business licenses. Requirements: (1) File with the Nevada Secretary of State's office, (2) For LLCs: must have filed Articles of Organization and have a registered agent in Nevada, (3) For Corporations: must have filed Articles of Incorporation and have a registered agent, (4) For Sole Proprietors/General Partnerships: file the State Business License application directly, (5) Provide the business name, physical address, mailing address, NAICS code, and estimated number of employees. Fee: $200 annually for most businesses. Exemptions: 501(c) nonprofits, governmental entities, and certain agricultural operations. The State Business License must be renewed annually by the last day of the anniversary month. Late renewal penalty: $100 for the first month, $50 for each additional month up to $500. Failure to renew results in revocation of the business entity status. The state business license number is required on the Clark County business license application.`,
        summary: "Nevada State Business License ($200/year) required for all businesses. Filed through Secretary of State.",
        category: "state_license",
        subcategory: "general",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.nvsos.gov/sos/businesses/state-business-license",
        effectiveDate: null,
      },
      {
        title: "Nevada Sales Tax Permit",
        sectionCode: "NRS 372.220",
        content: `Businesses that sell tangible personal property or certain services in Nevada must register for a Sales Tax Permit (also called a Seller's Permit) from the Nevada Department of Taxation. Clark County combined sales tax rate is 8.375% (state 4.6%, county 3.775%). Requirements: (1) Register with the Nevada Department of Taxation online or at a local office, (2) Provide business entity information, EIN or SSN, and anticipated monthly sales volume, (3) A security deposit may be required based on estimated monthly tax liability. The Sales Tax Permit is free but must be displayed at each business location. Sales tax returns are filed monthly, quarterly, or annually depending on volume. Returns are due by the last day of the month following the reporting period. Penalties for late filing: 10% of tax due plus 1% per month interest. Businesses must collect and remit use tax on taxable purchases where sales tax was not charged. Exemptions include most food for home consumption, prescription drugs, and certain medical devices.`,
        summary: "Businesses selling goods/taxable services need a Nevada Sales Tax Permit. Clark County rate: 8.375%.",
        category: "state_license",
        subcategory: "sales_tax",
        applicableIndustries: ["retail", "restaurant", "food_service", "manufacturing", "wholesale"],
        applicableEntityTypes: [],
        sourceUrl: "https://tax.nv.gov/Forms/General_Purpose_Forms/",
        effectiveDate: null,
      },
      {
        title: "Clark County Contractor License Requirements",
        sectionCode: "NRS 624",
        content: `Contractors performing construction, alteration, or repair work in Clark County must hold a valid Nevada State Contractor's License issued by the Nevada State Contractors Board (NSCB). Requirements: (1) Submit application to NSCB with $300 application fee, (2) Pass trade and business/law examinations, (3) Provide proof of financial responsibility: $1,000-$300,000 surety bond depending on license classification and monetary limit, (4) Maintain general liability insurance ($100,000/$300,000 minimum) and workers' compensation insurance if applicable, (5) Designate a qualified individual who holds the license. License classifications include: A (General Engineering), B (General Building), C (Specialty), with numerous subcategories. Residential contractors (C-3, C-4, etc.) have additional requirements including the Residential Recovery Fund contribution ($1,500). License must be renewed biennially. Clark County also requires contractors to register their state license locally when pulling permits. Unlicensed contracting is a misdemeanor with fines up to $10,000 per violation.`,
        summary: "Contractors need a Nevada State Contractor's License with bonds, insurance, and exams.",
        category: "professional_license",
        subcategory: "contractor",
        applicableIndustries: ["construction", "electrical", "plumbing", "hvac", "roofing"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.nvcontractorsboard.com/",
        effectiveDate: null,
      },
      // === EMPLOYER REQUIREMENTS ===
      {
        title: "Nevada Employer Registration Requirements",
        sectionCode: "NRS 612.435",
        content: `Businesses that employ workers in Nevada must comply with several state employment registration requirements: (1) Register with the Nevada Department of Employment, Training, and Rehabilitation (DETR) for unemployment insurance - required for all employers within 30 days of first paying wages. Employer contribution rates range from 0.25% to 5.4% of taxable wages (first $40,100 per employee per year). (2) Obtain Workers' Compensation Insurance - required for all employers with one or more employees. Can be obtained through a private insurance carrier or the state fund. Failure to maintain coverage is a category E felony for employers. (3) Register with the Nevada Department of Taxation for Modified Business Tax (MBT) - tax on wages: 1.378% for financial institutions and mining, 1.378% for all other employers on wages exceeding $50,000/quarter. (4) Comply with Nevada OSHA (Occupational Safety and Health Administration) workplace safety standards administered by the Division of Industrial Relations. (5) Post required workplace notices including: Nevada minimum wage ($10.25/hr without qualifying health benefits, $9.25 with), Nevada OSHA, workers' compensation information, and unemployment insurance information.`,
        summary: "Employers must register for unemployment insurance, workers' comp, and modified business tax within 30 days.",
        category: "employer_requirements",
        subcategory: "registration",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://detr.nv.gov/Page/Employer_Information",
        effectiveDate: null,
      },
      // === FEDERAL ===
      {
        title: "Federal Employer Identification Number (EIN)",
        sectionCode: "26 USC 6109",
        content: `Most businesses are required to obtain a Federal Employer Identification Number (EIN) from the Internal Revenue Service (IRS). An EIN is required for: (1) Any business with employees, (2) Business operated as a partnership, corporation, LLC with multiple members, or estate/trust, (3) Businesses that file excise tax returns, (4) Businesses that withhold taxes on income paid to non-resident aliens. Sole proprietors without employees may use their SSN but an EIN is recommended for liability separation. Application: File Form SS-4 online at IRS.gov (immediate issuance), by fax (4 business days), or by mail (4-5 weeks). No fee. The EIN is permanent and does not need to be renewed. One EIN per responsible party per day limit for online applications. The EIN is required on Nevada State Business License application, bank account opening, and most county/city business license applications.`,
        summary: "Most businesses need an EIN from the IRS. Free, permanent, and can be obtained online immediately.",
        category: "federal_requirements",
        subcategory: "ein",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
        effectiveDate: null,
      },
    ];
  }
}
