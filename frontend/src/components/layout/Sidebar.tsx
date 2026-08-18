'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, FolderOpen, Grid3X3, FileText,
  BookOpen, CreditCard, AlertCircle, Receipt, BarChart3,
  Settings, LogOut, Building2, ChevronRight, Bell,
  UserCog, MessageSquare, Phone, Megaphone,
} from 'lucide-react';
import { useAuthStore, ROLE_LABELS } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [] },
  { href: '/leads', label: 'Lead Management', icon: Users, roles: [] },
  { href: '/projects', label: 'Projects', icon: FolderOpen, roles: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'] },
  { href: '/inventory', label: 'Inventory', icon: Grid3X3, roles: [] },
  { href: '/quotations', label: 'Quotations', icon: FileText, roles: [] },
  { href: '/bookings', label: 'Bookings', icon: BookOpen, roles: [] },
  { href: '/collections', label: 'Collections', icon: CreditCard, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'POST_SALES_EXECUTIVE'] },
  { href: '/demands', label: 'Demands', icon: AlertCircle, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'POST_SALES_EXECUTIVE'] },
  { href: '/invoices', label: 'Invoices', icon: Receipt, roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'ACCOUNTS'] },
  { href: '/users', label: 'User Management', icon: UserCog, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearAuth();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const filteredNav = navItems.filter((item) => {
    if (item.roles.length === 0) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <aside
      className="flex flex-col h-full transition-all duration-300"
      style={{
        background: 'hsl(224 35% 10%)',
        width: collapsed ? '72px' : '256px',
        minWidth: collapsed ? '72px' : '256px',
        borderRight: '1px solid hsl(224 25% 18%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'hsl(224 25% 18%)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FFD700' }}>
          <Building2 className="w-5 h-5" style={{ color: '#0d1642' }} />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-none">AAROVIA</p>
            <p className="text-yellow-400 text-xs font-medium">PROPERTIES</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t" style={{ borderColor: 'hsl(224 25% 18%)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{ background: 'hsl(224 25% 16%)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: '#FFD700', color: '#0d1642' }}>
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-blue-300 text-xs truncate">{user ? ROLE_LABELS[user.role] : ''}</p>
            </div>
            <button onClick={handleLogout} className="text-blue-300 hover:text-white transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
