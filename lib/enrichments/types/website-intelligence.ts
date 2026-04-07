import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "website_intelligence",
  label: "Website Intel",
  description: "Scrape company website for CSR info, news, and company values via Firecrawl",
  displayKey: "summary",
  formatValue: (value) => {
    const str = String(value || "");
    return str.length > 50 ? str.slice(0, 50) + "..." : str;
  },
});
