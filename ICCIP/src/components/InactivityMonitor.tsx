import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Camera, UserCheck, UserX, AlertTriangle } from 'lucide-react';

export default function InactivityMonitor({ onEmergency }: { onEmergency: () => void }) {
  const [faceDetected, setFaceDetected] = useState(true);
  const [countdown, setCountdown] = useState(30); // 30 seconds inactivity
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Start camera
    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user"
            },
            audio: false
          });
          
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play().catch(e => console.error("Play error:", e));
            };
          }
          setCameraError(null);
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Permission denied');
        } else {
          setCameraError('Camera access denied');
        }
        setFaceDetected(false);
      }
    };

    startCamera();

    const resetTimer = () => {
      setCountdown(30);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Trigger emergency if face is also not detected or just purely on inactivity
          if (!faceDetected || cameraError) {
            onEmergency();
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    // Simulate face detection fluctuations
    const faceInterval = setInterval(() => {
      if (!cameraError) {
        setFaceDetected(Math.random() > 0.1); // 90% chance face is "detected"
      }
    }, 5000);

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      clearInterval(timerRef.current);
      clearInterval(faceInterval);
      
      // Cleanup stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [faceDetected, onEmergency, cameraError]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-64"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${faceDetected && !cameraError ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Emergency Monitor</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${faceDetected && !cameraError ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        </div>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-3 border border-white/5">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-900">
              <Camera className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-[10px] text-red-400 font-bold uppercase mb-2">{cameraError}</p>
              <p className="text-[8px] text-slate-500 mb-4">Please enable camera access for emergency monitoring.</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] rounded-md transition-colors"
              >
                Retry Access
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover opacity-50 grayscale"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                {faceDetected ? (
                  <UserCheck className="w-8 h-8 text-emerald-400/50" />
                ) : (
                  <UserX className="w-8 h-8 text-red-400/50" />
                )}
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[8px] font-mono text-white">
                {faceDetected ? 'FACE DETECTED' : 'NO FACE DETECTED'}
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-500">Inactivity Timeout</span>
            <span className={`font-mono ${countdown < 10 ? 'text-red-400' : 'text-slate-300'}`}>{countdown}s</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              animate={{ width: `${(countdown / 30) * 100}%` }}
              className={`h-full ${countdown < 10 ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
          </div>
        </div>

        <AnimatePresence>
          {!faceDetected && countdown < 15 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-[9px] text-red-200 leading-tight">
                No face detected. Emergency alert will trigger in {countdown}s.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
