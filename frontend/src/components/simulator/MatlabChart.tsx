import { useRef } from 'react'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Customized
} from 'recharts'
import html2canvas from 'html2canvas'
import { Download } from 'lucide-react'

const MATLAB_STYLES = [
    { color: '#0000FF', shape: 'circle' as const },
    { color: '#008000', shape: 'square' as const },
    { color: '#FF0000', shape: 'diamond' as const },
    { color: '#00CED1', shape: 'circle' as const },
    { color: '#FF00FF', shape: 'square' as const },
]

const CustomDot = (props: any) => {
    const { cx, cy, fill, shape } = props
    if (shape === 'circle') {
        return <circle cx={cx} cy={cy} r={6} fill={fill} stroke="none" />
    }
    if (shape === 'square') {
        return <rect x={cx - 5} y={cy - 5} width={10} height={10} fill={fill} stroke="none" />
    }
    if (shape === 'diamond') {
        return <polygon points={`${cx},${cy-7} ${cx+7},${cy} ${cx},${cy+7} ${cx-7},${cy}`} fill={fill} stroke="none" />
    }
    return <circle cx={cx} cy={cy} r={6} fill={fill} stroke="none" />
}

const BoundingBox = (props: any) => {
    const { offset, xAxisMap, yAxisMap } = props
    if (!offset) return null
    
    const xTicks = xAxisMap?.bottom?.ticks || []
    const yTicks = yAxisMap?.left?.ticks || []

    return (
        <svg>
            {/* Box border */}
            <rect 
                x={offset.left} 
                y={offset.top} 
                width={offset.width} 
                height={offset.height} 
                fill="none" 
                stroke="#000" 
                strokeWidth={1} 
            />
            {/* Top inward ticks */}
            {xTicks.map((tick: any, index: number) => (
                <line key={`top-tick-${index}`} x1={tick.coordinate} y1={offset.top} x2={tick.coordinate} y2={offset.top + 5} stroke="#000" strokeWidth={1} />
            ))}
            {/* Right inward ticks */}
            {yTicks.map((tick: any, index: number) => (
                <line key={`right-tick-${index}`} x1={offset.left + offset.width} y1={tick.coordinate} x2={offset.left + offset.width - 5} y2={tick.coordinate} stroke="#000" strokeWidth={1} />
            ))}
        </svg>
    )
}

export interface MatlabChartProps {
    data: Record<string, unknown>[]
    lines: string[]
    xAxisKey: string
    xAxisLabel: string
    yAxisLabel: string
    yAxisUnit: string
    legendPosition?: 'InsideSE' | 'InsideNE' | 'OutsideE'
    xDecimals?: number
    yDecimals?: number
}

