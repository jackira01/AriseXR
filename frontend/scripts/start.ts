import dotenv from 'dotenv'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const mode = process.argv[2] === 'test' ? 'test' : 'development'
const envFile = mode === 'test' ? '.env.test' : '.env'

if (mode === 'test' && !fs.existsSync(envFile)) {
    throw new Error(`Falta ${envFile}. Cópialo desde ${envFile}.example y configura el backend de prueba.`)
}

const result = dotenv.config({ path: envFile, override: mode === 'test' })
if (result.error) throw result.error

console.log(`[BOOT] Frontend ${mode}: ${envFile}`)
console.log(`[BOOT] Backend API: ${process.env.BACKEND_URL ?? 'no configurado'}`)

const child = spawn('bun', ['run', 'next', 'dev'], {
    stdio: 'inherit',
    env: process.env,
    windowsHide: false,
})

child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    else process.exitCode = code ?? 1
})
