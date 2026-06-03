import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme-secret'

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string
        name: string
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token não fornecido ou inválido.' })
        return
    }

    const token = authHeader.split(' ')[1]

    try {
        const payload = jwt.verify(token, JWT_SECRET) as { sub: string; name: string }
        ;(req as AuthenticatedRequest).user = {
            id: payload.sub,
            name: payload.name,
        }
        next()
    } catch (error) {
        res.status(401).json({ error: 'Token inválido ou expirado.' })
    }
}
