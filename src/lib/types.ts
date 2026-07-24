export type UserProfile = {
    id: string;
    uid: string;
    firstName: string;
    lastName: string;
    displayName: string;
    familyName?: string;
    wilaya: string;
    commune: string;
    address: string;
    idCardNumber?: string;
    phoneNumber: string;
    email: string;
    role: string;
    farmIds?: string[];
};

export type Animal = {
    id: string;
    animalId: string;
    species: string;
    breed: string;
    dob: string;
    gender: string;
    status: string;
    purpose: string;
    lastPregnancy?: string;
    weight?: string;
    monthlyProduction?: string;
    sickness?: string;
    vaccinations?: string;
    photoUrl?: string;
    sellerName?: string;
    farmName?: string;
    farmId: string;
    vaccinationDueOn?: Date;
    milkYieldAvgL?: number;
    lastPregnancyDate?: Date;
};

export type Farm = {
    id: string;
    farm_id: string;
    name: string;
    country: string;
    locale: string;
    timezone: string;
    address: string;
    baladia: string;
};

export type HealthLog = {
    id: string;
    animalId: string;
    eventType: string;
    description?: string;
    date: Date;
    cost?: number;
    medication?: string;
    notes?: string;
};

export type ProductionLog = {
    id: string;
    animalId: string;
    date: Date;
    metricType: string;
    value: number;
    unit: string;
};

export type BreedingRecord = {
    id: string;
    animalId: string;
    sireId?: string;
    eventType: string;
    date: Date;
    result?: string;
    expectedDueDate?: Date;
};

export type FeedInventory = {
    id: string;
    farmId: string;
    feedType: string;
    currentQuantity: number;
    unit: string;
    reorderLevel?: number;
    lastRestockDate?: Date;
};

export type VaccinationSchedule = {
    id: string;
    animalId: string;
    vaccineName: string;
    plannedDate: Date;
    status: 'planned' | 'completed' | 'missed';
    notes?: string;
};

export type IoTDevice = {
    id: string;
    device_id: string;
    animal_id: string | null;
    farm_id: string;
    name: string | null;
    battery_level: number | null;
    last_seen_at: string | null;
    firmware_version: string | null;
    created_at: string;
};

export type IoTReading = {
    id: string;
    device_id: string;
    animal_id: string | null;
    temperature: number | null;
    heart_rate: number | null;
    spo2: number | null;
    battery_level: number | null;
    rssi: number | null;
    recorded_at: string;
    created_at: string;
};

export type IoTDeviceWithAnimal = IoTDevice & {
    animal_name?: string;
    animal_species?: string;
    last_temperature?: number;
    last_heart_rate?: number;
    last_spo2?: number;
};
