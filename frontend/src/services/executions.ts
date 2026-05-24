import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type Execution = {
    id: string
    simulator: 'drone-delivery' | 'shared-drone-delivery'
    propertiesContent: string
    startedAt: string
    finishedAt: string | null
    logPath: string | null
    queueTimeCsvPath: string | null
    missionTimeCsvPath: string | null
    flightTimeCsvPath: string | null
    dropProbabilityCsvPath: string | null
    userId: string | null
}

export const executionsApi = {
    list: () =>
        axios.get<Execution[]>(`${API_URL}/execucoes`),

    getById: (id: string) =>
        axios.get<Execution>(`${API_URL}/execucoes/${id}`),
}

export function simulatorLabel(simulator: string): string {
    const labels: Record<string, string> = {
        'drone-delivery': 'Drone Delivery Sim',
        'shared-drone-delivery': 'Shared Drone Delivery Sim',
    }
    return labels[simulator] ?? simulator
}

export function executionStatus(execution: Execution): 'running' | 'done' {
    return execution.finishedAt ? 'done' : 'running'
}

export function formatDuration(startedAt: string, finishedAt: string | null): string {
    const start = new Date(startedAt).getTime()
    const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
    const diffMs = end - start
    const totalSeconds = Math.floor(diffMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    if (minutes === 0) return `${seconds}s`
    return `${minutes}m ${seconds}s`
}
