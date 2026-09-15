'use client'

import { useState } from 'react'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function daysIn(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

export default function Win11Calendar() {
  const today = new Date()
  const [cy, setCy] = useState(today.getFullYear())
  const [cm, setCm] = useState(today.getMonth())
  const [sel, setSel] = useState(iso(today.getFullYear(), today.getMonth(), today.getDate()))
  const [mins, setMins] = useState(30)

  const di = daysIn(cy, cm)
  const fd = firstDay(cy, cm)

  const prevM = cm === 0 ? 11 : cm - 1
  const prevY = cm === 0 ? cy - 1 : cy
  const prevDi = daysIn(prevY, prevM)

  const nextM = cm === 11 ? 0 : cm + 1
  const nextY = cm === 11 ? cy + 1 : cy

  const cells: Array<{ day: number; m: number; y: number; dim: 'prev' | 'curr' | 'next' }> = []

  for (let i = fd - 1; i >= 0; i--) {
    cells.push({ day: prevDi - i, m: prevM, y: prevY, dim: 'prev' })
  }
  for (let d = 1; d <= di; d++) {
    cells.push({ day: d, m: cm, y: cy, dim: 'curr' })
  }
  for (let d = 1; cells.length < 42; d++) {
    cells.push({ day: d, m: nextM, y: nextY, dim: 'next' })
  }

  const todayStr = iso(today.getFullYear(), today.getMonth(), today.getDate())
  const monthLabel = new Date(cy, cm).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const dayName = today.toLocaleString('en-US', { weekday: 'long' })
  const dayDate = today.toLocaleString('en-US', { month: 'long', day: 'numeric' })

  function prev() { if (cm === 0) { setCm(11); setCy(y => y - 1) } else setCm(m => m - 1) }
  function next() { if (cm === 11) { setCm(0); setCy(y => y + 1) } else setCm(m => m + 1) }

  return (
    <div className="w-[340px] rounded-xl border border-white/10 bg-neutral-900/80 p-5 text-white shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-white/90">{dayName}</p>
          <p className="text-sm text-white/60">{dayDate}</p>
        </div>
        <button className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white/90">
          <ChevronDownIcon />
        </button>
      </div>
      <div className="mt-3 border-b border-white/10" />

      {/* Month nav */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-white/90">{monthLabel}</p>
        <div className="flex gap-1">
          <button onClick={prev} className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white/90">
            <ChevronLeftIcon />
          </button>
          <button onClick={next} className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white/90">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-sm">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-[11px] font-bold text-white/40">{d}</div>
        ))}
        {cells.map((c, i) => {
          const dateStr = iso(c.y, c.m, c.day)
          const active = dateStr === sel && c.dim === 'curr'
          const isToday = dateStr === todayStr
          return (
            <button
              key={i}
              onClick={() => setSel(dateStr)}
              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[13px] transition-colors ${
                active
                  ? 'bg-[#f48a72] font-semibold text-white'
                  : c.dim !== 'curr'
                    ? 'text-neutral-500 hover:bg-white/10'
                    : 'text-white/80 hover:bg-white/10'
              } ${isToday && !active ? 'ring-1 ring-white/30' : ''}`}
            >
              {c.day}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMins((m) => Math.max(5, m - 5))}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90"
          >
            <MinusIcon />
          </button>
          <span className="w-14 text-center text-xs text-white/70">{mins} mins</span>
          <button
            onClick={() => setMins((m) => m + 5)}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90"
          >
            <PlusIcon />
          </button>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white">
          <PlayIcon />
          Focus
        </button>
      </div>
    </div>
  )
}
