# S2 review renders

28 actual captures, listed in RENDERS.json. Run `node scripts/render_s2.mjs --output-dir /absolute/synthetic/output` in a prepared checkout without another server on 4173.

390×844, light/dark, pinned desktop Chromium 141.0.7390.37, reduced motion. Data comes through the same Worker/D1 application using disposable synthetic fixtures. These are not owner/device screenshots. The reference file is unchanged; external font links are replaced in memory with the same self-hosted fonts. Browser clock is fixed; newly created Worker history timestamps reflect run time. This is review evidence, not an approved pixel-equality baseline.

Compare `today-light.png` / `reference-today-light.png`, `tasks-light.png` / `reference-tasks-light.png`, and `detail-datetime-light.png` / `reference-detail-light.png`, plus dark equivalents. Today-undated and Tasks-undated show below-fold navigation. Four precision-specific details and both sheets are included.

Intentional differences: readonly explanations/disabled writers; Personal filter; explicit precision selector; date-only and approximate presentation; actual scheduler-policy provenance; bounded/task-scoped history; higher-contrast text and readable completed rows. Unknown/approximate tasks stay under Tanpa tanggal even when completed, following the explicit owner constraint.

S1 owner acceptance is historical. S2 owner approval is pending. Do not begin S3 from this package. Real Chrome 138, TalkBack, normal-motion behavior and Android hardware are unverified.

Visual inspection compared Today/Tasks/Detail reference and implementation captures
in both themes, plus precision-specific details, below-fold rows and both sheets.
Paper/dot field, fonts, shadows, section ordering and bottom shell are retained.
Real metadata/explicit policy/history and readonly explanations make some cards
taller than the prototype; labels wrap rather than being hidden. This is an owner
review item, not a pixel-equality claim. Unknown and approximate wording remains
distinct; date-only shows no invented clock or urgency bar.
