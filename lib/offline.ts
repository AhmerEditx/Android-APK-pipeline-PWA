export type OfflineSet = {
  set_number: number
  weight_kg: number | null
  reps: number | null
  is_warmup?: boolean
}

export type OfflineExercise = {
  weId: string
  exercise_id: string
  position: number
  sets: OfflineSet[]
}

export type OfflineWorkout = {
  workoutId: string
  date: string
  notes: string | null
  plan_day_id: string | null
  exercises: OfflineExercise[]
  queuedAt: string
}

const KEY = 'irontrack.pendingWorkouts'
const CHANGE_EVENT = 'irontrack:pending-changed'

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function readQueue(): OfflineWorkout[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(list: OfflineWorkout[]) {
  try {
    if (list.length === 0) {
      localStorage.removeItem(KEY)
    } else {
      localStorage.setItem(KEY, JSON.stringify(list))
    }
  } catch {
    // storage full or unavailable — nothing we can do here
  }
}

function notify() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
}

export function getPendingWorkouts(): OfflineWorkout[] {
  return readQueue()
}

export function getPendingCount(): number {
  return readQueue().length
}

export function addPendingWorkout(workout: OfflineWorkout): void {
  const list = readQueue()
  list.push(workout)
  writeQueue(list)
  notify()
}

export function removePendingWorkout(workoutId: string): void {
  const next = readQueue().filter((w) => w.workoutId !== workoutId)
  writeQueue(next)
  notify()
}

export function subscribePending(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb)
  return () => window.removeEventListener(CHANGE_EVENT, cb)
}

export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return /fetch|network|load failed|net::|ECONN|Unexpected end|failed to connect|offline/i.test(err.message)
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}