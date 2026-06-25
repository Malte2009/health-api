import { Prisma } from "@prisma/client";
import prisma from "../../prisma/client";
import { NUTRIENT_KEYS, NutrientKey } from "../../utility/nutrientFields";

export type ChartValueType = "number" | "boolean" | "duration" | "score";
export type ChartCadence = "sample" | "window" | "event" | "daily";
export type ChartAggregation = "avg" | "sum" | "min" | "max" | "count" | "latest";
export type ChartBucket = "raw" | "hour" | "day" | "week" | "month";

export type ChartDataPoint = {
    id: string;
    label: string;
    group: string;
    unit: string | null;
    valueType: ChartValueType;
    cadence: ChartCadence;
    defaultAggregation: ChartAggregation;
    allowedAggregations: ChartAggregation[];
    defaultVisible: boolean;
    searchableText: string;
};

export type ChartSeriesRequest = {
    startDate: Date;
    endDate: Date;
    bucket: ChartBucket;
    series: Array<{
        dataPointId: string;
        aggregation?: ChartAggregation;
    }>;
};

export type ChartSeriesResponse = {
    series: Array<{
        dataPointId: string;
        label: string;
        unit: string | null;
        points: Array<{ x: string; y: number | null }>;
    }>;
};

type DailyLogField =
    | "overallScore"
    | "symptomBurdenScore"
    | "energyMorning"
    | "energyNoon"
    | "energyAfternoon"
    | "energyEvening"
    | "targetWater_ml"
    | "actualWater_ml"
    | "saltSupplementedMg"
    | "syncopeCount"
    | "presyncopeCount";

type SleepLogField =
    | "subjectiveHours"
    | "restedScore"
    | "sleepLatencyMinutes"
    | "wakeEpisodes"
    | "totalSleepMinutes"
    | "awakeMinutes"
    | "lightSleepMinutes"
    | "deepSleepMinutes"
    | "remSleepMinutes"
    | "turningSpikeCount"
    | "turningSpikeMaxHr";

type SleepTimeField = "bedTime" | "wakeTime";
type BloodPressureField = "systolic" | "diastolic" | "pulse" | "minutesAfterPositionChange";
type BodyLogField = "weight" | "fatMass" | "fatPercentage" | "muscleMass" | "waterMass" | "BMI" | "BMR";
type WorkoutField = "score" | "caloriesBurned" | "duration" | "avgHeartRate" | "pauses" | "pauseLength";
type IntakeField = "water_ml" | "otherFluid_ml" | "saltMg" | "caffeine_mg" | "alcohol_g";
type HrvMetricField = "rmssd_ms" | "mean_hr_bpm" | "artifact_percent";
type HrvWindowVariant = "none" | "standard" | "all";
type FoodMacroField =
    | "calories_per_100g"
    | "protein_g"
    | "carbs_g"
    | "fat_g"
    | "fiber_g"
    | "sugar_g"
    | "saturated_fat_g"
    | "unsaturated_fat_g"
    | "salt_g";
type HrvRecordingContext = "sleep" | "workout" | "orthostatic_test" | "rest" | "other";
type SymptomMetric = "count" | "averageSeverity";
type SyncopeMetric = "count" | "averageSeverity";

const SYMPTOM_TYPES = [
    "HEADACHE",
    "DIZZINESS",
    "VISUAL_DISTURBANCE",
    "PULSATILE_TINNITUS",
    "NECK_PULSATION",
    "POSITIONAL_PULSE_SPIKE",
    "CONGESTION_FEELING",
    "NAUSEA",
    "COGNITIVE_FOG",
    "FATIGUE",
    "FLUSHING",
    "URTICARIA",
    "DERMATOGRAPHISM",
    "GI_SYMPTOMS",
    "RESPIRATORY",
    "DYSPNEA",
    "CHEST_PRESSURE",
    "LIGHTHEADEDNESS",
    "OTHER",
] as const;

type SymptomTypeName = typeof SYMPTOM_TYPES[number];

const SYNCOPE_OUTCOMES = ["PRESYNCOPE", "SYNCOPE"] as const;
type SyncopeOutcomeName = typeof SYNCOPE_OUTCOMES[number];

type ChartDataPointQuery =
    | { source: "dailyLog"; field: DailyLogField }
    | { source: "sleepLog"; field: SleepLogField }
    | { source: "sleepTime"; field: SleepTimeField }
    | { source: "bloodPressureLog"; field: BloodPressureField }
    | { source: "bodyLog"; field: BodyLogField }
    | { source: "workout"; field: WorkoutField }
    | { source: "intakeLog"; field: IntakeField }
    | { source: "foodMacro"; field: FoodMacroField }
    | { source: "foodNutrient"; field: NutrientKey }
    | { source: "symptom"; metric: SymptomMetric; symptomType?: SymptomTypeName }
    | { source: "syncope"; metric: SyncopeMetric; outcome?: SyncopeOutcomeName }
    | { source: "hrvRecordingMetric"; field: HrvMetricField; context?: HrvRecordingContext }
    | { source: "hrvWindowMetric"; field: HrvMetricField; variant: HrvWindowVariant; context?: HrvRecordingContext };

type ChartDataPointDefinition = {
    descriptor: ChartDataPoint;
    query: ChartDataPointQuery;
    averageMode?: "observation" | "dailyTotal";
};

type Observation = {
    timestamp: Date;
    value: number;
};

export class ChartRequestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ChartRequestError";
    }
}

const BASIC_AGGREGATIONS: ChartAggregation[] = ["avg", "sum", "min", "max", "count", "latest"];
const SAMPLE_AGGREGATIONS: ChartAggregation[] = ["avg", "min", "max", "count", "latest"];
const SUM_FIRST_AGGREGATIONS: ChartAggregation[] = ["sum", "avg", "min", "max", "count", "latest"];

