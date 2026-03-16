export interface ScrapedRegulation {
  title: string;
  sectionCode: string | null;
  content: string;
  summary: string | null;
  category: string;
  subcategory: string | null;
  applicableIndustries: string[];
  applicableEntityTypes: string[];
  sourceUrl: string;
  effectiveDate: string | null;
}

export interface ScraperResult {
  jurisdictionLevel: "federal" | "state" | "county" | "city";
  state: string | null;
  county: string | null;
  city: string | null;
  regulations: ScrapedRegulation[];
}

export interface Scraper {
  name: string;
  scrape(): Promise<ScraperResult>;
}
