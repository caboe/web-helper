// Packt das Build-Verzeichnis in eine ZIP (ohne Sourcemaps).
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const out = join(root, 'web-helper-ai.zip')
if (!existsSync(dist)) {
  console.error('dist fehlt – erst npm run build ausführen.')
  process.exit(1)
}
if (existsSync(out)) {
  execSync('rm -f "' + out + '"')
}
execSync('cd "' + dist + '" && zip -r -X "../web-helper-ai.zip" . -x "*.map" >/dev/null')
console.log('ZIP erstellt:', out)
