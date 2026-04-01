export const NUTRIENT_KEYS = [
    'vitamin_a', 'vitamin_d', 'vitamin_e', 'vitamin_k',
    'vitamin_c', 'vitamin_b1', 'vitamin_b2', 'vitamin_b3', 'vitamin_b5',
    'vitamin_b6', 'vitamin_b7', 'vitamin_b9', 'vitamin_b12', 'choline',
    'calcium', 'phosphorus', 'magnesium', 'sodium', 'potassium',
    'chloride', 'sulfur', 'iron', 'zinc', 'selenium', 'iodine',
    'copper', 'manganese', 'chromium', 'molybdenum', 'fluoride',
    'omega_3', 'omega_6', 'omega_9',
] as const;

export type NutrientKey = typeof NUTRIENT_KEYS[number];

export const extractNutrientFields = (source: any): Record<NutrientKey, any> => {
    const result: any = {};
    for (const key of NUTRIENT_KEYS) {
        result[key] = source?.[key];
    }
    return result;
};
