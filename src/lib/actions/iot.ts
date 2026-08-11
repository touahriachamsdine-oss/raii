'use server';

import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { IoTDevice, IoTReading, IoTDeviceWithAnimal } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function getDevices(farmId: string): Promise<IoTDeviceWithAnimal[]> {
    try {
        const resolvedFarm = await db`
            SELECT id FROM farms 
            WHERE id::text = ${farmId} OR farm_id = ${farmId}
        `;
        if (resolvedFarm.length === 0) return [];
        const farmUuid = resolvedFarm[0].id;

        const devices = await db`
            SELECT 
                d.*,
                a.animal_id as animal_name,
                a.species as animal_species,
                r.temperature as last_temperature,
                r.heart_rate as last_heart_rate,
                r.spo2 as last_spo2
            FROM iot_devices d
            LEFT JOIN animals a ON d.animal_id = a.id
            LEFT JOIN LATERAL (
                SELECT temperature, heart_rate, spo2
                FROM iot_readings
                WHERE device_id = d.device_id
                ORDER BY recorded_at DESC
                LIMIT 1
            ) r ON true
            WHERE d.farm_id = ${farmUuid}
            ORDER BY d.last_seen_at DESC NULLS LAST
        `;
        return devices as unknown as IoTDeviceWithAnimal[];
    } catch (error) {
        console.error("Failed to fetch IoT devices:", error);
        return [];
    }
}

export async function getDeviceDetail(deviceId: string): Promise<IoTDeviceWithAnimal | null> {
    try {
        const devices = await db`
            SELECT 
                d.*,
                a.animal_id as animal_name,
                a.species as animal_species
            FROM iot_devices d
            LEFT JOIN animals a ON d.animal_id = a.id
            WHERE d.device_id = ${deviceId}
            LIMIT 1
        `;
        if (devices.length === 0) return null;
        return devices[0] as unknown as IoTDeviceWithAnimal;
    } catch (error) {
        console.error("Failed to fetch device detail:", error);
        return null;
    }
}

export async function getDeviceReadings(deviceId: string, limit = 100): Promise<IoTReading[]> {
    try {
        const readings = await db`
            SELECT * FROM iot_readings
            WHERE device_id = ${deviceId}
            ORDER BY recorded_at DESC
            LIMIT ${limit}
        `;
        return readings.map(r => ({
            ...r,
            recorded_at: r.recorded_at instanceof Date ? r.recorded_at.toISOString() : String(r.recorded_at),
            created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        })) as unknown as IoTReading[];
    } catch (error) {
        console.error("Failed to fetch device readings:", error);
        return [];
    }
}

export async function registerDevice(deviceId: string, farmId?: string, name?: string) {
    try {
        let farmUuid: string;

        if (farmId) {
            const resolvedFarm = await db`
                SELECT id FROM farms 
                WHERE id::text = ${farmId} OR farm_id = ${farmId}
            `;
            if (resolvedFarm.length === 0) throw new Error("Farm not found");
            farmUuid = resolvedFarm[0].id;
        } else {
            const { getSession } = await import('@/lib/session');
            const session = await getSession();
            if (!session) throw new Error("Not authenticated");
            const userId = session.userId as string;
            const userFarms = await db`
                SELECT farm_id FROM user_farms
                WHERE user_id = (SELECT id FROM users WHERE uid = ${userId})
                LIMIT 1
            `;
            if (userFarms.length === 0) throw new Error("No farm found for user");
            farmUuid = userFarms[0].farm_id;
        }

        await db`
            INSERT INTO iot_devices (id, device_id, farm_id, animal_id, name)
            VALUES (${uuidv4()}, ${deviceId}, ${farmUuid}, NULL, ${name || null})
            ON CONFLICT (device_id) DO UPDATE SET
                farm_id = ${farmUuid},
                animal_id = iot_devices.animal_id,
                name = COALESCE(${name || null}, iot_devices.name)
        `;
        revalidatePath('/[locale]/iot');
        return { success: true };
    } catch (error) {
        console.error("Failed to register device:", error);
        throw error;
    }
}

export async function unlinkDevice(deviceId: string) {
    try {
        await db`
            UPDATE iot_devices SET animal_id = NULL WHERE device_id = ${deviceId}
        `;
        revalidatePath('/[locale]/iot');
        return { success: true };
    } catch (error) {
        console.error("Failed to unlink device:", error);
        throw error;
    }
}

export async function requestReading(deviceId: string) {
    try {
        await db`
            INSERT INTO iot_pending_commands (id, device_id, command, status)
            VALUES (${uuidv4()}, ${deviceId}, 'take_reading', 'pending')
        `;
        return { success: true };
    } catch (error) {
        console.error("Failed to request reading:", error);
        throw error;
    }
}

export async function linkDeviceToAnimal(deviceId: string, animalId: string) {
    try {
        await db`
            UPDATE iot_devices SET animal_id = ${animalId} WHERE device_id = ${deviceId}
        `;
        revalidatePath('/[locale]/iot');
        return { success: true };
    } catch (error) {
        console.error("Failed to link device to animal:", error);
        throw error;
    }
}

export async function getUnlinkedDevices(farmId: string): Promise<IoTDevice[]> {
    try {
        const resolvedFarm = await db`
            SELECT id FROM farms 
            WHERE id::text = ${farmId} OR farm_id = ${farmId}
        `;
        if (resolvedFarm.length === 0) return [];
        const farmUuid = resolvedFarm[0].id;

        const devices = await db`
            SELECT * FROM iot_devices
            WHERE farm_id = ${farmUuid} AND animal_id IS NULL
            ORDER BY created_at DESC
        `;
        return devices as unknown as IoTDevice[];
    } catch (error) {
        console.error("Failed to fetch unlinked devices:", error);
        return [];
    }
}

export async function getDevicesByAnimal(animalId: string): Promise<IoTDevice[]> {
    try {
        const devices = await db`
            SELECT * FROM iot_devices
            WHERE animal_id = ${animalId}
            ORDER BY created_at DESC
        `;
        return devices as unknown as IoTDevice[];
    } catch (error) {
        console.error("Failed to fetch devices for animal:", error);
        return [];
    }
}

export async function updateDeviceIp(deviceId: string, ipAddress: string) {
    try {
        const ip = ipAddress.trim();
        if (ip && !/^[\w.:\-\/]+$/.test(ip)) {
            throw new Error("Invalid IP address format");
        }
        await db`
            UPDATE iot_devices SET ip_address = ${ip || null} WHERE device_id = ${deviceId}
        `;
        revalidatePath('/[locale]/iot');
        return { success: true };
    } catch (error) {
        console.error("Failed to update device IP:", error);
        throw error;
    }
}

export async function getDevicesLive(): Promise<IoTDeviceWithAnimal[]> {
    try {
        const { getSession } = await import('@/lib/session');
        const session = await getSession();
        if (!session) return [];
        const userId = session.userId as string;
        const userFarms = await db`
            SELECT farm_id FROM user_farms
            WHERE user_id = (SELECT id FROM users WHERE uid = ${userId})
            LIMIT 1
        `;
        if (userFarms.length === 0) return [];
        return getDevices(userFarms[0].farm_id as string);
    } catch (error) {
        console.error("Failed to fetch live devices:", error);
        return [];
    }
}
