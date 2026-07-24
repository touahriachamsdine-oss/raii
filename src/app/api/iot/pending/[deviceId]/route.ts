import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    try {
        const { deviceId } = await params;

        const commands = await db`
            SELECT id, command, created_at FROM iot_pending_commands
            WHERE device_id = ${deviceId} AND status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
        `;

        if (commands.length === 0) {
            return NextResponse.json({ command: null });
        }

        return NextResponse.json({
            command: commands[0].command,
            id: commands[0].id,
            created_at: commands[0].created_at,
        });
    } catch (error) {
        console.error('Failed to check pending commands:', error);
        return NextResponse.json({ command: null });
    }
}
