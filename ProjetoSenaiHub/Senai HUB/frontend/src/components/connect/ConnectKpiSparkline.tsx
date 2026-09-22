import { useId, useMemo } from 'react'

interface ConnectKpiSparklineProps {
  data: number[]
  className?: string
  height?: number
  /** Cor do traço / área (hex). Padrão: navy SENAI suave. */
  color?: string
}

function buildSparklinePaths(
  values: number[],
  width: number,
  height: number,
): { line: string; area: string } {
  if (values.length === 0) {
    return { line: '', area: '' }
  }

  const padY = 6
  const innerH = height - padY * 2
  const step = values.length <= 1 ? width : width / (values.length - 1)

  const min = Math.min(...values)
  const max = Math.max(...values)
  let scaleMin = min
  let scaleMax = max
  if (min === max) {
    const pad = Math.max(1, Math.abs(max) * 0.25)
    scaleMin = min - pad
    scaleMax = max + pad
  }
  const scaleRange = scaleMax - scaleMin || 1
  const coords = values.map((v, i) => {
    const x = i * step
    const y = padY + innerH - ((v - scaleMin) / scaleRange) * innerH
    return [x, y] as const
  })

  const line = coords.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ')
  const last = coords[coords.length - 1]
  const area = `${line} L ${last[0]} ${height} L 0 ${height} Z`

  return { line, area }
}

const DEFAULT_COLOR = '#021a3a'

export function ConnectKpiSparkline({
  data,
  className = '',
  height = 52,
  color = DEFAULT_COLOR,
}: ConnectKpiSparklineProps) {
  const gradientId = useId().replace(/:/g, '')
  const width = 280
  const safeData = useMemo(() => {
    if (data.length >= 2) return data
    if (data.length === 1) return [data[0], data[0]]
    return [0, 0]
  }, [data])

  const { line, area } = useMemo(
    () => buildSparklinePaths(safeData, width, height),
    [safeData, height],
  )

  const gridLines = useMemo(() => {
    const count = 7
    return Array.from({ length: count }, (_, i) => ((i + 1) / (count + 1)) * width)
  }, [])

  const strokeProps = {
    fill: 'none' as const,
    stroke: color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }

  if (!line) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full ${className}`}
        preserveAspectRatio="none"
        aria-hidden
      />
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0.03} />
        </linearGradient>
      </defs>
      {gridLines.map((x) => (
        <line
          key={x}
          x1={x}
          x2={x}
          y1={0}
          y2={height}
          stroke={color}
          strokeOpacity={0.08}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={area} fill={`url(#${gradientId}-fill)`} />
      {/* Halo suave (sem feDropShadow — em stroke-only o filtro SVG some com a linha) */}
      <path d={line} {...strokeProps} strokeOpacity={0.2} strokeWidth={5} />
      <path d={line} {...strokeProps} strokeOpacity={0.85} strokeWidth={2} />
    </svg>
  )
}
