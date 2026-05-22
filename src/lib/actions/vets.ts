'use server';

import db from '@/lib/db';

export async function searchVets(query: string) {
    try {
        const vets = await db`
      SELECT u.* FROM users u
      WHERE u.role = 'vet'
      AND (
        u.display_name ILIKE ${'%' + query + '%'}
        OR u.email ILIKE ${'%' + query + '%'}
      )
    `;
        return vets.map(v => ({
            ...v,
            uid: v.uid,
            displayName: v.display_name,
            email: v.email,
            phoneNumber: v.phone_number
        }));
    } catch (error) {
        console.error("Failed to search vets:", error);
        return [];
    }
}

export async function assignVet(vetUid: string, farmId: string) {
    try {
        const userResult = await db`SELECT id FROM users WHERE uid = ${vetUid}`;
        
        // Resolve farm UUID robustly
        const farmResult = await db`
            SELECT id FROM farms 
            WHERE id::text = ${farmId} OR farm_id = ${farmId}
        `;

        if (userResult.length === 0 || farmResult.length === 0) {
            throw new Error("User or Farm not found");
        }

        await db`
      INSERT INTO user_farms (user_id, farm_id)
      VALUES (${userResult[0].id}, ${farmResult[0].id})
      ON CONFLICT DO NOTHING
    `;
        return { success: true };
    } catch (error) {
        console.error("Failed to assign vet:", error);
        throw error;
    }
}

export async function unassignVet(vetUid: string, farmId: string) {
    try {
        const userResult = await db`SELECT id FROM users WHERE uid = ${vetUid}`;
        
        // Resolve farm UUID robustly
        const farmResult = await db`
            SELECT id FROM farms 
            WHERE id::text = ${farmId} OR farm_id = ${farmId}
        `;

        if (userResult.length === 0 || farmResult.length === 0) {
            throw new Error("User or Farm not found");
        }

        await db`
      DELETE FROM user_farms
      WHERE user_id = ${userResult[0].id}
      AND farm_id = ${farmResult[0].id}
    `;
        return { success: true };
    } catch (error) {
        console.error("Failed to unassign vet:", error);
        throw error;
    }
}

export async function getAssignedVets(farmId: string) {
    try {
        // Resolve farm UUID robustly
        const resolvedFarm = await db`
            SELECT id FROM farms 
            WHERE id::text = ${farmId} OR farm_id = ${farmId}
        `;
        if (resolvedFarm.length === 0) {
            return [];
        }
        const farmUuid = resolvedFarm[0].id;

        const vets = await db`
            SELECT u.* FROM users u
            JOIN user_farms uf ON u.id = uf.user_id
            WHERE uf.farm_id = ${farmUuid} AND u.role = 'vet'
        `;
        return vets.map(v => ({
            ...v,
            uid: v.uid,
            displayName: v.display_name,
            email: v.email,
            phoneNumber: v.phone_number
        }));
    } catch (error) {
        console.error("Failed to fetch assigned vets:", error);
        return [];
    }
}
