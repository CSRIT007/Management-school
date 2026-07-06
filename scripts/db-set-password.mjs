#!/usr/bin/env node
/**
 * Set PostgreSQL login password (DBeaver + app).
 * 1. Put POSTGRES_PASSWORD=your_password in .env
 * 2. Run: npm run db:password
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const envPath = path.join(root, '.env')

dotenv.config({ path: envPath })

const password = process.env.POSTGRES_PASSWORD?.trim()
const user = process.env.POSTGRES_USER?.trim() || 'postgres'
const db = process.env.POSTGRES_DB?.trim() || 'management_school'
const host = process.env.POSTGRES_HOST?.trim() || 'localhost'
const port = process.env.POSTGRES_PORT?.trim() || '5433'

if (!password) {
  console.error('Add POSTGRES_PASSWORD=your_strong_password to .env first.')
  process.exit(1)
}

if (password === 'postgres') {
  console.error('Choose a stronger password than "postgres".')
  process.exit(1)
}

const sqlPassword = password.replace(/'/g, "''")
const encoded = encodeURIComponent(password)
const databaseUrl = `postgresql://${user}:${encoded}@${host}:${port}/${db}`

function runPsql(sql, extraEnv = {}) {
  execSync(
    `docker compose exec -T db psql -U ${user} -d postgres -c "${sql.replace(/"/g, '\\"')}"`,
    { cwd: root, stdio: 'inherit', env: { ...process.env, ...extraEnv } }
  )
}

try {
  execSync('docker compose ps --status running db', { cwd: root, stdio: 'pipe' })
} catch {
  console.error('Start the database first: docker compose up -d db')
  process.exit(1)
}

console.log('Updating PostgreSQL password…')

try {
  runPsql(`ALTER USER ${user} WITH PASSWORD '${sqlPassword}';`)
} catch {
  console.error('Could not change password. Is the DB running? docker compose up -d db')
  process.exit(1)
}

let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''

const setLine = (key, value) => {
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, 'm')
  envText = re.test(envText) ? envText.replace(re, line) : `${envText.trimEnd()}\n${line}\n`
}

setLine('POSTGRES_USER', user)
setLine('POSTGRES_PASSWORD', password)
setLine('POSTGRES_DB', db)
setLine('POSTGRES_HOST', host)
setLine('POSTGRES_PORT', port)
setLine('DATABASE_URL', databaseUrl)

fs.writeFileSync(envPath, envText.endsWith('\n') ? envText : `${envText}\n`)

console.log('')
console.log('Password updated.')
console.log('')
console.log('DBeaver login:')
console.log(`  Host:     ${host}`)
console.log(`  Port:     ${port}`)
console.log(`  Database: ${db}`)
console.log(`  Username: ${user}`)
console.log(`  Password: (value of POSTGRES_PASSWORD in .env)`)
console.log('')
console.log('Restart API so it uses the new password:')
console.log('  docker compose up -d api   (Docker)')
console.log('  npm run server             (local dev — stop and start again)')

try {
  execSync('docker compose up -d --force-recreate api', { cwd: root, stdio: 'inherit' })
  console.log('')
  console.log('Docker API restarted with new password.')
} catch {
  console.log('')
  console.log('Could not restart Docker API automatically. Run: docker compose up -d api')
}
