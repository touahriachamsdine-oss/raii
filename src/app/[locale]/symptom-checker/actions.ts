'use server';

import { symptomTriage, type SymptomTriageInput, type SymptomTriageOutput } from '@/ai/flows/symptom-triage';

export type SymptomTriageResult = 
  | { ok: true; data: SymptomTriageOutput }
  | { ok: false; error: string };

export async function getSymptomTriage(input: SymptomTriageInput): Promise<SymptomTriageResult> {
  try {
    const result = await symptomTriage(input);
    return { ok: true, data: result };
  } catch (error) {
    console.error('Error in symptom triage:', error);
    if (error instanceof Error) {
        return { ok: false, error: error.message };
    }
    return { ok: false, error: 'Failed to get symptom triage analysis from the AI model.' };
  }
}
