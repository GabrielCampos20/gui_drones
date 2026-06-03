import { useRef, useState } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import html2canvas from 'html2canvas'
import { Download } from 'lucide-react'

// Cores com alto contraste focadas para uso acadêmico (estilo matlab/pyplot, fundo branco)
const ACADEMIC_STYLES = [
    { color: '#1f77b4', shape: 'circle' as const },  // Azul
    { color: '#d62728', shape: 'square' as const },  // Vermelho
    { color: '#2ca02c', shape: 'diamond' as const }, // Verde
    { color: '#9467bd', shape: 'circle' as const },  // Roxo
    { color: '#ff7f0e', shape: 'square' as const },  // Laranja
]

const CustomDot = (props: any) => {
    const { cx, cy, fill, shape } = props
    if (shape === 'circle') {
        return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="none" />
    }
    if (shape === 'square') {
        return <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={fill} stroke="none" />
    }
    if (shape === 'diamond') {
        return <polygon points={`${cx},${cy-5} ${cx+5},${cy} ${cx},${cy+5} ${cx-5},${cy}`} fill={fill} stroke="none" />
    }
    return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="none" />
}

export interface SimulationChartProps {
    data: Record<string, unknown>[]
    lines: string[]
    xAxisKey: string
    xAxisLabel: string
    yAxisLabel: string
    yAxisUnit: string
    xDecimals?: number
    yDecimals?: number
}

export default function SimulationChart({
    data,
    lines,
    xAxisKey,
    xAxisLabel,
    yAxisLabel,
    yAxisUnit,
    xDecimals = 2,
    yDecimals = 2,
}: SimulationChartProps) {
    const chartRef = useRef<HTMLDivElement>(null)
    const [isExporting, setIsExporting] = useState(false)

    const formatValue = (val: number | string, decimals: number) => {
        const num = Number(val)
        if (isNaN(num)) return String(val)
        return num.toFixed(decimals)
    }

    // Calcular ticks do Eixo X (10 divisões)
    const xValues = data.map(d => Number(d[xAxisKey])).filter(v => !isNaN(v))
    const minX = xValues.length ? Math.min(...xValues) : 0
    const maxX = xValues.length ? Math.max(...xValues) : 1
    const xTicks = []
    for (let i = 0; i < 10; i++) {
        xTicks.push(minX + (maxX - minX) * (i / 9))
    }

    const downloadPNG = async () => {
        if (!chartRef.current) return
        
        setIsExporting(true)
        // Give React a frame to hide the button
        await new Promise(resolve => requestAnimationFrame(resolve))
        
        try {
            // 400 DPI equivalent
            const canvas = await html2canvas(chartRef.current, {
                scale: 4.16,
                backgroundColor: '#ffffff'
            })
            
            const link = document.createElement('a')
            link.download = `${yAxisLabel.toLowerCase().replace(/ /g, '_')}_graph.png`
            link.href = canvas.toDataURL('image/png', 1.0)
            link.click()
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="flex flex-col gap-2 relative">
            {!isExporting && (
                <button 
                    onClick={downloadPNG}
                    className="absolute -top-10 right-0 flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-md text-sm hover:border-cyan-primary transition-colors text-text-secondary z-10"
                >
                    <Download size={14} />
                    Exportar PNG (400 DPI)
                </button>
            )}
            <div 
                ref={chartRef} 
                style={{ backgroundColor: '#ffffff', padding: '30px 20px', borderRadius: '4px', border: '1px solid #e2e8f0', position: 'relative' }}
            >
                <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
                        <XAxis 
                            xAxisId="bottom"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            ticks={xTicks}
                            dataKey={xAxisKey} 
                            stroke="#334155" 
                            padding={{ left: 20, right: 20 }}
                            tick={{ fill: '#334155', fontSize: 14 }}
                            tickFormatter={(val) => formatValue(val, xDecimals)}
                            label={{ 
                                value: xAxisLabel, 
                                position: 'bottom', 
                                offset: 0,
                                fill: '#334155',
                                fontSize: 16,
                                fontWeight: 500
                            }}
                        />
                        
                        <YAxis 
                            yAxisId="left"
                            type="number"
                            domain={['auto', 'auto']}
                            tickCount={8}
                            stroke="#334155" 
                            padding={{ bottom: 20, top: 20 }}
                            tick={{ fill: '#334155', fontSize: 14 }}
                            tickFormatter={(val) => formatValue(val, yDecimals)}
                            label={{ 
                                value: yAxisUnit ? `${yAxisLabel} (${yAxisUnit})` : yAxisLabel, 
                                angle: -90, 
                                position: 'insideLeft',
                                offset: -25,
                                style: { textAnchor: 'middle' },
                                fill: '#334155',
                                fontSize: 16,
                                fontWeight: 500
                            }}
                        />
                        
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#334155' }}
                            itemStyle={{ color: '#334155', fontWeight: 500 }}
                            labelFormatter={(label) => `${xAxisLabel}: ${formatValue(label, xDecimals)}`}
                        />
                        
                        <Legend 
                            layout="horizontal"
                            verticalAlign="bottom" 
                            align="center"
                            height={70}
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => <span style={{ color: '#334155', fontWeight: 500, fontSize: 14 }}>{value}</span>}
                        />

                        {lines.map((lineKey, index) => {
                            const style = ACADEMIC_STYLES[index % ACADEMIC_STYLES.length]
                            return (
                                <Line 
                                    key={lineKey} 
                                    xAxisId="bottom"
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey={lineKey} 
                                    stroke={style.color} 
                                    strokeWidth={2}
                                    dot={<CustomDot shape={style.shape} fill={style.color} />}
                                    activeDot={{ r: 6 }}
                                    isAnimationActive={false}
                                />
                            )
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
