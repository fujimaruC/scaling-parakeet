# S3–S7 build output — 2026-11-07

Implementation-only run. No application test, planning validator, mutation,
browser, accessibility, Android, account or device command was executed.
Compiler/bundler success is not runtime evidence. Terminal color escapes below
are removed; stdout/stderr text is otherwise retained. Actual final exit codes
were observed separately as Build exit: 0 and TypeScript compiler exit: 0.

## Locked dependency installation

Command: `npm ci --ignore-scripts` — exit 0. No dependency added.

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

added 170 packages in 13s
npm notice
npm notice New major version of npm available! 11.9.0 -> 12.2.2
npm notice Changelog: https://github.com/npm/cli/releases/tag/v12.2.2
npm notice To update run: npm install -g npm@12.2.2
npm notice
```

## TypeScript compilation (no tests executed)

Command: `./node_modules/.bin/tsc --noEmit` — exit 0.

```text
```

The compiler emitted no diagnostics. It type-checks the repository's included
sources; it does not execute application or test behavior.

## Production compilation (no deployment)

Command: `WRANGLER_SEND_METRICS=false npm run build` — exit 0.

```text
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> npm run build -w @academic-os/web && npm run build -w @academic-os/worker

npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 52 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.44 kB │ gzip:  0.30 kB
dist/assets/index-bTaNtkGA.css   23.14 kB │ gzip:  5.81 kB
dist/assets/index-CHUqOoJU.js   302.40 kB │ gzip: 96.35 kB
✓ built in 1.01s
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.

> build
> wrangler deploy --dry-run --outdir dist

▲ [WARNING] Proxy environment variables detected. We'll use your proxy for fetch requests.



 ⛅️ wrangler 4.158.0
────────────────────
✨ Read 16 files from the assets directory /workspace/scratch/bbff8dae2870/academic-os-build/apps/web/dist
Total Upload: 442.52 KiB / gzip: 87.23 KiB
Your Worker has access to the following bindings:
Binding                               Resource                  
env.DB (academic-os)                  D1 Database               
env.ASSETS                            Assets                    
env.OWNER_SUB ("UNCONFIGURED")        Environment Variable      
env.ACCESS_TEAM ("UNCONFIGURED")      Environment Variable      
env.ACCESS_AUD ("UNCONFIGURED")       Environment Variable      

--dry-run: exiting now.
```

Other implementation commands: deterministic icon generation via
`python3 scripts/generate_pwa_icons.py`; source formatting via the existing
Prettier binary. No acceptance/test suite was run. No new Java/SDK installed.
Native Android source and its historical evidence remain unchanged. All new
runtime behavior, migration application and accessibility remain unverified.
