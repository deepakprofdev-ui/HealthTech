import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { User } from './types';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PhysicianPortal from './pages/PhysicianPortal';
import DataSimulationPanel from './pages/DataSimulationPanel';
import ProfileEdit from './pages/ProfileEdit';
import Navbar from './components/Navbar';
import HealthScene from './components/HealthScene';
import { HealthProfileProvider } from './context/HealthProfileContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('aura_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('aura_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('aura_user');
  };

  const handleUpdateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('aura_user', JSON.stringify(updated));
  };

  if (loading) return <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white">Loading Aura AI...</div>;

  return (
    <HealthProfileProvider>
      <Router>
        <div className="min-h-screen text-slate-100 font-sans selection:bg-emerald-500/30">
          <HealthScene riskScore={0} />
          {user && <Navbar user={user} onLogout={handleLogout} />}

          <main className="container mx-auto px-4 py-8 relative z-10">
            <Routes>
              <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
              <Route path="/signup" element={!user ? <Signup onLogin={handleLogin} /> : <Navigate to="/" />} />
              <Route path="/simulate" element={user && user.role === 'patient' ? <DataSimulationPanel /> : <Navigate to="/" />} />
              <Route path="/profile" element={user && user.role === 'patient' ? <ProfileEdit user={user} onUpdate={handleUpdateUser} /> : <Navigate to="/" />} />
              <Route path="/" element={user ? (user.role === 'physician' ? <PhysicianPortal user={user} /> : <Dashboard user={user} />) : <Navigate to="/login" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </HealthProfileProvider>
  );
}
