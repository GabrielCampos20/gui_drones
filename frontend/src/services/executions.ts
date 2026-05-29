import axios from 'axios'
import { API_URL } from '../lib/api'

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

    /** Inicia uma nova simulação. */
    start: (simulator: string, propertiesContent: string) =>
        axios.post<Execution>(`${API_URL}/execucoes`, { simulator, propertiesContent }),

    stop: (id: string) =>
        axios.post<{ message: string }>(`${API_URL}/execucoes/${id}/stop`),

    clearAll: () =>
        axios.delete(`${API_URL}/execucoes`),
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
