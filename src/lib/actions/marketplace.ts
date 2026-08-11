'use server';

import db from '@/lib/db';

export type ForSaleAnimal = {
    id: string;
    animalId: string;
    species: string;
    breed: string;
    dob: string;
    gender: 'Male' | 'Female';
    purpose: 'Meat' | 'Milk' | 'Other';
    weight?: string;
    images?: string[];
    createdAt: string;
};

export async function getForSaleAnimals() {
    try {
        const animals = await db`
      SELECT * FROM for_sale ORDER BY created_at DESC
    `;

        return animals.map((a: any) => ({
            ...a,
            id: a.id,
            animalId: a.animal_id,
            createdAt: a.created_at
                ? (a.created_at instanceof Date ? a.created_at.toISOString() : String(a.created_at))
                : '',
        })) as ForSaleAnimal[];
    } catch (error) {
        console.error("Failed to fetch for-sale animals:", error);
        return [];
    }
}
