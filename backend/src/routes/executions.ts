import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import path from 'path'
import fs from 'fs'

const router = Router()

// ─── Simulation State ─────────────────────────────────────────────────────────
// AVISO: Este estado é em memória e vinculado a este processo Node.js.
// Não é seguro rodar com múltiplas instâncias (ex: PM2 cluster mode),
// pois o estado diverge entre processos. Para este projeto acadêmico,
// assume-se deployment de processo único.

const simState = {
    isRunning: false,
    droppedPackages: [] as number[],
    currentProcess: null as ChildProcess | null,

    reset() {
        this.isRunning = false
        this.droppedPackages = []
        this.currentProcess = null
    },
}

// ─── SSE event bus ────────────────────────────────────────────────────────────
// Fans out simulation events to all connected SSE clients
const simEventBus = new EventEmitter()
simEventBus.setMaxListeners(50)

function broadcastEvent(type: string, payload: Record<string, unknown>) {
    simEventBus.emit('event', JSON.stringify({ type, payload }))
}

// ─── Regex helpers ────────────────────────────────────────────────────────────

// Aceita vírgula OU ponto como separador decimal (locale pt-BR do Java)
// Matches: [104230,00] Drone 90 completed package 88 (queue 7,47 ms + flight 403,95 ms = mission 411,42 ms)
// Matches: [430.00] Drone 55 completed package 0 (queue 5.70 ms + flight 206.98 ms = mission 212.68 ms)
const COMPLETE_RE = /\[(\d+(?:[.,]\d+)?)\]\s+Drone\s+(\d+)\s+completed\s+package\s+(\d+)\s+\(queue\s+[\d.,]+\s+ms\s+\+\s+flight\s+([\d.,]+)\s+ms/

// Matches: Package 656 has been dropped.
const DROP_RE = /Package\s+(\d+)\s+has\s+been\s+dropped\./

/** Normaliza separador decimal: substitui vírgula por ponto antes do parseFloat */
function toFloat(s: string): number {
    return parseFloat(s.replace(',', '.'))
}

function parseStdoutLine(line: string) {
    const m = line.match(COMPLETE_RE)
    if (!m) return
    const arriveTime = toFloat(m[1])
    const droneId    = parseInt(m[2], 10)
    const packageId  = parseInt(m[3], 10)
    const flightTime = toFloat(m[4])
    const departTime = arriveTime - flightTime

    broadcastEvent('drone_depart', { droneId, packageId, departTime, flightTime })
    broadcastEvent('drone_arrive', { droneId, packageId, arriveTime })
}

function parseStderrLine(line: string) {
    const m = line.match(DROP_RE)
    if (m) {
        const packageId = parseInt(m[1], 10)
        simState.droppedPackages.push(packageId)
        broadcastEvent('package_drop', { packageId })
    }
}

// ─── GET /execucoes/status ───────────────────────────────────────────────────
router.get('/status', (req: Request, res: Response) => {
    res.json({ isRunning: simState.isRunning })
})

// ─── GET /execucoes/stream ────────────────────────────────────────────────────
// Server-Sent Events endpoint: streams drone events to the frontend in real-time
router.get('/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering if used
    res.flushHeaders()

    // Send a heartbeat immediately so the connection is confirmed
    res.write('data: {"type":"connected"}\n\n')

    // If no simulation is running, send that info
    if (!simState.isRunning) {
        res.write('data: {"type":"idle"}\n\n')
    }

    const onEvent = (data: string) => {
        res.write(`data: ${data}\n\n`)
    }

    simEventBus.on('event', onEvent)

    req.on('close', () => {
        simEventBus.off('event', onEvent)
    })
})

// ─── GET /execucoes/dropped-packages ─────────────────────────────────────────
router.get('/dropped-packages', (req: Request, res: Response) => {
    res.json({ droppedPackages: simState.droppedPackages })
})

// ─── GET /execucoes ──────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
    try {
        const executions = await prisma.execution.findMany({
            orderBy: {
                startedAt: 'desc',
            },
        })
        res.json(executions)
    } catch (error) {
        console.error('Error fetching executions:', error)
        res.status(500).json({ error: 'Erro ao buscar execuções.' })
    }
})

// ─── DELETE /execucoes ───────────────────────────────────────────────────────
router.delete('/', async (req: Request, res: Response) => {
    try {
        await prisma.execution.deleteMany()
        res.status(204).send()
    } catch (error) {
        console.error('Error deleting executions:', error)
        res.status(500).json({ error: 'Erro ao limpar histórico.' })
    }
})