export default function MatlabChart({
    data,
    lines,
    xAxisKey,
    xAxisLabel,
    yAxisLabel,
    yAxisUnit,
    legendPosition = 'InsideNE',
    xDecimals = 2,
    yDecimals = 2,
}: MatlabChartProps) {
    const chartRef = useRef<HTMLDivElement>(null)

    const formatValue = (val: number | string, decimals: number) => {
        const num = Number(val)
        if (isNaN(num)) return String(val)
        return num.toFixed(decimals)
    }

    // Calcular ticks do Eixo X (semelhante ao Matlab: 10 divisões)
    const xValues = data.map(d => Number(d[xAxisKey])).filter(v => !isNaN(v))
    const minX = xValues.length ? Math.min(...xValues) : 0
    const maxX = xValues.length ? Math.max(...xValues) : 1
    const xTicks = []
    for (let i = 0; i < 10; i++) {
        xTicks.push(minX + (maxX - minX) * (i / 9))
    }

    // Font styles exactly as requested (Sans-Serif, Bold, 23pt for axes, 18pt for legend)
    const axisFont = { fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: 23, fill: '#000' }
    const legendFont = { fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: 18, color: '#000' }

    // Legend placement
    let legendAlign: 'left' | 'center' | 'right' = 'right'
    let legendVerticalAlign: 'top' | 'middle' | 'bottom' = 'top'
    let legendWrapperStyle: React.CSSProperties = { paddingBottom: 20, paddingTop: 20 }

    if (legendPosition === 'InsideNE') {
        legendAlign = 'right'
        legendVerticalAlign = 'top'
        legendWrapperStyle = { position: 'absolute', right: 50, top: 30, backgroundColor: '#fff', border: '1px solid #000', padding: '5px' }
    } else if (legendPosition === 'InsideSE') {
        legendAlign = 'right'
        legendVerticalAlign = 'bottom'
        legendWrapperStyle = { position: 'absolute', right: 50, bottom: 90, backgroundColor: '#fff', border: '1px solid #000', padding: '5px' }
    }

    const downloadPNG = async () => {
        if (!chartRef.current) return
        
        // 400 DPI is ~4.16 scale (assuming 96 DPI baseline)
        const canvas = await html2canvas(chartRef.current, {
            scale: 4.16,
            backgroundColor: '#ffffff'
        })
        
        const link = document.createElement('a')
        link.download = `${yAxisLabel.toLowerCase().replace(/ /g, '_')}_graph.png`
        link.href = canvas.toDataURL('image/png', 1.0)
        link.click()
    }

    return (
        <div className="flex flex-col gap-2 relative">
            <button 
                onClick={downloadPNG}
                className="absolute -top-10 right-0 flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-md text-sm hover:border-cyan-primary transition-colors text-text-secondary z-10"
            >
                <Download size={14} />
                Exportar PNG (400 DPI)
            </button>
            <div 
                ref={chartRef} 
                style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '4px', border: 'none', position: 'relative' }}
            >
                <ResponsiveContainer width="100%" height={650}>
                    <LineChart data={data} margin={{ top: 20, right: 40, left: 110, bottom: 80 }}>
                        <Customized component={BoundingBox} />
                        
                        <XAxis 
                            xAxisId="bottom"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            ticks={xTicks}
                            interval={0}
                            dataKey={xAxisKey} 
                            stroke="#000" 
                            strokeWidth={1}
                            tickSize={-5}
                            tickMargin={15}
                            tick={{ ...axisFont }}
                            tickFormatter={(val) => formatValue(val, xDecimals)}
                            label={{ 
                                value: xAxisLabel, 
                                position: 'bottom', 
                                offset: 45,
                                style: axisFont
                            }}
                        />
                        
                        <YAxis 
                            yAxisId="left"
                            type="number"
                            domain={['auto', 'auto']}
                            stroke="#000" 
                            strokeWidth={1}
                            tickSize={-5}
                            tickMargin={15}
                            tick={{ ...axisFont }}
                            tickFormatter={(val) => formatValue(val, yDecimals)}
                            label={{ 
                                value: yAxisUnit ? `${yAxisLabel} (${yAxisUnit})` : yAxisLabel, 
                                angle: -90, 
                                position: 'left',
                                offset: 80,
                                style: axisFont
                            }}
                        />
                        
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', ...legendFont }} 
                            itemStyle={legendFont}
                            labelFormatter={(label) => `${xAxisLabel}: ${formatValue(label, xDecimals)}`}
                        />
                        
                        <Legend 
                            align={legendAlign} 
                            verticalAlign={legendVerticalAlign} 
                            wrapperStyle={legendWrapperStyle}
                            layout="vertical"
                            iconSize={0}
                            formatter={(value, entry, index) => {
                                const style = MATLAB_STYLES[index % MATLAB_STYLES.length]
                                return (
                                    <span style={{ ...legendFont, marginLeft: 0, display: 'inline-flex', alignItems: 'center' }}>
                                        <svg width="30" height="14" style={{ marginRight: 8, overflow: 'visible' }}>
                                            <line x1="0" y1="7" x2="30" y2="7" stroke={style.color} strokeWidth="2.5" />
                                            {style.shape === 'circle' && <circle cx="15" cy="7" r="6" fill={style.color} stroke="none" />}
                                            {style.shape === 'square' && <rect x="9" y="1" width="12" height="12" fill={style.color} stroke="none" />}
                                            {style.shape === 'diamond' && <polygon points="15,0 22,7 15,14 8,7" fill={style.color} stroke="none" />}
                                        </svg>
                                        {value}
                                    </span>
                                )
                            }}
                        />

                        {lines.map((lineKey, index) => {
                            const style = MATLAB_STYLES[index % MATLAB_STYLES.length]
                            return (
                                <Line 
                                    key={lineKey} 
                                    xAxisId="bottom"
                                    yAxisId="left"
                                    type="linear"
                                    dataKey={lineKey} 
                                    stroke={style.color} 
                                    strokeWidth={2.5}
                                    dot={<CustomDot shape={style.shape} fill={style.color} />}
                                    activeDot={{ r: 8 }}
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
