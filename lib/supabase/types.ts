export type Profile = {
  id: string
  full_name: string | null
  height_cm: number | null
  created_at: string
  updated_at: string
}

export type Exercise = {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
  primary_muscle: string | null
  instructions: string | null
}

export type Workout = {
  id: string
  user_id: string
  date: string
  notes: string | null
  created_at: string
}

export type WorkoutExercise = {
  id: string
  workout_id: string
  exercise_id: string
  position: number
}

export type LoggedSet = {
  id: string
  workout_exercise_id: string
  set_number: number
  weight_kg: number | null
  reps: number | null
  is_warmup: boolean
}

export type BodyMeasurement = {
  id: string
  user_id: string
  measured_on: string
  weight_kg: number
  body_fat_pct: number | null
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          full_name?: string | null
          height_cm?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Profile>
        Relationships: []
      }
      exercises: {
        Row: Exercise
        Insert: {
          id?: string
          name: string
          muscle_group: string
          equipment?: string | null
          primary_muscle?: string | null
          instructions?: string | null
        }
        Update: Partial<Exercise>
        Relationships: []
      }
      workouts: {
        Row: Workout
        Insert: {
          id?: string
          user_id?: string
          date?: string
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Workout>
        Relationships: []
      }
      workout_exercises: {
        Row: WorkoutExercise
        Insert: {
          id?: string
          workout_id: string
          exercise_id: string
          position?: number
        }
        Update: Partial<WorkoutExercise>
        Relationships: []
      }
      sets: {
        Row: LoggedSet
        Insert: {
          id?: string
          workout_exercise_id: string
          set_number: number
          weight_kg?: number | null
          reps?: number | null
          is_warmup?: boolean
        }
        Update: Partial<LoggedSet>
        Relationships: []
      }
      body_measurements: {
        Row: BodyMeasurement
        Insert: {
          id?: string
          user_id?: string
          measured_on?: string
          weight_kg: number
          body_fat_pct?: number | null
        }
        Update: Partial<BodyMeasurement>
        Relationships: []
      }
    }
    Views: { [key: string]: never }
    Functions: { [key: string]: never }
    Enums: { [key: string]: never }
  }
}