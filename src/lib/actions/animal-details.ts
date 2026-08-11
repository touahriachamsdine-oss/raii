'use server';

import db from '@/lib/db';

export async function getAnimalDetails(animalId: string) {
    try {
        const animalResult = await db`
      SELECT * FROM animals WHERE id = ${animalId}
    `;
        if (animalResult.length === 0) return null;

        const animal = animalResult[0];

        const healthLogs = await db`
            SELECT * FROM health_logs 
            WHERE animal_id = ${animalId} 
            ORDER BY date DESC
        `;

        const productionLogs = await db`
            SELECT * FROM production_logs 
            WHERE animal_id = ${animalId} 
            ORDER BY date DESC
        `;

        const breedingRecords = await db`
            SELECT * FROM breeding_records 
            WHERE animal_id = ${animalId} 
            ORDER BY date DESC
        `;

        const vaccinations = await db`
            SELECT * FROM vaccination_schedules 
            WHERE animal_id = ${animalId} 
            ORDER BY planned_date ASC
        `;

        return {
            ...animal,
            id: animal.id,
            animalId: animal.animal_id,
            healthLogs: healthLogs.map(l => ({
                id: l.id,
                animalId: l.animal_id,
                eventType: l.event_type,
                description: l.description,
                date: l.date,
                cost: l.cost,
                medication: l.medication,
                notes: l.notes
            })),
            productionLogs: productionLogs.map(l => ({
                id: l.id,
                animalId: l.animal_id,
                date: l.date,
                metricType: l.metric_type,
                value: l.value,
                unit: l.unit
            })),
            breedingRecords: breedingRecords.map(r => ({
                id: r.id,
                animalId: r.animal_id,
                sireId: r.sire_id,
                eventType: r.event_type,
                date: r.date,
                result: r.result,
                expectedDueDate: r.expected_due_date
            })),
            vaccinations: vaccinations.map(v => ({
                id: v.id,
                animalId: v.animal_id,
                vaccineName: v.vaccine_name,
                plannedDate: v.planned_date,
                status: v.status,
                notes: v.notes
            }))
        };
    } catch (error) {
        console.error("Failed to fetch animal details:", error);
        return null;
    }
}

export async function addConsultation(data: any) {
    try {
        const result = await db`
      INSERT INTO consultations (
        animal_id, doctor_id, diagnosis, professional_notes, treatment_plan, follow_up_date
      ) VALUES (
        ${data.animalId}, ${data.doctorId}, ${data.diagnosis}, ${data.professionalNotes}, ${data.treatmentPlan || null}, ${data.followUpDate || null}
      ) RETURNING id
    `;
        return { success: true, id: result[0].id };
    } catch (error) {
        console.error("Failed to add consultation:", error);
        throw error;
    }
}
