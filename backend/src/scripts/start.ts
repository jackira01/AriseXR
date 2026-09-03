const mode = process.argv[2] === 'test' ? 'test' : 'development'

process.env.NODE_ENV = mode
process.env.ENV_FILE = mode === 'test' ? '.env.test' : '.env'

void import('../index.js').catch((error) => {
    console.error('[BOOT] Error iniciando backend:', error)
    process.exitCode = 1
})
