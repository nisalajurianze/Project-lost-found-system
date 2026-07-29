# Dependency Licence Review

**Status:** Release-candidate review evidence; institutional/legal approval pending.

The committed lockfiles were converted into [DEPENDENCY_LICENSES.json](DEPENDENCY_LICENSES.json) and [SBOM.cdx.json](SBOM.cdx.json). The inventory currently contains **552** unique package/version/scope components and **3** entries whose lockfile licence field is unknown.

## Approval rules

1. Re-run this generator after any lockfile change.
2. Review UNKNOWN, custom, copyleft or dual-licence expressions before release.
3. Confirm notices/source-offer obligations where applicable.
4. Run a clean target-environment dependency install and live vulnerability audit.
5. Record the reviewer, date and exact release checksum in the production approval record.

No legal conclusion is fabricated by this automated inventory.
