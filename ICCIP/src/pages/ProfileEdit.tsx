import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { UserCog, Save, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';

interface Props {
    user: User;
    onUpdate: (updated: User) => void;
}

const inputCls =
    'w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500/50 transition-colors placeholder:text-slate-600';
const labelCls = 'block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2';

export default function ProfileEdit({ user, onUpdate }: Props) {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
    });
    const [showPw, setShowPw] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (form.password && form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (form.password && form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setSaving(true);
        try {
            const body: any = { name: form.name, email: form.email };
            if (form.password) body.password = form.password;

            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Update failed');
            }

            const updated: User = await res.json();
            onUpdate(updated);
            setSuccess(true);
            setForm(f => ({ ...f, password: '', confirmPassword: '' }));
            setTimeout(() => setSuccess(false), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-500 hover:text-white text-xs font-semibold mb-5 transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
                </button>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/15 rounded-xl">
                        <UserCog className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Edit Profile</h1>
                        <p className="text-slate-400 text-xs mt-0.5">Update your personal information</p>
                    </div>
                </div>
            </motion.div>

            {/* Form card */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6"
            >
                {/* Avatar */}
                <div className="flex items-center gap-4 pb-5 border-b border-white/8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-2xl font-black text-emerald-400">
                        {user.name[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1 inline-block">
                            {user.role}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div>
                        <label className={labelCls}>Full Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className={inputCls}
                            placeholder="Your full name"
                            required
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className={labelCls}>Email Address</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            className={inputCls}
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/8 pt-5">
                        <p className="text-xs text-slate-500 mb-4">Leave password fields empty to keep your current password.</p>

                        {/* New Password */}
                        <div className="mb-4">
                            <label className={labelCls}>New Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className={inputCls + ' pr-12'}
                                    placeholder="New password (optional)"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className={labelCls}>Confirm New Password</label>
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={form.confirmPassword}
                                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                className={inputCls}
                                placeholder="Repeat new password"
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                            {error}
                        </p>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold rounded-xl transition-all"
                    >
                        {saving ? (
                            <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                        ) : success ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving…' : success ? 'Saved!' : 'Save Changes'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
