import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { device_id, temperature, heart_rate, spo2, battery_level, rssi } = body;

        if (!device_id) {
            return NextResponse.json({ ok: false, error: 'device_id is required' }, { status: 400 });
        }

        const devices = await db`
            SELECT id, animal_id, farm_id FROM iot_devices WHERE device_id = ${device_id}
        `;
        if (devices.length === 0) {
            return NextResponse.json({ ok: false, error: 'Unknown device' }, { status: 404 });
        }
        const device = devices[0];

        await db`
            INSERT INTO iot_readings (id, device_id, animal_id, temperature, heart_rate, spo2, battery_level, rssi)
            VALUES (${uuidv4()}, ${device_id}, ${device.animal_id}, ${temperature ?? null}, ${heart_rate ?? null}, ${spo2 ?? null}, ${battery_level ?? null}, ${rssi ?? null})
        `;

        await db`
            UPDATE iot_devices SET
                battery_level = COALESCE(${battery_level ?? null}, battery_level),
                last_seen_at = now()
            WHERE device_id = ${device_id}
        `;

        const pendingCommands = await db`
            SELECT id, command FROM iot_pending_commands
            WHERE device_id = ${device_id} AND status = 'pending'
            LIMIT 1
        `;

        let pendingCommand: string | null = null;
        if (pendingCommands.length > 0) {
            pendingCommand = pendingCommands[0].command;
            await db`
                UPDATE iot_pending_commands SET status = 'completed', completed_at = now()
                WHERE id = ${pendingCommands[0].id}
            `;
        }

        return NextResponse.json({ ok: true, pending_command: pendingCommand });
    } catch (error) {
        console.error('Failed to process IoT reading:', error);
        return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
    }
}