const defineDataPoint = (
    descriptor: ChartDataPoint,
    query: ChartDataPointQuery,
    options: Pick<ChartDataPointDefinition, "averageMode"> = {}
): ChartDataPointDefinition => ({
    descriptor,
    query,
    ...options,
});

const titleFromSnakeCase = (value: string): string => {
    return value
        .split("_")
        .map(part => part.length === 0 ? part : part[0].toUpperCase() + part.slice(1))
        .join(" ");
};

const FOOD_MACRO_DEFINITIONS: Array<{
    id: string;
    label: string;
    unit: string;
    field: FoodMacroField;
    searchableText: string;
}> = [
    { id: "food.calories", label: "Calories", unit: "kcal", field: "calories_per_100g", searchableText: "food nutrition calories kcal energy" },
    { id: "food.protein_g", label: "Protein", unit: "g", field: "protein_g", searchableText: "food nutrition protein grams macro" },
    { id: "food.carbs_g", label: "Carbs", unit: "g", field: "carbs_g", searchableText: "food nutrition carbohydrates carbs grams macro" },
    { id: "food.fat_g", label: "Fat", unit: "g", field: "fat_g", searchableText: "food nutrition fat grams macro" },
    { id: "food.fiber_g", label: "Fiber", unit: "g", field: "fiber_g", searchableText: "food nutrition fiber fibre grams" },
    { id: "food.sugar_g", label: "Sugar", unit: "g", field: "sugar_g", searchableText: "food nutrition sugar grams" },
    { id: "food.saturated_fat_g", label: "Saturated fat", unit: "g", field: "saturated_fat_g", searchableText: "food nutrition saturated fat grams" },
    { id: "food.unsaturated_fat_g", label: "Unsaturated fat", unit: "g", field: "unsaturated_fat_g", searchableText: "food nutrition unsaturated fat grams" },
    { id: "food.salt_g", label: "Salt", unit: "g", field: "salt_g", searchableText: "food nutrition salt sodium chloride grams" },
];

const NUTRIENT_UNITS: Partial<Record<NutrientKey, string>> = {
    vitamin_a: "mcg RAE",
    vitamin_d: "mcg",
    vitamin_e: "mg",
    vitamin_k: "mcg",
    vitamin_c: "mg",
    vitamin_b1: "mg",
    vitamin_b2: "mg",
    vitamin_b3: "mg NE",
    vitamin_b5: "mg",
    vitamin_b6: "mg",
    vitamin_b7: "mcg",
    vitamin_b9: "mcg DFE",
    vitamin_b12: "mcg",
    choline: "mg",
    caffeine: "mg",
    calcium: "mg",
    phosphorus: "mg",
    magnesium: "mg",
    sodium: "mg",
    potassium: "mg",
    chloride: "mg",
    sulfur: "mg",
    iron: "mg",
    zinc: "mg",
    selenium: "mcg",
    iodine: "mcg",
    copper: "mg",
    manganese: "mg",
    chromium: "mcg",
    molybdenum: "mcg",
    fluoride: "mcg",
    omega_3: "mg",
    omega_6: "mg",
    omega_9: "mg",
    omega_3_ala_mg: "mg",
    omega_3_epa_mg: "mg",
    omega_3_dha_mg: "mg",
};

const HRV_CONTEXT_DEFINITIONS: Array<{ context: HrvRecordingContext; label: string }> = [
    { context: "sleep", label: "Sleep" },
    { context: "workout", label: "Workout" },
    { context: "orthostatic_test", label: "Orthostatic test" },
    { context: "rest", label: "Rest" },
    { context: "other", label: "Other" },
];

const FOOD_DATA_POINTS: ChartDataPointDefinition[] = [
    ...FOOD_MACRO_DEFINITIONS.map(macro => defineDataPoint({
        id: macro.id,
        label: macro.label,
        group: "Food / Macros",
        unit: macro.unit,
        valueType: "number",
        cadence: "event",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: macro.id === "food.calories" || macro.id === "food.protein_g",
        searchableText: macro.searchableText,
    }, { source: "foodMacro", field: macro.field }, { averageMode: "dailyTotal" })),
    ...NUTRIENT_KEYS.map(nutrientKey => defineDataPoint({
        id: `food.nutrient.${nutrientKey}`,
        label: titleFromSnakeCase(nutrientKey),
        group: "Food / Micronutrients",
        unit: NUTRIENT_UNITS[nutrientKey] ?? null,
        valueType: "number",
        cadence: "event",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: `food nutrition nutrient micronutrient ${nutrientKey} ${titleFromSnakeCase(nutrientKey)}`,
    }, { source: "foodNutrient", field: nutrientKey }, { averageMode: "dailyTotal" })),
];

const SYMPTOM_DATA_POINTS: ChartDataPointDefinition[] = [
    defineDataPoint({
        id: "symptoms.count",
        label: "Symptom count",
        group: "Symptoms",
        unit: null,
        valueType: "number",
        cadence: "event",
        defaultAggregation: "count",
        allowedAggregations: ["count"],
        defaultVisible: false,
        searchableText: "symptoms symptom count total",
    }, { source: "symptom", metric: "count" }),
    defineDataPoint({
        id: "symptoms.average_severity",
        label: "Average severity",
        group: "Symptoms",
        unit: null,
        valueType: "score",
        cadence: "event",
        defaultAggregation: "avg",
        allowedAggregations: SAMPLE_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "symptoms symptom severity average",
    }, { source: "symptom", metric: "averageSeverity" }),
    ...SYMPTOM_TYPES.flatMap(symptomType => [
        defineDataPoint({
            id: `symptoms.${symptomType.toLowerCase()}.count`,
            label: `${titleFromSnakeCase(symptomType.toLowerCase())} count`,
            group: "Symptoms / Types",
            unit: null,
            valueType: "number",
            cadence: "event",
            defaultAggregation: "count",
            allowedAggregations: ["count"],
            defaultVisible: false,
            searchableText: `symptom symptoms count ${symptomType} ${titleFromSnakeCase(symptomType.toLowerCase())}`,
        }, { source: "symptom", metric: "count", symptomType }),
        defineDataPoint({
            id: `symptoms.${symptomType.toLowerCase()}.average_severity`,
            label: `${titleFromSnakeCase(symptomType.toLowerCase())} severity`,
            group: "Symptoms / Types",
            unit: null,
            valueType: "score",
            cadence: "event",
            defaultAggregation: "avg",
            allowedAggregations: SAMPLE_AGGREGATIONS,
            defaultVisible: false,
            searchableText: `symptom symptoms severity ${symptomType} ${titleFromSnakeCase(symptomType.toLowerCase())}`,
        }, { source: "symptom", metric: "averageSeverity", symptomType }),
    ]),
];

