import type { Scraper, ScraperResult, ScrapedRegulation } from "./types";

/**
 * California state-level regulation scraper.
 * Covers CalGold business permit requirements and key state licensing.
 */
export class CaliforniaScraper implements Scraper {
  name = "State of California";

  async scrape(): Promise<ScraperResult> {
    const regulations = this.getRegulations();
    return {
      jurisdictionLevel: "state",
      state: "CA",
      county: null,
      city: null,
      regulations,
    };
  }

  private getRegulations(): ScrapedRegulation[] {
    return [
      {
        title: "California Seller's Permit",
        sectionCode: "R&TC 6066",
        content: `Any person or business that intends to sell or lease tangible personal property in California that would ordinarily be subject to sales tax must hold a seller's permit from the California Department of Tax and Fee Administration (CDTFA). This includes retailers, wholesalers, and some service providers. Application is free through the CDTFA online portal. Required information: business entity type, ownership details, business location(s), description of products/services, estimated monthly sales, and bank account information. A security deposit may be required ($2,000-$50,000) based on estimated tax liability. California sales tax varies by district (7.25% minimum statewide, up to 10.75% in some jurisdictions). Returns are filed quarterly (or monthly/annually based on volume). A sub-permit is required for each location. The permit must be displayed at the place of business. Operating without a seller's permit is a misdemeanor with fines up to $1,000 and/or up to 1 year in jail.`,
        summary: "Businesses selling tangible goods in California need a free Seller's Permit from CDTFA.",
        category: "state_license",
        subcategory: "sellers_permit",
        applicableIndustries: ["retail", "wholesale", "restaurant", "manufacturing"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.cdtfa.ca.gov/taxes-and-fees/faq-sellers-permits.htm",
        effectiveDate: null,
      },
      {
        title: "California Business Entity Registration",
        sectionCode: "Corp Code 17701.04",
        content: `All LLCs, corporations, partnerships, and certain other business entities must register with the California Secretary of State before conducting business in California. Domestic entities are formed by filing organizational documents. Foreign entities (formed outside California) must file a registration application. LLCs: File Articles of Organization (Form LLC-1, $70 filing fee), designate a registered agent in California, file Statement of Information (Form LLC-12, $20) within 90 days and biennially thereafter. All California LLCs are subject to an $800 annual minimum franchise tax payable to the Franchise Tax Board, due by the 15th day of the 4th month after entity formation, then annually on April 15. LLCs with gross revenue exceeding $250,000 pay an additional fee ($900-$11,790 based on revenue tier). Corporations: File Articles of Incorporation (Form ARTS-GS, $100), file Statement of Information (Form SI-550, $25) within 90 days and annually. Corporations pay the greater of $800 minimum franchise tax or 8.84% of net income.`,
        summary: "Business entities must register with CA Secretary of State. LLCs/$800 annual franchise tax minimum.",
        category: "state_license",
        subcategory: "entity_registration",
        applicableIndustries: ["all"],
        applicableEntityTypes: ["llc", "corporation", "s_corp", "partnership"],
        sourceUrl: "https://www.sos.ca.gov/business-programs/business-entities/forms",
        effectiveDate: null,
      },
      {
        title: "CalOSHA Workplace Safety Requirements",
        sectionCode: "Labor Code 6300",
        content: `California employers must comply with California Occupational Safety and Health Administration (Cal/OSHA) regulations, which are enforced by the Division of Occupational Safety and Health (DOSH). Key requirements: (1) Establish, implement, and maintain an effective Injury and Illness Prevention Program (IIPP) - required for ALL California employers regardless of size, (2) Report serious injuries, illnesses, or death to Cal/OSHA within 8 hours, (3) Maintain OSHA 300 log of work-related injuries and illnesses (employers with 10+ employees), (4) Provide safety training to all employees in a language they understand, (5) Post the Cal/OSHA workplace safety poster, (6) Obtain construction permits for certain high-hazard operations (demolition, excavation over 5 feet, scaffolding over certain heights). Industry-specific standards apply to construction, agriculture, healthcare, and other sectors. Cal/OSHA can inspect workplaces without advance notice. Penalties range from $5,000 for non-serious violations to $70,000 for willful violations, with criminal penalties for willful violations causing death.`,
        summary: "All California employers must have an Injury and Illness Prevention Program. Cal/OSHA enforces workplace safety.",
        category: "employer_requirements",
        subcategory: "safety",
        applicableIndustries: ["all"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.dir.ca.gov/dosh/",
        effectiveDate: null,
      },
      {
        title: "California Food Facility Health Permit",
        sectionCode: "H&SC 114381",
        content: `All food facilities in California must obtain a health permit from the local Environmental Health Department before operating. Under the California Retail Food Code (CalCode), a food facility includes any establishment that stores, prepares, packages, serves, vends, or otherwise provides food for human consumption at retail. Categories: (1) Permanent Food Facility - restaurants, cafes, bakeries, markets, (2) Mobile Food Facility - food trucks, carts, (3) Temporary Food Facility - events less than 25 days, (4) Cottage Food Operation - home-based low-risk food production. Requirements: Submit plans for review, pass a pre-operational inspection, have a Certified Food Protection Manager on staff, maintain California Food Handler Card for all food handlers ($15, valid 3 years). Annual permit fees vary by county ($300-$1,500 typically). All facilities are subject to routine inspections 1-3 times per year depending on risk classification. Inspection results are public record. Facilities scoring below 70% on inspection may face closure.`,
        summary: "Food businesses need a local health permit, certified food manager, and food handler cards for staff.",
        category: "health_permit",
        subcategory: "food_facility",
        applicableIndustries: ["restaurant", "food_service", "catering", "food_truck", "bakery", "grocery"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx",
        effectiveDate: null,
      },
      {
        title: "California ABC Liquor License",
        sectionCode: "B&PC 23300",
        content: `Selling or serving alcoholic beverages in California requires a license from the Department of Alcoholic Beverage Control (ABC). Major license types: Type 41 - On-Sale Beer and Wine for Eating Places ($720 annual), Type 47 - On-Sale General for Eating Places (allows distilled spirits, $13,800 original fee, $1,127 annual), Type 20 - Off-Sale Beer and Wine for retail ($594 annual), Type 21 - Off-Sale General (full line retail, prices vary by county). Application process: (1) File application with local ABC office, (2) Post 30-day public notice at the premises, (3) Complete background investigation (all owners, $97 per person), (4) Obtain local government approval (city/county), (5) Environmental review may be required, (6) Comply with distance restrictions from schools, churches, and hospitals. Processing time: 45-120 days for most licenses. Responsible Beverage Service (RBS) training required for all servers of alcohol (effective July 1, 2022). ABC can impose conditions on licenses. License transfers require ABC approval. Disciplinary actions for violations include fines, suspension, and revocation.`,
        summary: "Alcohol sales require a California ABC license. Multiple types available. Background checks and public notice required.",
        category: "liquor_license",
        subcategory: "general",
        applicableIndustries: ["restaurant", "bar", "nightclub", "hotel", "grocery", "convenience_store"],
        applicableEntityTypes: [],
        sourceUrl: "https://www.abc.ca.gov/licensing/",
        effectiveDate: null,
      },
    ];
  }
}
