import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { discussionService } from '../../services/api';
import type { CanalDiscussion, CanalDiscussionInfo, MessageGroupe } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatFullName } from '../../utils/displayName';
import { ROLE_LABELS } from '../../constants/roleAccess';
import ValidationActionButton from '../../components/ui/ValidationActionButton';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';

const POLL_INTERVAL_MS = 8000;

function initials(prenom?: string, nom?: string): string {
  const a = (prenom || '').trim().charAt(0);
  const b = (nom || '').trim().charAt(0);
  return (a + b).toUpperCase() || '?';
}

function formatHeure(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function GroupesDiscussionPage() {
  const { user } = useAuth();
  const [canaux, setCanaux] = useState<CanalDiscussionInfo[]>([]);
  const [activeCanal, setActiveCanal] = useState<CanalDiscussion | null>(null);
  const [messages, setMessages] = useState<MessageGroupe[]>([]);
  const [loadingCanaux, setLoadingCanaux] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [texte, setTexte] = useState('');
  const [sending, setSending] = useState(false);
  const skeletonLoading = useMinDelayLoading(loadingCanaux, 220);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const fetchCanaux = useCallback(async () => {
    try {
      const res = await discussionService.getCanaux();
      setCanaux(res.data);
      setActiveCanal((prev) => prev ?? (res.data[0]?.canal as CanalDiscussion | undefined) ?? null);
    } catch {
      toast.error("Erreur lors du chargement des groupes de discussion.");
    } finally {
      setLoadingCanaux(false);
    }
  }, []);

  const fetchMessages = useCallback(async (canal: CanalDiscussion, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await discussionService.getMessages(canal);
      setMessages(res.data);
    } catch {
      if (!silent) toast.error('Erreur lors du chargement des messages.');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchCanaux();
  }, [fetchCanaux]);

  useEffect(() => {
    if (!activeCanal) return;
    fetchMessages(activeCanal);
    const interval = setInterval(() => fetchMessages(activeCanal, true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeCanal, fetchMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!activeCanal) return;
    const contenu = texte.trim();
    if (!contenu) return;
    setSending(true);
    try {
      await discussionService.postMessage(activeCanal, contenu);
      setTexte('');
      await fetchMessages(activeCanal, true);
      setCanaux((prev) =>
        prev.map((c) => (c.canal === activeCanal ? { ...c, nbMessages: c.nbMessages + 1 } : c))
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de l'envoi du message.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  if (skeletonLoading) {
    return <PageLoadingSkeleton />;
  }

  if (canaux.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Groupes de discussion</h1>
          <p className="text-dark-400 mt-1">Aucun groupe de discussion n'est disponible pour votre rôle.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary-400" />
          Groupes de discussion
        </h1>
        <p className="text-dark-400 mt-1">Échangez avec les formateurs, le directeur et le comptable selon vos groupes.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canaux.map((c) => (
          <button
            key={c.canal}
            type="button"
            onClick={() => setActiveCanal(c.canal)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeCanal === c.canal
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {c.label}
            <span className="text-[10px] opacity-70">({c.nbMessages})</span>
          </button>
        ))}
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-2xl flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMessages ? (
            <div className="text-dark-400 text-sm">Chargement des messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-dark-400 text-sm">Aucun message pour l'instant. Soyez le premier à écrire.</div>
          ) : (
            messages.map((m) => {
              const isMine = m.auteur.id === user?.id;
              return (
                <div key={m.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-primary-500/20 text-primary-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {initials(m.auteur.prenom, m.auteur.nom)}
                  </div>
                  <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="text-xs text-dark-400 mb-1">
                      {formatFullName(m.auteur.prenom, m.auteur.nom)}
                      {' · '}
                      {ROLE_LABELS[m.auteur.role]}
                      {' · '}
                      {formatHeure(m.createdAt)}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                        isMine
                          ? 'bg-primary-500/20 text-white border border-primary-500/30'
                          : 'bg-dark-700 text-dark-100 border border-dark-600'
                      }`}
                    >
                      {m.contenu}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={listEndRef} />
        </div>

        <div className="border-t border-dark-700 p-3 flex items-end gap-2">
          <textarea
            className="input-field flex-1 resize-none"
            rows={2}
            placeholder="Écrire un message…"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            disabled={sending}
          />
          <ValidationActionButton
            onClick={() => void handleSend()}
            loading={sending}
            disabled={!texte.trim()}
            icon={Send}
            variant="primary"
            size="md"
          >
            Envoyer
          </ValidationActionButton>
        </div>
      </div>
    </div>
  );
}