// ─── POST /execucoes/:id/stop ────────────────────────────────────────────────
router.post('/:id/stop', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string

        if (!simState.isRunning || !simState.currentProcess) {
            res.status(400).json({ error: 'Não há simulação rodando no momento para ser parada.' })
            return
        }

        simState.currentProcess.kill('SIGTERM')
        res.json({ message: 'Simulação abortada com sucesso.' })
    } catch (error) {
        console.error('Error stopping execution:', error)
        res.status(500).json({ error: 'Erro ao tentar parar a simulação.' })
    }
})

// ─── POST /execucoes ─────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
    if (simState.isRunning) {
        res.status(409).json({ error: 'Uma simulação já está em andamento.' })
        return
    }

    const { simulator, propertiesContent } = req.body

    if (!simulator || !propertiesContent) {
        res.status(400).json({ error: 'Parâmetros "simulator" e "propertiesContent" são obrigatórios.' })
        return
    }

    try {
        simState.isRunning = true
        simState.droppedPackages = []

        const simFolder = simulator === 'drone-delivery' ? 'drone_delivery_sim' : 'shared_drone_delivery_sim'
        const jarName = simulator === 'drone-delivery' ? 'DroneDeliverySim.jar' : 'SharedDroneDeliverySim.jar'

        // 1. Sobrescrever o arquivo properties
        const simsDir = path.resolve(__dirname, '..', '..', '..', 'sims', simFolder)
        const propertiesPath = path.join(simsDir, 'config.properties')
        
        // Verifica se a pasta existe antes de escrever
        if (!fs.existsSync(simsDir)) {
            fs.mkdirSync(simsDir, { recursive: true })
        }
        fs.writeFileSync(propertiesPath, propertiesContent, 'utf-8')

        // 2. Criar execução no banco com caminhos preenchidos
        const execution = await prisma.execution.create({
            data: {
                simulator,
                propertiesContent,
                queueTimeCsvPath: `${simFolder}/queue_time.csv`,
                missionTimeCsvPath: `${simFolder}/mission_time.csv`,
                flightTimeCsvPath: `${simFolder}/flight_time.csv`,
                dropProbabilityCsvPath: `${simFolder}/drop_probability.csv`
            },
        })

        // 3. Responder imediatamente ao front-end
        res.status(201).json(execution)

        // Notify SSE clients that simulation started
        broadcastEvent('simulation_start', { executionId: execution.id })

        // 4. Iniciar processamento em background
        const jarPath = path.join(simsDir, jarName)
        const child = spawn('java', ['-jar', jarPath], { cwd: simsDir })
        
        simState.currentProcess = child

        let stdoutBuffer = ''
        let stderrBuffer = ''

        child.stdout.on('data', (data) => {
            const chunk = data.toString()
            stdoutBuffer += chunk
            const lines = stdoutBuffer.split('\n')
            stdoutBuffer = lines.pop() ?? ''
            for (const line of lines) {
                parseStdoutLine(line)
            }
        })

        child.stderr.on('data', (data) => {
            const chunk = data.toString()
            stderrBuffer += chunk
            const lines = stderrBuffer.split('\n')
            stderrBuffer = lines.pop() ?? ''
            for (const line of lines) {
                parseStderrLine(line)
            }
        })

        child.on('close', async () => {
            simState.isRunning = false
            simState.currentProcess = null
            broadcastEvent('simulation_end', {})
            try {
                await prisma.execution.update({
                    where: { id: execution.id },
                    data: {
                        finishedAt: new Date(),
                    },
                })
            } catch (err) {
                console.error("Erro ao atualizar a execução com finishedAt", err)
            }
        })

        child.on('error', async (error) => {
            simState.isRunning = false
            simState.currentProcess = null
            broadcastEvent('simulation_end', { error: true })
            console.error('Erro na simulação background', error)
            try {
                await prisma.execution.update({
                    where: { id: execution.id },
                    data: {
                        finishedAt: new Date(),
                    },
                })
            } catch (err) {
                console.error("Erro ao atualizar a execução no catch", err)
            }
        })
    } catch (error) {
        simState.reset()
        console.error('Error starting execution:', error)
        res.status(500).json({ error: 'Erro ao iniciar simulação.' })
    }
})

// ─── GET /execucoes/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const execution = await prisma.execution.findUnique({
            where: { id },
        })

        if (!execution) {
            res.status(404).json({ error: 'Execução não encontrada.' })
            return
        }

        res.json(execution)
    } catch (error) {
        console.error('Error fetching execution by id:', error)
        res.status(500).json({ error: 'Erro ao buscar execução.' })
    }
})

export default router
