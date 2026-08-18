'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Building2, Lock, Mail } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data.email, data.password);
      const { token, user } = res.data;
      setAuth(user, token);
      toast.success(`Welcome back, ${user.name}!`);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0d1642 0%, #1a237e 50%, #0d1642 100%)' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-navy-900" style={{ color: '#0d1642' }} />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">AAROVIA</h1>
            <p className="text-blue-300 text-xs">PROPERTIES</p>
          </div>
        </div>

        <div>
          <h2 className="text-5xl font-bold text-white leading-tight mb-6">
            Enterprise<br />
            <span className="text-yellow-400">Real Estate</span><br />
            CRM
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed max-w-md">
            Complete lead management, inventory tracking, quotations, bookings, collections, and post-sales — all in one platform.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Lead Management', desc: 'Multi-source, auto-assign' },
              { label: 'Inventory Grid', desc: 'Real-time availability' },
              { label: 'Quotation & Booking', desc: 'Approval workflows' },
              { label: 'WhatsApp & Calls', desc: 'Built-in communications' },
            ].map((f) => (
              <div key={f.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-yellow-400 font-semibold text-sm">{f.label}</p>
                <p className="text-blue-200 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-sm">© 2024 Aarovia Properties. All rights reserved.</p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center">
                <Building2 className="w-6 h-6" style={{ color: '#0d1642' }} />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">AAROVIA PROPERTIES</h1>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h2>
            <p className="text-gray-500 text-sm mb-8">Enter your credentials to access the CRM</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@aarovia.com"
                    className="form-input pl-10"
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="form-input pl-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#FFD700', color: '#0d1642' }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


