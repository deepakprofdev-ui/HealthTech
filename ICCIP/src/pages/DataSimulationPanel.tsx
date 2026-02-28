import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useHealthProfile } from '../context/HealthProfileContext';
import { SimulatedHealthProfile, SourceKey } from '../types';
import {
    FlaskConical, Heart, Stethoscope, Cpu,
    CheckCircle2, RefreshCw, Activity, Send, Shuffle,
    Pill, Brain, ToggleLeft, ToggleRight, Wifi, WifiOff,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────── */
type EMRDraft = {
    age: number;
    gender: 'Male' | 'Female';
    chronicCondition: 'Diabetes' | 'Hypertension' | 'CKD' | 'Cardiac' | 'None';
    medicationAdherence: number;
    lastVisitDate: string;
};

const defaultEMR: EMRDraft = {
    age: 35, gender: 'Male', chronicCondition: 'None',
    medicationAdherence: 80,
    lastVisitDate: new Date().toISOString().split('T')[0],
};

/* ─── UI helpers ─────────────────────────────────────────────────── */
function ReadonlyRow({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
            <span className="text-sm font-bold text-white">
                {value}<span className="text-slate-400 font-normal text-xs ml-1">{unit}</span>
            </span>
        </div>
    );
}

function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 shrink-0">{label}</span>
            {children}
        </div>
    );
}

const inputCls = "bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white outline-none focus:border-blue-400/60 transition-colors text-right w-28";
const selectCls = "bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-sm font-bold text-white outline-none focus:border-blue-400/60 transition-colors";

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button onClick={onToggle} className="shrink-0 flex items-center gap-1 transition-all" title={enabled ? 'Disable source' : 'Enable source'}>
            {enabled
                ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                : <ToggleLeft className="w-5 h-5 text-slate-600" />}
        </button>
    );
}

function SourceCard({ enabled, borderColor, bgGlow, children }: {
    enabled: boolean; borderColor: string; bgGlow: string; children: React.ReactNode;
}) {
    return (
        <motion.div
            animate={{ opacity: enabled ? 1 : 0.45 }}
            className={`rounded-3xl p-6 relative overflow-hidden bg-slate-900/50 backdrop-blur-xl border transition-all ${enabled ? borderColor : 'border-white/5'}`}
        >
            <div className={`absolute -top-8 -right-8 w-32 h-32 ${bgGlow} rounded-full blur-2xl`} />
            {children}
        </motion.div>
    );
}

function CardHeader({
    icon, color, title, subtitle, enabled, onToggle, onShuffle,
}: {
    icon: React.ReactNode; color: string; title: string; subtitle: string;
    enabled: boolean; onToggle: () => void; onShuffle?: () => void;
}) {
    return (
        <div className="mb-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
                <div>
                    <h3 className="font-bold text-base">{title}</h3>
                    <p className="text-[11px] text-slate-500">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
                {onShuffle && enabled && (
                    <button onClick={onShuffle} title="Randomize" className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-all">
                        <Shuffle className="w-3.5 h-3.5" />
                    </button>
                )}
                <Toggle enabled={enabled} onToggle={onToggle} />
            </div>
        </div>
    );
}

