import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme-secret'
const SALT_ROUNDS = 10

// ─── Schemas ──────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
    name: z.string().min(2),
    password: z.string().min(6),
})

const LoginSchema = z.object({
    name: z.string().min(1),
    password: z.string().min(1),
})

// ─── POST /auth/register ──────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
    const parsed = RegisterSchema.safeParse(req.body)

    if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() })
        return
    }

    const { name, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { name } })
    if (existing) {
        res.status(409).json({ error: 'Nome de usuário já está em uso.' })
        return
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await prisma.user.create({
        data: { name, passwordHash },
        select: { id: true, name: true },
    })

    const token = jwt.sign({ sub: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' })

    res.status(201).json({ token, user })
})

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
    const parsed = LoginSchema.safeParse(req.body)

    if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos.' })
        return
    }

    const { name, password } = parsed.data

    const user = await prisma.user.findUnique({
        where: { name },
        select: { id: true, name: true, passwordHash: true },
    })

    if (!user) {
        res.status(401).json({ error: 'Nome de usuário ou senha inválidos.' })
        return
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
        res.status(401).json({ error: 'Nome de usuário ou senha inválidos.' })
        return
    }

    const token = jwt.sign({ sub: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' })

    res.json({ token, user: { id: user.id, name: user.name } })
})

export default router