const SYNCOPE_DATA_POINTS: ChartDataPointDefinition[] = [
    defineDataPoint({
        id: "syncopes.count",
        label: "Syncope events",
        group: "Syncopes",
        unit: null,
        valueType: "number",
        cadence: "event",
        defaultAggregation: "count",
        allowedAggregations: ["count"],
        defaultVisible: false,
        searchableText: "syncope syncopes presyncope count events",
    }, { source: "syncope", metric: "count" }),
    defineDataPoint({
        id: "syncopes.average_severity",
        label: "Syncope severity",
        group: "Syncopes",
        unit: null,
        valueType: "score",
        cadence: "event",
        defaultAggregation: "avg",
        allowedAggregations: SAMPLE_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "syncope syncopes severity average",
    }, { source: "syncope", metric: "averageSeverity" }),
    ...SYNCOPE_OUTCOMES.flatMap(outcome => [
        defineDataPoint({
            id: `syncopes.${outcome.toLowerCase()}.count`,
            label: `${titleFromSnakeCase(outcome.toLowerCase())} count`,
            group: "Syncopes / Outcomes",
            unit: null,
            valueType: "number",
            cadence: "event",
            defaultAggregation: "count",
            allowedAggregations: ["count"],
            defaultVisible: false,
            searchableText: `syncope syncopes ${outcome} count events`,
        }, { source: "syncope", metric: "count", outcome }),
        defineDataPoint({
            id: `syncopes.${outcome.toLowerCase()}.average_severity`,
            label: `${titleFromSnakeCase(outcome.toLowerCase())} severity`,
            group: "Syncopes / Outcomes",
            unit: null,
            valueType: "score",
            cadence: "event",
            defaultAggregation: "avg",
            allowedAggregations: SAMPLE_AGGREGATIONS,
            defaultVisible: false,
            searchableText: `syncope syncopes ${outcome} severity average`,
        }, { source: "syncope", metric: "averageSeverity", outcome }),
    ]),
];

const HRV_CONTEXT_DATA_POINTS: ChartDataPointDefinition[] = HRV_CONTEXT_DEFINITIONS.flatMap(contextDefinition => [
    defineDataPoint({
        id: `hrv.context.${contextDefinition.context}.recording.rmssd_ms`,
        label: `${contextDefinition.label} RMSSD`,
        group: `HRV / ${contextDefinition.label} / Recording`,
        unit: "ms",
        valueType: "number",
        cadence: "event",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: contextDefinition.context === "sleep",
        searchableText: `hrv ${contextDefinition.label} recording rmssd ms heart rate variability`,
    }, { source: "hrvRecordingMetric", field: "rmssd_ms", context: contextDefinition.context }),
    defineDataPoint({
        id: `hrv.context.${contextDefinition.context}.window.standard.rmssd_ms`,
        label: `${contextDefinition.label} RMSSD`,
        group: `HRV / ${contextDefinition.label} / Windows / Standard`,
        unit: "ms",
        valueType: "number",
        cadence: "window",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: `hrv ${contextDefinition.label} window standard rmssd ms heart rate variability`,
    }, { source: "hrvWindowMetric", field: "rmssd_ms", variant: "standard", context: contextDefinition.context }),
    defineDataPoint({
        id: `hrv.context.${contextDefinition.context}.window.standard.mean_hr_bpm`,
        label: `${contextDefinition.label} mean HR`,
        group: `HRV / ${contextDefinition.label} / Windows / Standard`,
        unit: "bpm",
        valueType: "number",
        cadence: "window",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: `hrv ${contextDefinition.label} window standard mean heart rate bpm`,
    }, { source: "hrvWindowMetric", field: "mean_hr_bpm", variant: "standard", context: contextDefinition.context }),
    defineDataPoint({
        id: `hrv.context.${contextDefinition.context}.window.standard.artifact_percent`,
        label: `${contextDefinition.label} artifacts`,
        group: `HRV / ${contextDefinition.label} / Windows / Standard`,
        unit: "%",
        valueType: "number",
        cadence: "window",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: `hrv ${contextDefinition.label} window standard artifact percent quality`,
    }, { source: "hrvWindowMetric", field: "artifact_percent", variant: "standard", context: contextDefinition.context }),
]);

