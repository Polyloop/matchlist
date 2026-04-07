import { registerEnrichmentType } from "../registry";

registerEnrichmentType({
  type: "procurement_contact",
  label: "Procurement Contact",
  description: "Find procurement or CSR contacts for donation requests",
  displayKey: "contact_name",
});
