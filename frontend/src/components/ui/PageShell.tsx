import type { ReactNode } from 'react'

type PageShellProps = {
    title: string
    description?: string
    children: ReactNode
}

export default function PageShell({ title, description, children }: PageShellProps) {
    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="w-full max-w-6xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--color-text-muted)' }}>
                            {description}
                        </p>
                    ) : null}
                </div>

                {children}
            </div>
        </div>
    )
}
