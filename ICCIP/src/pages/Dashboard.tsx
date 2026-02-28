import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, HealthRecord, HealthAnalysis, Alert, ChatMessage } from '../types';
import { analyzeHealth } from '../services/aiService';
import {
  Activity, TrendingUp, AlertCircle, Calendar,
  Plus, Clipboard, Heart, Brain, Utensils,
  ChevronRight, MessageSquare, Users, Stethoscope,
  Clock, Sun, Moon, ShieldAlert, X, Send,
  Paperclip, Check, CheckCheck, Trash2
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
  ReferenceLine, ComposedChart, Line, Scatter
} from 'recharts';
import { format } from 'date-fns';
import io from 'socket.io-client';
import { useHealthProfile } from '../context/HealthProfileContext';
import SimulatedProfileCard from '../components/SimulatedProfileCard';
import { getDisplayId } from '../utils/anonymize';
import WeeklyDietPlan from '../components/WeeklyDietPlan';
import { parseMessageContent } from '../utils/chatHelpers';





export default function Dashboard({ user }: { user: User }) {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [analysis, setAnalysis] = useState<HealthAnalysis | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [simulatedAlerts, setSimulatedAlerts] = useState<Alert[]>([]);
  const [doctors, setDoctors] = useState<any>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAddData, setShowAddData] = useState(false);
  const [showInitialSetup, setShowInitialSetup] = useState(false);
  const [newData, setNewData] = useState({ type: 'lab', data: '', routine: 'daily' });
  const [socket, setSocket] = useState<any>(null);
  const { profile, enabledSources } = useHealthProfile();
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  const dismissAlert = (key: string) =>
    setDismissedKeys(prev => new Set([...prev, key]));

  const [typingDoctors, setTypingDoctors] = useState<Set<number>>(new Set());
  const [attachment, setAttachment] = useState<{ name: string; type: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ref to scroll to Live Consultation when a specialist is clicked
  const chatRef = useRef<HTMLDivElement>(null);

  // Track when each alert key first appeared
  const alertSeenRef = useRef<Map<string, number>>(new Map());

  // Auto-dismiss alerts that have been visible for ≥ 2 minutes
  useEffect(() => {
    const AUTO_MS = 2 * 60 * 1000;
    const id = setInterval(() => {
      const now = Date.now();
      setDismissedKeys(prev => {
        const next = new Set(prev);
        alertSeenRef.current.forEach((seenAt, key) => {
          if (!prev.has(key) && now - seenAt >= AUTO_MS) {
            next.add(key);
          }
        });
        return next;
      });
    }, 15_000); // check every 15 s
    return () => clearInterval(id);
  }, []);


  useEffect(() => {
    fetchData();
    fetchDoctors();
    const newSocket = io();
    setSocket(newSocket);
    newSocket.emit('join_room', user.id);
    newSocket.on('new_alert', (alert: Alert) => {
      setAlerts(prev => prev.some(a => a.id === alert.id) ? prev : [alert, ...prev]);
    });
    newSocket.on('receive_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      // If we receive a message from the currently selected doctor, mark it read immediately
      setDoctors((currentDoctors) => {
        // Just emit mark_read. We can't access selectedDoctorId reliably here without adding it to deps,
        // which would reconnect socket on every select. Better to just mark read if we see it anyway.
        newSocket.emit('mark_read', { messageIds: [msg.id], senderId: msg.sender_id });
        return currentDoctors;
      });
    });
    newSocket.on('user_typing', (senderId: number) => {
      setTypingDoctors(prev => new Set(prev).add(senderId));
      setTimeout(() => {
        setTypingDoctors(prev => {
          const next = new Set(prev);
          next.delete(senderId);
          return next;
        });
      }, 3000);
    });
    newSocket.on('messages_read', (messageIds: number[]) => {
      setMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, message: JSON.stringify({ ...parseMessageContent(m.message), status: 'read' }) } : m));
    });
    newSocket.on('message_deleted', (msgId: number) => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, message: JSON.stringify({ ...parseMessageContent(m.message), is_deleted: true, text: '', attachment: null }) } : m));
    });
    newSocket.on('critical_alert', (alertData: any) => {
      setAlerts(prev => [{
        id: Date.now(), user_id: user.id, message: `AI Assistant: ${alertData.text}`,
        type: 'emergency', status: 'unread', timestamp: new Date().toISOString()
      }, ...prev]);
    });
    return () => {
      newSocket.close();
    };
  }, [user.id]);

  const fetchData = async () => {
    try {
      const [recRes, alertRes] = await Promise.all([
        fetch(`/api/records/${user.id}`),
        fetch(`/api/alerts/${user.id}`)
      ]);
      const recData = await recRes.json();
      const alertData = await alertRes.json();

      if (Array.isArray(recData)) {
        setRecords(recData);
        if (recData.length === 0) {
          setShowInitialSetup(true);
        } else {
          handleAnalyze(recData);
        }
      }

      if (Array.isArray(alertData)) {
        setAlerts(alertData);
        // Auto-dismiss all pre-existing alerts on login — only in-session alerts are shown
        setDismissedKeys(prev => {
          const next = new Set(prev);
          alertData.forEach((a: any) => next.add(`${a.id}-${a.timestamp}`));
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch('/api/doctors');
      const data = await res.json();
      if (data && !data.error) {
        setDoctors(data);
      }
    } catch (e) {
      console.error('Failed to fetch doctors:', e);
    }
  };

  const handleAnalyze = useCallback(async (data: HealthRecord[]) => {
    setIsAnalyzing(true);
    const result = await analyzeHealth(data);
    setAnalysis(result);
    setIsAnalyzing(false);
  }, []);

  // Re-analyze whenever a simulated profile is set — debounced so EMR edits don't spam
  useEffect(() => {
    if (!profile) return;

    const timer = setTimeout(() => {
      const now = new Date().toISOString();

      const emrRecord: HealthRecord = {
        id: -1, user_id: user.id, type: 'emr', timestamp: now,
        data: {
          age: profile.age, gender: profile.gender,
          chronicCondition: profile.chronicCondition,
          medicationAdherence: profile.medicationAdherence,
          lastVisitDate: profile.lastVisitDate,
        }
      };
      const wearableRecord: HealthRecord = {
        id: -2, user_id: user.id, type: 'wearable', timestamp: now,
        data: {
          heartRate: profile.heartRate,
          bloodPressure: `${profile.bloodPressureSystolic}/${profile.bloodPressureDiastolic}`,
          spo2: profile.spo2, dailySteps: profile.dailySteps, sleepHours: profile.sleepHours,
        }
      };
      const labRecord: HealthRecord = {
        id: -3, user_id: user.id, type: 'lab', timestamp: now,
        data: {
          hba1c: profile.hba1c, creatinine: profile.creatinine,
          cholesterol: profile.cholesterol, bmi: profile.bmi,
        }
      };

      // Replace simulated alerts entirely (no accumulation)
      const newSimAlerts: Alert[] = [];
      if (profile.hba1c > 8) newSimAlerts.push({ id: -10, user_id: user.id, message: `Simulated HbA1c is ${profile.hba1c}% — significantly above target. Diabetes management review recommended.`, type: 'risk', status: 'unread', timestamp: now });
      if (profile.bloodPressureSystolic > 145) newSimAlerts.push({ id: -11, user_id: user.id, message: `Simulated BP ${profile.bloodPressureSystolic}/${profile.bloodPressureDiastolic} mmHg — hypertensive range. Consult physician.`, type: 'risk', status: 'unread', timestamp: now });
      if (profile.heartRate > 100) newSimAlerts.push({ id: -12, user_id: user.id, message: `Simulated resting heart rate ${profile.heartRate} bpm — tachycardia detected.`, type: 'risk', status: 'unread', timestamp: now });
      if (profile.spo2 < 94) newSimAlerts.push({ id: -13, user_id: user.id, message: `Simulated SpO2 ${profile.spo2}% — low oxygen saturation. Respiratory check advised.`, type: 'emergency', status: 'unread', timestamp: now });
      if (profile.medicationAdherence < 60) newSimAlerts.push({ id: -14, user_id: user.id, message: `Medication adherence at ${profile.medicationAdherence}% — poor compliance detected.`, type: 'medication', status: 'unread', timestamp: now });
      setSimulatedAlerts(newSimAlerts);

      // Build health records only from enabled sources
      const merged: HealthRecord[] = [];
      if (enabledSources.emr) merged.push(emrRecord);
      if (enabledSources.wearable) merged.push(wearableRecord);
      if (enabledSources.lab) merged.push(labRecord);
      // Pharmacy & mental health as extra EMR/wearable fields for AI context
      if (enabledSources.pharmacy || enabledSources.mental) {
        merged.push({
          id: -4, user_id: user.id, type: 'emr', timestamp: now,
          data: {
            ...(enabledSources.pharmacy ? { medications: profile.medications, dosageCompliance: profile.dosageCompliance, refillDaysRemaining: profile.refillDaysRemaining, adverseReactionRisk: profile.adverseReactionRisk } : {}),
            ...(enabledSources.mental ? { stressLevel: profile.stressLevel, moodScore: profile.moodScore, anxietyScore: profile.anxietyScore, phq9Score: profile.phq9Score, sleepQuality: profile.sleepQuality } : {}),
          }
        });
      }
      merged.push(...records);
      handleAnalyze(merged);
    }, 400); // debounce — wait 400 ms after last change

    return () => clearTimeout(timer);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedData = JSON.parse(newData.data);
      await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          type: newData.type,
          data: parsedData,
          routine_type: newData.routine
        })
      });
      setShowAddData(false);
      setShowInitialSetup(false);
      setNewData({ type: 'lab', data: '', routine: 'daily' });
      fetchData();
    } catch (e) {
      alert('Invalid JSON data format');
    }
  };



  const allAlerts = [...simulatedAlerts, ...alerts]
    .filter((a, idx, arr) => arr.findIndex(b => b.id === a.id) === idx); // deduplicate by id

  // ── Risk Trend: build a 30-day rolling series ─────────────────────────────
  const generateTrendData = () => {
    // If AI returned a trend, use it but ensure enough points
    if (analysis?.riskTrend && analysis.riskTrend.length >= 5) {
      return analysis.riskTrend.map(p => ({ ...p, danger: p.score > 70 ? p.score : null }));
    }

    // Derive a base risk value from what we know
    const baseScore = profile
      ? Math.round(
        (profile.hba1c > 8 ? 25 : profile.hba1c > 6.5 ? 12 : 5) +
        (profile.bloodPressureSystolic > 150 ? 20 : profile.bloodPressureSystolic > 135 ? 10 : 3) +
        (profile.heartRate > 100 ? 15 : profile.heartRate > 90 ? 7 : 2) +
        (profile.spo2 < 93 ? 20 : profile.spo2 < 96 ? 8 : 0) +
        (profile.medicationAdherence < 50 ? 15 : profile.medicationAdherence < 75 ? 7 : 0) +
        (profile.bmi > 35 ? 5 : 0)
      )
      : analysis?.riskScore ?? 42;

    // Generate 30 daily points with realistic noise & a slow trend
    const pts: { date: string; score: number; danger: number | null }[] = [];
    let val = Math.max(10, Math.min(90, baseScore));
    const drift = profile?.chronicCondition !== 'None' ? 0.25 : -0.1;
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Add weekly cycle + random jitter
      const weekly = Math.sin((i / 7) * Math.PI) * 4;
      const jitter = (Math.random() - 0.5) * 10;
      val = Math.max(5, Math.min(95, val + drift + jitter * 0.4 + weekly * 0.3));
      const score = Math.round(val);
      pts.push({
        date: format(d, 'MM/dd'),
        score,
        danger: score > 70 ? score : null,
      });
    }
    return pts;
  };

  const chartData = generateTrendData();
  const latestScore = chartData[chartData.length - 1]?.score ?? 0;
  const trendDirection = chartData.length >= 3
    ? chartData[chartData.length - 1].score - chartData[chartData.length - 3].score
    : 0;


  return (
    <div className="space-y-6">
      {/* Simulated profile banner — full-width, only when active */}
      {profile && <SimulatedProfileCard profile={profile} enabledSources={enabledSources} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Risk & AI Analysis */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4">
              <TrendingUp className="w-6 h-6 text-emerald-400 opacity-50" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">Health Risk Index</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tighter text-white">
                {analysis?.riskScore || '--'}
              </span>
              <span className="text-slate-400 text-sm font-medium">/ 100</span>
            </div>
            <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis?.riskScore || 0}%` }}
                className={`h-full ${analysis?.riskScore && analysis.riskScore > 70 ? 'bg-red-500' : 'bg-emerald-500'}`}
              />
            </div>
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              {analysis?.summary || 'Analyzing your health data to generate a real-time risk score...'}
            </p>
            {analysis?.diagnosisFeedback && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Diagnosis Feedback</p>
                <p className="text-[11px] text-emerald-200 leading-tight">{analysis.diagnosisFeedback}</p>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-lg">AI 6-Month Projection</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed italic">
              "{analysis?.projection || 'Gathering more data to project your health trajectory...'}"
            </p>
            {analysis?.diseaseRisks && analysis.diseaseRisks.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold text-purple-400 uppercase">Potential Risks</p>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(analysis.diseaseRisks) && analysis.diseaseRisks.map((risk, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md text-[10px] text-purple-300">
                      {risk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Daily Routine</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {analysis?.routineImpact.daily || 'Monitoring...'}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Weekend Routine</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {analysis?.routineImpact.weekend || 'Monitoring...'}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Middle Column: Timeline & Metrics */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-lg">Risk Trend Timeline</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold flex items-center gap-1 ${trendDirection > 5 ? 'text-red-400' : trendDirection < -5 ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                  {trendDirection > 5 ? '▲ Rising' : trendDirection < -5 ? '▼ Falling' : '● Stable'}
                </span>
                <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-md text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  30-day window
                </div>
              </div>
            </div>

            {/* Mini stats row */}
            <div className="flex gap-4 mb-4">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-600 uppercase tracking-widest">Current</span>
                <span className={`text-lg font-black ${latestScore > 70 ? 'text-red-400' : latestScore > 45 ? 'text-yellow-400' : 'text-emerald-400'
                  }`}>{latestScore}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-600 uppercase tracking-widest">Peak</span>
                <span className="text-lg font-black text-slate-300">{Math.max(...chartData.map(d => d.score))}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-600 uppercase tracking-widest">Low</span>
                <span className="text-lg font-black text-slate-300">{Math.min(...chartData.map(d => d.score))}</span>
              </div>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="60%" stopColor="#10b981" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#ffffff08" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #ffffff15',
                      borderRadius: '12px',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}
                    itemStyle={{ color: '#10b981', fontSize: 11, fontWeight: 700 }}
                    formatter={(v: number) => [`${v} / 100`, 'Risk Score']}
                  />
                  {/* Danger threshold line */}
                  <ReferenceLine
                    y={70}
                    stroke="#ef444440"
                    strokeDasharray="4 4"
                    label={{ value: 'High Risk', position: 'insideTopRight', fill: '#ef4444', fontSize: 9 }}
                  />
                  {/* Safe gradient fill */}
                  <Area
                    type="monotoneX"
                    dataKey="score"
                    stroke="none"
                    fill="url(#riskGrad)"
                    isAnimationActive
                  />
                  {/* Main trend line */}
                  <Line
                    type="monotoneX"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                    isAnimationActive
                    animationDuration={800}
                  />
                  {/* Danger zone overlay */}
                  <Area
                    type="monotoneX"
                    dataKey="danger"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#dangerGrad)"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg">Available Specialists</h3>
              </div>
            </div>
            {/* Specialists list */}
            {Object.keys(doctors).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-600">
                <Stethoscope className="w-8 h-8 opacity-20" />
                <p className="text-xs">No physicians available yet.</p>
                <p className="text-[10px] text-slate-700">Check back later or contact support.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {Object.entries(doctors).map(([spec, docs]: [string, any]) => (
                  <div key={spec} className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{spec}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {Array.isArray(docs) && docs.map((doc: any) => {
                        const isSelected = selectedDoctorId === doc.id;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => {
                              setSelectedDoctorId(doc.id);
                              setTimeout(() => chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/5 border-white/5 hover:border-emerald-500/30'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                {getDisplayId(doc.id, 'physician').slice(-4)}
                              </div>
                              <div>
                                <div className="text-xs font-bold">{getDisplayId(doc.id, 'physician')}</div>
                                <div className="text-[9px] text-slate-400">{doc.name}</div>
                                <div className="text-[9px] text-slate-600">{doc.specialization || doc.hospital_name}</div>
                              </div>
                            </div>
                            <MessageSquare className={`w-4 h-4 transition-colors ${isSelected ? 'text-emerald-400' : 'text-slate-600'}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Alerts & Nutrition */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-6 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-bold">Health Alerts</h3>
            </div>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {Array.isArray(allAlerts) && allAlerts.length > 0 ? allAlerts
                  .filter(alert => !dismissedKeys.has(`${alert.id}-${alert.timestamp}`))
                  .map((alert, i) => {
                    const key = `${alert.id}-${alert.timestamp}`;
                    // Record first-seen time for auto-dismiss
                    if (!alertSeenRef.current.has(key)) {
                      alertSeenRef.current.set(key, Date.now());
                    }
                    return (
                      <motion.div
                        key={key}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 40, opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`p-4 rounded-2xl border ${alert.type === 'emergency' ? 'bg-red-500/10 border-red-500/30' :
                          alert.id! < 0 ? 'bg-violet-500/10 border-violet-500/20' :
                            'bg-orange-500/10 border-orange-500/30'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            {alert.id! < 0 && <ShieldAlert className="w-3 h-3 text-violet-400" />}
                            {alert.type === 'medication' && alert.id! >= 0 && <Clock className="w-3 h-3 text-orange-400" />}
                            <p className="text-xs font-bold uppercase tracking-tighter">
                              {alert.id! < 0 ? '⚡ Simulated · ' : ''}{alert.type}
                            </p>
                          </div>
                          <button
                            onClick={() => dismissAlert(key)}
                            className="shrink-0 p-0.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/10 transition-all"
                            title="Dismiss"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-300">{alert.message}</p>
                        <div className="text-[10px] opacity-50 mt-2">{format(new Date(alert.timestamp), 'HH:mm')}</div>
                      </motion.div>
                    );
                  })
                  : (
                    <div className="text-center py-8 text-slate-600 text-sm">No active alerts</div>
                  )}
              </AnimatePresence>
            </div>
          </div>

          <WeeklyDietPlan />


          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <h3 className="font-bold mb-4">AI Recommendations</h3>
            <div className="space-y-3">
              {Array.isArray(analysis?.recommendations) && analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3 text-[11px] text-slate-400">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  {rec}
                </div>
              )) || <p className="text-slate-600 text-xs">No recommendations yet</p>}
            </div>
          </div>

          {/* Live Consultation */}
          <div ref={chatRef} className="bg-slate-900/40 backdrop-blur-xl border border-blue-500/20 rounded-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/5 bg-blue-500/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-blue-300">Live Consultation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-slate-500">Live</span>
              </div>
            </div>

            {/* Doctor selector */}
            <div className="px-4 pt-3 pb-2 border-b border-white/5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Consulting with</label>
              <select
                value={selectedDoctorId ?? ''}
                onChange={e => setSelectedDoctorId(Number(e.target.value) || null)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500/50 text-white"
              >
                <option value="">— Select a doctor —</option>
                {Object.entries(doctors).flatMap(([, docs]: [string, any]) =>
                  (Array.isArray(docs) ? docs : []).map((doc: any) => (
                    <option key={doc.id} value={doc.id}>
                      {getDisplayId(doc.id, 'physician')} · {doc.name} · {doc.specialization || doc.hospital_name || 'Physician'}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[260px] relative">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 text-[11px] text-center py-6">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                  {selectedDoctorId ? 'No messages yet. Say hello!' : 'Select a doctor to start a consultation.'}
                </div>
              ) : (
                messages
                  .filter(m =>
                    (m.sender_id === user.id && m.receiver_id === selectedDoctorId) ||
                    (m.receiver_id === user.id && m.sender_id === selectedDoctorId)
                  )
                  .map((msg, i) => {
                    const parsed = parseMessageContent(msg.message);
                    const isMine = msg.sender_id === user.id;
                    const isDeleted = parsed.is_deleted;

                    return (
                      <div key={i} className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-snug relative ${isMine
                          ? 'bg-blue-600/90 text-white font-medium rounded-br-sm'
                          : 'bg-white/10 text-white rounded-bl-sm'
                          } ${isDeleted ? 'opacity-50 italic' : ''}`}>

                          {isDeleted ? (
                            <span>This message was deleted.</span>
                          ) : (
                            <>
                              {parsed.attachment && (
                                <div className="flex items-center gap-2 mb-2 p-2 bg-black/20 rounded border border-white/10">
                                  <Paperclip className="w-4 h-4" />
                                  <a href={parsed.attachment.url} target="_blank" rel="noopener noreferrer" className="truncate text-[11px] font-bold text-blue-300 hover:underline">
                                    {parsed.attachment.name}
                                  </a>
                                </div>
                              )}
                              <span>{parsed.text}</span>
                            </>
                          )}

                          <div className={`text-[8px] mt-1 opacity-70 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {format(new Date(msg.timestamp), 'HH:mm')}
                            {isMine && !isDeleted && (
                              parsed.status === 'read' ? <CheckCheck className="w-3 h-3 text-blue-300" /> : <Check className="w-3 h-3" />
                            )}
                          </div>

                          {/* Delete Button (Hover) */}
                          {isMine && !isDeleted && (
                            <button
                              onClick={() => socket?.emit('delete_message', { messageId: msg.id, userId: user.id, receiverId: selectedDoctorId })}
                              className="absolute top-1 -left-6 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-600 mt-0.5 px-1">
                          {isMine
                            ? `${getDisplayId(user.id, user.role)} (You)`
                            : getDisplayId(msg.sender_id, 'physician')}
                        </span>
                      </div>
                    );
                  })
              )}
              {selectedDoctorId && typingDoctors.has(selectedDoctorId) && (
                <div className="flex gap-1 items-center px-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={e => {
                e.preventDefault();
                if ((!newMessage.trim() && !attachment) || !selectedDoctorId || !socket) return;

                const payload = {
                  text: newMessage.trim(),
                  attachment: attachment,
                  status: 'sent',
                  is_deleted: false,
                };

                const msg: ChatMessage = {
                  id: Date.now(),
                  sender_id: user.id,
                  receiver_id: selectedDoctorId,
                  message: JSON.stringify(payload),
                  timestamp: new Date().toISOString(),
                };

                socket.emit('send_message', {
                  senderId: msg.sender_id,
                  receiverId: msg.receiver_id,
                  message: msg.message,
                });

                setMessages(prev => [...prev, msg]);
                setNewMessage('');
                setAttachment(null);
              }}
              className="p-3 border-t border-white/5 bg-black/30 flex items-center gap-2 relative"
            >
              {attachment && (
                <div className="absolute bottom-[105%] left-2 right-2 p-2 bg-slate-800 border border-white/10 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xl">
                  <div className="flex items-center gap-2 max-w-[85%]">
                    <Paperclip className="w-4 h-4 text-emerald-400" />
                    <span className="truncate">{attachment.name}</span>
                  </div>
                  <button type="button" onClick={() => setAttachment(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAttachment({ name: file.name, type: file.type, url: URL.createObjectURL(file) });
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedDoctorId}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={selectedDoctorId ? 'Type a secure message…' : 'Select a doctor first'}
                value={newMessage}
                disabled={!selectedDoctorId}
                onChange={e => {
                  setNewMessage(e.target.value);
                  if (selectedDoctorId && socket) socket.emit('typing', { senderId: user.id, receiverId: selectedDoctorId });
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500/50 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!selectedDoctorId || (!newMessage.trim() && !attachment)}
                className="p-2 bg-blue-500 disabled:opacity-40 text-black rounded-xl hover:bg-blue-400 transition-all font-bold"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Add Data Modal */}
        <AnimatePresence>
          {(showAddData || showInitialSetup) && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !showInitialSetup && setShowAddData(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 border border-white/10 p-8 rounded-3xl w-full max-w-lg relative z-10"
              >
                <h2 className="text-2xl font-bold mb-2">{showInitialSetup ? 'Initial Health Setup' : 'Add Health Data'}</h2>
                <p className="text-slate-500 text-sm mb-6">
                  {showInitialSetup ? 'Please provide your baseline health data for AI prediction.' : 'Feed new lab reports or wearable data to the AI.'}
                </p>
                <form onSubmit={handleAddData} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Data Source</label>
                      <select
                        value={newData.type}
                        onChange={(e) => setNewData({ ...newData, type: e.target.value as any })}
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 outline-none text-sm"
                      >
                        <option value="lab">Lab Report</option>
                        <option value="wearable">Wearable Device</option>
                        <option value="emr">EMR Record</option>
                        <option value="routine">Routine Log</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Routine Type</label>
                      <select
                        value={newData.routine}
                        onChange={(e) => setNewData({ ...newData, routine: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 outline-none text-sm"
                      >
                        <option value="daily">Daily/Weekday</option>
                        <option value="weekend">Weekend</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">JSON Payload (Metrics)</label>
                    <textarea
                      value={newData.data}
                      onChange={(e) => setNewData({ ...newData, data: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-4 h-40 font-mono text-xs outline-none focus:border-emerald-500/50"
                      placeholder='{"heartRate": 75, "bloodPressure": "120/80", "glucose": 105}'
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setShowAddData(false); setShowInitialSetup(false); }}
                      className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-bold transition-all"
                    >
                      {showInitialSetup ? 'Start Prediction' : 'Submit Data'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
