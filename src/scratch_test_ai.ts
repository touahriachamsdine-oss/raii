import { symptomTriage } from './ai/flows/symptom-triage';
import { config } from 'dotenv';
config();

async function runTest() {
  console.log('Running AI triage test locally...');
  try {
    const result = await symptomTriage({
      species: 'bovine',
      symptoms: ['coughing', 'fever', 'lethargy'],
    });
    console.log('AI Triage Result Success:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('AI Triage Result Failure:', err);
  }
}

runTest();
