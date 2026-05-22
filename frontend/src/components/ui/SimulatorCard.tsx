import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type SimulatorCardProps = {
    title: string
    description: string
    route: string
    onClick?: () => void
}

export default function SimulatorCard({ title, description, route, onClick }: SimulatorCardProps) {
    return (
        <Link to={route} onClick={onClick} className="group block cursor-pointer">
            <div
                className="h-full p-8 rounded-lg border-2 transition-all duration-300"
                style={{
                    backgroundColor: 'var(--color-card)',
                    borderColor: 'var(--color-border)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-cyan-primary)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
            >
                <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                    {title}
                </h2>

                <p className="mb-6 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {description}
                </p>

                <div
                    className="flex items-center gap-2 font-medium transition-colors duration-300"
                    style={{ color: 'var(--color-cyan-light)' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--color-cyan-primary)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--color-cyan-light)'
                    }}
                >
                    <span>Launch Simulator</span>
                    <ArrowRight size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
                </div>
            </div>
        </Link>
    )
}
