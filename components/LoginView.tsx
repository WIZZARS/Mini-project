
import React, { useState } from 'react';

interface Props {
  onLogin: () => void;
}

const LoginView: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 800);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <i className="fa-solid fa-robot text-3xl text-white"></i>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
            <p className="text-slate-400">Sign in to start your interview preparation</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <label className="flex items-center text-slate-400 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                Remember me
              </label>
              <a href="#" className="text-indigo-400 hover:text-indigo-300">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center space-x-2 group disabled:opacity-70"
            >
              {isLoading ? (
                <i className="fa-solid fa-spinner animate-spin"></i>
              ) : (
                <>
                  <span>Sign In</span>
                  <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500 font-bold">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center space-x-2 py-3 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium text-slate-300">
              <i className="fa-brands fa-google"></i>
              <span>Google</span>
            </button>
            <button className="flex items-center justify-center space-x-2 py-3 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium text-slate-300">
              <i className="fa-brands fa-linkedin"></i>
              <span>LinkedIn</span>
            </button>
          </div>
        </div>
        
        <p className="mt-8 text-center text-slate-500 text-sm">
          Don't have an account? <a href="#" className="text-indigo-400 font-bold hover:underline">Sign up for free</a>
        </p>
      </div>
    </div>
  );
};

export default LoginView;