const CHART_DATA_POINTS: ChartDataPointDefinition[] = [
    defineDataPoint({
        id: "daily.overall_score",
        label: "Overall score",
        group: "Daily",
        unit: null,
        valueType: "score",
        cadence: "daily",
        defaultAggregation: "latest",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: true,
        searchableText: "daily overall score wellbeing health day",
    }, { source: "dailyLog", field: "overallScore" }),
    defineDataPoint({
        id: "daily.symptom_burden_score",
        label: "Symptom burden",
        group: "Daily",
        unit: null,
        valueType: "score",
        cadence: "daily",
        defaultAggregation: "latest",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "daily symptom burden score",
    }, { source: "dailyLog", field: "symptomBurdenScore" }),
    defineDataPoint({
        id: "sleep.total_minutes",
        label: "Sleep duration",
        group: "Sleep",
        unit: "min",
        valueType: "duration",
        cadence: "daily",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: true,
        searchableText: "sleep total duration minutes",
    }, { source: "sleepLog", field: "totalSleepMinutes" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "sleep.subjective_hours",
        label: "Subjective sleep",
        group: "Sleep",
        unit: "h",
        valueType: "duration",
        cadence: "daily",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep subjective hours",
    }, { source: "sleepLog", field: "subjectiveHours" }),
    defineDataPoint({
        id: "sleep.rested_score",
        label: "Rested score",
        group: "Sleep",
        unit: null,
        valueType: "score",
        cadence: "daily",
        defaultAggregation: "latest",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep rested recovery score",
    }, { source: "sleepLog", field: "restedScore" }),
    defineDataPoint({
        id: "sleep.deep_minutes",
        label: "Deep sleep",
        group: "Sleep / Stages",
        unit: "min",
        valueType: "duration",
        cadence: "daily",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep deep stage minutes",
    }, { source: "sleepLog", field: "deepSleepMinutes" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "sleep.light_minutes",
        label: "Light sleep",
        group: "Sleep / Stages",
        unit: "min",
        valueType: "duration",
        cadence: "daily",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep light stage minutes",
    }, { source: "sleepLog", field: "lightSleepMinutes" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "sleep.rem_minutes",
        label: "REM sleep",
        group: "Sleep / Stages",
        unit: "min",
        valueType: "duration",
        cadence: "daily",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep rem stage minutes",
    }, { source: "sleepLog", field: "remSleepMinutes" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "sleep.awake_minutes",
        label: "Awake time",
        group: "Sleep / Stages",
        unit: "min",
        valueType: "duration",
        cadence: "daily",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep awake stage minutes",
    }, { source: "sleepLog", field: "awakeMinutes" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "sleep.latency_minutes",
        label: "Sleep latency",
        group: "Sleep / Timing",
        unit: "min",
        valueType: "duration",
        cadence: "daily",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep latency time to fall asleep minutes",
    }, { source: "sleepLog", field: "sleepLatencyMinutes" }),
    defineDataPoint({
        id: "sleep.wake_episodes",
        label: "Wake episodes",
        group: "Sleep / Timing",
        unit: null,
        valueType: "number",
        cadence: "daily",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep wake episodes awakenings count",
    }, { source: "sleepLog", field: "wakeEpisodes" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "sleep.turning_spike_count",
        label: "Turning spikes",
        group: "Sleep / Heart rate",
        unit: null,
        valueType: "number",
        cadence: "daily",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep turning pulse heart rate spikes count",
    }, { source: "sleepLog", field: "turningSpikeCount" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "sleep.turning_spike_max_hr_bpm",
        label: "Max turning spike HR",
        group: "Sleep / Heart rate",
        unit: "bpm",
        valueType: "number",
        cadence: "daily",
        defaultAggregation: "max",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep turning pulse heart rate spike max bpm",
    }, { source: "sleepLog", field: "turningSpikeMaxHr" }),
    defineDataPoint({
        id: "sleep.bedtime_clock_hour",
        label: "Bedtime",
        group: "Sleep / Timing",
        unit: "clock hour",
        valueType: "duration",
        cadence: "daily",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep bedtime average bed time clock hour time of day",
    }, { source: "sleepTime", field: "bedTime" }),
    defineDataPoint({
        id: "sleep.wake_time_clock_hour",
        label: "Wake time",
        group: "Sleep / Timing",
        unit: "clock hour",
        valueType: "duration",
        cadence: "daily",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "sleep wake time average wakeup clock hour time of day",
    }, { source: "sleepTime", field: "wakeTime" }),
    defineDataPoint({
        id: "blood_pressure.systolic_mmhg",
        label: "Systolic",
        group: "Vitals / Blood pressure",
        unit: "mmHg",
        valueType: "number",
        cadence: "sample",
        defaultAggregation: "avg",
        allowedAggregations: SAMPLE_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "blood pressure systolic mmhg",
    }, { source: "bloodPressureLog", field: "systolic" }),
    defineDataPoint({
        id: "blood_pressure.diastolic_mmhg",
        label: "Diastolic",
        group: "Vitals / Blood pressure",
        unit: "mmHg",
        valueType: "number",
        cadence: "sample",
        defaultAggregation: "avg",
        allowedAggregations: SAMPLE_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "blood pressure diastolic mmhg",
    }, { source: "bloodPressureLog", field: "diastolic" }),
    defineDataPoint({
        id: "blood_pressure.pulse_bpm",
        label: "Pulse",
        group: "Vitals / Blood pressure",
        unit: "bpm",
        valueType: "number",
        cadence: "sample",
        defaultAggregation: "avg",
        allowedAggregations: SAMPLE_AGGREGATIONS,
        defaultVisible: true,
        searchableText: "blood pressure pulse heart rate bpm",
    }, { source: "bloodPressureLog", field: "pulse" }),
    defineDataPoint({
        id: "body.weight_kg",
        label: "Weight",
        group: "Body",
        unit: "kg",
        valueType: "number",
        cadence: "daily",
        defaultAggregation: "latest",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "body weight kg",
    }, { source: "bodyLog", field: "weight" }),
    defineDataPoint({
        id: "body.bmi",
        label: "BMI",
        group: "Body",
        unit: null,
        valueType: "number",
        cadence: "daily",
        defaultAggregation: "latest",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "body bmi",
    }, { source: "bodyLog", field: "BMI" }),
    defineDataPoint({
        id: "workout.score",
        label: "Workout score",
        group: "Training",
        unit: null,
        valueType: "score",
        cadence: "event",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "training workout exercise score",
    }, { source: "workout", field: "score" }),
    defineDataPoint({
        id: "workout.duration_minutes",
        label: "Workout duration",
        group: "Training",
        unit: "min",
        valueType: "duration",
        cadence: "event",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "training workout duration minutes",
    }, { source: "workout", field: "duration" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "workout.calories_burned",
        label: "Workout calories",
        group: "Training",
        unit: "kcal",
        valueType: "number",
        cadence: "event",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "training workout calories burned kcal",
    }, { source: "workout", field: "caloriesBurned" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "workout.avg_hr_bpm",
        label: "Workout average HR",
        group: "Training",
        unit: "bpm",
        valueType: "number",
        cadence: "event",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "training workout average heart rate bpm",
    }, { source: "workout", field: "avgHeartRate" }),
    defineDataPoint({
        id: "intake.water_ml",
        label: "Water",
        group: "Intake",
        unit: "ml",
        valueType: "number",
        cadence: "sample",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "intake water fluid hydration ml",
    }, { source: "intakeLog", field: "water_ml" }, { averageMode: "dailyTotal" }),
    defineDataPoint({
        id: "intake.caffeine_mg",
        label: "Caffeine",
        group: "Intake",
        unit: "mg",
        valueType: "number",
        cadence: "sample",
        defaultAggregation: "sum",
        allowedAggregations: SUM_FIRST_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "intake caffeine mg coffee",
    }, { source: "intakeLog", field: "caffeine_mg" }, { averageMode: "dailyTotal" }),
    ...FOOD_DATA_POINTS,
    ...SYMPTOM_DATA_POINTS,
    ...SYNCOPE_DATA_POINTS,
    defineDataPoint({
        id: "hrv.recording.rmssd_ms",
        label: "All contexts RMSSD",
        group: "HRV / All contexts / Recording",
        unit: "ms",
        valueType: "number",
        cadence: "event",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "hrv all contexts recording rmssd ms heart rate variability",
    }, { source: "hrvRecordingMetric", field: "rmssd_ms" }),
    defineDataPoint({
        id: "hrv.window.none.rmssd_ms",
        label: "All contexts RMSSD",
        group: "HRV / All contexts / Windows / None",
        unit: "ms",
        valueType: "number",
        cadence: "window",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "hrv all contexts window none rmssd ms unfiltered heart rate variability",
    }, { source: "hrvWindowMetric", field: "rmssd_ms", variant: "none" }),
    defineDataPoint({
        id: "hrv.window.standard.rmssd_ms",
        label: "All contexts RMSSD",
        group: "HRV / All contexts / Windows / Standard",
        unit: "ms",
        valueType: "number",
        cadence: "window",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "hrv all contexts window standard rmssd ms heart rate variability",
    }, { source: "hrvWindowMetric", field: "rmssd_ms", variant: "standard" }),
    defineDataPoint({
        id: "hrv.window.all.rmssd_ms",
        label: "All contexts RMSSD",
        group: "HRV / All contexts / Windows / All",
        unit: "ms",
        valueType: "number",
        cadence: "window",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "hrv all contexts window all rmssd ms adaptive filtered heart rate variability",
    }, { source: "hrvWindowMetric", field: "rmssd_ms", variant: "all" }),
    defineDataPoint({
        id: "hrv.window.standard.mean_hr_bpm",
        label: "All contexts mean HR",
        group: "HRV / All contexts / Windows / Standard",
        unit: "bpm",
        valueType: "number",
        cadence: "window",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "hrv all contexts window standard mean heart rate bpm",
    }, { source: "hrvWindowMetric", field: "mean_hr_bpm", variant: "standard" }),
    defineDataPoint({
        id: "hrv.window.standard.artifact_percent",
        label: "All contexts artifacts",
        group: "HRV / All contexts / Windows / Standard",
        unit: "%",
        valueType: "number",
        cadence: "window",
        defaultAggregation: "avg",
        allowedAggregations: BASIC_AGGREGATIONS,
        defaultVisible: false,
        searchableText: "hrv all contexts window standard artifact percent quality",
    }, { source: "hrvWindowMetric", field: "artifact_percent", variant: "standard" }),
    ...HRV_CONTEXT_DATA_POINTS,
];

