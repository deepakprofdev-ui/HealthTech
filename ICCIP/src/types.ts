export interface User {
  id: number;
  email: string;
  name: string;
  role: 'patient' | 'physician';
  specialization?: string;
  license_number?: string;
  hospital_name?: string;
  created_at?: string;
}

export interface HealthRecord {
  id: number;
  user_id: number;
  type: 'lab' | 'wearable' | 'emr' | 'routine';
  data: any;
  timestamp: string;
  routine_type?: 'daily' | 'weekend';
}

export interface Alert {
  id: number;
  user_id: number;
  message: string;
  type: 'medication' | 'risk' | 'emergency';
  status: 'unread' | 'read';
  timestamp: string;
}

export interface ChatAttachment {
  name: string;
  type: string;
  url: string; // Simulated file url or base64
}

export interface ChatPayload {
  text: string;
  attachment?: ChatAttachment | null;
  is_deleted?: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  parsed?: ChatPayload;
  timestamp: string;
}

export interface HealthAnalysis {
  riskScore: number;
  summary: string;
  projection: string;
  recommendations: string[];
  nutritionPlan: string[];
  diseaseRisks: string[];
  diagnosisFeedback: string;
  routineImpact: {
    daily: string;
    weekend: string;
  };
  riskTrend: { date: string; score: number }[];
}

export interface MonthlyReport {
  userId: number;
  month: string;
  averageRisk: number;
  keyEvents: string[];
  clinicalSummary: string;
}

export interface SimulatedHealthProfile {
  // EMR
  age: number;
  gender: 'Male' | 'Female';
  chronicCondition: 'Diabetes' | 'Hypertension' | 'CKD' | 'Cardiac' | 'None';
  medicationAdherence: number;
  lastVisitDate: string;
  // Wearable
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  spo2: number;
  dailySteps: number;
  sleepHours: number;
  // Lab
  hba1c: number;
  creatinine: number;
  cholesterol: number;
  bmi: number;
  // Pharmacy
  medications: string[];
  dosageCompliance: number;       // % 0-100
  refillDaysRemaining: number;    // days
  adverseReactionRisk: 'Low' | 'Moderate' | 'High';
  // Mental Health
  stressLevel: number;            // 1-10
  moodScore: number;              // 1-10 (10 = best)
  anxietyScore: number;           // 1-10
  phq9Score: number;              // 0-27
  sleepQuality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
}

export type SourceKey = 'emr' | 'wearable' | 'lab' | 'pharmacy' | 'mental';
export type EnabledSources = Record<SourceKey, boolean>;

