import React from 'react'

import BlackHoleCanvas from './BlackHoleCanvas'

// Define the types for the props
interface CircProgressBarProps {
  labels: string[]
  index: number // Current progress index (0-based)
  lineLength: number // Total length of the line from the circle edge
  segmentProportion: number // Proportion of the line that is the first segment
  onClick: () => void
}

const CircProgressBar: React.FC<CircProgressBarProps> = ({ labels, index, lineLength, segmentProportion, onClick }) => {
  const fontSize = 10
  const totalMeasures = labels.length
  const radius = 65 // Radius of the circle
  const svgSize = 400 // SVG canvas size to accommodate longer labels
  const viewBoxSize = svgSize / 2 // Adjust viewbox to keep circle centered
  const circumference = 2 * Math.PI * radius // Circumference of the circle
  // Calculate the stroke dash array for the progress, adjusted to the index + 1
  const dashArray = labels.length === 0 && index === 0 ? 0 : (index / totalMeasures) * circumference

  // Function to calculate line points and determine the side of the circle
  const calculateLinePoints = (idx: number, total: number, length: number) => {
    // Adjust the angle for symmetric label distribution
    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2 + Math.PI / total
    const isLeftHalf = angle > Math.PI / 2 && angle < (3 * Math.PI) / 2
    const isBottomHalf = angle > 0 && angle < Math.PI
    const startX = viewBoxSize + radius * Math.cos(angle)
    const startY = viewBoxSize + radius * Math.sin(angle)
    const endX = startX + (isLeftHalf ? -1 : 1) * length * Math.cos(Math.PI / 4)
    const endY = startY + (isBottomHalf ? 1 : -1) * length * Math.sin(Math.PI / 4)
    const horizontalEndX = endX + (isLeftHalf ? -1 : 1) * length
    const horizontalEndY = endY

    return { startX, startY, endX, endY, horizontalEndX, horizontalEndY, isLeftHalf }
  }

  return (
    <div className="flex justify-center items-center">
      <div className="relative flex justify-center items-center h-[400px] w-[400px]">
        {labels.length !== 0 || index !== 0 ? (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <BlackHoleCanvas width={svgSize / 2} height={svgSize / 2} />
          </div>
        ) : null}
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
          <circle cx={viewBoxSize} cy={viewBoxSize} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <g
            style={{
              cursor: 'pointer',
              transition: 'box-shadow 0.3s, transform 0.3s',
              transformOrigin: `${viewBoxSize}px ${viewBoxSize}px`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.filter = 'drop-shadow(0 0 1px #ef4444)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.filter = 'none'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <circle
              cx={viewBoxSize}
              cy={viewBoxSize}
              r={radius}
              fill="transparent"
              stroke="#ef4444"
              strokeWidth="10"
              strokeDasharray={`${dashArray} ${circumference}`}
              strokeLinecap={index > 0 ? 'round' : 'butt'}
              transform={`rotate(-90 ${viewBoxSize} ${viewBoxSize})`}
              onClick={(e) => {
                onClick()
              }}
            />
          </g>
          {/* Measure points, lines, and labels */}
          {labels.map((label, idx) => {
            const isReached = idx <= index - 1 // Check if the progress has reached this label
            const { startX, startY, endX, endY, horizontalEndX, horizontalEndY, isLeftHalf } = calculateLinePoints(
              idx,
              totalMeasures,
              lineLength * segmentProportion
            )

            return (
              <g key={idx}>
                {/* Line from the circle to the horizontal line */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={isReached ? '#ef4444' : '#000'}
                  strokeWidth="2"
                />
                {/* Horizontal line to the label */}
                <line
                  x1={endX}
                  y1={endY}
                  x2={horizontalEndX}
                  y2={horizontalEndY}
                  stroke={isReached ? '#ef4444' : '#000'}
                  strokeWidth="2"
                />
                {/* Label */}
                <text
                  className="select-none"
                  x={horizontalEndX}
                  y={horizontalEndY}
                  fill={isReached ? '#ef4444' : '#000'}
                  fontSize={fontSize}
                  textAnchor={isLeftHalf ? 'end' : 'start'}
                  dy=".3em"
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

export default CircProgressBar
