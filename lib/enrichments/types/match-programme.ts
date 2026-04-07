import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "match_programme",
  label: "Match Programme",
  description: "Check if employer has a matching gift programme via Double the Donation",
  displayKey: "match_eligible",
  formatValue: (value) => {
    if (value === true) return "Eligible";
    if (value === false) return "Not Eligible";
    return "—";
  },
});
