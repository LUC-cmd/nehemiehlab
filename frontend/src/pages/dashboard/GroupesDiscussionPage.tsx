import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Users, Plus, Building2, Network, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { discussionService, centreService, clusterService } from '../../services/api';
import type {
  CanalDiscussion,
  CanalDiscussionInfo,
  MessageGroupe,
  ConversationCiblee,
  MessageCible,
  Centre,
  Cluster,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatFullName } from '../../utils/displayName';
import { ROLE_LABELS } from '../../constants/roleAccess';
import ValidationActionButton from '../../components/ui/ValidationActionButton';
import Modal from '../../components/ui/Modal';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';

const POLL_INTERVAL_MS = 8000;

type Thread = { type: 'canal'; canal: CanalDiscussion } | { type: 'conversation'; id: number };
type AnyMessage = MessageGroupe | MessageCible;
type TargetMode = 'centre' | 'cluster' | 'comptable';

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

function threadKey(t: Thread): string {
  return t.type === 'canal' ? `canal:${t.canal}` : `conv:${t.id}`;
}

export default function GroupesDiscussionPage() {
  const { user } = useAuth();
  const isDirecteur = user?.role === 'DIRECTEUR';

  const [canaux, setCanaux] = useState<CanalDiscussionInfo[]>([]);
  const [conversations, setConversations] = useState<ConversationCiblee[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<AnyMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [texte, setTexte] = useState('');
  const [sending, setSending] = useState(false);
  const skeletonLoading = useMinDelayLoading(loadingThreads, 220);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  // --- Composition d'un message ciblé (Directeur uniquement) ---
  const [composeOpen, setComposeOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<TargetMode>('centre');
  const [centres, setCentres] = useState<Centre[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [centreId, setCentreId] = useState<number | ''>('');
  const [clusterNom, setClusterNom] = useState('');
  const [inclureComptable, setInclureComptable] = useState(false);
  const [composeTexte, setComposeTexte] = useState('');
  const [composing, setComposing] = useState(false);

  const fetchThreads = useCallback(async () => {
    try {
      const [resCanaux, resConv] = await Promise.all([
        discussionService.getCanaux(),
        discussionService.getConversations(),
      ]);
      setCanaux(resCanaux.data);
      setConversations(resConv.data);
      setActiveThread((prev) => {
        if (prev) return prev;
        if (resCanaux.data[0]) return { type: 'canal', canal: resCanaux.data[0].canal };
        if (resConv.data[0]) return { type: 'conversation', id: resConv.data[0].id };
        return null;
      });
    } catch {
      toast.error('Erreur lors du chargement des groupes de discussion.');
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const fetchMessages = useCallback(async (thread: Thread, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res =
        thread.type === 'canal'
          ? await discussionService.getMessages(thread.canal)
          : await discussionService.getMessagesConversation(thread.id);
      setMessages(res.data);
    } catch {
      if (!silent) toast.error('Erreur lors du chargement des messages.');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (!activeThread) return;
    fetchMessages(activeThread);
    const interval = setInterval(() => fetchMessages(activeThread, true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThread ? threadKey(activeThread) : null, fetchMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!composeOpen || !isDirecteur) return;
    centreService.getAll().then((res) => setCentres(res.data as Centre[])).catch(() => {});
    clusterService.getAll().then((res) => setClusters(res.data as Cluster[])).catch(() => {});
  }, [composeOpen, isDirecteur]);

  const handleSend = async () => {
    if (!activeThread) return;
    const contenu = texte.trim();
    if (!contenu) return;
    setSending(true);
    try {
      if (activeThread.type === 'canal') {
        await discussionService.postMessage(activeThread.canal, contenu);
        setCanaux((prev) =>
          prev.map((c) => (c.canal === activeThread.canal ? { ...c, nbMessages: c.nbMessages + 1 } : c))
        );
      } else {
        await discussionService.postMessageConversation(activeThread.id, contenu);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeThread.id ? { ...c, nbMessages: c.nbMessages + 1 } : c))
        );
      }
      setTexte('');
      await fetchMessages(activeThread, true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de l'envoi du message.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const resetCompose = () => {
    setTargetMode('centre');
    setCentreId('');
    setClusterNom('');
    setInclureComptable(false);
    setComposeTexte('');
  };

  const handleCreerConversation = async () => {
    const contenu = composeTexte.trim();
    if (!contenu) {
      toast.error('Écrivez un message.');
      return;
    }
    if (targetMode === 'centre' && !centreId) {
      toast.error('Sélectionnez un centre.');
      return;
    }
    if (targetMode === 'cluster' && !clusterNom) {
      toast.error('Sélectionnez un cluster.');
      return;
    }

    setComposing(true);
    try {
      const payload =
        targetMode === 'centre'
          ? { centreId: Number(centreId), inclureComptable, contenu }
          : targetMode === 'cluster'
          ? { cluster: clusterNom, inclureComptable, contenu }
          : { inclureComptable: true, contenu };

      const res = await discussionService.creerConversation(payload);
      toast.success('Message envoyé.');
      setComposeOpen(false);
      resetCompose();
      await fetchThreads();
      setActiveThread({ type: 'conversation', id: res.data.id });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de l'envoi du message.";
      toast.error(msg);
    } finally {
      setComposing(false);
    }
  };

  if (skeletonLoading) {
    return <PageLoadingSkeleton />;
  }

  if (canaux.length === 0 && conversations.length === 0 && !isDirecteur) {
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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary-400" />
            Groupes de discussion
          </h1>
          <p className="text-dark-400 mt-1">Échangez avec les formateurs, le directeur et le comptable selon vos groupes.</p>
        </div>
        {isDirecteur && (
          <ValidationActionButton
            onClick={() => setComposeOpen(true)}
            icon={Plus}
            variant="primary"
            size="md"
          >
            Nouveau message ciblé
          </ValidationActionButton>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canaux.map((c) => (
          <button
            key={`canal:${c.canal}`}
            type="button"
            onClick={() => setActiveThread({ type: 'canal', canal: c.canal })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeThread?.type === 'canal' && activeThread.canal === c.canal
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {c.label}
            <span className="text-[10px] opacity-70">({c.nbMessages})</span>
          </button>
        ))}
        {conversations.map((c) => (
          <button
            key={`conv:${c.id}`}
            type="button"
            onClick={() => setActiveThread({ type: 'conversation', id: c.id })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeThread?.type === 'conversation' && activeThread.id === c.id
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-white'
            }`}
          >
            {c.centreId ? <Building2 className="w-3.5 h-3.5" /> : c.cluster ? <Network className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
            {c.label}
            <span className="text-[10px] opacity-70">({c.nbMessages})</span>
          </button>
        ))}
      </div>

      {!activeThread ? (
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 text-dark-400 text-sm">
          Aucune conversation pour l'instant.
        </div>
      ) : (
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
      )}

      {isDirecteur && (
        <Modal
          open={composeOpen}
          title="Nouveau message ciblé"
          subtitle="Envoyez un message aux formateurs d'un centre, d'un cluster, et/ou au comptable."
          onClose={() => {
            setComposeOpen(false);
            resetCompose();
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-dark-400 mb-2 block">Destinataires</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode('centre')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    targetMode === 'centre'
                      ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                      : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-white'
                  }`}
                >
                  Formateurs d'un centre
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('cluster')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    targetMode === 'cluster'
                      ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                      : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-white'
                  }`}
                >
                  Formateurs d'un cluster
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('comptable')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    targetMode === 'comptable'
                      ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                      : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-white'
                  }`}
                >
                  Comptable uniquement
                </button>
              </div>
            </div>

            {targetMode === 'centre' && (
              <div>
                <label className="text-xs font-semibold text-dark-400 mb-1 block">Centre</label>
                <select
                  className="input-field w-full"
                  value={centreId}
                  onChange={(e) => setCentreId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Sélectionner un centre…</option>
                  {centres.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetMode === 'cluster' && (
              <div>
                <label className="text-xs font-semibold text-dark-400 mb-1 block">Cluster</label>
                <select
                  className="input-field w-full"
                  value={clusterNom}
                  onChange={(e) => setClusterNom(e.target.value)}
                >
                  <option value="">Sélectionner un cluster…</option>
                  {clusters.map((c) => (
                    <option key={c.id} value={c.nom}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetMode !== 'comptable' && (
              <label className="flex items-center gap-2 text-sm text-dark-200">
                <input
                  type="checkbox"
                  checked={inclureComptable}
                  onChange={(e) => setInclureComptable(e.target.checked)}
                  className="rounded border-dark-600"
                />
                Inclure aussi le comptable dans cette conversation
              </label>
            )}

            <div>
              <label className="text-xs font-semibold text-dark-400 mb-1 block">Message</label>
              <textarea
                className="input-field w-full resize-none"
                rows={4}
                placeholder="Écrire votre message…"
                value={composeTexte}
                onChange={(e) => setComposeTexte(e.target.value)}
                disabled={composing}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <ValidationActionButton
                onClick={() => void handleCreerConversation()}
                loading={composing}
                disabled={!composeTexte.trim()}
                icon={Send}
                variant="primary"
                size="md"
              >
                Envoyer
              </ValidationActionButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
