import type { ScheduleSlot } from '@/lib/schedule'

export type Profile = {
  id: string
  full_name: string | null
  height_cm: number | null
  email: string | null
  is_admin: boolean
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
  plan_day_id: string | null
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

export type Plan = {
  id: string
  name: string
  description: string | null
  days_count: number
  is_public: boolean
  owner_id: string | null
  created_at: string
}

export type PlanDay = {
  id: string
  plan_id: string
  name: string
  position: number
}

export type PlanDayExercise = {
  id: string
  plan_day_id: string
  exercise_id: string
  position: number
  prescribed_sets: number
  prescribed_reps: string | null
  target_weight: string | null
}

export type UserPlan = {
  id: string
  user_id: string
  plan_id: string
  starts_on: string
  active: boolean
  schedule: ScheduleSlot[] | null
  created_at: string
}

export type UserPlanExercise = {
  id: string
  user_id: string
  user_plan_id: string
  plan_day_id: string
  exercise_id: string
  position: number
  prescribed_sets: number
  prescribed_reps: string | null
  target_weight: string | null
}

export type Message = {
  id: string
  recipient_id: string
  subject: string
  body: string
  created_at: string
  read_at: string | null
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
          email?: string | null
          is_admin?: boolean
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
          plan_day_id?: string | null
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
      plans: {
        Row: Plan
        Insert: {
          id?: string
          name: string
          description?: string | null
          days_count: number
          is_public?: boolean
          owner_id?: string | null
          created_at?: string
        }
        Update: Partial<Plan>
        Relationships: []
      }
      plan_days: {
        Row: PlanDay
        Insert: {
          id?: string
          plan_id: string
          name: string
          position?: number
        }
        Update: Partial<PlanDay>
        Relationships: []
      }
      plan_day_exercises: {
        Row: PlanDayExercise
        Insert: {
          id?: string
          plan_day_id: string
          exercise_id: string
          position?: number
          prescribed_sets?: number
          prescribed_reps?: string | null
          target_weight?: string | null
        }
        Update: Partial<PlanDayExercise>
        Relationships: []
      }
      user_plans: {
        Row: UserPlan
        Insert: {
          id?: string
          user_id?: string
          plan_id: string
          starts_on?: string
          active?: boolean
          schedule?: ScheduleSlot[] | null
          created_at?: string
        }
        Update: Partial<UserPlan>
        Relationships: []
      }
      user_plan_exercises: {
        Row: UserPlanExercise
        Insert: {
          id?: string
          user_id?: string
          user_plan_id: string
          plan_day_id: string
          exercise_id: string
          position?: number
          prescribed_sets?: number
          prescribed_reps?: string | null
          target_weight?: string | null
        }
        Update: Partial<UserPlanExercise>
        Relationships: []
      }
      messages: {
        Row: Message
        Insert: {
          id?: string
          recipient_id: string
          subject: string
          body: string
          created_at?: string
          read_at?: string | null
        }
        Update: Partial<Message>
        Relationships: []
      }
    }
    Views: { [key: string]: never }
    Functions: { [key: string]: never }
    Enums: { [key: string]: never }
  }
}