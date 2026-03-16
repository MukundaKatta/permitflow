export type { Scraper, ScraperResult, ScrapedRegulation } from "./types";
export { ClarkCountyScraper } from "./clark-county";
export { CaliforniaScraper } from "./california";
export { FederalScraper } from "./federal";

import type { Scraper } from "./types";
import { ClarkCountyScraper } from "./clark-county";
import { CaliforniaScraper } from "./california";
import { FederalScraper } from "./federal";

export function getAllScrapers(): Scraper[] {
  return [new FederalScraper(), new CaliforniaScraper(), new ClarkCountyScraper()];
}

export function getScrapersForState(state: string): Scraper[] {
  const scrapers: Scraper[] = [new FederalScraper()];
  switch (state.toUpperCase()) {
    case "NV":
      scrapers.push(new ClarkCountyScraper());
      break;
    case "CA":
      scrapers.push(new CaliforniaScraper());
      break;
  }
  return scrapers;
}
