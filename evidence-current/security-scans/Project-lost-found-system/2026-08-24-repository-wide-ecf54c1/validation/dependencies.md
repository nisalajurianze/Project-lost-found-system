# Phase 3 validation shard — dependency advisories

- Target: `7499a19`
- Checked: 2026-08-24
- Method: current lockfile/runtime tree, online `npm audit --omit=dev --json`, and upstream GitHub Security Advisories.

## DEP-NPM-01 — React Router 6.30.4 remains in affected advisory ranges

Rubric: exact installed versions resolved; advisory ranges matched; application mode and attacker-controlled navigation sinks checked; current mitigations tested; supported remediation/proof gap stated.

- Exact tree: `react-router-dom@6.30.4` → `react-router@6.30.4`; both are pinned in `frontend/package.json` / lockfile.
- Audit result: frontend production audit reports two moderate vulnerable package entries; backend production audit reports zero vulnerabilities.
- Upstream advisories:
  - `GHSA-jjmj-jmhj-qwj2` / CVE-2026-53668 lists `react-router-dom >=6.30.2 <=6.30.4` and describes open redirect leading to XSS: <https://github.com/advisories/GHSA-jjmj-jmhj-qwj2>
  - `GHSA-wrjc-x8rr-h8h6` / CVE-2026-53669 lists `react-router >=6.0.0 <7.18.0` and describes unexpected external navigation for attacker-supplied paths: <https://github.com/advisories/GHSA-wrjc-x8rr-h8h6>
  - `GHSA-337j-9hxr-rhxg` lists `react-router >=6.4.0 <7.18.0`, but explicitly excludes Declarative Mode: <https://github.com/advisories/GHSA-337j-9hxr-rhxg>
- Applicability:
  - The app uses Declarative Mode (`main.jsx:3,24-35`), so the SSR/manual hydration constructor-injection advisory is **not applicable**.
  - The project has 115 React Router navigation/link uses. Its identified externally influenced assistant and login-return paths use `toSafeInternalPath`, which rejects external, scheme-relative, encoded-separator and backslash paths (`internalNavigation.js`; passing regression test). Backend assistant action URLs are fixed internal paths.
  - This materially reduces known reachability, but does not change the fact that the installed router packages are in the official affected ranges; exhaustive proof that no future/user-derived path reaches any of 115 sinks cannot be delegated to package-level mitigation.
- Remediation nuance: `npm audit` advertises `react-router-dom@6.30.6` as a non-major fix. That removes the directly listed `react-router-dom <=6.30.4` range, but `6.30.6` still depends on `react-router@6.30.6`, which remains inside the upstream `<7.18.0` range. A clean audit therefore cannot be assumed from the non-major suggestion; the supported router migration must be tested explicitly.
- Impact/preconditions: attacker-controlled navigation input plus user interaction; application sanitization lowers current exploit likelihood. Treat as a dependency-risk/release-hardening item, not a demonstrated application exploit.
- Checklist: [x] version [x] range [x] mode [x] source/sink review [x] mitigation test/proof gap.
- Disposition: **reportable dependency exposure; exploitation not reproduced**. Moderate upstream severity, medium application confidence.

## Audit command summary

```text
backend: npm audit --omit=dev --json  => 0 total
frontend: npm audit --omit=dev --json => 2 moderate package entries, 0 high/critical
frontend: npm ls react-router-dom react-router --all
          react-router-dom@6.30.4 -> react-router@6.30.4
```

No dependency or lockfile was changed during validation.
