import { Client, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE } from './api';
import { getAuthToken } from '../utils/authStorage';
import type { Notification } from '../types';

/**
 * Connexion temps réel (STOMP over SockJS) au flux de notifications de l'utilisateur.
 * Vient en complément du polling existant (DashboardLayout) : si la connexion
 * échoue ou se coupe, le polling reste le filet de sécurité — cette fonction
 * ne lance jamais d'exception et se contente de réessayer en tâche de fond.
 */
export function connectNotificationsSocket(onNotification: (notif: Notification) => void): () => void {
  const token = getAuthToken();
  if (!token) {
    return () => {};
  }

  const client = new Client({
    webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      client.subscribe('/user/queue/notifications', (message: IMessage) => {
        try {
          const notif = JSON.parse(message.body) as Notification;
          onNotification(notif);
        } catch {
          /* message non exploitable : ignoré, le polling prendra le relais */
        }
      });
    },
    onStompError: () => {
      /* laisser reconnectDelay retenter ; le polling REST reste actif en parallèle */
    },
    onWebSocketError: () => {
      /* idem */
    },
  });

  client.activate();

  return () => {
    void client.deactivate();
  };
}
