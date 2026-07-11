/** Brouillons de séances terrain pour usage hors ligne. */
export type OfflineSessionDraft = {
  localId: string;
  titre: string;
  centreId: number;
  centreNom?: string;
  dureePrevueMinutes: number;
  moduleFait?: string;
  etatEquipements?: string;
  defisSession?: string;
  heureDebut: string;
  heureFin?: string;
  statut: 'EN_COURS' | 'CLOTUREE';
  evaluations: Array<{
    localEleveId: number;
    eleveNom: string;
    elevePrenom: string;
    eleveSexe?: string;
    eleveAge?: number;
    eleveClasse?: string;
    present: boolean;
    note?: number | null;
    commentaire?: string | null;
    projetTravaille?: string | null;
  }>;
  createdAt: number;
  closedAt?: number;
  synced?: boolean;
};

const DRAFTS_KEY = 'nh_offline_session_drafts';
const PENDING_FORMATIONS_KEY = 'nh_offline_formations';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function listOfflineSessionDrafts(): OfflineSessionDraft[] {
  return readJson<OfflineSessionDraft[]>(DRAFTS_KEY, []).filter((d) => !d.synced);
}

export function saveOfflineSessionDraft(draft: OfflineSessionDraft) {
  const all = readJson<OfflineSessionDraft[]>(DRAFTS_KEY, []);
  const idx = all.findIndex((d) => d.localId === draft.localId);
  if (idx >= 0) all[idx] = draft;
  else all.unshift(draft);
  writeJson(DRAFTS_KEY, all);
}

export function removeOfflineSessionDraft(localId: string) {
  const all = readJson<OfflineSessionDraft[]>(DRAFTS_KEY, []).filter((d) => d.localId !== localId);
  writeJson(DRAFTS_KEY, all);
}

export function getOfflineSessionDraft(localId: string): OfflineSessionDraft | null {
  return listOfflineSessionDrafts().find((d) => d.localId === localId) || null;
}

export type OfflineFormationDraft = {
  localId: string;
  centreId: number;
  titre: string;
  description: string;
  dureeHeures: number;
  date: string;
  elevesPresents: number[];
  createdAt: number;
};

export function listOfflineFormations(): OfflineFormationDraft[] {
  return readJson<OfflineFormationDraft[]>(PENDING_FORMATIONS_KEY, []);
}

export function enqueueOfflineFormation(draft: OfflineFormationDraft) {
  const all = listOfflineFormations();
  all.push(draft);
  writeJson(PENDING_FORMATIONS_KEY, all);
}

export function clearOfflineFormations(keep: OfflineFormationDraft[]) {
  writeJson(PENDING_FORMATIONS_KEY, keep);
}

export function newLocalId(prefix = 'local'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
