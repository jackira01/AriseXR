import dotenv from 'dotenv'

const envFile = process.env.ENV_FILE ?? (process.env.NODE_ENV === 'test' ? '.env.test' : '.env')
const result = dotenv.config({
    path: envFile,
    // Bun puede haber cargado .env antes de este módulo; test debe tener prioridad.
    override: envFile === '.env.test',
})

if (result.error && process.env.NODE_ENV !== 'production') {
    console.warn(`[BOOT] No se pudo cargar ${envFile}: ${result.error.message}`)
}
