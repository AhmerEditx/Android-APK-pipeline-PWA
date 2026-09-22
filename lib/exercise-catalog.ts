import type { SupabaseClient } from '@supabase/supabase-js'

const CATALOG_SELECT = 'id, name, muscle_group, equipment, primary_muscle'

export type CatalogExerciseRow = {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
  primary_muscle: string | null
}

export async function fetchExerciseCatalog(
  supabase: SupabaseClient
): Promise<CatalogExerciseRow[]> {
  const all: CatalogExerciseRow[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select(CATALOG_SELECT)
      .order('name')
      .range(from, from + 999)
    if (error) break
    if (!data || data.length === 0) break
    all.push(...data)
    from += data.length
    if (data.length < 1000) break
  }
  return all
}