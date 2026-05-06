'use server';

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function getFarms() {
    try {
        const farms = await sql`
      SELECT id, name, country, timezone
      FROM farms
      ORDER BY name ASC
    `;
        return farms;
    } catch (error) {
        console.error('Failed to fetch farms:', error);
        throw new Error('Failed to fetch farms.');
    }
}

export async function getFarmDetails(farmId: string) {
    try {
        const farm = await sql`
      SELECT id, name, country, timezone
      FROM farms
      WHERE id = ${farmId}
    `;

        const users = await sql`
      SELECT u.id, u.display_name as "displayName", u.email, u.role
      FROM users u
      JOIN farm_users fu ON u.id = fu.user_id
      WHERE fu.farm_id = ${farmId}
    `;

        const animals = await sql`
      SELECT id, species, breed, dob, gender, status
      FROM animals
      WHERE farm_id = ${farmId}
      ORDER BY id ASC
    `;

        return {
            farm: farm[0] || null,
            users,
            animals
        };
    } catch (error) {
        console.error('Failed to fetch farm details:', error);
        throw new Error('Failed to fetch farm details.');
    }
}
