import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "donation_programme",
  label: "Donation Programme",
  description: "Detect if company has an in-kind donation programme",
  displayKey: "programme_exists",
  formatValue: (value) => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "—";
  },
});
