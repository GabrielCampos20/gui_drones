import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import authRouter from './routes/auth'
import executionsRouter from './routes/executions'

const app = express()
const PORT = process.env.PORT || 3000

function getSimsBaseDir() {
    // 1. Verifica se está rodando dentro do Docker (onde o volume é montado em /app/sims)
    if (fs.existsSync('/app/sims')) {
        return '/app/sims'
    }

    // 2. Busca a raiz do monorepo (onde ficam as pastas backend e frontend juntas)
    let currentDir = __dirname
    while (currentDir !== path.parse(currentDir).root) {
        if (fs.existsSync(path.join(currentDir, 'backend')) && fs.existsSync(path.join(currentDir, 'frontend'))) {
            return path.join(currentDir, 'sims')
        }
        currentDir = path.dirname(currentDir)
    }

    // Fallback para caso extremo
    return path.resolve(__dirname, '..', '..', '..', 'sims')
}

app.use(cors())
app.use(express.json())

app.use('/files', express.static(getSimsBaseDir()))

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.use('/auth', authRouter)

// ─── Execucoes ────────────────────────────────────────────────────────────────

app.use('/execucoes', executionsRouter)

// ─── Saúde ────────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
    res.json({ status: 'ok' })
})

app.get('/health', (_req, res) => {
    res.json({ status: 'healthy' })
})

// ─── Simulador ────────────────────────────────────────────────────────────────

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