const CHART_DATA_POINT_BY_ID = new Map(CHART_DATA_POINTS.map(dataPoint => [dataPoint.descriptor.id, dataPoint]));

const toNumberOrNull = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
};

const readNumericField = <FieldName extends string>(record: Record<FieldName, unknown>, field: FieldName): number | null => {
    return toNumberOrNull(record[field]);
};

const getFoodLogWeightInGrams = (foodLog: {
    weight_g: number | null;
    food: {
        defaultAmount: number | null;
        defaultUnit: "G" | "ML" | "PORTION" | null;
        density_g_per_ml: number | null;
        g_per_portion: number | null;
    };
}): number => {
    if (foodLog.weight_g != null) return foodLog.weight_g;
    if (foodLog.food.defaultAmount == null) return 0;
    if (foodLog.food.defaultUnit === "ML") return foodLog.food.density_g_per_ml == null ? 0 : foodLog.food.defaultAmount * foodLog.food.density_g_per_ml;
    if (foodLog.food.defaultUnit === "PORTION") return foodLog.food.g_per_portion == null ? 0 : foodLog.food.defaultAmount * foodLog.food.g_per_portion;
    return foodLog.food.defaultAmount;
};

const getClockHour = (date: Date): number => {
    return date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
};

const getSleepTimeValue = (date: Date, field: SleepTimeField): number => {
    const clockHour = getClockHour(date);
    if (field === "bedTime" && clockHour < 12) {
        return clockHour + 24;
    }

    return clockHour;
};

const freshness = (record: { createdAt: Date; changedAt: Date | null }): number => {
    return (record.changedAt ?? record.createdAt).getTime();
};

