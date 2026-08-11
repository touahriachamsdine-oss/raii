import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const ownerEmail = 'owner@raai.ai';
const ownerPassword = 'Test1234';
const vetEmail = 'vet@raai.ai';
const vetPassword = 'Test1234';

const sql = postgres(process.env.DATABASE_URL);

try {
  const hash = await bcrypt.hash(ownerPassword, 10);

  const farmId = uuidv4();
  const ownerUid = uuidv4();
  const vetUid = uuidv4();

  const existing = await sql`SELECT role, email FROM users WHERE email IN (${ownerEmail}, ${vetEmail})`;
  if (existing.length > 0) {
    console.log('Test users already exist — skipping.');
    for (const u of existing) console.log(`  ${u.email} (${u.role})`);
    process.exit(0);
  }

  // Farm
  await sql`
    INSERT INTO farms (id, farm_id, name, country, locale, timezone, address, baladia)
    VALUES (${farmId}, ${uuidv4()}, 'RAAI Test Farm', 'Algeria', 'Algiers', 'Africa/Algiers', '01 Rue des Oliviers', 'Bab El Oued')
  `;

  // Owner
  await sql`
    INSERT INTO users (id, uid, first_name, last_name, display_name, family_name, wilaya, commune, address, id_card_number, phone_number, email, role, password_hash)
    VALUES (${ownerUid}, ${ownerUid}, 'Test', 'Owner', 'Test Owner', 'TestFamily', 'Algiers', 'Bab El Oued', '01 Rue des Oliviers', '1234567', '0555123456', ${ownerEmail}, 'owner', ${hash})
  `;
  await sql`INSERT INTO user_farms (user_id, farm_id) VALUES (${ownerUid}, ${farmId})`;

  // Vet (assigned to the same farm so the owner sees them)
  await sql`
    INSERT INTO users (id, uid, first_name, last_name, display_name, email, role, password_hash)
    VALUES (${vetUid}, ${vetUid}, 'Test', 'Vet', 'Test Vet', ${vetEmail}, 'vet', ${hash})
  `;
  await sql`INSERT INTO user_farms (user_id, farm_id) VALUES (${vetUid}, ${farmId})`;

  // Animals
  const animals = [
    { animalId: 'AN-BOV-001', species: 'bovine', breed: 'Holstein', gender: 'Female', status: 'Active', purpose: 'Milk', weight: '550', monthlyProduction: '18', lastPregnancyDate: new Date() },
    { animalId: 'AN-OVI-001', species: 'ovine', breed: 'Ouled Djellal', gender: 'Female', status: 'Active', purpose: 'Meat', weight: '45', monthlyProduction: '1.2' },
    { animalId: 'AN-CAP-001', species: 'caprine', breed: 'Alpine', gender: 'Female', status: 'Active', purpose: 'Milk', weight: '60', monthlyProduction: '3' },
  ];
  for (const a of animals) {
    await sql`
      INSERT INTO animals (id, animal_id, farm_id, species, breed, dob, gender, status, purpose, last_pregnancy, weight, monthly_production, last_pregnancy_date)
      VALUES (${uuidv4()}, ${a.animalId}, ${farmId}, ${a.species}, ${a.breed}, '2022-03-15', ${a.gender}, ${a.status}, ${a.purpose}, '2025-01-10', ${a.weight}, ${a.monthlyProduction}, ${a.lastPregnancyDate ?? null})
    `;
  }

  // Pre-registered IoT device so you can POST readings right away
  await sql`
    INSERT INTO iot_devices (id, device_id, farm_id, name)
    VALUES (${uuidv4()}, 'RAAI-TEST-001', ${farmId}, 'Test Collar')
  `;

  console.log('Created:');
  console.log('  Farm:         RAAI Test Farm');
  console.log('  Owner login:  ' + ownerEmail + ' / ' + ownerPassword);
  console.log('  Vet login:    ' + vetEmail + ' / ' + vetPassword);
  console.log('  Animals:      AN-BOV-001, AN-OVI-001, AN-CAP-001');
  console.log('  IoT device:   RAAI-TEST-001');
  console.log('');
  console.log('Lighting the API:');
  console.log('  curl -X POST https://raii-ten.vercel.app/api/iot/readings \\');
  console.log('    -H "Content-Type: application/json" -H "x-api-key: dqtqbqse" \\');
  console.log('    -d \'{"device_id":"RAAI-TEST-001","temperature":38.5,"heart_rate":72,"spo2":96.4,"battery_level":3.71,"rssi":-58}\'');
} finally {
  await sql.end();
}