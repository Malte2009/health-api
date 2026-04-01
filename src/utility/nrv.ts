export const NRV = {
    // Fat Soluble Vitamins
    vitamin_a:  900,    // mcg RAE
    vitamin_d:  20,     // mcg
    vitamin_e:  15,     // mg
    vitamin_k:  120,    // mcg

    // Water Soluble Vitamins
    vitamin_c:   90,    // mg
    vitamin_b1:  1.2,   // mg
    vitamin_b2:  1.3,   // mg
    vitamin_b3:  16,    // mg NE
    vitamin_b5:  5,     // mg
    vitamin_b6:  1.7,   // mg
    vitamin_b7:  30,    // mcg
    vitamin_b9:  400,   // mcg DFE
    vitamin_b12: 2.4,   // mcg
    choline:     550,   // mg

    // Major Minerals
    calcium:    1300,   // mg
    phosphorus: 1250,   // mg
    magnesium:  420,    // mg
    sodium:     2300,   // mg
    potassium:  4700,   // mg
    chloride:   2300,   // mg

    // Trace Minerals
    iron:       18,     // mg
    zinc:       11,     // mg
    selenium:   55,     // mcg
    iodine:     150,    // mcg
    copper:     0.9,    // mg
    manganese:  2.3,    // mg
    chromium:   35,     // mcg
    molybdenum: 45,     // mcg
    fluoride:   4,      // mg

    // Fatty Acids
    omega_3: 1600,      // mg
    omega_6: 17000,     // mg
} as const;

export type NrvKey = keyof typeof NRV;
