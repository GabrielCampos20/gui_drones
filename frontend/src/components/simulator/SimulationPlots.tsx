import { useEffect, useState } from 'react'
import axios from 'axios'
import Papa from 'papaparse'
import MatlabChart from './MatlabChart'
import type { Execution } from '../../services/executions'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface PlotData {
    data: Record<string, unknown>[]
    lines: string[]
}

interface SimulationPlotsProps {
    execution: Execution
}

export default function SimulationPlots({ execution }: SimulationPlotsProps) {
    const [queueData, setQueueData] = useState<PlotData | null>(null)
    const [missionData, setMissionData] = useState<PlotData | null>(null)
    const [flightData, setFlightData] = useState<PlotData | null>(null)
    const [dropData, setDropData] = useState<PlotData | null>(null)

    const parseCsvToChartData = async (csvPath: string | null): Promise<PlotData | null> => {
        if (!csvPath) return null
        try {
            const encodedPath = csvPath.split('/').map(encodeURIComponent).join('/')
            const url = `${API_URL}/files/${encodedPath}`
            const response = await axios.get(url, { responseType: 'text' })
            
            return new Promise((resolve) => {
                Papa.parse(response.data, {
                    header: false,
                    skipEmptyLines: true,
                    complete: (results) => {
                        // O formato é AR; Drones; Mean
                        // A primeira linha geralmente é o cabeçalho "AR;Drones;Mean"
                        const rows = results.data as string[][]
                        const dataMap = new Map<number, Record<string, unknown>>()
                        const linesSet = new Set<string>()
                        
                        let isFirstLine = true
                        for (const row of rows) {
                            if (isFirstLine) {
                                isFirstLine = false
                                continue
                            }
                            if (row.length < 3) continue
                            
                            // Tratar as strings. Às vezes papaparse separa por vírgula em vez de ponto-e-vírgula.
                            // Mas o CSV do Java tem ';' separando. Se papaparse não detectou, temos que lidar.
                            // Vamos garantir pegando os elementos certos (o Java solta "1.5; 100; 12.5")
                            let arStr = row[0]
                            let dronesStr = row[1]
                            let meanStr = row[2]

                            if (row.length === 1 && typeof row[0] === 'string') {
                                const parts = row[0].split(';')
                                if (parts.length >= 3) {
                                    arStr = parts[0]
                                    dronesStr = parts[1]
                                    meanStr = parts[2]
                                }
                            }

                            if (!arStr || !dronesStr || !meanStr) continue

                            const ar = parseFloat(arStr.replace(',', '.').trim())
                            const drones = parseInt(dronesStr.trim(), 10)
                            const mean = parseFloat(meanStr.replace(',', '.').trim())
                            
                            if (isNaN(ar) || isNaN(drones) || isNaN(mean)) continue

                            const lineKey = `Number of Drones = ${drones}`
                            linesSet.add(lineKey)

                            if (!dataMap.has(ar)) {
                                dataMap.set(ar, { AR: ar })
                            }
                            const entry = dataMap.get(ar)
                            entry[lineKey] = mean
                        }

                        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.AR - b.AR)
                        const lines = Array.from(linesSet).sort() // Opcional: ordenar pelos drones
                        
                        if (sortedData.length > 0) {
                            resolve({ data: sortedData, lines })
                        } else {
                            resolve(null)
                        }
                    },
                    error: () => resolve(null)
                })
            })
        } catch (error) {
            console.error('Error fetching/parsing CSV:', error)
            return null
        }
    }

    useEffect(() => {
        let isMounted = true

        const loadData = async () => {
            const [qData, mData, fData, dData] = await Promise.all([
                parseCsvToChartData(execution.queueTimeCsvPath),
                parseCsvToChartData(execution.missionTimeCsvPath),
                parseCsvToChartData(execution.flightTimeCsvPath),
                parseCsvToChartData(execution.dropProbabilityCsvPath),
            ])

            if (isMounted) {
                setQueueData(qData)
                setMissionData(mData)
                setFlightData(fData)
                setDropData(dData)
            }
        }

        loadData()

        return () => {
            isMounted = false
        }
    }, [execution])

    const hasAnyData = queueData || missionData || flightData || dropData

    if (!hasAnyData) return null

    return (
        <div className="mt-8">
            <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                Gráficos da Simulação
            </h3>
            
            <div className="space-y-12">
                {/* Queue Time */}
                {queueData && (
                    <div>
                        <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                            Tempo de Fila
                        </h4>
                        <MatlabChart 
                            data={queueData.data} 
                            lines={queueData.lines}
                            xAxisKey="AR"
                            xAxisLabel="Arrival Rate (AR)"
                            yAxisLabel="Mean Queue Time"
                            yAxisUnit="ms"
                            legendPosition="InsideNE"
                        />
                    </div>
                )}

                {/* Mission Time */}
                {missionData && (
                    <div>
                        <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                            Tempo de Missão
                        </h4>
                        <MatlabChart 
                            data={missionData.data} 
                            lines={missionData.lines}
                            xAxisKey="AR"
                            xAxisLabel="Arrival Rate (AR)"
                            yAxisLabel="Mean Mission Time"
                            yAxisUnit="ms"
                            legendPosition="InsideNE"
                        />
                    </div>
                )}

                {/* Flight Time */}
                {flightData && (
                    <div>
                        <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                            Tempo de Voo
                        </h4>
                        <MatlabChart 
                            data={flightData.data} 
                            lines={flightData.lines}
                            xAxisKey="AR"
                            xAxisLabel="Arrival Rate (AR)"
                            yAxisLabel="Mean Flight Time"
                            yAxisUnit="ms"
                            legendPosition="InsideNE"
                        />
                    </div>
                )}

                {/* Drop Probability */}
                {dropData && (
                    <div>
                        <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                            Probabilidade de Queda
                        </h4>
                        <MatlabChart 
                            data={dropData.data} 
                            lines={dropData.lines}
                            xAxisKey="AR"
                            xAxisLabel="Arrival Rate (AR)"
                            yAxisLabel="Drop Probability"
                            yAxisUnit="%"
                            legendPosition="InsideSE" // O Java usa InsideSE para o DropLinePlot
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
