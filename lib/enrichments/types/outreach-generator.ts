import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "outreach_generator",
  label: "Outreach Draft",
  description: "Generate a volunteer partnership pitch using AI",
  displayKey: "outreach_preview",
  formatValue: (value) => {
    const str = String(value || "");
    return str.length > 60 ? str.slice(0, 60) + "..." : str;
  },
});
