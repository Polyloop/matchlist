import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "loi_generator",
  label: "LOI Draft",
  description: "Generate a letter of inquiry using AI",
  displayKey: "loi_preview",
  formatValue: (value) => {
    const str = String(value || "");
    return str.length > 60 ? str.slice(0, 60) + "..." : str;
  },
});
