import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, Users, BookOpen, CreditCard,
  BarChart3, Bell, LogOut, Menu, X, ChevronDown, User,
  AlertTriangle, Settings, GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/api';
import type { Notification } from '../../types';

// Navigation par rôle
const navByRole = {
  DIRECTEUR: [
    { to: '/dashboard', label: 'Vue d\'ensemble', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { to: '/dashboard/centres', label: 'Centres', icon: <Building2 className="w-5 h-5" /> },
    { to: '/dashboard/formateurs', label: 'Formateurs', icon: <GraduationCap className="w-5 h-5" /> },
    { to: '/dashboard/eleves', label: 'Élèves', icon: <Users className="w-5 h-5" /> },
    { to: '/dashboard/formations', label: 'Formations', icon: <BookOpen className="w-5 h-5" /> },
    { to: '/dashboard/transactions', label: 'Transactions', icon: <CreditCard className="w-5 h-5" /> },
    { to: '/dashboard/rapports', label: 'Rapports', icon: <BarChart3 className="w-5 h-5" /> },
    { to: '/dashboard/utilisateurs', label: 'Utilisateurs', icon: <Settings className="w-5 h-5" /> },
  ],
  FORMATEUR: [
    { to: '/dashboard', label: 'Vue d\'ensemble', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { to: '/dashboard/mes-centres', label: 'Mes Centres', icon: <Building2 className="w-5 h-5" /> },
    { to: '/dashboard/eleves', label: 'Mes Élèves', icon: <Users className="w-5 h-5" /> },
    { to: '/dashboard/formations', label: 'Journal de formation', icon: <BookOpen className="w-5 h-5" /> },
    { to: '/dashboard/transactions', label: 'Mes Paiements', icon: <CreditCard className="w-5 h-5" /> },
    { to: '/dashboard/rapports', label: 'Mes Rapports', icon: <BarChart3 className="w-5 h-5" /> },
  ],
  COORDINATEUR: [
    { to: '/dashboard', label: 'Vue d\'ensemble', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { to: '/dashboard/eleves', label: 'Élèves du centre', icon: <Users className="w-5 h-5" /> },
    { to: '/dashboard/formations', label: 'Formations', icon: <BookOpen className="w-5 h-5" /> },
    { to: '/dashboard/signalements', label: 'Signalements', icon: <AlertTriangle className="w-5 h-5" /> },
  ],
  COMPTABLE: [
    { to: '/dashboard', label: 'Vue d\'ensemble', icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
    { to: '/dashboard/transactions', label: 'Transactions', icon: <CreditCard className="w-5 h-5" /> },
    { to: '/dashboard/rapports', label: 'Rapports', icon: <BarChart3 className="w-5 h-5" /> },
  ],
};

const roleColors: Record<string, string> = {
  DIRECTEUR: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  FORMATEUR: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  COORDINATEUR: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  COMPTABLE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const roleLabels: Record<string, string> = {
  DIRECTEUR: 'Directeur',
  FORMATEUR: 'Formateur',
  COORDINATEUR: 'Coordinateur',
  COMPTABLE: 'Comptable',
};

// ─── Panneau de notifications ───────────────────────────────────
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    notificationService.getMes()
      .then((r) => setNotifs(r.data))
      .catch(() => {});
  }, []);

  const marquerLu = async (id: number) => {
    await notificationService.marquerLu(id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, lu: true } : n));
  };

  const typeIcon: Record<string, React.ReactNode> = {
    SIGNALEMENT: <AlertTriangle className="w-4 h-4 text-red-400" />,
    TRANSACTION: <CreditCard className="w-4 h-4 text-amber-400" />,
    INFO: <Bell className="w-4 h-4 text-blue-400" />,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
      className="absolute right-0 top-12 w-96 card z-50 shadow-2xl shadow-black/50 border border-dark-600">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-dark-700">
        <h3 className="text-white font-semibold">Notifications</h3>
        <button onClick={onClose} className="text-dark-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-8 text-dark-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {notifs.map((n) => (
            <div key={n.id}
              onClick={() => !n.lu && marquerLu(n.id)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                n.lu ? 'bg-dark-800/40' : 'bg-dark-800 border border-dark-600 hover:border-primary-500/30'
              }`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{typeIcon[n.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${n.lu ? 'text-dark-400' : 'text-white'}`}>{n.titre}</p>
                    {!n.lu && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-dark-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-dark-500 mt-1">
                    {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Layout Principal ────────────────────────────────────────────
export default function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = role ? navByRole[role] ?? [] : [];

  // Polling notifications toutes les 30s
  useEffect(() => {
    const fetch = () => {
      notificationService.getMes()
        .then((r) => setUnreadCount(r.data.filter((n: Notification) => !n.lu).length))
        .catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-dark-800">
        <img src="http://nehemiahlab.com/assets/img/logo.png" alt="Nehemiah Lab"
          className={`transition-all duration-300 ${sidebarOpen ? 'h-9' : 'h-8 mx-auto'}`} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            onClick={() => setMobileSidebar(false)}
          >
            <span className="shrink-0">{item.icon}</span>
            {(sidebarOpen || mobileSidebar) && (
              <span className="truncate">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info bas de sidebar */}
      <div className="p-4 border-t border-dark-800">
        <div className={`flex items-center gap-3 p-3 rounded-xl bg-dark-800 ${!sidebarOpen && !mobileSidebar ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 shrink-0">
            <User className="w-4 h-4" />
          </div>
          {(sidebarOpen || mobileSidebar) && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{user?.prenom} {user?.nom}</p>
              <span className={`badge text-xs border ${role ? roleColors[role] : ''}`}>
                {role ? roleLabels[role] : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col bg-dark-900 border-r border-dark-800 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
        <SidebarContent />
      </aside>

      {/* Sidebar Mobile */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setMobileSidebar(false)} />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-dark-900 border-r border-dark-800 z-50 lg:hidden flex flex-col">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-dark-900 border-b border-dark-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Toggle sidebar desktop */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex btn-ghost p-2">
              <Menu className="w-5 h-5" />
            </button>
            {/* Toggle mobile */}
            <button onClick={() => setMobileSidebar(true)}
              className="lg:hidden btn-ghost p-2">
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
                className="btn-ghost p-2 relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
              </AnimatePresence>
            </div>

            {/* Menu utilisateur */}
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-dark-800 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-400" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-white text-sm font-medium leading-none">{user?.prenom} {user?.nom}</p>
                  <p className="text-dark-400 text-xs mt-0.5">{role ? roleLabels[role] : ''}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-52 card z-50 shadow-2xl border border-dark-600 p-1">
                    <NavLink to="/dashboard/profil"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-800 text-dark-300 hover:text-white text-sm transition-colors">
                      <User className="w-4 h-4" />
                      Mon profil
                    </NavLink>
                    <hr className="border-dark-700 my-1" />
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-dark-300 hover:text-red-400 text-sm transition-colors">
                      <LogOut className="w-4 h-4" />
                      Se déconnecter
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
