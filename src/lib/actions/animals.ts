'use server';

import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Animal } from '@/lib/types';

export async function getAnimals(userId: string): Promise<Animal[]> {
    try {
        const animals = await db`
      SELECT * FROM animals 
      WHERE farm_id IN (SELECT farm_id FROM user_farms WHERE user_id = (SELECT id FROM users WHERE uid = ${userId}))
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

export async function addAnimal(data: Partial<Animal>, farmId: string) {
    try {
        const id = uuidv4();
        const farmResult = await db`SELECT id FROM farms WHERE farm_id = ${farmId}`;
        const farmUuid = farmResult[0].id;

        await db`
      INSERT INTO animals (
        id, animal_id, farm_id, species, breed, dob, gender, status, purpose,
        last_pregnancy, weight, monthly_production, sickness, vaccinations, photo_url,
        seller_name, farm_name
      ) VALUES (
        ${id}, ${data.animalId || null}, ${farmUuid}, ${data.species || null}, ${data.breed || null}, ${data.dob || null},
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
