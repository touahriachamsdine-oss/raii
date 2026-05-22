'use server';

import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Animal } from '@/lib/types';

export async function getAnimals(farmIdOrUserId: string): Promise<Animal[]> {
    try {
        // Resolve farm UUID robustly: can be farms.id, farms.farm_id, or user's Auth uid
        const resolvedFarm = await db`
            SELECT id FROM farms 
            WHERE id::text = ${farmIdOrUserId} 
               OR farm_id = ${farmIdOrUserId}
               OR id IN (
                   SELECT farm_id FROM user_farms 
                   WHERE user_id = (SELECT id FROM users WHERE uid = ${farmIdOrUserId})
               )
        `;

        if (resolvedFarm.length === 0) {
            return [];
        }

        const farmUuid = resolvedFarm[0].id;
        const animals = await db`
            SELECT * FROM animals 
            WHERE farm_id = ${farmUuid}
        `;

        return animals.map(a => ({
            ...a,
            id: a.id,
            animalId: a.animal_id,
            species: a.species,
            breed: a.breed,
            dob: a.dob,
            gender: a.gender,
            status: a.status,
            purpose: a.purpose,
            farmId: a.farm_id,
            lastPregnancy: a.last_pregnancy,
            monthlyProduction: a.monthly_production,
            photoUrl: a.photo_url,
            sellerName: a.seller_name,
            farmName: a.farm_name,
            vaccinationDueOn: a.vaccination_due_on,
            milkYieldAvgL: a.milk_yield_avg_l,
            lastPregnancyDate: a.last_pregnancy_date
        })) as Animal[];
    } catch (error) {
        console.error("Failed to fetch animals:", error);
        return [];
    }
}

export async function addAnimal(data: Partial<Animal>, farmIdOrUserId: string) {
    try {
        const id = uuidv4();
        
        // Resolve farm UUID robustly
        const resolvedFarm = await db`
            SELECT id FROM farms 
            WHERE id::text = ${farmIdOrUserId} 
               OR farm_id = ${farmIdOrUserId}
               OR id IN (
                   SELECT farm_id FROM user_farms 
                   WHERE user_id = (SELECT id FROM users WHERE uid = ${farmIdOrUserId})
               )
        `;

        if (resolvedFarm.length === 0) {
            throw new Error(`Farm with identifier ${farmIdOrUserId} not found`);
        }
        const farmUuid = resolvedFarm[0].id;

        // Auto-generate standard unique animal ID with collision protection
        let animalId: string = data.animalId || '';
        if (!animalId) {
            let isUnique = false;
            while (!isUnique) {
                const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
                animalId = `AN-${randomSuffix}`;
                const existing = await db`SELECT 1 FROM animals WHERE animal_id = ${animalId}`;
                if (existing.length === 0) {
                    isUnique = true;
                }
            }
        }

        await db`
      INSERT INTO animals (
        id, animal_id, farm_id, species, breed, dob, gender, status, purpose,
        last_pregnancy, weight, monthly_production, sickness, vaccinations, photo_url,
        seller_name, farm_name
      ) VALUES (
        ${id}, ${animalId}, ${farmUuid}, ${data.species || null}, ${data.breed || null}, ${data.dob || null},
        ${data.gender || null}, ${data.status || null}, ${data.purpose || null}, ${data.lastPregnancy || null},
        ${data.weight || null}, ${data.monthlyProduction || null}, ${data.sickness || null},
        ${data.vaccinations || null}, ${data.photoUrl || null}, ${data.sellerName || null},
        ${data.farmName || null}
      )
    `;
        return { success: true, id };
    } catch (error) {
        console.error("Failed to add animal:", error);
        throw error;
    }
}

export async function updateAnimal(id: string, data: Partial<Animal>) {
    try {
        await db`
      UPDATE animals SET
        species = ${data.species || null},
        breed = ${data.breed || null},
        dob = ${data.dob || null},
        gender = ${data.gender || null},
        status = ${data.status || null},
        purpose = ${data.purpose || null},
        last_pregnancy = ${data.lastPregnancy || null},
        weight = ${data.weight || null},
        monthly_production = ${data.monthlyProduction || null},
        sickness = ${data.sickness || null},
        vaccinations = ${data.vaccinations || null},
        photo_url = ${data.photoUrl || null},
        updated_at = now()
      WHERE id = ${id}
    `;
        return { success: true };
    } catch (error) {
        console.error("Failed to update animal:", error);
        throw error;
    }
}

export async function deleteAnimal(id: string) {
    try {
        await db`DELETE FROM animals WHERE id = ${id}`;
        return { success: true };
    } catch (error) {
        console.error("Failed to delete animal:", error);
        throw error;
    }
}
