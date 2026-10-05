# Click Mode Dashboard implementation plan

Verification tier: Tier 1
Reason: The root launcher's presentation and link labels are simplified while routes, runtime state, and product renderers remain unchanged.
Run: `npm run typecheck`, focused launcher browser acceptance, and visual browser inspection.
Skip: Renderer performance checks because the dashboard does not change either product renderer or workload.

1. Retain the supplied Click logo and both stable route destinations.
2. Remove every decorative dashboard element and reduce the root to a centered logo plus two buttons.
3. Update focused browser acceptance for the visible labels and destinations.
4. Record the simplification and verification evidence in the Toolcraft worklog.
