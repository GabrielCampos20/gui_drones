import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import axios from 'axios'
import SimulationChart from './SimulationChart'

export interface SharedSimulationPlotsProps {
    execution: any
}

export default function SharedSimulationPlots({ execution }: SharedSimulationPlotsProps) {
    const [data, setData] = useState<any[]>([])
    const [lines, setLines] = useState<string[]>([])
    const [xAxisKey, setXAxisKey] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const isStationary = execution.propertiesContent?.includes('simulation.type=STATIONARY')
    const csvPath = isStationary ? execution.sharedMmtVsArCsvPath : execution.sharedMmtVsTimeCsvPath

    useEffect(() => {
        if (!csvPath) {
            setError('Caminho do CSV não encontrado.')
            setLoading(false)
            return
        }

        const fetchCsv = async () => {
            try {
                const encodedPath = csvPath.split('/').map(encodeURIComponent).join('/')
                const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/files/${encodedPath}`
                const response = await axios.get(url)
                
                Papa.parse(response.data, {
                    header: true,
                    skipEmptyLines: true,
                    delimiter: ';',
                    complete: (results) => {
                        if (!results.data || results.data.length === 0) {
                            setError('CSV vazio.')
                            setLoading(false)
                            return
                        }
                        
                        const cols = results.meta.fields || []
                        if (cols.length < 2) {
                            setError('Formato de CSV inválido (poucas colunas).')
                            setLoading(false)
                            return
                        }

                        const xKey = cols[0]
                        const yLines = cols.slice(1)

                        // Processa "Mean / Error" ("77.0 / 0.0") extraindo só o Mean como número
                        const processedData = results.data.map((row: any) => {
                            const newRow = { ...row }
                            if (newRow[xKey] !== undefined) {
                                newRow[xKey] = parseFloat(newRow[xKey])
                            }
                            yLines.forEach(line => {
                                if (newRow[line] && typeof newRow[line] === 'string') {
                                    const meanStr = newRow[line].split('/')[0].trim()
                                    newRow[line] = parseFloat(meanStr)
                                } else if (newRow[line] !== undefined) {
                                    newRow[line] = parseFloat(newRow[line])
                                }
                            })
                            return newRow
                        })

                        setData(processedData)
                        setXAxisKey(xKey)
                        setLines(yLines)
                        setLoading(false)
                    },
                    error: (err: any) => {
                        console.error('Erro no parse do CSV:', err)
                        setError('Erro ao processar o arquivo CSV.')
                        setLoading(false)
                    }
                })
            } catch (err) {
                console.error('Erro ao buscar CSV:', err)
                setError('Ainda não há dados disponíveis para plotagem.')
                setLoading(false)
            }
        }

        fetchCsv()
    }, [csvPath])

    if (loading) {
        return <div className="text-[var(--color-text-secondary)] text-center p-4">Carregando gráficos...</div>
    }

    if (error) {
        return <div className="text-red-400 text-center p-4">{error}</div>
    }

    const title = isStationary ? "Mean Mission Time vs Arrival Rate" : "Mean Mission Time vs Time"
    const xLabel = isStationary ? "Arrival Rate (AR)" : "Time (ms)"
    const yLabel = "Mean Mission Time"

    return (
        <div className="grid grid-cols-1 gap-6">
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow p-6">
                <h3 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">
                    {title}
                </h3>
                <SimulationChart 
                    data={data}
                    lines={lines}
                    xAxisKey={xAxisKey}
                    xAxisLabel={xLabel}
                    yAxisLabel={yLabel}
                    yAxisUnit="ms"
                />
            </div>
        </div>
    )
}
