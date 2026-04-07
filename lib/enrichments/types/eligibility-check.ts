import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "eligibility_check",
  label: "Eligibility",
  description: "Score eligibility against your organisation's profile",
  displayKey: "eligibility_score",
  formatValue: (value) => {
    const num = Number(value);
    if (isNaN(num)) return "—";
    return `${Math.round(num * 100)}%`;
  },
});
