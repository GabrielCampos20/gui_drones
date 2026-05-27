import { Router, type Request, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'

const router = Router()

export let isSimulationRunning = false
export let droppedPackages: number[] = []
export let currentProcess: ChildProcess | null = null

// ─── GET /execucoes/status ───────────────────────────────────────────────────
router.get('/status', (req: Request, res: Response) => {
    res.json({ isRunning: isSimulationRunning })
})

// ─── GET /execucoes/dropped-packages ─────────────────────────────────────────
router.get('/dropped-packages', (req: Request, res: Response) => {
    res.json({ droppedPackages })
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

        if (!isSimulationRunning || !currentProcess) {
            res.status(400).json({ error: 'Não há simulação rodando no momento para ser parada.' })
            return
        }

        // Mata o processo enviando um sinal de terminal
        currentProcess.kill('SIGTERM')
        res.json({ message: 'Simulação abortada com sucesso.' })
    } catch (error) {
        console.error('Error stopping execution:', error)
        res.status(500).json({ error: 'Erro ao tentar parar a simulação.' })
    }
})

// ─── POST /execucoes ─────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
    if (isSimulationRunning) {
        res.status(409).json({ error: 'Uma simulação já está em andamento.' })
        return
    }

    const { simulator, propertiesContent } = req.body

    if (!simulator || !propertiesContent) {
        res.status(400).json({ error: 'Parâmetros "simulator" e "propertiesContent" são obrigatórios.' })
        return
    }

    try {
        isSimulationRunning = true
        droppedPackages = []

        // 1. Sobrescrever o arquivo properties
        const simsDir = path.resolve(__dirname, '..', '..', 'sims')
        const propertiesPath = path.join(simsDir, 'config.properties')
        fs.writeFileSync(propertiesPath, propertiesContent, 'utf-8')

        // 2. Criar execução no banco
        const execution = await prisma.execution.create({
            data: {
                simulator,
                propertiesContent,
            },
        })

        // 3. Responder imediatamente ao front-end
        res.status(201).json(execution)

        // 4. Iniciar processamento em background
        const jarPath = path.join(simsDir, 'DroneDeliverySim.jar')
        const child = spawn('java', ['-jar', jarPath], { cwd: simsDir })
        
        currentProcess = child

        let stdoutData = ''
        let stderrData = ''

        child.stdout.on('data', (data) => {
            stdoutData += data.toString()
        })

        child.stderr.on('data', (data) => {
            const chunk = data.toString()
            stderrData += chunk

            const lines = chunk.split('\n')
            for (const line of lines) {
                const match = line.match(/Package (\d+) has been dropped\./)
                if (match) {
                    droppedPackages.push(parseInt(match[1], 10))
                }
            }
        })

        child.on('close', async () => {
            isSimulationRunning = false
            currentProcess = null
            try {
                // Aqui podemos salvar os arquivos, ou por enquanto apenas dar um finishedAt
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
            isSimulationRunning = false
            currentProcess = null
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
        isSimulationRunning = false
        currentProcess = null
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
