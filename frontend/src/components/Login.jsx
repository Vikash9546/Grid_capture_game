import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { socket } from '../socket';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [color, setColor] = useState('blue');
  const [customColor, setCustomColor] = useState('#a855f7');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const setUser = useStore((state) => state.setUser);

  useEffect(() => {
    if (!username.trim() || username.length < 3) {
      setIsAvailable(true);
      setError('');
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setIsChecking(true);
      try {
        const res = await fetch(`http://localhost:4000/api/auth/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        setIsAvailable(data.available);
        if (!data.available) {
          setError('CALLSIGN_TAKEN // ACCESS_DENIED');
        } else {
          setError('');
        }
      } catch (err) {
        setError('CONNECTION_FAILED');
      } finally {
        setIsChecking(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [username]);

  const colors = [
    { id: 'blue', hex: '#60a5fa', bg: '#60a5fa', border: '#60a5fa', icon: 'check', fill: 1, iconColor: '#003a6b', opacity: '100' },
    { id: 'green', hex: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)', icon: 'token', fill: 0, iconColor: '#10b981', opacity: '0' },
    { id: 'orange', hex: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.4)', icon: 'token', fill: 0, iconColor: '#f97316', opacity: '0' },
    { id: 'red', hex: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)', icon: 'token', fill: 0, iconColor: '#ef4444', opacity: '0' }
  ];

  const activeTheme = colors.find(c => c.id === color) || { hex: color, isCustom: true };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !isAvailable || isChecking) return;
    
    setIsLoading(true);

    try {
      const loginRes = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, color: activeTheme.hex })
      });
      const loginData = await loginRes.json();
      
      if (!loginData.user) {
        throw new Error('Login failed');
      }

      const sessionUser = loginData.user;

      socket.connect();
      socket.emit('join_world', { userId: sessionUser.id });
      
      setUser(sessionUser);
      localStorage.setItem('territory_user', JSON.stringify(sessionUser));
      onLogin();
    } catch (err) {
      setError('CONNECTION_FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#101415] text-[#e0e3e5] min-h-screen overflow-hidden flex flex-col items-center justify-center relative font-sans selection:bg-[#60a5fa] selection:text-[#003a6b]">
      
      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        {/* World Map Wireframe / Schematic */}
        <div 
          className="absolute inset-0 opacity-20 filter grayscale contrast-150" 
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBkJqSNRTC99NrSHnZH7HLUq5STtMenn57yLBz5j8T4cMnAJeLW0IziHMO_eWcW3ujvHQhXEztiwb57zP9J4tyVjAVuzQTI6GD6BJmp0ip4_bMFFm49UcsPsOoTFdbMZXHALg1rwllhcK4WYfOHC_sfFghv792IMnUtdU6aU1Va48jyXoqyLyfQ2sYB8AgXDK0CMkfw-bb0-LU6XQFGuMZglAzeb35qaJ--EpHnHk5ZyK6bFx-GTLKVE_jeWAj4XuoVBtvzIXe1ujs')" }}
        />
        {/* Grid & Scanline */}
        <div className="absolute inset-0 grid-overlay" />
        <div className="scanline" />
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-10 w-full max-w-lg px-[24px] flex flex-col items-center">
        
        {/* Header Brand Anchor */}
        <header className="mb-12 text-center">
          <h1 className="text-[32px] leading-[1.2] tracking-[-0.02em] font-bold text-[#60a5fa] mb-2">TERRITORY</h1>
          <div className="h-1 w-24 bg-[#60a5fa] mx-auto" />
        </header>

        {/* Authentication Card */}
        <div className="w-full bg-[#191c1e] border border-[#264191] p-10 relative group">
          
          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#60a5fa] -translate-x-1 -translate-y-1" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#60a5fa] translate-x-1 -translate-y-1" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#60a5fa] -translate-x-1 translate-y-1" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#60a5fa] translate-x-1 translate-y-1" />

          <div className="mb-8">
            <h2 className="text-[24px] leading-[1.3] font-semibold text-[#e0e3e5] mb-2 tracking-tight">COMMANDER AUTHENTICATION</h2>
            <p className="font-mono text-[12px] leading-[1.2] tracking-[0.05em] text-[#c1c7d3] uppercase opacity-80">Establish a secure link to the tactical network.</p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Username Input */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] leading-[1] tracking-[0.1em] font-bold text-[#60a5fa] block">CALLSIGN_ID</label>
              <div className="relative group">
                <input 
                  className="w-full bg-[#272a2c] border border-[#414751]/40 px-4 py-3 font-mono text-[16px] leading-[1.2] font-medium text-[#e0e3e5] focus:outline-none focus:border-[#60a5fa] focus:bg-[#264191]/10 transition-all placeholder:text-[#414751]/60" 
                  placeholder="ENTER_IDENTIFIER..." 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toUpperCase())}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 text-[#e0e3e5]">
                  <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                </div>
              </div>
              {error && <p className="font-mono text-[10px] text-[#ffb4ab] uppercase tracking-widest mt-1">{error}</p>}
            </div>

            {/* Color Picker (Faction) */}
            <div className="space-y-4">
              <label className="font-mono text-[10px] leading-[1] tracking-[0.1em] font-bold text-[#60a5fa] block">FACTION_COLOR</label>
              <div className="flex flex-wrap gap-4">
                {colors.map((c) => {
                  const isActive = color === c.id;
                  return (
                    <button 
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`faction-chip w-10 h-10 border-2 flex items-center justify-center transition-all ring-offset-2 ring-offset-[#101415] hover:scale-110 active:scale-95 ${isActive ? 'ring-2 ring-[#60a5fa]' : ''} group/btn`}
                      style={{ 
                        backgroundColor: isActive && c.id !== 'blue' ? c.hex + '66' : c.bg, // Hack to make active background opaqueish
                        borderColor: isActive ? c.hex : c.border 
                      }}
                    >
                      <span 
                        className={`material-symbols-outlined text-[18px] ${!isActive ? 'opacity-0 group-hover/btn:opacity-100' : ''}`}
                        style={{ 
                          color: isActive ? (c.id === 'blue' ? '#003a6b' : c.hex) : c.iconColor,
                          fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` 
                        }}
                      >
                        {isActive ? 'check' : 'token'}
                      </span>
                    </button>
                  );
                })}

                {/* Custom Color Picker */}
                <div className="relative group/btn">
                  <input 
                    type="color"
                    value={colors.find(c => c.id === color) ? customColor : color}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setColor(e.target.value);
                    }}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    title="Custom Faction Color"
                  />
                  <div 
                    className={`faction-chip w-10 h-10 border-2 flex items-center justify-center transition-all ring-offset-2 ring-offset-[#101415] hover:scale-110 active:scale-95 ${!colors.find(c => c.id === color) ? 'ring-2 ring-[#60a5fa]' : ''}`}
                    style={{ 
                      backgroundColor: !colors.find(c => c.id === color) ? color + '66' : 'rgba(255,255,255,0.05)',
                      borderColor: !colors.find(c => c.id === color) ? color : 'rgba(255,255,255,0.2)'
                    }}
                  >
                    <span 
                      className={`material-symbols-outlined text-[18px] ${colors.find(c => c.id === color) ? 'opacity-60 group-hover/btn:opacity-100' : ''}`}
                      style={{ 
                        color: !colors.find(c => c.id === color) ? color : '#fff',
                        fontVariationSettings: `'FILL' ${!colors.find(c => c.id === color) ? 1 : 0}` 
                      }}
                    >
                      {!colors.find(c => c.id === color) ? 'check' : 'palette'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="pt-4 flex flex-col gap-4">
              <button 
                type="submit"
                disabled={isLoading || !username || username.length < 3 || !isAvailable || isChecking}
                className="w-full bg-[#60a5fa] text-[#003a6b] font-mono text-[10px] leading-[1] tracking-[0.1em] font-bold py-4 flex items-center justify-center gap-3 hover:bg-[#d4e3ff] transition-colors active:scale-[0.98] duration-100 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'INITIALIZING...' : isChecking ? 'VERIFYING...' : 'INITIALIZE UPLINK'}
                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">login</span>
              </button>
              <a className="font-mono text-[10px] leading-[1] tracking-[0.1em] font-bold text-[#c1c7d3] text-center hover:text-[#60a5fa] transition-colors pt-2" href="#">
                GUEST_VIEW_ONLY
              </a>
            </div>
          </form>

          {/* Technical Data Footer within Card */}
          <div className="mt-10 pt-6 border-t border-[#414751]/20 flex justify-between items-center opacity-60">
            <div className="font-mono text-[10px] flex items-center gap-2">
              <span className="w-2 h-2 bg-[#60a5fa] animate-pulse" />
              UPLINK STATUS: READY
            </div>
            <div className="font-mono text-[10px]">
              REF_ID: 22-04-77
            </div>
          </div>
        </div>
      </main>

      {/* Global Layout Footer */}
      <footer className="fixed bottom-0 w-full px-[24px] py-6 flex justify-between items-end z-20">
        <div className="font-mono text-[12px] leading-[1.2] tracking-[0.05em] text-[#8b919d]">
          CONNECTION: <span className="text-[#60a5fa]">SECURE</span> // ENCRYPTION: <span className="text-[#60a5fa]">256-BIT</span>
        </div>
        <div className="font-mono text-[12px] leading-[1.2] tracking-[0.05em] text-[#8b919d] flex items-center gap-4">
          <span>© TERRITORY_SYSTEMS</span>
          <div className="flex gap-2">
            <span className="w-1 h-4 bg-[#414751]/30" />
            <span className="w-1 h-4 bg-[#414751]/30" />
            <span className="w-1 h-4 bg-[#60a5fa]" />
          </div>
        </div>
      </footer>
    </div>
  );
}