const getHrvWindowVariant = (metric: {
    adaptiveFilteringApplied: boolean | null;
    rangeFilteringApplied: boolean | null;
    movingAverageFilteringApplied: boolean | null;
    artifactFilteringApplied: boolean | null;
}): HrvWindowVariant | null => {
    const adaptiveFilteringApplied = metric.adaptiveFilteringApplied === true;
    const rangeFilteringApplied = metric.rangeFilteringApplied === true;
    const movingAverageFilteringApplied = metric.movingAverageFilteringApplied === true;
    const artifactFilteringApplied = metric.artifactFilteringApplied === true;

    if (!adaptiveFilteringApplied && !rangeFilteringApplied && !movingAverageFilteringApplied && !artifactFilteringApplied) {
        return "none";
    }

    if (!adaptiveFilteringApplied && rangeFilteringApplied && movingAverageFilteringApplied && artifactFilteringApplied) {
        return "standard";
    }

    if (adaptiveFilteringApplied && rangeFilteringApplied && movingAverageFilteringApplied && artifactFilteringApplied) {
        return "all";
    }

    return null;
};

const buildHrvRecordingContextWhere = (context?: HrvRecordingContext): Prisma.HrvRecordingWhereInput => {
    if (!context) return {};

    if (context === "sleep") {
        return {
            OR: [
                { sleepLogId: { not: null } },
                { context: "NIGHT_SLEEP" },
            ],
        };
    }

    if (context === "workout") {
        return {
            OR: [
                { workoutId: { not: null } },
                { context: "TRAINING" },
            ],
        };
    }

    if (context === "orthostatic_test") {
        return { context: "ORTHOSTATIC_TEST" };
    }

    if (context === "rest") {
        return { context: "REST" };
    }

    return {
        sleepLogId: null,
        workoutId: null,
        OR: [
            { context: null },
            { context: "OTHER" },
        ],
    };
};

const getBucketStart = (date: Date, bucket: Exclude<ChartBucket, "raw">): Date => {
    const bucketStart = new Date(date);

    if (bucket === "hour") {
        bucketStart.setUTCMinutes(0, 0, 0);
        return bucketStart;
    }

    if (bucket === "day") {
        bucketStart.setUTCHours(0, 0, 0, 0);
        return bucketStart;
    }

    if (bucket === "week") {
        bucketStart.setUTCHours(0, 0, 0, 0);
        const currentDay = bucketStart.getUTCDay();
        const daysSinceMonday = currentDay === 0 ? 6 : currentDay - 1;
        bucketStart.setUTCDate(bucketStart.getUTCDate() - daysSinceMonday);
        return bucketStart;
    }

    bucketStart.setUTCDate(1);
    bucketStart.setUTCHours(0, 0, 0, 0);
    return bucketStart;
};

const addBucketInterval = (date: Date, bucket: Exclude<ChartBucket, "raw">): Date => {
    const nextDate = new Date(date);

    if (bucket === "hour") nextDate.setUTCHours(nextDate.getUTCHours() + 1);
    if (bucket === "day") nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    if (bucket === "week") nextDate.setUTCDate(nextDate.getUTCDate() + 7);
    if (bucket === "month") nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);

    return nextDate;
};

const getUtcDayStart = (date: Date): Date => {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    return dayStart;
};

const countTouchedUtcDays = (startDate: Date, endDateExclusive: Date): number => {
    if (endDateExclusive.getTime() <= startDate.getTime()) return 0;

    const firstDay = getUtcDayStart(startDate);
    const lastIncludedMoment = new Date(endDateExclusive.getTime() - 1);
    const lastDay = getUtcDayStart(lastIncludedMoment);

    return Math.floor((lastDay.getTime() - firstDay.getTime()) / 86400000) + 1;
};