function EmptyState() {
    return <div className="py-8 text-center text-slate-700 text-xs">— no data —<br /><span className="text-[9px] text-slate-800 mt-1 block">Hit "Apply" or toggle source</span></div>;
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function DataSimulationPanel() {
    const { profile, setProfile, generateRandomProfile, enabledSources, toggleSource } = useHealthProfile();
    const [applying, setApplying] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const navigate = useNavigate();
    const [emr, setEmr] = useState<EMRDraft>(defaultEMR);

    useEffect(() => {
        if (!profile) {
            const p = generateRandomProfile();
            setProfile(p);
        }
    }, []); // eslint-disable-line

    useEffect(() => {
        if (!profile) return;
        setEmr({
            age: profile.age, gender: profile.gender,
            chronicCondition: profile.chronicCondition,
            medicationAdherence: profile.medicationAdherence,
            lastVisitDate: profile.lastVisitDate,
        });
    }, [profile]);

    const handleEmrChange = <K extends keyof EMRDraft>(field: K, value: EMRDraft[K]) => {
        const updated = { ...emr, [field]: value };
        setEmr(updated);
        if (profile) setProfile({ ...profile, ...updated });
    };

    const handleApply = async () => {
        if (!profile) return;
        setApplying(true);
        setShowSuccess(false);
        await new Promise(r => setTimeout(r, 500));
        setProfile({ ...profile, ...emr });
        setApplying(false);
        setShowSuccess(true);
        setTimeout(() => navigate('/'), 800);
    };

    const randomizeWearableLab = () => {
        if (!profile) return;
        const fresh = generateRandomProfile();
        setProfile({ ...profile, ...emr, heartRate: fresh.heartRate, bloodPressureSystolic: fresh.bloodPressureSystolic, bloodPressureDiastolic: fresh.bloodPressureDiastolic, spo2: fresh.spo2, dailySteps: fresh.dailySteps, sleepHours: fresh.sleepHours, hba1c: fresh.hba1c, creatinine: fresh.creatinine, cholesterol: fresh.cholesterol, bmi: fresh.bmi });
    };

    const randomizePharmacy = () => {
        if (!profile) return;
        const fresh = generateRandomProfile();
        setProfile({ ...profile, ...emr, medications: fresh.medications, dosageCompliance: fresh.dosageCompliance, refillDaysRemaining: fresh.refillDaysRemaining, adverseReactionRisk: fresh.adverseReactionRisk });
    };

    const randomizeMental = () => {
        if (!profile) return;
        const fresh = generateRandomProfile();
        setProfile({ ...profile, ...emr, stressLevel: fresh.stressLevel, moodScore: fresh.moodScore, anxietyScore: fresh.anxietyScore, phq9Score: fresh.phq9Score, sleepQuality: fresh.sleepQuality });
    };

    const p: SimulatedHealthProfile | null = profile;
    const activeSources = (Object.keys(enabledSources) as SourceKey[]).filter(k => enabledSources[k]);

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-violet-500/15 rounded-xl"><Cpu className="w-6 h-6 text-violet-400" /></div>
                    <h1 className="text-3xl font-black tracking-tight">Multi-Source Data Simulation</h1>
                </div>
                <p className="text-slate-400 text-sm ml-14">
                    Toggle data sources on/off. Edit EMR manually or randomize wearable, lab, pharmacy, and mental health data independently.
                </p>
            </motion.div>

            {/* Action bar */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }} className="mb-6 flex items-center gap-4 flex-wrap">
                <button
                    onClick={handleApply}
                    disabled={applying || !profile || activeSources.length === 0}
                    className="flex items-center gap-3 px-7 py-4 bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-50 rounded-2xl font-bold text-base shadow-lg shadow-violet-900/40 transition-all duration-200 active:scale-95"
                >
                    {applying ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {applying ? 'Applying…' : 'Apply to Dashboard'}
                </button>

                {/* Active sources badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    {(['emr', 'wearable', 'lab', 'pharmacy', 'mental'] as SourceKey[]).map(key => (
                        <button
                            key={key}
                            onClick={() => toggleSource(key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${enabledSources[key]
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                    : 'bg-white/5 border-white/5 text-slate-600'
                                }`}
                        >
                            {enabledSources[key] ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {key}
                        </button>
                    ))}
                </div>

                <AnimatePresence>
                    {showSuccess && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                            <CheckCircle2 className="w-4 h-4" /> Dashboard updated
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Source Cards Grid — 5 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                {/* ── EMR (editable) ── */}
                <SourceCard enabled={enabledSources.emr} borderColor="border-blue-500/20" bgGlow="bg-blue-500/5">
                    <CardHeader icon={<Stethoscope className="w-5 h-5 text-blue-400" />} color="bg-blue-500/15"
                        title="EMR Data" subtitle="Electronic Medical Records"
                        enabled={enabledSources.emr} onToggle={() => toggleSource('emr')} />
                    <span className="absolute top-5 right-14 text-[9px] font-bold uppercase tracking-widest text-blue-400/70 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">Editable</span>

                    <InputRow label="Age">
                        <input type="number" min={1} max={120} value={emr.age}
                            onChange={e => handleEmrChange('age', parseInt(e.target.value) || 1)} className={inputCls} />
                    </InputRow>
                    <InputRow label="Gender">
                        <select value={emr.gender} onChange={e => handleEmrChange('gender', e.target.value as EMRDraft['gender'])} className={selectCls}>
                            <option value="Male">Male</option><option value="Female">Female</option>
                        </select>
                    </InputRow>
                    <InputRow label="Condition">
                        <select value={emr.chronicCondition} onChange={e => handleEmrChange('chronicCondition', e.target.value as EMRDraft['chronicCondition'])} className={selectCls}>
                            <option value="None">None</option><option value="Diabetes">Diabetes</option>
                            <option value="Hypertension">Hypertension</option><option value="CKD">CKD</option>
                            <option value="Cardiac">Cardiac</option>
                        </select>
                    </InputRow>
                    <InputRow label="Med. Adherence">
                        <div className="flex items-center gap-2">
                            <input type="range" min={0} max={100} value={emr.medicationAdherence}
                                onChange={e => handleEmrChange('medicationAdherence', parseInt(e.target.value))}
                                className="w-20 accent-blue-400" />
                            <span className="text-sm font-bold text-white w-9 text-right">{emr.medicationAdherence}%</span>
                        </div>
                    </InputRow>
                    <InputRow label="Last Visit">
                        <input type="date" value={emr.lastVisitDate}
                            onChange={e => handleEmrChange('lastVisitDate', e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-sm font-bold text-white outline-none focus:border-blue-400/60 transition-colors" />
                    </InputRow>
                </SourceCard>

                {/* ── Wearable ── */}
                <SourceCard enabled={enabledSources.wearable} borderColor="border-emerald-500/20" bgGlow="bg-emerald-500/5">
                    <CardHeader icon={<Heart className="w-5 h-5 text-emerald-400" />} color="bg-emerald-500/15"
                        title="Wearable Device" subtitle="Real-time biometrics"
                        enabled={enabledSources.wearable} onToggle={() => toggleSource('wearable')} onShuffle={randomizeWearableLab} />
                    {p ? (
                        <motion.div key={p.heartRate} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <ReadonlyRow label="Heart Rate" value={p.heartRate} unit="bpm" />
                            <ReadonlyRow label="Blood Pressure" value={`${p.bloodPressureSystolic}/${p.bloodPressureDiastolic}`} unit="mmHg" />
                            <ReadonlyRow label="SpO2" value={p.spo2} unit="%" />
                            <ReadonlyRow label="Daily Steps" value={p.dailySteps.toLocaleString()} />
                            <ReadonlyRow label="Sleep Hours" value={p.sleepHours} unit="h/night" />
                        </motion.div>
                    ) : <EmptyState />}
                </SourceCard>

                {/* ── Lab ── */}
                <SourceCard enabled={enabledSources.lab} borderColor="border-orange-500/20" bgGlow="bg-orange-500/5">
                    <CardHeader icon={<FlaskConical className="w-5 h-5 text-orange-400" />} color="bg-orange-500/15"
                        title="Lab Report" subtitle="Biochemistry panel"
                        enabled={enabledSources.lab} onToggle={() => toggleSource('lab')} onShuffle={randomizeWearableLab} />
                    {p ? (
                        <motion.div key={p.hba1c} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <ReadonlyRow label="HbA1c" value={p.hba1c} unit="%" />
                            <ReadonlyRow label="Creatinine" value={p.creatinine} unit="mg/dL" />
                            <ReadonlyRow label="Cholesterol" value={p.cholesterol} unit="mg/dL" />
                            <ReadonlyRow label="BMI" value={p.bmi} unit="kg/m²" />
                        </motion.div>
                    ) : <EmptyState />}
                </SourceCard>

                {/* ── Pharmacy ── */}
                <SourceCard enabled={enabledSources.pharmacy} borderColor="border-pink-500/20" bgGlow="bg-pink-500/5">
                    <CardHeader icon={<Pill className="w-5 h-5 text-pink-400" />} color="bg-pink-500/15"
                        title="Pharmacy / Medications" subtitle="Prescription & compliance"
                        enabled={enabledSources.pharmacy} onToggle={() => toggleSource('pharmacy')} onShuffle={randomizePharmacy} />
                    {p ? (
                        <motion.div key={p.dosageCompliance} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="flex items-start justify-between py-2.5 border-b border-white/5">
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Medications</span>
                                <div className="text-right">
                                    {p.medications.map((m, i) => (
                                        <span key={i} className="block text-xs font-bold text-white leading-snug">{m}</span>
                                    ))}
                                </div>
                            </div>
                            <ReadonlyRow label="Dosage Compliance" value={p.dosageCompliance} unit="%" />
                            <ReadonlyRow label="Refill In" value={p.refillDaysRemaining} unit="days" />
                            <div className="flex items-center justify-between py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Adverse Risk</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${p.adverseReactionRisk === 'High' ? 'bg-red-500/15 text-red-400' :
                                        p.adverseReactionRisk === 'Moderate' ? 'bg-yellow-500/15 text-yellow-400' :
                                            'bg-emerald-500/15 text-emerald-400'}`}>
                                    {p.adverseReactionRisk}
                                </span>
                            </div>
                        </motion.div>
                    ) : <EmptyState />}
                </SourceCard>

                {/* ── Mental Health ── */}
                <SourceCard enabled={enabledSources.mental} borderColor="border-purple-500/20" bgGlow="bg-purple-500/5">
                    <CardHeader icon={<Brain className="w-5 h-5 text-purple-400" />} color="bg-purple-500/15"
                        title="Mental Health" subtitle="Psychological indicators"
                        enabled={enabledSources.mental} onToggle={() => toggleSource('mental')} onShuffle={randomizeMental} />
                    {p ? (
                        <motion.div key={p.stressLevel} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <ReadonlyRow label="Stress Level" value={`${p.stressLevel} / 10`} />
                            <ReadonlyRow label="Mood Score" value={`${p.moodScore} / 10`} />
                            <ReadonlyRow label="Anxiety Score" value={`${p.anxietyScore} / 10`} />
                            <ReadonlyRow label="PHQ-9 Score" value={p.phq9Score} />
                            <div className="flex items-center justify-between py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Sleep Quality</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${p.sleepQuality === 'Excellent' ? 'bg-emerald-500/15 text-emerald-400' :
                                        p.sleepQuality === 'Good' ? 'bg-blue-500/15 text-blue-400' :
                                            p.sleepQuality === 'Fair' ? 'bg-yellow-500/15 text-yellow-400' :
                                                'bg-red-500/15 text-red-400'}`}>
                                    {p.sleepQuality}
                                </span>
                            </div>
                        </motion.div>
                    ) : <EmptyState />}
                </SourceCard>

            </div>

            {/* Status bar */}
            <AnimatePresence>
                {p && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mt-6 flex items-center justify-between px-5 py-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4 text-violet-400" />
                            <span className="text-sm text-slate-300">
                                {activeSources.length} / 5 sources active · {emr.chronicCondition} · {emr.age} yr {emr.gender}
                            </span>
                        </div>
                        <button onClick={() => { const fresh = generateRandomProfile(); setProfile(fresh); }}
                            className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1.5 transition-colors">
                            <Shuffle className="w-3 h-3" /> Randomize All
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
