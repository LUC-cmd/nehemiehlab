import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, CheckCircle2, Clock3, CreditCard, PlayCircle, Filter } from 'lucide-react';
import {
  centreService,
  formationService,
  notificationService,
  sessionService,
  transactionService,
} from '../../services/api';
import type { Centre, ModuleFormation, Notification, SessionCours, Transaction } from '../../types';
import { PageLoadingSkeleton } from '../../components/ui/DashboardSkeletons';
import { formatFullName } from '../../utils/displayName';

type ActivityEvent = {
  id: string;
  date: string;
  title: string;
  description: string;
  kind: 'notification' | 'session' | 'transaction' | 'formation';
};

const eventStyles: Record<ActivityEvent['kind'], { icon: React.ReactNode; className: string; label: string }> = {
  notification: { icon: <Bell className="h-4 w-4" />, className: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Notifications' },
  session: { icon: <PlayCircle className="h-4 w-4" />, className: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: 'Séances terrain' },
  transaction: { icon: <CreditCard className="h-4 w-4" />, className: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Paiements' },
  formation: { icon: <BookOpen className="h-4 w-4" />, className: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Modules enseignés' },
};

const validDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function JournalActivitePage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [partialLoad, setPartialLoad] = useState(false);
  const [kindFilter, setKindFilter] = useState<ActivityEvent['kind'] | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const [notificationsResult, sessionsResult, transactionsResult, centresResult] = await Promise.allSettled([
        notificationService.getMes(),
        sessionService.getAll(),
        transactionService.getAll(),
        centreService.getAll(),
      ]);

      const notifications: Notification[] =
        notificationsResult.status === 'fulfilled' ? notificationsResult.value.data || [] : [];
      const sessions: SessionCours[] =
        sessionsResult.status === 'fulfilled' ? sessionsResult.value.data || [] : [];
      const transactions: Transaction[] =
        transactionsResult.status === 'fulfilled' ? transactionsResult.value.data || [] : [];
      const centres: Centre[] =
        centresResult.status === 'fulfilled' ? centresResult.value.data || [] : [];

      const formationResults = await Promise.allSettled(
        centres.map((centre) => formationService.getByCentre(centre.id)),
      );
      const formations: ModuleFormation[] = formationResults.flatMap((result) =>
        result.status === 'fulfilled' ? result.value.data || [] : [],
      );

      const nextEvents: ActivityEvent[] = [
        ...notifications.map((notification) => ({
          id: `notification-${notification.id}`,
          date: notification.createdAt,
          title: notification.titre,
          description: notification.message,
          kind: 'notification' as const,
        })),
        ...sessions.map((session) => ({
          id: `session-${session.id}`,
          date: session.createdAt || session.heureDebut,
          title: session.statut === 'CLOTUREE' ? 'Session clôturée' : 'Session démarrée',
          description: `${session.titre} · ${session.centre?.nom || 'Centre non renseigné'}${session.formateur ? ` · ${formatFullName(session.formateur.prenom, session.formateur.nom)}` : ''}`,
          kind: 'session' as const,
        })),
        ...transactions.map((transaction) => ({
          id: `transaction-${transaction.id}-${transaction.statut}`,
          date: transaction.validatedAt || transaction.createdAt,
          title:
            transaction.statut === 'VALIDEE'
              ? 'Paiement validé'
              : transaction.statut === 'REFUSEE'
                ? 'Paiement refusé'
                : 'Paiement en attente',
          description: `${transaction.description} · ${transaction.montant.toLocaleString('fr-FR')} FCFA · ${formatFullName(transaction.formateur?.prenom, transaction.formateur?.nom)}`,
          kind: 'transaction' as const,
        })),
        ...formations.map((formation) => ({
          id: `formation-${formation.id}`,
          date: formation.date,
          title: 'Module enseigné enregistré',
          description: `${formation.titre} · ${formatFullName(formation.formateurPrenom, formation.formateurNom)}`,
          kind: 'formation' as const,
        })),
      ];

      setEvents(
        nextEvents
          .filter((event) => validDate(event.date))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 80),
      );
      setPartialLoad(
        [notificationsResult, sessionsResult, transactionsResult, centresResult, ...formationResults]
          .some((result) => result.status === 'rejected'),
      );
      setLoading(false);
    };

    load().catch(() => {
      setPartialLoad(true);
      setLoading(false);
    });
  }, []);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((event) => {
      if (kindFilter && event.kind !== kindFilter) return false;
      if (!q) return true;
      return `${event.title} ${event.description}`.toLowerCase().includes(q);
    });
  }, [events, kindFilter, search]);

  if (loading) return <PageLoadingSkeleton cardCount={5} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Journal d&apos;activité</h1>
        <p className="mt-1 text-slate-500">
          Séances clôturées, modules enseignés, paiements et notifications importantes.
        </p>
      </div>

      <div className="card border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            className="input-field py-2 text-sm flex-1"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as ActivityEvent['kind'] | '')}
          >
            <option value="">Toutes les activités</option>
            {(Object.keys(eventStyles) as ActivityEvent['kind'][]).map((kind) => (
              <option key={kind} value={kind}>{eventStyles[kind].label}</option>
            ))}
          </select>
        </div>
        <input
          type="search"
          className="input-field py-2 text-sm sm:max-w-xs"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {partialLoad && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Certaines activités n&apos;ont pas pu être chargées. Les données disponibles sont affichées.
        </div>
      )}

      <section className="card border border-slate-200">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center">
            <Clock3 className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Aucune activité récente.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute bottom-3 left-5 top-3 w-px bg-slate-200" />
            <div className="space-y-1">
              {filteredEvents.map((event) => {
                const date = validDate(event.date)!;
                const style = eventStyles[event.kind];
                return (
                  <article key={event.id} className="relative flex gap-4 rounded-xl px-1 py-3 hover:bg-slate-50">
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${style.className}`}>
                      {event.kind === 'transaction' && event.title.includes('validé')
                        ? <CheckCircle2 className="h-4 w-4" />
                        : style.icon}
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                        <div>
                          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{style.label}</span>
                          <h2 className="font-semibold text-slate-900">{event.title}</h2>
                        </div>
                        <time className="shrink-0 text-xs text-slate-400" dateTime={event.date}>
                          {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {' · '}
                          {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{event.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
