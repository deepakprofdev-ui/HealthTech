import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';
import { LogOut, Activity, User as UserIcon, FlaskConical, UserCog, Hash } from 'lucide-react';
import { getDisplayId } from '../utils/anonymize';

export default function Navbar({ user, onLogout }: { user: User, onLogout: () => void }) {
  const { pathname } = useLocation();
  const myId = getDisplayId(user.id, user.role);

  return (
    <nav className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter text-emerald-400">
          <Activity className="w-6 h-6" />
          AURA HEALTH AI
        </Link>

        <div className="flex items-center gap-6">
          {/* Own display ID — always visible so user can share it */}
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-800 border border-white/10 text-slate-400">
            <Hash className="w-2.5 h-2.5" />
            {myId}
          </span>

          {user.role === 'patient' && (
            <Link
              to="/simulate"
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${pathname === '/simulate'
                ? 'text-violet-400'
                : 'text-slate-400 hover:text-violet-300'
                }`}
            >
              <FlaskConical className="w-4 h-4" />
              Simulate Data
            </Link>
          )}

          {user.role === 'patient' ? (
            <Link
              to="/profile"
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${pathname === '/profile' ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-300'
                }`}
            >
              <UserCog className="w-4 h-4" />
              {user.name}
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <UserIcon className="w-4 h-4" />
              {user.name} ({user.role})
            </div>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
