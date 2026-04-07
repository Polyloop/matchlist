import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "volunteer_programme",
  label: "Volunteer Programme",
  description: "Detect if company has an employee volunteer programme",
  displayKey: "programme_exists",
  formatValue: (value) => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "—";
  },
});
