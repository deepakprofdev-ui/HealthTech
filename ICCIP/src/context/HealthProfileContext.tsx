import { createContext, useContext, useState, ReactNode } from 'react';
import { SimulatedHealthProfile, SourceKey, EnabledSources } from '../types';

export const ALL_SOURCES: SourceKey[] = ['emr', 'wearable', 'lab', 'pharmacy', 'mental'];

const DEFAULT_ENABLED: EnabledSources = {
    emr: true, wearable: true, lab: true, pharmacy: true, mental: true,
};

interface HealthProfileContextValue {
    profile: SimulatedHealthProfile | null;
    setProfile: (p: SimulatedHealthProfile | null) => void;
    generateRandomProfile: () => SimulatedHealthProfile;
    enabledSources: EnabledSources;
    toggleSource: (key: SourceKey) => void;
}

const HealthProfileContext = createContext<HealthProfileContextValue | null>(null);

function rand(min: number, max: number, decimals = 0) {
    const v = Math.random() * (max - min) + min;
    return decimals ? parseFloat(v.toFixed(decimals)) : Math.round(v);
}

const CONDITIONS = ['Diabetes', 'Hypertension', 'CKD', 'Cardiac', 'None'] as const;
const GENDERS = ['Male', 'Female'] as const;
const SLEEP_Q = ['Poor', 'Fair', 'Good', 'Excellent'] as const;
const ADV_RISK = ['Low', 'Moderate', 'High'] as const;

const MED_POOLS: Record<string, string[]> = {
    Diabetes: ['Metformin', 'Glipizide', 'Insulin Glargine', 'Sitagliptin'],
    Hypertension: ['Amlodipine', 'Lisinopril', 'Losartan', 'Hydrochlorothiazide'],
    CKD: ['Furosemide', 'Calcitriol', 'Calcium Acetate', 'Erythropoietin'],
    Cardiac: ['Aspirin', 'Atorvastatin', 'Carvedilol', 'Warfarin'],
    None: ['Vitamin D', 'Multivitamin', 'Omega-3'],
};

export function generateRandomProfile(): SimulatedHealthProfile {
    const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];

    const isCardiac = condition === 'Cardiac';
    const isDiabetic = condition === 'Diabetes';
    const isCKD = condition === 'CKD';
    const isHypertensive = condition === 'Hypertension';
    const hasCondition = condition !== 'None';

    // ── Core biometrics ──────────────────────────────────────────────
    const age = rand(28, 75);
    const heartRate = rand(isCardiac ? 88 : 60, isCardiac ? 115 : 95);
    const bpSystolic = rand(isHypertensive || isCardiac ? 130 : 110, isHypertensive ? 165 : 135);
    const bpDiastolic = rand(70, bpSystolic > 140 ? 100 : 88);
    const spo2 = rand(isCardiac ? 92 : 95, 100);
    const dailySteps = rand(1200, 12000);
    const sleepHours = rand(4, 9, 1);
    const hba1c = rand(isDiabetic ? 7.5 : 4.5, isDiabetic ? 11.0 : 6.4, 1);
    const creatinine = rand(isCKD ? 1.4 : 0.6, isCKD ? 3.5 : 1.2, 2);
    const cholesterol = rand(isCardiac ? 200 : 140, isCardiac ? 280 : 210);
    const bmi = rand(18, 38, 1);
    const medAdherence = rand(hasCondition ? 40 : 80, 100);

    const daysAgo = rand(7, 365);
    const lastVisit = new Date();
    lastVisit.setDate(lastVisit.getDate() - daysAgo);
    const lastVisitDate = lastVisit.toISOString().split('T')[0];

    // ── Pharmacy ─────────────────────────────────────────────────────
    const medPool = MED_POOLS[condition];
    const count = rand(1, Math.min(3, medPool.length));
    const shuffled = [...medPool].sort(() => Math.random() - 0.5);
    const medications = shuffled.slice(0, count);
    const dosageCompliance = rand(hasCondition ? 45 : 75, 100);
    const refillDaysRemaining = rand(0, 60);
    const adverseReactionRisk = ADV_RISK[
        isCardiac || isDiabetic ? rand(0, 2) : rand(0, 1)
    ] as SimulatedHealthProfile['adverseReactionRisk'];

    // ── Mental Health ─────────────────────────────────────────────────
    const stressLevel = rand(hasCondition ? 5 : 1, 10);
    const moodScore = rand(1, hasCondition ? 7 : 10);
    const anxietyScore = rand(hasCondition ? 4 : 1, 10);
    const phq9Score = rand(0, hasCondition ? 20 : 9);
    const sleepQuality = SLEEP_Q[sleepHours >= 7 ? rand(2, 3) : sleepHours >= 5 ? rand(1, 2) : 0] as SimulatedHealthProfile['sleepQuality'];

    return {
        age, gender, chronicCondition: condition,
        medicationAdherence: medAdherence, lastVisitDate,
        heartRate, bloodPressureSystolic: bpSystolic, bloodPressureDiastolic: bpDiastolic,
        spo2, dailySteps, sleepHours,
        hba1c, creatinine, cholesterol, bmi,
        medications, dosageCompliance, refillDaysRemaining, adverseReactionRisk,
        stressLevel, moodScore, anxietyScore, phq9Score, sleepQuality,
    };
}

export function HealthProfileProvider({ children }: { children: ReactNode }) {
    const [profile, setProfile] = useState<SimulatedHealthProfile | null>(null);
    const [enabledSources, setEnabledSources] = useState<EnabledSources>(DEFAULT_ENABLED);

    const toggleSource = (key: SourceKey) =>
        setEnabledSources(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <HealthProfileContext.Provider value={{ profile, setProfile, generateRandomProfile, enabledSources, toggleSource }}>
            {children}
        </HealthProfileContext.Provider>
    );
}

export function useHealthProfile() {
    const ctx = useContext(HealthProfileContext);
    if (!ctx) throw new Error('useHealthProfile must be used inside HealthProfileProvider');
    return ctx;
}
