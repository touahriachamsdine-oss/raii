'use server';

import db from '@/lib/db';

export async function getDashboardStats(farmId: string) {
    try {
        const statsResult = await db`
      SELECT
        COUNT(*) as total_animals,
        COUNT(*) FILTER (WHERE status = 'Active') as active_animals,
        COUNT(*) FILTER (WHERE status = 'Deceased') as deceased_animals,
        COALESCE(SUM(milk_yield_avg_l), 0) as total_milk_yield
      FROM animals
      WHERE farm_id = (SELECT id FROM farms WHERE farm_id = ${farmId})
    `;

        const stats = statsResult[0];

        const speciesBreakdown = await db`
      SELECT species, COUNT(*) as count
      FROM animals
      WHERE farm_id = (SELECT id FROM farms WHERE farm_id = ${farmId})
      AND status = 'Active'
      GROUP BY species
    `;

        const openAlertsCount = await db`
      SELECT COUNT(*) as count FROM alerts
      WHERE farm_id = (SELECT id FROM farms WHERE farm_id = ${farmId})
      AND status = 'open'
    `;

        const reproductionCount = await db`
      SELECT COUNT(*) as count FROM animals
      WHERE farm_id = (SELECT id FROM farms WHERE farm_id = ${farmId})
      AND last_pregnancy_date > now() - interval '1 year'
    `;

        const vaccinationsDueCount = await db`
      SELECT COUNT(*) as count FROM animals
      WHERE farm_id = (SELECT id FROM farms WHERE farm_id = ${farmId})
      AND vaccination_due_on <= now() + interval '7 days'
    `;

        const recentConsultations = await db`
      SELECT c.*, a.name as animal_name
      FROM consultations c
      JOIN animals a ON c.animal_id = a.id
      WHERE a.farm_id = (SELECT id FROM farms WHERE farm_id = ${farmId})
      ORDER BY c.created_at DESC
      LIMIT 5
    `;

        const recentAlerts = await db`
      SELECT * FROM alerts
      WHERE farm_id = (SELECT id FROM farms WHERE farm_id = ${farmId})
      ORDER BY created_at DESC
      LIMIT 5
    `;

        return {
            totalAnimals: Number(stats.total_animals),
            activeAnimals: Number(stats.active_animals),
            deceasedAnimals: Number(stats.deceased_animals),
            totalMilkYield: Number(stats.total_milk_yield),
            speciesBreakdown: speciesBreakdown.reduce((acc: any, row: any) => {
                acc[row.species] = Number(row.count);
                return acc;
            }, {}),
            openAlertsCount: Number(openAlertsCount[0].count),
            reproductionCount: Number(reproductionCount[0].count),
            vaccinationsDueCount: Number(vaccinationsDueCount[0].count),
            recentConsultations: recentConsultations.map(c => ({
                ...c,
                id: c.id,
                animalName: c.animal_name,
                professionalNotes: c.professional_notes,
                createdAt: c.created_at
            })),
            recentAlerts: recentAlerts.map(a => ({
                ...a,
                id: a.id,
                createdAt: a.created_at
            }))
        };
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        return null;
    }
}
