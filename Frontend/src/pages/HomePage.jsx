import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Feature = ({ title, desc, icon }) => (
  <div className="p-8 bg-white/70 backdrop-blur-sm rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
    <p className="text-base text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const GOOGLE_AUTH_URL = API_ORIGIN ? `${API_ORIGIN}/api/auth/google` : '/api/auth/google';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {}, [user]);

  return (
    <div className="min-h-screen bg-[#fafcff] font-sans selection:bg-blue-200 overflow-hidden relative text-slate-800">
      
      {/* Decorative Blob Backgrounds */}
      <div className="absolute top-0 w-full overflow-hidden -z-10 pointer-events-none h-screen mix-blend-multiply">
        <div className="absolute -top-[20%] left-0 w-[50%] h-[50%] rounded-full bg-blue-300/30 blur-[120px]" />
        <div className="absolute top-[10%] right-0 w-[40%] h-[40%] rounded-full bg-indigo-300/30 blur-[120px]" />
      </div>

      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between sticky top-0 z-50 bg-[#fafcff]/80 backdrop-blur-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20">
            PB
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-800">PixelBoard</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 font-medium">
          <a href="#features" className="text-slate-500 hover:text-blue-600 transition-colors">Features</a>
          <a href="#how-it-works" className="text-slate-500 hover:text-blue-600 transition-colors">How it works</a>
        </nav>
        <div className="flex items-center gap-4">
          {user ? (
            <button onClick={() => navigate('/dashboard')} className="text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95">
              Dashboard
            </button>
          ) : (
            <Link to="/auth" className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95">
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 lg:pt-32 lg:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-semibold text-sm mb-8 shadow-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Real-time collaboration is here
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-8 max-w-4xl mx-auto tracking-tight">
            Draw, brainstorm, and build together in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">real-time</span>.
          </h1>
          
          <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            PixelBoard is the intuitive digital whiteboard that makes remote collaboration feel like you're in the same room. No installations required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
               <button onClick={() => navigate('/dashboard')} className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold rounded-2xl shadow-xl transition-all active:scale-95">
                 Open your Dashboard
               </button>
            ) : (
               <Link to="/auth" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                 Start drawing for free
               </Link>
            )}

            {!user && (
              <a href={GOOGLE_AUTH_URL} className="w-full sm:w-auto px-8 py-4 border border-slate-200 hover:border-slate-300 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-lg font-bold inline-flex items-center justify-center gap-3 transition-all shadow-sm active:scale-95">
                <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Sign up with Google
              </a>
            )}
          </div>
        </section>

        {/* MOCKUP SECTION */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_50px_rgb(0,0,0,0.1)] border-8 border-slate-900 bg-slate-900 group">
            {/* Fake browser header */}
            <div className="h-10 border-b border-slate-700/50 flex items-center px-4 gap-2 bg-slate-800">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 text-xs text-slate-400 font-medium bg-slate-700/50 px-3 py-1 rounded-md flex-1 text-center truncate max-w-sm mx-auto">pixelboard.online/board/team-sync</div>
            </div>
            
            {/* Fake canvas area */}
            <div className="bg-slate-50 aspect-video relative flex items-center justify-center overflow-hidden">
               {/* Pattern grid */}
               <div className="absolute inset-0 z-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
               
               {/* Fake drawings */}
               <svg className="absolute w-[60%] h-[60%] z-10 text-indigo-500 opacity-80" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M 40,100 C 60,60 140,60 160,100 C 140,140 60,140 40,100 Z" />
                 <circle cx="100" cy="100" r="20" />
                 <path d="M 20,20 Q 50,80 180,20" stroke="#3b82f6" strokeDasharray="8 8"/>
               </svg>

               <div className="absolute py-2 px-6 bg-white z-20 rounded-xl shadow-lg border border-slate-200 font-bold text-slate-700 -rotate-6 top-[20%] right-[30%]">Marketing Brainstorm</div>

               {/* Simulated Live Cursors */}
               <div className="absolute top-[40%] left-[40%] z-30 animate-pulse transition-all duration-1000">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="#ec4899" stroke="white" strokeWidth="2"><path d="M4 4l5.5 15.5 2.5-5.5 5.5-2.5z"/></svg>
                 <div className="ml-4 mt-1 px-2.5 py-1 bg-pink-500 text-white text-xs font-bold rounded-full shadow-md whitespace-nowrap">Sarah J.</div>
               </div>

               <div className="absolute top-[60%] left-[55%] z-30 animate-bounce transition-all duration-[2000ms] delay-300">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" strokeWidth="2"><path d="M4 4l5.5 15.5 2.5-5.5 5.5-2.5z"/></svg>
                 <div className="ml-4 mt-1 px-2.5 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-md whitespace-nowrap">Alex (You)</div>
               </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-100">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Everything you need to create</h2>
            <p className="text-lg text-slate-500">A minimal interface with powerful tools designed to get out of your way so the ideas can flow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Feature 
              title="Infinite Canvas" 
              desc="Never run out of space. Pan and zoom infinitely to capture every detail of your brainstorm or diagram." 
              icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>} 
            />
            <Feature 
              title="Real-time Sync" 
              desc="See cursors move instantly and strokes draw in real-time. Built on websockets for ultra-low latency." 
              icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} 
            />
            <Feature 
              title="Always Saved" 
              desc="Close your tab anytime. Your boards are securely persisted to the cloud and instantly accessible." 
              icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>} 
            />
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="bg-slate-900 py-24 text-center px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-extrabold text-white mb-6">Ready to bring your ideas to life?</h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">Join thousands of teams, educators, and creators who trust PixelBoard for their daily collaboration.</p>
            {user ? (
               <button onClick={() => navigate('/dashboard')} className="px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white text-lg font-bold rounded-xl shadow-lg transition-all">
                 Go to Dashboard
               </button>
            ) : (
               <Link to="/auth" className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white text-lg font-bold rounded-xl shadow-lg transition-all inline-block">
                 Sign up for free
               </Link>
            )}
          </div>
        </section>

      </main>

      <footer className="bg-slate-950 text-slate-400 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">PB</div>
             <span className="font-bold text-slate-300">PixelBoard</span>
          </div>
          <div className="text-sm">© 2026 PixelBoard. All rights reserved.</div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
