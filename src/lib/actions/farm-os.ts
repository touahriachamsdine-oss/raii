'use server';

import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { HealthLog, ProductionLog, BreedingRecord, FeedInventory, VaccinationSchedule } from '@/lib/types';
import { revalidatePath } from 'next/cache';

// --- Health Logs ---

export async function getHealthLogs(animalId: string): Promise<HealthLog[]> {
    try {
        const logs = await db`
            SELECT * FROM health_logs 
            WHERE animal_id = ${animalId} 
            ORDER BY date DESC
        `;
        return logs.map(l => ({
            id: l.id,
            animalId: l.animal_id,
            eventType: l.event_type,
            description: l.description,
            date: l.date,
            cost: l.cost,
            medication: l.medication,
            notes: l.notes
        })) as HealthLog[];
    } catch (error) {
        console.error("Failed to fetch health logs:", error);
        return [];
    }
}

export async function addHealthLog(data: Partial<HealthLog>) {
    try {
        const id = uuidv4();
        await db`
            INSERT INTO health_logs (
                id, animal_id, event_type, description, date, cost, medication, notes
            ) VALUES (
                ${id}, ${data.animalId ?? null}, ${data.eventType ?? null}, ${data.description ?? null}, 
                ${data.date ?? null}, ${data.cost ?? null}, ${data.medication ?? null}, ${data.notes ?? null}
            )
        `;
        revalidatePath('/[locale]/animal/[animalId]', 'page');
        return { success: true, id };
    } catch (error) {
        console.error("Failed to add health log:", error);
        throw error;
    }
}

export async function deleteHealthLog(id: string) {
    try {
        await db`DELETE FROM health_logs WHERE id = ${id}`;
        revalidatePath('/[locale]/animal/[animalId]', 'page');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete health log:", error);
        throw error;
    }
}

// --- Production Logs ---

export async function getProductionLogs(animalId: string): Promise<ProductionLog[]> {
    try {
        const logs = await db`
            SELECT * FROM production_logs 
            WHERE animal_id = ${animalId} 
            ORDER BY date DESC
        `;
        return logs.map(l => ({
            id: l.id,
            animalId: l.animal_id,
            date: l.date,
            metricType: l.metric_type,
            value: l.value,
            unit: l.unit
        })) as ProductionLog[];
    } catch (error) {
        console.error("Failed to fetch production logs:", error);
        return [];
    }
}

export async function addProductionLog(data: Partial<ProductionLog>) {
    try {
        const id = uuidv4();
        await db`
            INSERT INTO production_logs (
                id, animal_id, date, metric_type, value, unit
            ) VALUES (
                ${id}, ${data.animalId ?? null}, ${data.date ?? null}, ${data.metricType ?? null}, ${data.value ?? null}, ${data.unit ?? null}
            )
        `;
        revalidatePath('/[locale]/animal/[animalId]', 'page');
        return { success: true, id };
    } catch (error) {
        console.error("Failed to add production log:", error);
        throw error;
    }
}

export async function deleteProductionLog(id: string) {
    try {
        await db`DELETE FROM production_logs WHERE id = ${id}`;
        revalidatePath('/[locale]/animal/[animalId]', 'page');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete production log:", error);
        throw error;
    }
}

// --- Breeding Records ---

export async function getBreedingRecords(animalId: string): Promise<BreedingRecord[]> {
    try {
        const records = await db`
            SELECT * FROM breeding_records 
            WHERE animal_id = ${animalId} 
            ORDER BY date DESC
        `;
        return records.map(r => ({
            id: r.id,
            animalId: r.animal_id,
            sireId: r.sire_id,
            eventType: r.event_type,
            date: r.date,
            result: r.result,
            expectedDueDate: r.expected_due_date
        })) as BreedingRecord[];
    } catch (error) {
        console.error("Failed to fetch breeding records:", error);
        return [];
    }
}

