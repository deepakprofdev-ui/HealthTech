import { motion } from 'motion/react';
import { Stethoscope, Heart, FlaskConical, Cpu, Pill, Brain, WifiOff } from 'lucide-react';
import { SimulatedHealthProfile, EnabledSources } from '../types';

function Row({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
            <span className="text-xs font-bold text-white">
                {value}<span className="text-slate-400 font-normal ml-1">{unit}</span>
            </span>
        </div>
    );
}

function MiniCard({ icon, color, title, enabled, children }: {
    icon: React.ReactNode; color: string; title: string; enabled: boolean; children: React.ReactNode;
}) {
    return (
        <div className={`rounded-2xl p-4 border transition-all ${enabled ? 'bg-black/20 border-white/5' : 'bg-black/10 border-white/[0.03] opacity-40'}`}>
            <div className={`flex items-center justify-between mb-3`}>
                <div className={`flex items-center gap-2 ${color}`}>
                    {icon}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{title}</span>
                </div>
                {!enabled && <WifiOff className="w-3 h-3 text-slate-700" />}
            </div>
            {children}
        </div>
    );
}

interface Props {
    profile: SimulatedHealthProfile;
    enabledSources?: EnabledSources;
    patientLabel?: string;
}

export default function SimulatedProfileCard({ profile: p, enabledSources, patientLabel }: Props) {
    const en = enabledSources ?? { emr: true, wearable: true, lab: true, pharmacy: true, mental: true };

    const riskLevel =
        p.hba1c > 8 || p.bloodPressureSystolic > 150 || p.heartRate > 100 || p.stressLevel >= 8 ? 'High' :
            p.hba1c > 6.5 || p.bloodPressureSystolic > 135 || p.stressLevel >= 6 ? 'Moderate' : 'Low';

    const riskColor =
        riskLevel === 'High' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
            riskLevel === 'Moderate' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

    const activeCount = Object.values(en).filter(Boolean).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-violet-500/20 rounded-3xl p-5"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-500/15 rounded-lg">
                        <Cpu className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold">Simulated Health Profile</h3>
                        {patientLabel && <p className="text-[10px] text-slate-500">{patientLabel}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[9px] text-slate-500">{activeCount}/5 sources</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${riskColor}`}>
                        {riskLevel} Risk
                    </span>
                </div>
            </div>

            {/* Cards grid: responsive 2-3 cols */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                <MiniCard icon={<Stethoscope className="w-3.5 h-3.5" />} color="text-blue-400" title="EMR" enabled={en.emr}>
                    <Row label="Age" value={p.age} unit="yrs" />
                    <Row label="Gender" value={p.gender} />
                    <Row label="Condition" value={p.chronicCondition} />
                    <Row label="Med. Adh." value={p.medicationAdherence} unit="%" />
                </MiniCard>

                <MiniCard icon={<Heart className="w-3.5 h-3.5" />} color="text-emerald-400" title="Wearable" enabled={en.wearable}>
                    <Row label="HR" value={p.heartRate} unit="bpm" />
                    <Row label="BP" value={`${p.bloodPressureSystolic}/${p.bloodPressureDiastolic}`} />
                    <Row label="SpO2" value={p.spo2} unit="%" />
                    <Row label="Steps" value={p.dailySteps.toLocaleString()} />
                </MiniCard>

                <MiniCard icon={<FlaskConical className="w-3.5 h-3.5" />} color="text-orange-400" title="Lab" enabled={en.lab}>
                    <Row label="HbA1c" value={p.hba1c} unit="%" />
                    <Row label="Creat." value={p.creatinine} unit="mg/dL" />
                    <Row label="Choles." value={p.cholesterol} unit="mg/dL" />
                    <Row label="BMI" value={p.bmi} />
                </MiniCard>

                <MiniCard icon={<Pill className="w-3.5 h-3.5" />} color="text-pink-400" title="Pharmacy" enabled={en.pharmacy}>
                    <Row label="Meds" value={p.medications?.length ?? 0} unit="active" />
                    <Row label="Compliance" value={p.dosageCompliance ?? '—'} unit="%" />
                    <Row label="Refill" value={p.refillDaysRemaining ?? '—'} unit="d" />
                    <Row label="Adv. Risk" value={p.adverseReactionRisk ?? '—'} />
                </MiniCard>

                <MiniCard icon={<Brain className="w-3.5 h-3.5" />} color="text-purple-400" title="Mental" enabled={en.mental}>
                    <Row label="Stress" value={`${p.stressLevel ?? '—'}/10`} />
                    <Row label="Mood" value={`${p.moodScore ?? '—'}/10`} />
                    <Row label="PHQ-9" value={p.phq9Score ?? '—'} />
                    <Row label="Sleep Q." value={p.sleepQuality ?? '—'} />
                </MiniCard>
            </div>
        </motion.div>
    );
}
