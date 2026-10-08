// Runs before `next build`. On Vercel PRODUCTION deploys (merges to main) it applies any new
// db/migrations/*.sql to the production database, so the database is always updated together with the code.
// Preview deploys (pull requests) and local builds do nothing here: they must not change the live database.
// If a migration fails, the build fails and Vercel keeps the previous version online.
import { execFileSync } from 'node:child_process'

if (process.env.VERCEL_ENV === 'production') {
  console.log('[deploy] Production deploy: applying database migrations…')
  execFileSync(process.execPath, ['scripts/migrate.mjs'], { stdio: 'inherit' })
} else {
  console.log(`[deploy] Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'not set'}).`)
}
