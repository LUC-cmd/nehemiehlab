import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Building2, Users, BookOpen, CreditCard,
  BarChart3, Bell, LogOut, Menu, X, ChevronDown, User,
  AlertTriangle, Settings, GraduationCap, Timer, Megaphone, Sparkles, Image as ImageIcon, Library, UsersRound, ClipboardCheck, Shield, History, BookOpenCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { notificationService } from '../../services/api';
import { LOGO_SRC, BRAND_TEAL } from '../../constants/branding';
import { buildNavForRole, ROLE_LABELS } from '../../constants/roleAccess';
import InscriptionsToggle from '../../components/dashboard/InscriptionsToggle';
import LogoutConfirmDialog from '../../components/ui/LogoutConfirmDialog';
import UserAvatar from '../../components/ui/UserAvatar';
import { formatFullName } from '../../utils/displayName';
import {
  acknowledgeAllNotificationsRead,
  acknowledgeNotificationRead,
  ensureBrowserNotificationPermission,
  getBrowserNotificationPermission,
  processUnreadReminders,
  shouldAskBrowserNotificationPermission,
  syncDocumentTitleAlert,
} from '../../utils/browserNotifications';
import type { Notification, Role } from '../../types';
import type { DashboardPage } from '../../constants/roleAccess';

const pageIcons: Record<DashboardPage, React.ReactNode> = {
  home: <LayoutDashboard className="w-5 h-5" />,
  centres: <Building2 className="w-5 h-5" />,
  'mes-centres': <Building2 className="w-5 h-5" />,
  formateurs: <GraduationCap className="w-5 h-5" />,
  eleves: <Users className="w-5 h-5" />,
  sessions: <Timer className="w-5 h-5" />,
  formations: <BookOpen className="w-5 h-5" />,
  'supports-cours': <GraduationCap className="w-5 h-5" />,
  'journal-activite': <History className="w-5 h-5" />,
  'evaluation-formateur': <BookOpenCheck className="w-5 h-5" />,
  transactions: <CreditCard className="w-5 h-5" />,
  rapports: <BarChart3 className="w-5 h-5" />,
  publications: <Megaphone className="w-5 h-5" />,
  actualites: <Sparkles className="w-5 h-5" />,
  galerie: <ImageIcon className="w-5 h-5" />,
  ressources: <Library className="w-5 h-5" />,
  communaute: <UsersRound className="w-5 h-5" />,
  'profils-enfants': <Users className="w-5 h-5" />,
  'controle-gestion': <ClipboardCheck className="w-5 h-5" />,
  utilisateurs: <Settings className="w-5 h-5" />,
  signalements: <AlertTriangle className="w-5 h-5" />,
  permissions: <Shield className="w-5 h-5" />,
  profil: <User className="w-5 h-5" />,
};

const roleColors: Record<Role, string> = {
  DIRECTEUR: 'bg-purple-50 text-purple-700 border-purple-200',
  FORMATEUR: 'bg-blue-50 text-blue-700 border-blue-200',
  COORDINATEUR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RESPONSABLE_CLUSTER: 'bg-violet-50 text-violet-700 border-violet-200',
  COMPTABLE: 'bg-amber-50 text-amber-700 border-amber-200',
  STAFF_NEHEMIAH: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  ANIMATEUR: 'bg-teal-50 text-teal-700 border-teal-200',
  PARENT: 'bg-rose-50 text-rose-700 border-rose-200',
  BENEVOLE: 'bg-lime-50 text-lime-700 border-lime-200',
  PARTICIPANT: 'bg-sky-50 text-sky-700 border-sky-200',
};

