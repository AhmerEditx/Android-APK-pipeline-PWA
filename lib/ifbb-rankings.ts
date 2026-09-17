export type IFBBRank = {
  rank: 1 | 2 | 3
  name: string
  note: string
}

export const IFBB_TOP3: Record<string, IFBBRank[]> = {
  Chest: [
    { rank: 1, name: 'Barbell Bench Press', note: 'Heavy compound pressing — the number one chest mass builder.' },
    { rank: 2, name: 'Incline Dumbbell Press', note: 'Overloads the upper chest for a fuller, complete pec.' },
    { rank: 3, name: 'Dumbbell Fly', note: 'Deep stretch with maximal pec adduction and isolation.' },
  ],
  Shoulders: [
    { rank: 1, name: 'Standing Overhead Press', note: 'Total shoulder strength and packed-on delt mass.' },
    { rank: 2, name: 'Seated Dumbbell Shoulder Press', note: 'Longer range of motion hits all three delt heads.' },
    { rank: 3, name: 'Lateral Raise', note: 'Unmatched isolation for side-delt width.' },
  ],
  Triceps: [
    { rank: 1, name: 'Close-Grip Bench Press', note: 'Heavy elbow extension loading all three heads.' },
    { rank: 2, name: 'Skull Crusher', note: 'Peak-stretch isolation that builds triceps mass.' },
    { rank: 3, name: 'Triceps Pushdown', note: 'Constant-tension isolation to finish the triceps.' },
  ],
  Back: [
    { rank: 1, name: 'Deadlift', note: 'The king of back thickness and posterior-chain strength.' },
    { rank: 2, name: 'Pull-Up', note: 'Best upper-back and lat width builder — weighted or bodyweight.' },
    { rank: 3, name: 'Barbell Row', note: 'Heavy load that thickens the mid and upper back.' },
  ],
  Biceps: [
    { rank: 1, name: 'Barbell Curl', note: 'The foundational biceps mass movement.' },
    { rank: 2, name: 'Incline Dumbbell Curl', note: 'Long-head stretch for that peak.' },
    { rank: 3, name: 'Hammer Curl', note: 'Builds the brachialis for forearm-to-biceps width.' },
  ],
  Forearms: [
    { rank: 1, name: 'Wrist Curl', note: 'Direct forearm flexion and carryover to pressing.' },
    { rank: 2, name: 'Reverse Wrist Curl', note: 'Trains the extensors for balanced forearms.' },
    { rank: 3, name: 'Farmers Carry', note: 'Builds brutal grip strength and forearm endurance.' },
  ],
  Quads: [
    { rank: 1, name: 'Back Squat', note: 'The ultimate lower-body mass builder.' },
    { rank: 2, name: 'Front Squat', note: 'Emphasizes the quads and core under load.' },
    { rank: 3, name: 'Bulgarian Split Squat', note: 'Single-leg quad overload with a long range of motion.' },
  ],
  Hamstrings: [
    { rank: 1, name: 'Romanian Deadlift', note: 'Lengthening-under-load — the best hamstring builder.' },
    { rank: 2, name: 'Stiff-Leg Deadlift', note: 'A deeper hip-hinge for maximum hamstring stretch.' },
    { rank: 3, name: 'Leg Curl', note: 'Direct isolation of the biceps femoris.' },
  ],
  Glutes: [
    { rank: 1, name: 'Hip Thrust', note: 'Peak glute activation in loaded hip extension.' },
    { rank: 2, name: 'Glute Bridge', note: 'High glute activation, easy to load anywhere.' },
    { rank: 3, name: 'Cable Kickback', note: 'Isolates the glutes through full extension.' },
  ],
  Calves: [
    { rank: 1, name: 'Standing Calf Raise', note: 'Loads the gastrocnemius through a full, deep stretch.' },
    { rank: 2, name: 'Seated Calf Raise', note: 'Isolates the soleus for calf thickness.' },
    { rank: 3, name: 'Leg Press Calf Raise', note: 'Heavy calf loading inside the leg press.' },
  ],
  Abs: [
    { rank: 1, name: 'Plank', note: 'The safe core-stability staple.' },
    { rank: 2, name: 'Hanging Leg Raise', note: 'Lower abs trained through spinal decompression.' },
    { rank: 3, name: 'Cable Crunch', note: 'Constant-tension upper-abdominal flexion.' },
  ],
}

export function ifbbRankFor(muscleGroup: string, name: string): IFBBRank | null {
  const ranks = IFBB_TOP3[muscleGroup]
  if (!ranks) return null
  return ranks.find((r) => r.name.toLowerCase() === name.trim().toLowerCase()) ?? null
}