export async function addBreedingRecord(data: Partial<BreedingRecord>) {
    try {
        const id = uuidv4();
        await db`
            INSERT INTO breeding_records (
                id, animal_id, sire_id, event_type, date, result, expected_due_date
            ) VALUES (
                ${id}, ${data.animalId ?? null}, ${data.sireId ?? null}, ${data.eventType ?? null}, 
                ${data.date ?? null}, ${data.result ?? null}, ${data.expectedDueDate ?? null}
            )
        `;
        revalidatePath('/[locale]/animal/[animalId]', 'page');
        return { success: true, id };
    } catch (error) {
        console.error("Failed to add breeding record:", error);
        throw error;
    }
}

export async function deleteBreedingRecord(id: string) {
    try {
        await db`DELETE FROM breeding_records WHERE id = ${id}`;
        revalidatePath('/[locale]/animal/[animalId]', 'page');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete breeding record:", error);
        throw error;
    }
}

// --- Feed Inventory ---

export async function getFeedInventory(farmId: string): Promise<FeedInventory[]> {
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

        const inventory = await db`
            SELECT * FROM feed_inventory 
            WHERE farm_id = ${farmUuid} 
            ORDER BY feed_type ASC
        `;
        return inventory.map(i => ({
            id: i.id,
            farmId: i.farm_id,
            feedType: i.feed_type,
            currentQuantity: i.current_quantity,
            unit: i.unit,
            reorderLevel: i.reorder_level,
            lastRestockDate: i.last_restock_date
        })) as FeedInventory[];
    } catch (error) {
        console.error("Failed to fetch feed inventory:", error);
        return [];
    }
}

export async function updateFeedInventory(data: Partial<FeedInventory>) {
    try {
        if (data.id) {
            await db`
                UPDATE feed_inventory SET
                    current_quantity = ${data.currentQuantity ?? null},
                    last_restock_date = ${data.lastRestockDate ?? null},
                    updated_at = now()
                WHERE id = ${data.id}
            `;
            return { success: true };
        } else {
            const id = uuidv4();
            
            // Resolve farm UUID robustly
            const farmId = data.farmId || '';
            const resolvedFarm = await db`
                SELECT id FROM farms 
                WHERE id::text = ${farmId} OR farm_id = ${farmId}
            `;
            if (resolvedFarm.length === 0) {
                throw new Error(`Farm with identifier ${farmId} not found`);
            }
            const farmUuid = resolvedFarm[0].id;

            await db`
                INSERT INTO feed_inventory (
                    id, farm_id, feed_type, current_quantity, unit, reorder_level
                ) VALUES (
                    ${id}, ${farmUuid}, ${data.feedType ?? null}, ${data.currentQuantity ?? null}, 
                    ${data.unit ?? null}, ${data.reorderLevel ?? null}
                )
            `;
            return { success: true, id };
        }
    } catch (error) {
        console.error("Failed to update feed inventory:", error);
        throw error;
    }
}

export async function deleteFeedInventory(id: string) {
    try {
        await db`DELETE FROM feed_inventory WHERE id = ${id}`;
        return { success: true };
    } catch (error) {
        console.error("Failed to delete feed inventory:", error);
        throw error;
    }
}

// --- Vaccination Schedules ---

export async function getVaccinationSchedules(animalId: string): Promise<VaccinationSchedule[]> {
    try {
        const schedules = await db`
            SELECT * FROM vaccination_schedules 
            WHERE animal_id = ${animalId} 
            ORDER BY planned_date ASC
        `;
        return schedules.map(s => ({
            id: s.id,
            animalId: s.animal_id,
            vaccineName: s.vaccine_name,
            plannedDate: s.planned_date,
            status: s.status,
            notes: s.notes
        })) as VaccinationSchedule[];
    } catch (error) {
        console.error("Failed to fetch vaccination schedules:", error);
        return [];
    }
}

export async function updateVaccinationStatus(id: string, status: 'planned' | 'completed' | 'missed') {
    try {
        await db`
            UPDATE vaccination_schedules SET
                status = ${status},
                updated_at = now()
            WHERE id = ${id}
        `;
        return { success: true };
    } catch (error) {
        console.error("Failed to update vaccination status:", error);
        throw error;
    }
}

export async function deleteVaccinationSchedule(id: string) {
    try {
        await db`DELETE FROM vaccination_schedules WHERE id = ${id}`;
        revalidatePath('/[locale]/animal/[animalId]', 'page');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete vaccination schedule:", error);
        throw error;
    }
}