// ─── Panneau de notifications ───────────────────────────────────
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notification[]>([]);

  useEffect(() => {
    notificationService.getMes()
      .then((r) => setNotifs(r.data))
      .catch(() => {});
  }, []);

  const marquerLu = async (id: number) => {
    await notificationService.marquerLu(id);
    acknowledgeNotificationRead(id);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, lu: true } : n));
  };

  const marquerTousLus = async () => {
    await notificationService.marquerTousLus();
    acknowledgeAllNotificationsRead(notifs.map((n) => n.id));
    setNotifs((prev) => prev.map((n) => ({ ...n, lu: true })));
  };

  const openNotification = async (n: Notification) => {
    if (!n.lu) await marquerLu(n.id);
    onClose();
    if (n.type === 'SIGNALEMENT') navigate('/dashboard/signalements');
    else if (n.type === 'TRANSACTION') navigate('/dashboard/transactions');
    else navigate('/dashboard');
  };

  const typeIcon: Record<string, React.ReactNode> = {
    SIGNALEMENT: <AlertTriangle className="w-4 h-4 text-red-400" />,
    TRANSACTION: <CreditCard className="w-4 h-4 text-amber-400" />,
    INFO: <Bell className="w-4 h-4 text-blue-400" />,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
      className="absolute right-0 top-12 w-[min(24rem,calc(100vw-1.5rem))] card z-50 shadow-xl shadow-slate-900/10 border border-slate-200">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <h3 className="text-slate-900 font-semibold">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifs.some((n) => !n.lu) && (
            <button type="button" onClick={() => void marquerTousLus()} className="text-xs text-primary-600 hover:underline">
              Tout marquer lu
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mb-3 -mt-2">
        Les alertes non lues sont rappelées sur le bureau PC jusqu&apos;à lecture. Email envoyé aussi hors application.
      </p>

      {notifs.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {notifs.map((n) => (
            <div key={n.id}
              onClick={() => void openNotification(n)}
              className={`p-3 rounded-xl cursor-pointer transition-all ${
                n.lu ? 'bg-slate-50' : 'bg-white border border-slate-200 hover:border-primary-300'
              }`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{typeIcon[n.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${n.lu ? 'text-slate-400' : 'text-slate-900'}`}>{n.titre}</p>
                    {!n.lu && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
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
  const { hasFeature } = useAccess();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [desktopNotifPermission, setDesktopNotifPermission] = useState(
    () => getBrowserNotificationPermission(),
  );
  const prevNotifsRef = useRef<Notification[]>([]);

  const handleNotificationInteract = useCallback(async (notif: Notification) => {
    try {
      await notificationService.marquerLu(notif.id);
      acknowledgeNotificationRead(notif.id);
      prevNotifsRef.current = prevNotifsRef.current.map((n) =>
        n.id === notif.id ? { ...n, lu: true } : n,
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    notificationService.getMes()
      .then((r) => {
        const data = r.data as Notification[];
        processUnreadReminders(data, { onInteract: (n) => void handleNotificationInteract(n) });
        prevNotifsRef.current = data;
        const unread = data.filter((n) => !n.lu).length;
        setUnreadCount(unread);
        syncDocumentTitleAlert(unread);
      })
      .catch(() => {});
  }, [handleNotificationInteract]);

  const navItems = (role ? buildNavForRole(role, hasFeature) : []).map((item) => ({
    ...item,
    icon: pageIcons[item.page],
  }));

  // Notifications : polling + rappels bureau jusqu'à lecture
  useEffect(() => {
    if (shouldAskBrowserNotificationPermission()) {
      void ensureBrowserNotificationPermission().then((p) => {
        if (p !== 'unsupported') setDesktopNotifPermission(p);
      });
    }
    refreshNotifications();
    const pollId = window.setInterval(refreshNotifications, 15000);
    return () => window.clearInterval(pollId);
  }, [refreshNotifications]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) refreshNotifications();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refreshNotifications]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const requestLogout = () => {
    setShowUserMenu(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo centré */}
      <div className="px-5 py-6 border-b border-slate-200 flex items-center justify-center">
        <img
          src={LOGO_SRC}
          alt="Smart Kids Academy"
          className={`transition-all duration-300 rounded-lg object-contain mx-auto ${sidebarOpen || mobileSidebar ? 'h-14' : 'h-10'}`}
        />
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

      {/* Pied de sidebar — fond bleu marque */}
      <div className="p-4 border-t border-[#003a44] bg-[#004b57]">
        <div className={`flex items-center gap-3 p-3 rounded-xl bg-white/10 ${!sidebarOpen && !mobileSidebar ? 'justify-center' : ''}`}>
          <UserAvatar user={user} size="sm" className="shrink-0 ring-2 ring-white/30" />
          {(sidebarOpen || mobileSidebar) && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{formatFullName(user?.prenom, user?.nom)}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 bg-white/15 px-2 py-0.5 rounded-md">
                {role ? ROLE_LABELS[role] : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="dashboard-page flex h-screen h-[100dvh] overflow-hidden bg-transparent">
        {/* Sidebar Desktop */}
        <aside className={`hidden lg:flex flex-col border-r border-slate-200 transition-all duration-300 bg-white ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}>
          <SidebarContent />
        </aside>

        {/* Sidebar Mobile */}
        <AnimatePresence>
          {mobileSidebar && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
                onClick={() => setMobileSidebar(false)} />
              <motion.aside
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25 }}
                className="fixed left-0 top-0 bottom-0 w-[min(18rem,88vw)] border-r border-slate-200 z-50 lg:hidden flex flex-col bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 lg:hidden">
                  <p className="text-sm font-semibold text-slate-800">Menu</p>
                  <button
                    type="button"
                    onClick={() => setMobileSidebar(false)}
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 touch-target"
                    aria-label="Fermer le menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Zone principale */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar */}
          <header
            className="min-h-16 border-b border-white/10 px-3 sm:px-4 flex items-center justify-between shrink-0 text-white relative z-20 pt-[env(safe-area-inset-top)]"
            style={{ backgroundColor: BRAND_TEAL }}
          >
            <div className="flex items-center gap-3">
              {/* Toggle sidebar desktop */}
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:flex p-2 rounded-lg text-white/85 hover:text-white hover:bg-white/10 transition-colors">
                <Menu className="w-5 h-5" />
              </button>
              {/* Toggle mobile */}
              <button onClick={() => setMobileSidebar(true)}
                className="lg:hidden p-2 rounded-lg text-white/85 hover:text-white hover:bg-white/10 transition-colors">
                <Menu className="w-5 h-5" />
              </button>
              {!isOnline && (
                <span className="hidden sm:inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-300/40 text-amber-100">
                  Hors ligne
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Directeur : ouvrir / fermer inscriptions (toujours visible) */}
              {role === 'DIRECTEUR' && <InscriptionsToggle variant="topbar" />}

              {/* Notifications */}
              <div className="relative flex items-center gap-1">
                {desktopNotifPermission !== 'granted' && desktopNotifPermission !== 'unsupported' && (
                  <button
                    type="button"
                    title="Activer les alertes bureau (rappel jusqu'à lecture)"
                    onClick={() => {
                      void ensureBrowserNotificationPermission().then((p) => {
                        if (p !== 'unsupported') setDesktopNotifPermission(p);
                      });
                    }}
                    className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-1 rounded-lg bg-amber-400/20 text-amber-100 border border-amber-300/30 hover:bg-amber-400/30"
                  >
                    Alertes PC
                  </button>
                )}
                <button
                  onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
                  className="p-2 relative rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white text-[#004b57] text-xs rounded-full flex items-center justify-center font-bold">
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
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
                  <UserAvatar
                    user={user}
                    size="sm"
                    className="!bg-white/15 !border-white/25 !text-white ring-1 ring-white/20"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-white text-sm font-medium leading-none">{user?.prenom} {user?.nom}</p>
                    <p className="text-white/65 text-xs mt-0.5">{role ? ROLE_LABELS[role] : ''}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-52 card z-50 shadow-xl border border-slate-200 p-1">
                      <NavLink to="/dashboard/profil"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-sm transition-colors">
                        <User className="w-4 h-4" />
                        Mon profil
                      </NavLink>
                      <hr className="border-slate-200 my-1" />
                      <button onClick={requestLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 text-sm transition-colors">
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 lg:p-8 bg-slate-50 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-7xl min-w-0">
            <Outlet />
          </div>
        </main>
        </div>
      </div>

      <LogoutConfirmDialog
        open={showLogoutConfirm}
        userName={user?.prenom}
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
    </>
  );
}
