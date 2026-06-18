import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { socket } from '../socket';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setUser = useStore((state) => state.setUser);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      
      if (!data.available) {
        setError('Username already taken. If it is yours, we will log you in.');
        // For simplicity, we could allow them to use it if there's no auth password
        // Let's just proceed as login instead of signup in this simple case
      }

      // Connect socket and join
      socket.connect();
      socket.emit('join_world', { username, color });
      
      setUser({ username, color });
      onLogin();
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Territory Capture
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your hero name"
              required
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-12 rounded cursor-pointer bg-transparent border-0"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !username}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {isLoading ? 'Entering World...' : 'Play Now'}
          </button>
        </form>
      </div>
    </div>
  );
}
