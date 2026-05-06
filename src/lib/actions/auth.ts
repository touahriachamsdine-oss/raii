'use server';

import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { createSession, deleteSession, getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

export async function getCurrentUser() {
  try {
    const session = await getSession();
    if (!session) return null;

    const userId = session.userId as string;
    const users = await db`SELECT * FROM users WHERE uid = ${userId}`;

    if (users.length === 0) return null;

    return {
      uid: users[0].uid,
      email: users[0].email,
      role: users[0].role,
      displayName: users[0].display_name
    };
  } catch (error) {
    console.error("Failed to fetch current user from database:", error);
    return null;
  }
}

export async function login(data: any) {
  try {
    const users = await db`
      SELECT * FROM users WHERE email = ${data.email}
    `;

    if (users.length === 0) {
      throw new Error("Invalid credentials");
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    await createSession(user.uid);

    return { success: true, user: { uid: user.uid, email: user.email } };
  } catch (error: any) {
    console.error("Login failed:", error);
    throw error;
  }
}

export async function signup(data: any) {
  const { email, password, role, firstName, lastName, wilaya, commune, address, phoneNumber, familyName, idCardNumber, farmName } = data;

  try {
    const userId = uuidv4();
    const farmId = uuidv4();
    const farmNameUsed = role === 'owner' ? familyName : farmName;

    // 1. Create Farm
    await db`
      INSERT INTO farms (id, farm_id, name, country, locale, timezone, address, baladia)
      VALUES (${farmId}, ${uuidv4()}, ${farmNameUsed}, 'Algeria', ${wilaya}, 'Africa/Algiers', ${address}, ${commune})
    `;

    // 2. Create User
    const lowercasedEmail = email.toLowerCase();
    const isAdmin = lowercasedEmail === 'admin@gmail.real' || lowercasedEmail === 'hadil@admin.test';

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    await db`
      INSERT INTO users (
        id, uid, first_name, last_name, display_name, family_name, wilaya, commune,
        address, id_card_number, phone_number, email, role, password_hash
      ) VALUES (
        ${userId}, ${userId}, ${firstName}, ${lastName}, ${firstName + ' ' + lastName},
        ${familyName || null}, ${wilaya}, ${commune}, ${address}, ${idCardNumber || null},
        ${phoneNumber}, ${email}, ${isAdmin ? 'admin' : role}, ${passwordHash}
      )
    `;

    // 3. Link User to Farm
    await db`
      INSERT INTO user_farms (user_id, farm_id)
      VALUES (${userId}, ${farmId})
    `;

    await createSession(userId);

    return { success: true, userId };
  } catch (error) {
    console.error("Signup failed:", error);
    throw error;
  }
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
