import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/auth', authRouter)

app.get('/', (_req, res) => {
    res.json({ status: 'ok' })
})

app.get('/health', (_req, res) => {
    res.json({ status: 'healthy' })
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})