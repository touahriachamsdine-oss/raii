import { config } from 'dotenv';
config({ path: '.env.local' });

// Simulates 2 livestock collars sending readings to the server.
// Run: node scripts/simulate-devices.mjs
const API = 'https://raii-ten.vercel.app';
const KEY = 'dqtqbqse';
const DEVICES = ['SIM-001', 'SIM-002'];
const INTERVAL_MS = 10 * 1000;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function reading(deviceId) {
  return {
    device_id: deviceId,
    temperature: Math.round(rand(37.0, 40.5) * 10) / 10,
    heart_rate: Math.round(rand(48, 90)),
    spo2: Math.round(rand(92, 99.5) * 10) / 10,
    battery_level: Math.round(rand(3.5, 4.1) * 100) / 100,
    rssi: -Math.round(rand(40, 70)),
  };
}

async function tick() {
  for (const id of DEVICES) {
    try {
      const res = await fetch(`${API}/api/iot/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
        body: JSON.stringify(reading(id)),
      });
      console.log(new Date().toISOString(), id, '->', res.status, await res.text());
    } catch (e) {
      console.log(new Date().toISOString(), id, '-> ERROR', e.message);
    }
  }
}

console.log(`Simulating ${DEVICES.join(', ')} -> ${API}/api/iot/readings every ${INTERVAL_MS / 1000}s. Ctrl+C to stop.`);
await tick();
setInterval(tick, INTERVAL_MS);