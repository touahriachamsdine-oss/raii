'use server';
/**
 * @fileOverview A symptom triage AI agent for livestock.
 *
 * - symptomTriage - A function that handles the symptom triage process.
 * - SymptomTriageInput - The input type for the symptomTriage function.
 * - SymptomTriageOutput - The return type for the symptomTriage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SymptomTriageInputSchema = z.object({
  species: z.string().describe('The species of the animal (e.g., bovine, ovine, caprine).'),
  symptoms: z.array(z.string()).describe('A list of symptoms observed in the animal.'),
});
export type SymptomTriageInput = z.infer<typeof SymptomTriageInputSchema>;

const LikelyCauseSchema = z.object({
  name: z.string().describe('The name of the likely condition.'),
  confidence: z.number().describe('A confidence level (0-1) for the likelihood of this condition.'),
  why: z.string().describe('Explanation of why this condition is likely, given the symptoms.'),
});

const SymptomTriageOutputSchema = z.object({
  likelyCauses: z.array(LikelyCauseSchema).describe('A list of likely conditions with confidence levels and explanations.'),
  recommendedActions: z.array(z.string()).describe('Recommended actions to take based on the symptoms and likely conditions.'),
  urgency: z.string().describe('An assessment of the urgency of the situation (e.g., low, medium, high).'),
});
export type SymptomTriageOutput = z.infer<typeof SymptomTriageOutputSchema>;

export async function symptomTriage(input: SymptomTriageInput): Promise<SymptomTriageOutput> {
  return symptomTriageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'symptomTriagePrompt',
  input: {schema: SymptomTriageInputSchema},
  output: {schema: SymptomTriageOutputSchema},
  prompt: `You are an AI assistant that helps vets and farm workers triage livestock symptoms.

You will be given the species of the animal and a list of symptoms. You should respond with a list of likely conditions, a confidence level for each condition, and an explanation of why the condition is likely.

You should also provide a list of recommended actions to take, and an assessment of the urgency of the situation.

Species: {{{species}}}
Symptoms: {{#each symptoms}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Please remember that this is not medical advice, and a veterinarian should always be consulted for diagnosis and treatment.
`,
});

const symptomTriageFlow = ai.defineFlow(
  {
    name: 'symptomTriageFlow',
    inputSchema: SymptomTriageInputSchema,
    outputSchema: SymptomTriageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
