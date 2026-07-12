import type { Notification } from '../types';

const PERMISSION_KEY = 'ska_notif_permission_asked';
const REMINDER_STATE_KEY = 'ska_notif_reminder_times';
/** Délai entre deux rappels bureau pour la même alerte non lue */
const REMINDER_INTERVAL_MS = 2 * 60 * 1000;
const BASE_TITLE = 'Smart Kids Academy';

type ReminderState = Record<string, number>;

export type BrowserNotificationOptions = {
  isReminder?: boolean;
  onInteract?: (notif: Notification) => void;
};

export function canUseBrowserNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!canUseBrowserNotifications()) return 'unsupported';
  return Notification.permission;
}

export async function ensureBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!canUseBrowserNotifications()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    localStorage.setItem(PERMISSION_KEY, '1');
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export function shouldAskBrowserNotificationPermission(): boolean {
  if (!canUseBrowserNotifications()) return false;
  if (Notification.permission !== 'default') return false;
  return !localStorage.getItem(PERMISSION_KEY);
}

function readReminderState(): ReminderState {
  try {
    const raw = sessionStorage.getItem(REMINDER_STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ReminderState;
  } catch {
    return {};
  }
}

function writeReminderState(state: ReminderState): void {
  try {
    sessionStorage.setItem(REMINDER_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function acknowledgeNotificationRead(id: number): void {
  const state = readReminderState();
  delete state[String(id)];
  writeReminderState(state);
}

export function acknowledgeAllNotificationsRead(ids: number[]): void {
  const state = readReminderState();
  ids.forEach((id) => delete state[String(id)]);
  writeReminderState(state);
}

export function notificationDeepLink(notif: Notification): string {
  if (notif.type === 'SIGNALEMENT') return '/dashboard/signalements';
  if (notif.type === 'TRANSACTION') return '/dashboard/transactions';
  return '/dashboard';
}

export function showBrowserNotification(
  notif: Notification,
  options?: BrowserNotificationOptions,
): void {
  if (!canUseBrowserNotifications() || Notification.permission !== 'granted') return;
  if (notif.lu) return;

  const prefix = options?.isReminder ? 'Rappel — ' : '';
  const body = notif.message.length > 180
    ? `${notif.message.slice(0, 177)}…`
    : notif.message;

  try {
    const opts = {
      body,
      tag: `ska-notif-${notif.id}`,
      icon: '/assets/images/smart-kids-logo.png',
      silent: false,
      renotify: true,
      requireInteraction: true,
    } as NotificationOptions;

    const desktop = new window.Notification(`${prefix}${notif.titre}`, opts);

    desktop.onclick = () => {
      window.focus();
      if (!notif.lu) {
        options?.onInteract?.(notif);
      }
      const path = notificationDeepLink(notif);
      if (window.location.pathname !== path) {
        window.location.href = path;
      }
      desktop.close();
    };
  } catch {
    /* ignore */
  }
}

/**
 * Affiche (ou rappelle) chaque notification non lue jusqu'à lecture.
 * Une fois lue côté serveur, plus aucun rappel.
 */
export function processUnreadReminders(
  notifications: Notification[],
  options?: Pick<BrowserNotificationOptions, 'onInteract'>,
): void {
  if (!canUseBrowserNotifications() || Notification.permission !== 'granted') return;

  const unread = notifications.filter((n) => !n.lu);
  const unreadIds = new Set(unread.map((n) => n.id));
  const state = readReminderState();
  const now = Date.now();

  Object.keys(state).forEach((key) => {
    if (!unreadIds.has(Number(key))) {
      delete state[key];
    }
  });

  unread.forEach((notif) => {
    const key = String(notif.id);
    const lastShown = state[key] ?? 0;
    const isFirst = lastShown === 0;
    const shouldRemind = isFirst || now - lastShown >= REMINDER_INTERVAL_MS;
    if (!shouldRemind) return;

    showBrowserNotification(notif, {
      isReminder: !isFirst,
      onInteract: options?.onInteract,
    });
    state[key] = now;
  });

  writeReminderState(state);
}

export function syncDocumentTitleAlert(unreadCount: number): void {
  if (typeof document === 'undefined') return;
  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${BASE_TITLE}`;
  } else {
    document.title = BASE_TITLE;
  }
}

/** @deprecated Utiliser processUnreadReminders */
export function notifyNewItems(previous: Notification[], current: Notification[]): void {
  processUnreadReminders(current);
}
