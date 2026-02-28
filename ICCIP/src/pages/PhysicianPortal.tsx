import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, HealthRecord, Alert, ChatMessage } from '../types';
import {
  Users, Search, AlertCircle, MessageSquare,
  Activity, Clipboard, TrendingUp, Calendar,
  ChevronRight, Send, Phone, Video, FileText,
  Filter, ShieldAlert, Stethoscope, X, History,
  Paperclip, Check, CheckCheck, Trash2, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import io from 'socket.io-client';
import { useHealthProfile } from '../context/HealthProfileContext';
import SimulatedProfileCard from '../components/SimulatedProfileCard';
import { getDisplayId } from '../utils/anonymize';
import { parseMessageContent } from '../utils/chatHelpers';

export default function PhysicianPortal({ user }: { user: User }) {
  const [patients, setPatients] = useState<User[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'high-risk' | 'stable'>('all');
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const { profile, enabledSources } = useHealthProfile();
  const [showConvPopup, setShowConvPopup] = useState(false);
  const [convHistory, setConvHistory] = useState<ChatMessage[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [typingPatients, setTypingPatients] = useState<Set<number>>(new Set());
  const [attachment, setAttachment] = useState<{ name: string; type: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    fetchPatients();
    const newSocket = io();
    setSocket(newSocket);
    newSocket.emit('join_room', user.id);
    newSocket.on('receive_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setConvHistory(prev => [...prev, msg]);
      // Auto mark read if chat is open and it's from current patient
      setSelectedPatient(currentPatient => {
        if (currentPatient && msg.sender_id === currentPatient.id) {
          newSocket.emit('mark_read', { messageIds: [msg.id], senderId: msg.sender_id });
        }
        return currentPatient;
      });
    });
    newSocket.on('user_typing', (senderId: number) => {
      setTypingPatients(prev => new Set(prev).add(senderId));
      setTimeout(() => setTypingPatients(prev => {
        const next = new Set(prev); next.delete(senderId); return next;
      }), 3000);
    });
    newSocket.on('messages_read', (messageIds: number[]) => {
      const updateMsg = (m: ChatMessage) => messageIds.includes(m.id) ? { ...m, message: JSON.stringify({ ...parseMessageContent(m.message), status: 'read' }) } : m;
      setMessages(prev => prev.map(updateMsg));
      setConvHistory(prev => prev.map(updateMsg));
    });
    newSocket.on('message_deleted', (msgId: number) => {
      const updateMsg = (m: ChatMessage) => m.id === msgId ? { ...m, message: JSON.stringify({ ...parseMessageContent(m.message), is_deleted: true, text: '', attachment: null }) } : m;
      setMessages(prev => prev.map(updateMsg));
      setConvHistory(prev => prev.map(updateMsg));
    });
    newSocket.on('critical_alert', (alertData: any) => {
      alert(`URGENT AI ALERT: ${alertData.text}`);
    });
    return () => {
      newSocket.close();
    };
  }, [user.id]);

  const fetchPatients = async () => {
    try {
      const res = await fetch('/api/patients');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPatients(data);
      }
    } catch (e) {
      console.error('Failed to fetch patients:', e);
    }
  };

  const fetchPatientData = async (patientId: number) => {
    const [recRes, reportRes] = await Promise.all([
      fetch(`/api/records/${patientId}`),
      fetch(`/api/reports/monthly/${patientId}`)
    ]);
    setRecords(await recRes.json());
    setMonthlyReport(await reportRes.json());
  };

  const handleSelectPatient = (patient: User) => {
    setSelectedPatient(patient);
    fetchPatientData(patient.id);
    setMessages([]); // clear old chat on new patient select
  };

  const fetchConversation = async (patientId: number) => {
    setConvLoading(true);
    setConvHistory([]);
    try {
      const res = await fetch(`/api/messages?userId1=${user.id}&userId2=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setConvHistory(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load conversation', e);
    } finally {
      setConvLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !selectedPatient || !socket) return;

    const payload = {
      text: newMessage.trim(),
      attachment: attachment,
      status: 'sent',
      is_deleted: false,
    };

    const msgData: ChatMessage = {
      id: Date.now(),
      sender_id: user.id,
      receiver_id: selectedPatient.id,
      message: JSON.stringify(payload),
      timestamp: new Date().toISOString()
    };

    socket.emit('send_message', {
      senderId: msgData.sender_id,
      receiverId: msgData.receiver_id,
      message: msgData.message
    });

    setMessages(prev => [...prev, msgData]);
    setConvHistory(prev => [...prev, msgData]);
    setNewMessage('');
    setAttachment(null);
  };

  const sendAlert = async (type: 'medication' | 'risk' | 'emergency', message: string) => {
    if (!selectedPatient) return;
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedPatient.id, message, type })
    });
    alert(`Alert sent to ${selectedPatient.name}`);
  };

  const filteredPatients = Array.isArray(patients) ? patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <>
      <div className="h-[calc(100vh-120px)] grid grid-cols-12 gap-6">
        {/* Patient List */}
        <div className="col-span-3 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Patients
              </h2>
              <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {patients.length} Total
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/20 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500/50 transition-all"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-blue-500 text-black' : 'bg-white/5 text-slate-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('high-risk')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${filter === 'high-risk' ? 'bg-red-500 text-black' : 'bg-white/5 text-slate-400'}`}
              >
                High Risk
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredPatients.map(patient => (
              <motion.div
                key={patient.id}
                onClick={() => handleSelectPatient(patient)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedPatient?.id === patient.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-transparent hover:border-white/10'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">
                    {getDisplayId(patient.id, 'patient').slice(-4)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{getDisplayId(patient.id, 'patient')}</div>
                    <div className="text-[10px] text-slate-500">{patient.name}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Patient Detail View */}
        <div className="col-span-9 space-y-6 overflow-y-auto pr-2">
          {selectedPatient ? (
            <>
              <div className="flex items-center justify-between bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-blue-500/20 flex items-center justify-center text-2xl font-bold text-blue-400">
                    {getDisplayId(selectedPatient.id, 'patient').slice(-4)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{getDisplayId(selectedPatient.id, 'patient')}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedPatient.name}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> Stable Condition
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Last Visit: 2 days ago
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                    <Phone className="w-5 h-5 text-slate-400" />
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                    <Video className="w-5 h-5 text-slate-400" />
                  </button>
                  <button
                    onClick={() => sendAlert('emergency', 'EMERGENCY: Immediate medical attention required.')}
                    className="px-6 bg-red-500 hover:bg-red-400 text-black font-bold rounded-2xl transition-all flex items-center gap-2"
                  >
                    <ShieldAlert className="w-5 h-5" />
                    Emergency
                  </button>
                  <button
                    onClick={() => { fetchConversation(selectedPatient.id); setShowConvPopup(true); }}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-2xl text-blue-400 text-xs font-bold transition-all"
                  >
                    <History className="w-4 h-4" />
                    View Conversation
                  </button>
                </div>
              </div>

              {/* Simulated Profile Data */}
              {profile && (
                <SimulatedProfileCard
                  profile={profile}
                  enabledSources={enabledSources}
                  patientLabel={`Applied from simulation panel · ${selectedPatient.name}`}
                />
              )}

              <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Metrics & Reports */}
                <div className="col-span-8 space-y-6">
                  <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Monthly Clinical Report
                      </h3>
                      <span className="text-xs text-slate-500 font-mono uppercase">{monthlyReport?.month || 'February 2026'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Avg Risk</div>
                        <div className="text-2xl font-black text-emerald-400">{monthlyReport?.averageRisk || '--'}%</div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Alerts Sent</div>
                        <div className="text-2xl font-black text-orange-400">4</div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Compliance</div>
                        <div className="text-2xl font-black text-blue-400">92%</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Key Events</h4>
                        <ul className="space-y-2">
                          {Array.isArray(monthlyReport?.keyEvents) && monthlyReport.keyEvents.map((event: string, i: number) => (
                            <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-purple-500" />
                              {event}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Clinical Summary</h4>
                        <p className="text-sm text-slate-400 leading-relaxed italic bg-black/20 p-4 rounded-2xl border border-white/5">
                          "{monthlyReport?.clinicalSummary || 'Generating summary...'}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <h3 className="font-bold mb-4">Recent Health Records</h3>
                    <div className="space-y-3">
                      {Array.isArray(records) && records.map((record, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                              {record.type === 'lab' ? <Clipboard className="w-5 h-5 text-blue-400" /> : <Activity className="w-5 h-5 text-emerald-400" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold capitalize">{record.type} Report</div>
                              <div className="text-[10px] text-slate-500">{format(new Date(record.timestamp), 'MMM d, yyyy HH:mm')}</div>
                            </div>
                          </div>
                          <button className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:underline">View Details</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Actions & Chat */}
                <div className="col-span-4 space-y-6">
                  <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => sendAlert('medication', 'Reminder: Take your morning medication.')}
                        className="w-full py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-2xl text-orange-400 text-xs font-bold transition-all"
                      >
                        Medication Reminder
                      </button>
                      <button
                        onClick={() => sendAlert('risk', 'AI Alert: Your heart rate trend is increasing. Please rest.')}
                        className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-2xl text-blue-400 text-xs font-bold transition-all"
                      >
                        Risk Advisory
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold uppercase tracking-widest">Live Consultation</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${msg.sender_id === user.id ? 'bg-blue-500 text-black' : 'bg-white/10 text-white'}`}>
                            {msg.message}
                          </div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5 flex gap-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500/50"
                      />
                      <button type="submit" className="p-2 bg-blue-500 text-black rounded-xl hover:bg-blue-400 transition-all">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/20 border border-white/5 border-dashed rounded-3xl">
              <Users className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a patient to view analytics</p>
              <p className="text-sm">Real-time health monitoring and AI insights will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Conversation History Popup ─────────────────────── */}
      <AnimatePresence>
        {showConvPopup && selectedPatient && (
          <>
            <motion.div
              key="conv-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConvPopup(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              key="conv-modal"
              initial={{ opacity: 0, scale: 0.92, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 40 }}
              transition={{ type: 'spring', damping: 24, stiffness: 280 }}
              className="fixed inset-x-0 top-1/2 -translate-y-1/2 mx-auto z-50 w-full max-w-lg px-4"
            >
              <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 bg-blue-500/10 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-xs">
                      {getDisplayId(selectedPatient.id, 'patient').slice(-4)}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{getDisplayId(selectedPatient.id, 'patient')}</p>
                      <p className="text-[10px] text-slate-500">
                        {selectedPatient.name} &middot; {convHistory.length} message{convHistory.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowConvPopup(false)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 h-[400px] overflow-y-auto space-y-3 relative">
                  {convLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <span className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" />
                    </div>
                  ) : convHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
                      <MessageSquare className="w-10 h-10 opacity-30" />
                      <p className="text-sm">No messages yet with this patient.</p>
                      <p className="text-xs text-slate-700">Start the conversation below.</p>
                    </div>
                  ) : convHistory.map((msg, i) => {
                    const isMine = msg.sender_id === user.id;
                    const parsed = parseMessageContent(msg.message);
                    const isDeleted = parsed.is_deleted;

                    return (
                      <div key={i} className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed relative ${isMine ? 'bg-blue-600/90 text-white rounded-br-md font-medium' : 'bg-white/10 text-white rounded-bl-md'} ${isDeleted ? 'opacity-50 italic' : ''}`}>
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

                          {/* Delete Hover */}
                          {isMine && !isDeleted && (
                            <button
                              onClick={() => socket?.emit('delete_message', { messageId: msg.id, userId: user.id, receiverId: selectedPatient.id })}
                              className="absolute top-1 -left-6 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-600 mt-1 px-1">
                          {isMine
                            ? `${getDisplayId(user.id, user.role)} (You)`
                            : `${getDisplayId(selectedPatient.id, 'patient')} · ${selectedPatient.name}`
                          }
                        </span>
                      </div>
                    );
                  })}

                  {selectedPatient && typingPatients.has(selectedPatient.id) && (
                    <div className="flex gap-1 items-center px-4 py-2 opacity-50">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  )}
                </div>

                <div className="bg-black/30 w-full pt-3">
                  {/* AI Smart Replies Container */}
                  <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                    {['How are your symptoms today?', 'Remember to take your meds.', 'Please schedule a follow-up.', 'Your labs look stable.', 'We need to adjust your dosage.'].map((reply, idx) => (
                      <button key={idx} type="button" onClick={() => setNewMessage(reply)} className="whitespace-nowrap px-3 py-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full border border-blue-500/20 hover:bg-blue-500/20 flex items-center gap-1.5 transition-colors">
                        <Sparkles className="w-3 h-3" /> {reply}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(e); }}
                    className="px-5 py-4 border-t border-white/5 flex items-center gap-2 relative bg-slate-900/50"
                  >
                    {attachment && (
                      <div className="absolute bottom-[105%] left-2 right-2 p-2 bg-slate-800 border border-white/10 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xl">
                        <div className="flex items-center gap-2 max-w-[85%]">
                          <Paperclip className="w-4 h-4 text-blue-400" />
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
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      placeholder="Type a secure message…"
                      value={newMessage}
                      onChange={e => {
                        setNewMessage(e.target.value);
                        if (selectedPatient && socket) socket.emit('typing', { senderId: user.id, receiverId: selectedPatient.id });
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <button type="submit" disabled={!newMessage.trim() && !attachment} className="p-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:hover:bg-blue-500 text-black rounded-xl transition-all">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
