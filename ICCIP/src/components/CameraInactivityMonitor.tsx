import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, CameraOff, LogOut, ShieldAlert, X } from 'lucide-react';

const INACTIVE_LOGOUT_MS = 15 * 60 * 1000;  // 15 minutes
const WARN_AT_MS = 14 * 60 * 1000;  // warn at 14 min
const SAMPLE_INTERVAL_MS = 3_000;           // check every 3 s
const MOTION_THRESHOLD = 8;              // pixel diff MAD to count as motion

interface Props {
    onLogout: () => void;
}

export default function CameraInactivityMonitor({ onLogout }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const prevDataRef = useRef<Uint8ClampedArray | null>(null);
    const lastMotionRef = useRef<number>(Date.now());
    const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [camStatus, setCamStatus] = useState<'requesting' | 'active' | 'denied'>('requesting');
    const [showWarning, setShowWarning] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(60);
    const [minimized, setMinimized] = useState(false);

    // ── Motion detection ────────────────────────────────────────────────────
    const sampleFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const W = 80, H = 60; // thumbnail resolution — fast & enough
        canvas.width = W;
        canvas.height = H;
        ctx.drawImage(video, 0, 0, W, H);
        const { data } = ctx.getImageData(0, 0, W, H);

        if (prevDataRef.current) {
            let diff = 0;
            for (let i = 0; i < data.length; i += 4) {
                diff += Math.abs(data[i] - prevDataRef.current[i])        // R
                    + Math.abs(data[i + 1] - prevDataRef.current[i + 1])  // G
                    + Math.abs(data[i + 2] - prevDataRef.current[i + 2]); // B
            }
            const mad = diff / (W * H * 3);

            if (mad >= MOTION_THRESHOLD) {
                // Motion detected — reset timer
                lastMotionRef.current = Date.now();
                setShowWarning(false);
                if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                    setSecondsLeft(60);
                }
            }
        }

        prevDataRef.current = new Uint8ClampedArray(data);

        // Check inactivity duration
        const idle = Date.now() - lastMotionRef.current;
        if (idle >= INACTIVE_LOGOUT_MS) {
            onLogout();
        } else if (idle >= WARN_AT_MS && !showWarning) {
            setShowWarning(true);
            setSecondsLeft(60);
            if (!countdownTimerRef.current) {
                countdownTimerRef.current = setInterval(() => {
                    setSecondsLeft(s => {
                        if (s <= 1) {
                            onLogout();
                            return 0;
                        }
                        return s - 1;
                    });
                }, 1000);
            }
        }
    }, [onLogout, showWarning]);

    // ── Start camera ────────────────────────────────────────────────────────
    useEffect(() => {
        let stream: MediaStream;

        const start = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 160, height: 120, facingMode: 'user' },
                    audio: false,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setCamStatus('active');
                lastMotionRef.current = Date.now();
                sampleTimerRef.current = setInterval(sampleFrame, SAMPLE_INTERVAL_MS);
            } catch {
                setCamStatus('denied');
            }
        };

        start();

        return () => {
            if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            stream?.getTracks().forEach(t => t.stop());
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-register interval when sampleFrame changes
    useEffect(() => {
        if (camStatus !== 'active') return;
        if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
        sampleTimerRef.current = setInterval(sampleFrame, SAMPLE_INTERVAL_MS);
        return () => { if (sampleTimerRef.current) clearInterval(sampleTimerRef.current); };
    }, [sampleFrame, camStatus]);

    const dismissWarning = () => {
        lastMotionRef.current = Date.now();
        setShowWarning(false);
        setSecondsLeft(60);
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
    };

    return (
        <>
            {/* Hidden video + canvas for processing */}
            <video ref={videoRef} className="hidden" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />

            {/* ── Camera status badge ─────────────────────────────────────────── */}
            <div className="fixed bottom-4 right-4 z-40">
                <motion.button
                    onClick={() => setMinimized(m => !m)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md border transition-all ${camStatus === 'active'
                            ? 'bg-slate-900/80 border-emerald-500/30 text-emerald-400'
                            : camStatus === 'denied'
                                ? 'bg-slate-900/80 border-red-500/30 text-red-400'
                                : 'bg-slate-900/80 border-white/10 text-slate-400'
                        }`}
                >
                    {camStatus === 'active'
                        ? <Camera className="w-3.5 h-3.5" />
                        : <CameraOff className="w-3.5 h-3.5" />}
                    {!minimized && (
                        <span>
                            {camStatus === 'active' ? 'Presence monitor on' :
                                camStatus === 'denied' ? 'Camera denied' : 'Starting camera…'}
                        </span>
                    )}
                </motion.button>
            </div>

            {/* ── Inactivity warning overlay ──────────────────────────────────── */}
            <AnimatePresence>
                {showWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    >
                        {/* backdrop */}
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative z-10 bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl shadow-red-900/30"
                        >
                            {/* pulsing icon */}
                            <div className="relative inline-flex mb-5">
                                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                                <div className="relative p-4 bg-red-500/15 rounded-full">
                                    <ShieldAlert className="w-8 h-8 text-red-400" />
                                </div>
                            </div>

                            <h2 className="text-xl font-black mb-2 text-white">Inactivity Detected</h2>
                            <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                                No movement detected via camera.<br />
                                You will be logged out automatically.
                            </p>

                            {/* countdown ring */}
                            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                                <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="#ffffff10" strokeWidth="6" />
                                    <circle
                                        cx="40" cy="40" r="34"
                                        fill="none"
                                        stroke="#ef4444"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 34}`}
                                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - secondsLeft / 60)}`}
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <span className="text-2xl font-black text-white">{secondsLeft}</span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={onLogout}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-xl font-bold text-sm transition-all"
                                >
                                    <LogOut className="w-4 h-4" /> Logout Now
                                </button>
                                <button
                                    onClick={dismissWarning}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold text-sm transition-all"
                                >
                                    <X className="w-4 h-4" /> I'm Here
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
