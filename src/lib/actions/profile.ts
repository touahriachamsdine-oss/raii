import db from '@/lib/db';
import { UserProfile } from '@/lib/types';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const users = await db`
      SELECT u.*, array_agg(uf.farm_id) as farm_ids
      FROM users u
      LEFT JOIN user_farms uf ON u.id = uf.user_id
      WHERE u.uid = ${uid}
      GROUP BY u.id
    `;
        if (users.length === 0) return null;

        const user = users[0];
        return {
            id: user.id,
            uid: user.uid,
            displayName: user.display_name,
            firstName: user.first_name,
            lastName: user.last_name,
            familyName: user.family_name,
            phoneNumber: user.phone_number,
            idCardNumber: user.id_card_number,
            email: user.email,
            role: user.role,
            wilaya: user.wilaya,
            commune: user.commune,
            address: user.address,
            farmIds: user.farm_ids.filter((id: string | null) => id !== null)
        };
    } catch (error) {
        console.error("Failed to fetch user profile:", error);
        return null;
    }
}

export async function updateUserProfile(uid: string, data: any) {
    try {
        await db`
      UPDATE users SET
        first_name = ${data.firstName},
        last_name = ${data.lastName},
        display_name = ${data.firstName + ' ' + data.lastName},
        family_name = ${data.familyName || null},
        wilaya = ${data.wilaya},
        commune = ${data.commune},
        address = ${data.address},
        id_card_number = ${data.idCardNumber || null},
        phone_number = ${data.phoneNumber},
        updated_at = now()
      WHERE uid = ${uid}
    `;
        return { success: true };
    } catch (error) {
        console.error("Failed to update user profile:", error);
        throw error;
    }
}
