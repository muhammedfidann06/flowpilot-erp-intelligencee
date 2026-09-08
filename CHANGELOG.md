# Changelog

## 1.1.0 — 2026-09-08

- Fixed Pages asset layout: canonical root src/data, generated identical dist, no root dependency on dist paths.
- Added install manifest, PNG/maskable/Apple icons, scoped atomic offline cache and opt-in updates.
- Added TR/EN/DE PWA guidance and connection states.
- Added 15 regression tests for publishing and PWA; 213 total Node/Python tests.
- Updated deployment, architecture and verification documentation.

## 1.0.1 — 2026-09-08

- Fixed action creation in non-secure local HTTP previews using cryptographic random bytes.
- Fixed history navigation, dialog naming/focus and off-canvas navigation accessibility.
- Added persistent storage failure feedback that cannot be hidden by a success toast.
- Fixed unavailable stock coverage exports and missing-value sorting.
- Hardened data validation, relational consistency and calendar validation.
- Excluded incomplete deliveries from OTD; corrected February chart intervals.
- Extended CSV formula neutralization and attached the download anchor for compatibility.
- Added empty-data, failed-load/retry and malformed-input regression coverage.
- Expanded automated coverage to 198 tests; documented actual Chrome review and unverified boundaries.
- Added an actual screenshot and optional Vite local preview. Static GitHub Pages publishing still needs no build.

## 1.0.0 — 2026-09-07

Initial Turkish / English / German portfolio release with operational modules, explanatory analytics, local action workflow and mock ERP API.