const aggregateObservations = (observations: Observation[], aggregation: ChartAggregation): number | null => {
    if (observations.length === 0) return null;
    if (aggregation === "count") return observations.length;

    const values = observations.map(observation => observation.value);

    if (aggregation === "sum") {
        return values.reduce((sum, value) => sum + value, 0);
    }

    if (aggregation === "min") {
        return Math.min(...values);
    }

    if (aggregation === "max") {
        return Math.max(...values);
    }

    if (aggregation === "latest") {
        return [...observations].sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())[0].value;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const aggregateDailyTotalAverage = (
    observations: Observation[],
    bucketStart: Date,
    bucketEndExclusive: Date,
    requestStart: Date,
    requestEnd: Date
): number | null => {
    if (observations.length === 0) return null;

    const effectiveStart = new Date(Math.max(bucketStart.getTime(), requestStart.getTime()));
    const effectiveEndExclusive = new Date(Math.min(bucketEndExclusive.getTime(), requestEnd.getTime() + 1));
    const touchedDays = countTouchedUtcDays(effectiveStart, effectiveEndExclusive);
    if (touchedDays === 0) return null;

    const total = observations.reduce((sum, observation) => sum + observation.value, 0);
    return total / touchedDays;
};

class ChartService {
    getDataPoints(): ChartDataPoint[] {
        return CHART_DATA_POINTS.map(dataPoint => dataPoint.descriptor);
    }

    async getSeries(userId: string, request: ChartSeriesRequest): Promise<ChartSeriesResponse> {
        if (request.startDate.getTime() > request.endDate.getTime()) {
            throw new ChartRequestError("startDate must be before or equal to endDate");
        }

        const requestedSeries = request.series.map(seriesRequest => {
            const dataPoint = CHART_DATA_POINT_BY_ID.get(seriesRequest.dataPointId);
            if (!dataPoint) {
                throw new ChartRequestError(`Unknown dataPointId: ${seriesRequest.dataPointId}`);
            }

            const aggregation = seriesRequest.aggregation ?? dataPoint.descriptor.defaultAggregation;
            if (!dataPoint.descriptor.allowedAggregations.includes(aggregation)) {
                throw new ChartRequestError(`Aggregation ${aggregation} is not allowed for ${seriesRequest.dataPointId}`);
            }

            return { dataPoint, aggregation };
        });

        const responseSeries = [];

        for (const requested of requestedSeries) {
            const observations = await this.getObservations(userId, request.startDate, request.endDate, requested.dataPoint.query);
            responseSeries.push({
                dataPointId: requested.dataPoint.descriptor.id,
                label: requested.dataPoint.descriptor.label,
                unit: requested.dataPoint.descriptor.unit,
                points: this.buildPoints(
                    observations,
                    request.bucket,
                    request.startDate,
                    request.endDate,
                    requested.aggregation,
                    requested.dataPoint.averageMode ?? "observation"
                ),
            });
        }

        return { series: responseSeries };
    }

    private buildPoints(
        observations: Observation[],
        bucket: ChartBucket,
        startDate: Date,
        endDate: Date,
        aggregation: ChartAggregation,
        averageMode: "observation" | "dailyTotal"
    ): Array<{ x: string; y: number | null }> {
        const sortedObservations = observations.sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());

        if (bucket === "raw") {
            return sortedObservations.map(observation => ({
                x: observation.timestamp.toISOString(),
                y: observation.value,
            }));
        }

        const points: Array<{ x: string; y: number | null }> = [];
        let bucketStart = getBucketStart(startDate, bucket);

        while (bucketStart.getTime() <= endDate.getTime()) {
            const nextBucketStart = addBucketInterval(bucketStart, bucket);
            const bucketObservations = sortedObservations.filter(observation => {
                const timestamp = observation.timestamp.getTime();
                return timestamp >= bucketStart.getTime() && timestamp < nextBucketStart.getTime();
            });

            points.push({
                x: bucketStart.toISOString(),
                y: aggregation === "avg" && averageMode === "dailyTotal"
                    ? aggregateDailyTotalAverage(bucketObservations, bucketStart, nextBucketStart, startDate, endDate)
                    : aggregateObservations(bucketObservations, aggregation),
            });

            bucketStart = nextBucketStart;
        }

        return points;
    }

    private async getObservations(
        userId: string,
        startDate: Date,
        endDate: Date,
        query: ChartDataPointQuery
    ): Promise<Observation[]> {
        if (query.source === "dailyLog") return this.getDailyLogObservations(userId, startDate, endDate, query.field);
        if (query.source === "sleepLog") return this.getSleepLogObservations(userId, startDate, endDate, query.field);
        if (query.source === "sleepTime") return this.getSleepTimeObservations(userId, startDate, endDate, query.field);
        if (query.source === "bloodPressureLog") return this.getBloodPressureObservations(userId, startDate, endDate, query.field);
        if (query.source === "bodyLog") return this.getBodyLogObservations(userId, startDate, endDate, query.field);
        if (query.source === "workout") return this.getWorkoutObservations(userId, startDate, endDate, query.field);
        if (query.source === "intakeLog") return this.getIntakeObservations(userId, startDate, endDate, query.field);
        if (query.source === "foodMacro") return this.getFoodMacroObservations(userId, startDate, endDate, query.field);
        if (query.source === "foodNutrient") return this.getFoodNutrientObservations(userId, startDate, endDate, query.field);
        if (query.source === "symptom") return this.getSymptomObservations(userId, startDate, endDate, query.metric, query.symptomType);
        if (query.source === "syncope") return this.getSyncopeObservations(userId, startDate, endDate, query.metric, query.outcome);
        if (query.source === "hrvRecordingMetric") return this.getHrvRecordingObservations(userId, startDate, endDate, query.field, query.context);
        return this.getHrvWindowObservations(userId, startDate, endDate, query.field, query.variant, query.context);
    }

    private async getDailyLogObservations(userId: string, startDate: Date, endDate: Date, field: DailyLogField): Promise<Observation[]> {
        const records = await prisma.dailyLog.findMany({
            where: { userId, date: { gte: startDate, lte: endDate } },
            orderBy: { date: "asc" },
        });

        return records.flatMap(record => {
            const value = readNumericField(record, field);
            return value === null ? [] : [{ timestamp: record.date, value }];
        });
    }

    private async getSleepLogObservations(userId: string, startDate: Date, endDate: Date, field: SleepLogField): Promise<Observation[]> {
        const records = await prisma.sleepLog.findMany({
            where: { userId, date: { gte: startDate, lte: endDate } },
            orderBy: { date: "asc" },
        });

        return records.flatMap(record => {
            const value = readNumericField(record, field);
            return value === null ? [] : [{ timestamp: record.date, value }];
        });
    }

    private async getSleepTimeObservations(userId: string, startDate: Date, endDate: Date, field: SleepTimeField): Promise<Observation[]> {
        const records = await prisma.sleepLog.findMany({
            where: { userId, date: { gte: startDate, lte: endDate } },
            orderBy: { date: "asc" },
        });

        return records.flatMap(record => {
            const timeValue = record[field];
            if (!timeValue) return [];
            return [{ timestamp: record.date, value: getSleepTimeValue(timeValue, field) }];
        });
    }

    private async getBloodPressureObservations(userId: string, startDate: Date, endDate: Date, field: BloodPressureField): Promise<Observation[]> {
        const records = await prisma.bloodPressureLog.findMany({
            where: { userId, timestamp: { gte: startDate, lte: endDate } },
            orderBy: { timestamp: "asc" },
        });

        return records.flatMap(record => {
            const value = readNumericField(record, field);
            return value === null ? [] : [{ timestamp: record.timestamp, value }];
        });
    }

    private async getBodyLogObservations(userId: string, startDate: Date, endDate: Date, field: BodyLogField): Promise<Observation[]> {
        const records = await prisma.bodyLog.findMany({
            where: {
                userId,
                healthDay: { date: { gte: startDate, lte: endDate } },
            },
            include: { healthDay: { select: { date: true } } },
            orderBy: { createdAt: "asc" },
        });

        return records.flatMap(record => {
            const value = readNumericField(record, field);
            return value === null || !record.healthDay ? [] : [{ timestamp: record.healthDay.date, value }];
        });
    }

    private async getWorkoutObservations(userId: string, startDate: Date, endDate: Date, field: WorkoutField): Promise<Observation[]> {
        const records = await prisma.workout.findMany({
            where: {
                userId,
                healthDay: { date: { gte: startDate, lte: endDate } },
            },
            include: { healthDay: { select: { date: true } } },
            orderBy: { createdAt: "asc" },
        });

        return records.flatMap(record => {
            const value = readNumericField(record, field);
            return value === null || !record.healthDay ? [] : [{ timestamp: record.healthDay.date, value }];
        });
    }

    private async getIntakeObservations(userId: string, startDate: Date, endDate: Date, field: IntakeField): Promise<Observation[]> {
        const records = await prisma.intakeLog.findMany({
            where: { userId, timestamp: { gte: startDate, lte: endDate } },
            orderBy: { timestamp: "asc" },
        });

        return records.flatMap(record => {
            const value = readNumericField(record, field);
            return value === null ? [] : [{ timestamp: record.timestamp, value }];
        });
    }

    private async getFoodMacroObservations(userId: string, startDate: Date, endDate: Date, field: FoodMacroField): Promise<Observation[]> {
        const records = await prisma.foodLog.findMany({
            where: { userId, date: { gte: startDate, lte: endDate } },
            include: { food: true },
            orderBy: { date: "asc" },
        });

        return records.flatMap(record => {
            const amountPerHundredGrams = readNumericField(record.food, field);
            if (amountPerHundredGrams === null) return [];

            const grams = getFoodLogWeightInGrams(record);
            return [{ timestamp: record.date, value: amountPerHundredGrams * (grams / 100) }];
        });
    }

    private async getFoodNutrientObservations(userId: string, startDate: Date, endDate: Date, field: NutrientKey): Promise<Observation[]> {
        const records = await prisma.foodLog.findMany({
            where: { userId, date: { gte: startDate, lte: endDate } },
            include: { food: { include: { nutrients: true } } },
            orderBy: { date: "asc" },
        });

        return records.flatMap(record => {
            if (!record.food.nutrients) return [];

            const amountPerHundredGrams = toNumberOrNull(record.food.nutrients[field]);
            if (amountPerHundredGrams === null) return [];

            const grams = getFoodLogWeightInGrams(record);
            return [{ timestamp: record.date, value: amountPerHundredGrams * (grams / 100) }];
        });
    }

    private async getSymptomObservations(
        userId: string,
        startDate: Date,
        endDate: Date,
        metric: SymptomMetric,
        symptomType?: SymptomTypeName
    ): Promise<Observation[]> {
        const records = await prisma.symptomLog.findMany({
            where: {
                userId,
                timestamp: { gte: startDate, lte: endDate },
                ...(symptomType ? { name: symptomType } : {}),
            },
            orderBy: { timestamp: "asc" },
        });

        return records.map(record => ({
            timestamp: record.timestamp,
            value: metric === "count" ? 1 : record.severity,
        }));
    }

    private async getSyncopeObservations(
        userId: string,
        startDate: Date,
        endDate: Date,
        metric: SyncopeMetric,
        outcome?: SyncopeOutcomeName
    ): Promise<Observation[]> {
        const records = await prisma.syncopeLog.findMany({
            where: {
                userId,
                timestamp: { gte: startDate, lte: endDate },
                ...(outcome ? { outcome } : {}),
            },
            orderBy: { timestamp: "asc" },
        });

        return records.map(record => ({
            timestamp: record.timestamp,
            value: metric === "count" ? 1 : record.severity,
        }));
    }

    private async getHrvRecordingObservations(
        userId: string,
        startDate: Date,
        endDate: Date,
        field: HrvMetricField,
        context?: HrvRecordingContext
    ): Promise<Observation[]> {
        const records = await prisma.hrvRecording.findMany({
            where: {
                userId,
                AND: [
                    buildHrvRecordingContextWhere(context),
                    {
                        OR: [
                            { startDateTime: { gte: startDate, lte: endDate } },
                            { startDateTime: null, date: { gte: startDate, lte: endDate } },
                        ],
                    },
                ],
            },
            include: {
                metrics: {
                    where: { hrvWindowId: null },
                    orderBy: { createdAt: "desc" },
                },
            },
            orderBy: { date: "asc" },
        });

        return records.flatMap(record => {
            const metric = [...record.metrics]
                .sort((left, right) => freshness(right) - freshness(left))
                .find(candidate => readNumericField(candidate, field) !== null);
            if (!metric) return [];

            const value = readNumericField(metric, field);
            return value === null ? [] : [{ timestamp: record.startDateTime ?? record.date, value }];
        });
    }

    private async getHrvWindowObservations(
        userId: string,
        startDate: Date,
        endDate: Date,
        field: HrvMetricField,
        variant: HrvWindowVariant,
        context?: HrvRecordingContext
    ): Promise<Observation[]> {
        const records = await prisma.hrvWindow.findMany({
            where: {
                windowStart: { gte: startDate, lte: endDate },
                recording: {
                    userId,
                    ...(context ? { context } : {}),
                },
            },
            include: {
                metrics: {
                    orderBy: { createdAt: "desc" },
                },
            },
            orderBy: { windowStart: "asc" },
        });

        return records.flatMap(record => {
            const metric = [...record.metrics]
                .sort((left, right) => freshness(right) - freshness(left))
                .find(candidate => getHrvWindowVariant(candidate) === variant && readNumericField(candidate, field) !== null);
            if (!metric) return [];

            const value = readNumericField(metric, field);
            return value === null ? [] : [{ timestamp: record.windowStart, value }];
        });
    }
}

export default new ChartService();
