import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { spawn } from 'child_process'
import authRouter from './routes/auth'
import executionsRouter from './routes/executions'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/files', express.static(path.resolve(__dirname, '..', 'sims')))

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
