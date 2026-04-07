import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "request_generator",
  label: "Request Draft",
  description: "Generate an in-kind donation request using AI",
  displayKey: "request_preview",
  formatValue: (value) => {
    const str = String(value || "");
    return str.length > 60 ? str.slice(0, 60) + "..." : str;
  },
});
