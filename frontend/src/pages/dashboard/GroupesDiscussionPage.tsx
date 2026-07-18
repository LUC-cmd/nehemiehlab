import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Users, Plus, Building2, Network, Wallet, MessageCircle, ArrowLeft, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { discussionService, centreService, clusterService } from '../../services/api';
import { connectNotificationsSocket } from '../../services/notificationsSocket';
import type {
  CanalDiscussion,
  CanalDiscussionInfo,
  MessageGroupe,
  ConversationCiblee,
  MessageCible,
  ConversationContact,
  Centre,
  Cluster,
  LectureInfo,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatFullName } from '../../utils/displayName';
import { ROLE_LABELS } from '../../constants/roleAccess';
import ValidationActionButton from '../../components/ui/ValidationActionButton';
import Modal from '../../components/ui/Modal';
import UserAvatar from '../../components/ui/UserAvatar';
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
  const [envoyerEmailReply, setEnvoyerEmailReply] = useState(false);
  const [lecteurs, setLecteurs] = useState<LectureInfo[]>([]);
  const skeletonLoading = useMinDelayLoading(loadingThreads, 220);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  // --- Nouvelle discussion libre (tous les rôles, style WhatsApp) ---
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [contacts, setContacts] = useState<ConversationContact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [contactTexte, setContactTexte] = useState('');
  const [contactSending, setContactSending] = useState(false);

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
  const [envoyerEmailCompose, setEnvoyerEmailCompose] = useState(false);

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

  // Marque le fil comme lu par l'utilisateur courant (WhatsApp-like : le dernier accès
  // sert a deduire, message par message, qui l'a deja lu) et rafraichit la liste des
  // lecteurs pour affichage cote expediteur.
  const markAndLoadLecteurs = useCallback((thread: Thread) => {
    const marquer =
      thread.type === 'canal'
        ? discussionService.marquerLu(thread.canal)
        : discussionService.marquerLuConversation(thread.id);
    marquer.catch(() => {});
    const lecteursPromise =
      thread.type === 'canal'
        ? discussionService.getLecteurs(thread.canal)
        : discussionService.getLecteursConversation(thread.id);
    lecteursPromise.then((res) => setLecteurs(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (!activeThread) return;
    setLecteurs([]);
    fetchMessages(activeThread);
    markAndLoadLecteurs(activeThread);
    const interval = setInterval(() => {
      fetchMessages(activeThread, true);
      markAndLoadLecteurs(activeThread);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThread ? threadKey(activeThread) : null, fetchMessages, markAndLoadLecteurs]);

  // Rafraîchit aussi périodiquement la liste des fils (pour voir apparaître une nouvelle
  // conversation démarrée par quelqu'un d'autre, sans recharger toute la page).
  useEffect(() => {
    const interval = setInterval(() => fetchThreads(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  // Temps réel : dès qu'une notification de type DISCUSSION arrive (WebSocket), on
  // rafraîchit immédiatement la liste des fils et, si c'est le fil ouvert, les messages
  // — au lieu d'attendre le prochain polling (jusqu'à 8s). Le polling reste le filet de
  // sécurité si la connexion WebSocket est indisponible.
  const activeThreadRef = useRef<Thread | null>(null);
  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  useEffect(() => {
    const disconnect = connectNotificationsSocket((notif) => {
      if (notif.type !== 'DISCUSSION') return;
      fetchThreads();
      const current = activeThreadRef.current;
      if (current) fetchMessages(current, true);
    });
    return disconnect;
  }, [fetchThreads, fetchMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!composeOpen || !isDirecteur) return;
    centreService.getAll().then((res) => setCentres(res.data as Centre[])).catch(() => {});
    clusterService.getAll().then((res) => setClusters(res.data as Cluster[])).catch(() => {});
  }, [composeOpen, isDirecteur]);

  useEffect(() => {
    if (!contactPickerOpen) return;
    discussionService.getContacts().then((res) => setContacts(res.data)).catch(() => {
      toast.error('Erreur lors du chargement des contacts.');
    });
  }, [contactPickerOpen]);

  const handleSend = async () => {
    if (!activeThread || !user) return;
    const contenu = texte.trim();
    if (!contenu) return;
    const emailPourCetEnvoi = envoyerEmailReply;

    // Envoi optimiste : le champ se vide et le message apparaît immédiatement, sans
    // attendre la réponse serveur. On réconcilie avec fetchMessages() une fois le
    // message réellement enregistré (ou on retire le message optimiste en cas d'échec).
    const tempId = -Date.now();
    const optimiste = {
      id: tempId,
      auteur: user,
      contenu,
      createdAt: new Date().toISOString(),
      ...(activeThread.type === 'canal' ? { canal: activeThread.canal } : { conversationId: activeThread.id }),
    } as AnyMessage;

    setTexte('');
    setEnvoyerEmailReply(false);
    setMessages((prev) => [...prev, optimiste]);
    setSending(true);
    try {
      if (activeThread.type === 'canal') {
        await discussionService.postMessage(activeThread.canal, contenu);
        setCanaux((prev) =>
          prev.map((c) => (c.canal === activeThread.canal ? { ...c, nbMessages: c.nbMessages + 1 } : c))
        );
      } else {
        await discussionService.postMessageConversation(activeThread.id, contenu, emailPourCetEnvoi);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeThread.id ? { ...c, nbMessages: c.nbMessages + 1 } : c))
        );
      }
      await fetchMessages(activeThread, true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de l'envoi du message.";
      toast.error(msg);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setTexte(contenu);
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
    setEnvoyerEmailCompose(false);
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
          ? { centreId: Number(centreId), inclureComptable, contenu, envoyerEmail: envoyerEmailCompose }
          : targetMode === 'cluster'
          ? { cluster: clusterNom, inclureComptable, contenu, envoyerEmail: envoyerEmailCompose }
          : { inclureComptable: true, contenu, envoyerEmail: envoyerEmailCompose };

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

  const resetContactPicker = () => {
    setContactSearch('');
    setSelectedContactIds([]);
    setContactTexte('');
  };

  const toggleContact = (id: number) => {
    setSelectedContactIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleDemarrerDiscussion = async () => {
    const contenu = contactTexte.trim();
    if (!contenu) {
      toast.error('Écrivez un message.');
      return;
    }
    if (selectedContactIds.length === 0) {
      toast.error('Sélectionnez au moins une personne.');
      return;
    }
    setContactSending(true);
    try {
      const res = await discussionService.creerConversation({ participantIds: selectedContactIds, contenu });
      toast.success('Message envoyé.');
      setContactPickerOpen(false);
      resetContactPicker();
      await fetchThreads();
      setActiveThread({ type: 'conversation', id: res.data.id });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de l'envoi du message.";
      toast.error(msg);
    } finally {
      setContactSending(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return true;
    return `${c.prenom} ${c.nom}`.toLowerCase().includes(q);
  });

  // Une diffusion ciblée (centre/cluster/comptable) est une alerte à sens unique : seul le
  // Directeur peut y répondre. Les conversations "canal" et "libre" restent à deux sens.
  const activeConv =
    activeThread?.type === 'conversation' ? conversations.find((c) => c.id === activeThread.id) : undefined;
  const canReply = activeThread?.type === 'canal' || !activeConv || activeConv.peutRepondre;
  const isCibleThread = activeThread?.type === 'conversation' && activeConv && !activeConv.libre;

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
          <p className="text-dark-400 mt-1">Échangez avec les formateurs, le directeur et le comptable.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ValidationActionButton
            onClick={() => setContactPickerOpen(true)}
            icon={MessageCircle}
            variant="sky"
            size="md"
          >
            Nouvelle discussion
          </ValidationActionButton>
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
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-2xl flex flex-col md:flex-row h-[70vh] overflow-hidden">
        {/* Colonne des fils de discussion (sidebar) */}
        <div
          className={`w-full md:w-72 flex-shrink-0 border-r border-dark-700 overflow-y-auto p-3 space-y-5 ${
            activeThread ? 'hidden md:block' : 'block'
          }`}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-dark-500 px-2 mb-2">Groupes</div>
            <div className="space-y-1">
              {canaux.map((c) => {
                const active = activeThread?.type === 'canal' && activeThread.canal === c.canal;
                return (
                  <button
                    key={`canal:${c.canal}`}
                    type="button"
                    onClick={() => setActiveThread({ type: 'canal', canal: c.canal })}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                      active
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                        : 'text-dark-300 hover:bg-dark-700/60 border border-transparent'
                    }`}
                  >
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 truncate">{c.label}</span>
                    <span className="text-[10px] opacity-70">{c.nbMessages}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-dark-500 px-2 mb-2">Messages</div>
            {conversations.length === 0 ? (
              <div className="text-xs text-dark-500 px-2">Aucune conversation pour l'instant.</div>
            ) : (
              <div className="space-y-1">
                {conversations.map((c) => {
                  const active = activeThread?.type === 'conversation' && activeThread.id === c.id;
                  const Icon = c.libre
                    ? (c.participants?.length ?? 0) > 1
                      ? Users
                      : MessageCircle
                    : c.centreId
                    ? Building2
                    : c.cluster
                    ? Network
                    : Wallet;
                  return (
                    <button
                      key={`conv:${c.id}`}
                      type="button"
                      onClick={() => setActiveThread({ type: 'conversation', id: c.id })}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${
                        active
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'text-dark-300 hover:bg-dark-700/60 border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{c.label}</span>
                      <span className="text-[10px] opacity-70">{c.nbMessages}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Fil actif */}
        <div className={`flex-1 flex flex-col min-w-0 ${activeThread ? 'flex' : 'hidden md:flex'}`}>
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center text-dark-400 text-sm p-6 text-center">
              Sélectionnez un groupe ou une conversation pour commencer.
            </div>
          ) : (
            <>
              <div className="md:hidden border-b border-dark-700 p-2">
                <button
                  type="button"
                  onClick={() => setActiveThread(null)}
                  className="flex items-center gap-1.5 text-xs text-dark-300 px-2 py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="text-dark-400 text-sm">Chargement des messages…</div>
                ) : messages.length === 0 ? (
                  <div className="text-dark-400 text-sm">Aucun message pour l'instant. Soyez le premier à écrire.</div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.auteur.id === user?.id;
                    // Accuse de lecture : visible uniquement par l'auteur du message. Un
                    // lecteur "a lu" ce message si son dernier acces au fil est posterieur
                    // (ou egal) a la creation du message.
                    const lecteursMessage = isMine
                      ? lecteurs.filter(
                          (l) => l.userId !== m.auteur.id && new Date(l.dernierAcces) >= new Date(m.createdAt)
                        )
                      : [];
                    return (
                      <div key={m.id} className={`flex gap-3 ${isMine ? 'flex-row-reverse text-right' : ''}`}>
                        <UserAvatar
                          user={{ prenom: m.auteur.prenom, nom: m.auteur.nom, avatar: m.auteur.avatar }}
                          size="md"
                          className="flex-shrink-0"
                        />
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
                          {isMine && lecteursMessage.length > 0 && (
                            <div
                              className="flex items-center gap-1 mt-1 justify-end"
                              title={`Lu par ${lecteursMessage
                                .map((l) => formatFullName(l.prenom, l.nom))
                                .join(', ')}`}
                            >
                              <span className="text-[10px] text-dark-400">Lu</span>
                              <div className="flex -space-x-1.5">
                                {lecteursMessage.slice(0, 4).map((l) => (
                                  <UserAvatar
                                    key={l.userId}
                                    user={{ prenom: l.prenom || '', nom: l.nom || '', avatar: l.avatar }}
                                    size="xs"
                                    className="ring-2 ring-dark-800"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={listEndRef} />
              </div>

              {canReply ? (
                <div className="border-t border-dark-700 p-3">
                  {isDirecteur && isCibleThread && (
                    <label className="flex items-center gap-2 text-xs text-dark-300 mb-2">
                      <input
                        type="checkbox"
                        checked={envoyerEmailReply}
                        onChange={(e) => setEnvoyerEmailReply(e.target.checked)}
                        className="rounded border-dark-600"
                      />
                      Envoyer aussi par email
                    </label>
                  )}
                  <div className="flex items-end gap-2">
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
              ) : (
                <div className="border-t border-dark-700 p-4 text-xs text-dark-400 text-center">
                  Vous consultez cette diffusion du Directeur. Seul le Directeur peut y répondre.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Nouvelle discussion libre : accessible à tous les rôles du module */}
      <Modal
        open={contactPickerOpen}
        title="Nouvelle discussion"
        subtitle="Choisissez une ou plusieurs personnes pour démarrer une conversation."
        onClose={() => {
          setContactPickerOpen(false);
          resetContactPicker();
        }}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-dark-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              className="input-field w-full pl-9"
              placeholder="Rechercher une personne…"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
            />
          </div>

          <div className="max-h-56 overflow-y-auto border border-dark-700 rounded-lg divide-y divide-dark-700">
            {filteredContacts.length === 0 ? (
              <div className="p-3 text-sm text-dark-400">Aucun résultat.</div>
            ) : (
              filteredContacts.map((c) => {
                const checked = selectedContactIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                      checked ? 'bg-primary-500/10' : 'hover:bg-dark-700/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleContact(c.id)}
                      className="rounded border-dark-600"
                    />
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {initials(c.prenom, c.nom)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-dark-100 truncate">{formatFullName(c.prenom, c.nom)}</div>
                      <div className="text-[11px] text-dark-500">{ROLE_LABELS[c.role as keyof typeof ROLE_LABELS] || c.role}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-dark-400 mb-1 block">Message</label>
            <textarea
              className="input-field w-full resize-none"
              rows={4}
              placeholder="Écrire votre message…"
              value={contactTexte}
              onChange={(e) => setContactTexte(e.target.value)}
              disabled={contactSending}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ValidationActionButton
              onClick={() => void handleDemarrerDiscussion()}
              loading={contactSending}
              disabled={!contactTexte.trim() || selectedContactIds.length === 0}
              icon={Send}
              variant="primary"
              size="md"
            >
              Envoyer
            </ValidationActionButton>
          </div>
        </div>
      </Modal>

      {/* Message ciblé par centre/cluster/comptable : réservé au Directeur */}
      {isDirecteur && (
        <Modal
          open={composeOpen}
          title="Nouveau message ciblé"
          subtitle="Envoyez une alerte aux formateurs d'un centre, d'un cluster, et/ou au comptable. Ils la consultent en temps réel mais ne peuvent pas y répondre."
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

            <label className="flex items-center gap-2 text-sm text-dark-200">
              <input
                type="checkbox"
                checked={envoyerEmailCompose}
                onChange={(e) => setEnvoyerEmailCompose(e.target.checked)}
                className="rounded border-dark-600"
              />
              Envoyer aussi par email aux destinataires
            </label>

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
