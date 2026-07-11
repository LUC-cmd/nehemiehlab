import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../context/AccessContext';
import { transactionService, userService, rapportService } from '../../services/api';
import type { Transaction, User } from '../../types';
import {
  Plus, X, Calendar, User as UserIcon, Check, XSquare, Clock,
  Paperclip, FileText, Image as ImageIcon, Eye, Upload, AlertTriangle,
  Printer, Download, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageLoadingSkeleton, TableSkeleton } from '../../components/ui/DashboardSkeletons';
import { useMinDelayLoading } from '../../hooks/useMinDelayLoading';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SecureProofViewer from '../../components/ui/SecureProofViewer';
import MediaDropZone from '../../components/ui/MediaDropZone';

const ACCEPTED_PROOF =
  '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_PROOF_BYTES = 10 * 1024 * 1024;

const emptyForm = {
  formateurId: '',
  montant: '',
  type: 'DEPLACEMENT',
  description: '',
};

function isImageProof(tx: Transaction) {
  const t = (tx.justificatifType || '').toLowerCase();
  const name = (tx.justificatifNom || tx.justificatifUrl || '').toLowerCase();
  return t.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/.test(name);
}

function isPdfProof(tx: Transaction) {
  const t = (tx.justificatifType || '').toLowerCase();
  const name = (tx.justificatifNom || tx.justificatifUrl || '').toLowerCase();
  return t.includes('pdf') || name.endsWith('.pdf');
}

export default function TransactionsPage() {
  const { hasRole } = useAuth();
  const { hasFeature } = useAccess();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formateurs, setFormateurs] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const skeletonLoading = useMinDelayLoading(loading, 220);

  const [newTx, setNewTx] = useState(emptyForm);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [lateProofFiles, setLateProofFiles] = useState<File[]>([]);

  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [uploadingProofId, setUploadingProofId] = useState<number | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'validate' | 'refuse';
    transactionId: number;
    missingProof?: boolean;
  } | null>(null);

  const isComptable = hasRole('COMPTABLE');
  const isDirecteur = hasRole('DIRECTEUR');
  const isFormateur = hasRole('FORMATEUR');
  /** Seul le comptable saisit / joint — le Directeur consulte et imprime */
  const canCreate = isComptable;
  const canValidateTx = hasFeature('validate_transactions') && isFormateur;
  const canAttachLater = isComptable;
  const canPrintReports = isDirecteur || isComptable;

  useEffect(() => {
    fetchTransactions();
    if (canCreate) {
      userService.getFormateurs().then((r) => setFormateurs(r.data)).catch(() => {});
    }
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = isFormateur
        ? await transactionService.getMesTransactions()
        : await transactionService.getAll();
      setTransactions(res.data);
    } catch {
      toast.error('Erreur lors du chargement des transactions.');
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setNewTx(emptyForm);
    setProofFiles([]);
  };

  const proofFile = proofFiles[0] || null;

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await transactionService.create({
        formateurId: Number(newTx.formateurId),
        montant: Number(newTx.montant),
        type: newTx.type,
        description: newTx.description,
        justificatif: proofFile,
      });
      toast.success(
        proofFile
          ? 'Transaction saisie avec justificatif.'
          : 'Transaction saisie. Information manquante (justificatif) — visible en rouge jusqu’à ajout.',
        { duration: 5000 },
      );
      setShowAddModal(false);
      resetCreateForm();
      fetchTransactions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erreur lors de la saisie de la transaction.';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleValider = async (id: number) => {
    const tx = transactions.find((t) => t.id === id);
    setConfirmAction({
      type: 'validate',
      transactionId: id,
      missingProof: Boolean(tx && !tx.justificatifUrl),
    });
  };

  const confirmValider = async (id: number) => {
    try {
      await transactionService.valider(id);
      toast.success('Paiement validé.');
      fetchTransactions();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Erreur lors de la validation.';
      toast.error(msg);
    }
  };

  const handleRefuser = async (id: number) => {
    setConfirmAction({ type: 'refuse', transactionId: id });
  };

  const confirmRefuser = async (id: number) => {
    try {
      await transactionService.refuser(id);
      toast.error('Transaction refusée.');
      fetchTransactions();
    } catch {
      toast.error('Erreur lors du refus.');
    }
  };

  const handleLateUpload = async (tx: Transaction, file: File | null) => {
    if (!file) return;
    if (file.size > MAX_PROOF_BYTES) {
      toast.error('Le justificatif ne doit pas dépasser 10 Mo.');
      return;
    }
    setUploadingProofId(tx.id);
    try {
      const { data } = await transactionService.uploadJustificatif(tx.id, file);
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? data : t)));
      if (detailTx?.id === tx.id) setDetailTx(data);
      toast.success('Justificatif ajouté — le formateur est notifié.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Erreur lors de l'upload.";
      toast.error(msg);
    } finally {
      setUploadingProofId(null);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const res = await rapportService.exporterTransactions({});
      downloadBlob(res.data, `rapport_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Rapport Excel téléchargé.');
    } catch {
      toast.error("Erreur lors de l'export Excel.");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      const res = await rapportService.exporterTransactionsPdf({});
      downloadBlob(res.data, `rapport_financier_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Rapport PDF prêt à imprimer.');
    } catch {
      toast.error("Erreur lors de l'export PDF.");
    } finally {
      setExporting(null);
    }
  };

  const handlePrintList = () => {
    window.print();
  };

  const getStatusBadge = (status: Transaction['statut']) => {
    switch (status) {
      case 'VALIDEE':
        return <span className="badge badge-success flex items-center gap-1"><Check className="w-3 h-3" /> Validée</span>;
      case 'REFUSEE':
        return <span className="badge badge-danger flex items-center gap-1"><XSquare className="w-3 h-3" /> Refusée</span>;
      default:
        return <span className="badge badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>;
    }
  };

  const getTypeLabel = (type: Transaction['type']) => {
    const labels: Record<string, string> = {
      DEPLACEMENT: 'Déplacement',
      HONORAIRES: 'Honoraires',
      FRAIS_PEDAGOGIQUES: 'Frais pédagogiques',
      MATERIEL: 'Matériel',
      AUTRE: 'Autre',
    };
    return labels[type] || type;
  };

  const missingProofCount = useMemo(
    () => transactions.filter((t) => !t.justificatifUrl && t.statut === 'EN_ATTENTE').length,
    [transactions],
  );

  const colSpan = useMemo(() => {
    let n = 7;
    if (canValidateTx || isDirecteur) n += 1;
    return n;
  }, [canValidateTx, isDirecteur]);

  if (skeletonLoading && transactions.length === 0) {
    return <PageLoadingSkeleton showTable />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions &amp; Paiements</h1>
          <p className="text-slate-500 mt-1">
            {isFormateur
              ? 'Consultez vos paiements saisis hors app. Vous pouvez valider même si un justificatif manque.'
              : isDirecteur
                ? 'Consultation complète — sans saisie ni modification. Exportez ou imprimez les rapports.'
                : 'Saisissez les paiements réalisés hors app. Sans justificatif, la ligne reste en rouge jusqu’à l’ajout.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canPrintReports && (
            <>
              <button
                type="button"
                onClick={handlePrintList}
                className="print:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                title="Imprimer la liste"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={!!exporting}
                className="print:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Excel
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!!exporting}
                className="print:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
              >
                {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                PDF
              </button>
            </>
          )}
          {canCreate && (
            <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary print:hidden">
              <Plus className="w-4 h-4" />
              Saisir une transaction
            </button>
          )}
        </div>
      </div>

      {missingProofCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-semibold">
              {missingProofCount} transaction{missingProofCount > 1 ? 's' : ''} — information manquante
            </p>
            <p className="text-red-700/90 mt-0.5">
              Justificatif non joint. Visible pour le formateur et le directeur. La validation reste possible ; dès qu’il est ajouté, le formateur est notifié.
            </p>
          </div>
        </div>
      )}

      {skeletonLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Bénéficiaire</th>
                <th>Type</th>
                <th>Description</th>
                <th>Montant</th>
                <th>Justificatif</th>
                <th>Statut</th>
                {(canValidateTx || isDirecteur) && <th>{canValidateTx ? 'Actions' : 'Consultation'}</th>}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const missingProof = !tx.justificatifUrl;
                return (
                  <tr
                    key={tx.id}
                    className={missingProof && tx.statut === 'EN_ATTENTE' ? 'bg-red-50/70' : undefined}
                  >
                    <td>
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-slate-900 font-medium">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        {tx.formateur?.prenom} {tx.formateur?.nom}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs uppercase tracking-wider font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {getTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td className="text-slate-600 max-w-xs truncate">{tx.description}</td>
                    <td className="text-slate-900 font-bold">{tx.montant.toLocaleString('fr-FR')} FCFA</td>
                    <td>
                      {tx.justificatifUrl ? (
                        <button
                          type="button"
                          onClick={() => setDetailTx(tx)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          {isImageProof(tx) ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                          Voir
                        </button>
                      ) : (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setDetailTx(tx)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-200/80"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Manquant
                          </button>
                          {canAttachLater && (
                            <label className="flex items-center gap-1 text-xs font-semibold text-red-700 cursor-pointer hover:underline">
                              <Upload className="w-3.5 h-3.5" />
                              {uploadingProofId === tx.id ? 'Envoi…' : 'Joindre maintenant'}
                              <input
                                type="file"
                                accept={ACCEPTED_PROOF}
                                className="hidden"
                                disabled={uploadingProofId === tx.id}
                                onChange={(e) => handleLateUpload(tx, e.target.files?.[0] || null)}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </td>
                    <td>{getStatusBadge(tx.statut)}</td>
                    {(canValidateTx || isDirecteur) && (
                      <td>
                        {canValidateTx && tx.statut === 'EN_ATTENTE' ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailTx(tx)}
                              className="p-1 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                              title="Voir le détail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleValider(tx.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title={
                                missingProof
                                  ? 'Valider (justificatif encore manquant)'
                                  : 'Valider'
                              }
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRefuser(tx.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Refuser"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDetailTx(tx)}
                            className="text-xs text-slate-500 hover:text-[#004b57] inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Détail
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="text-center py-8 text-slate-500">
                    Aucune transaction saisie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal saisie */}
      <Modal
        open={showAddModal}
        title="Saisir une transaction"
        size="md"
        onClose={() => {
          if (creating) return;
          setShowAddModal(false);
          resetCreateForm();
        }}
        footer={
          <>
            <button
              type="button"
              disabled={creating}
              onClick={() => {
                setShowAddModal(false);
                resetCreateForm();
              }}
              className="btn-ghost w-full sm:w-auto justify-center"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="create-tx-form"
              disabled={creating}
              className="btn-primary w-full sm:w-auto justify-center disabled:opacity-50"
            >
              {creating ? 'Enregistrement…' : 'Enregistrer la saisie'}
            </button>
          </>
        }
      >
        <form id="create-tx-form" onSubmit={handleCreateTx} className="space-y-3 sm:space-y-4">
          <p className="text-xs text-slate-500 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            Les paiements se font hors application (Mobile Money, banque, etc.). Ici vous saisissez uniquement le suivi.
          </p>
          <div>
            <label className="label">Formateur bénéficiaire</label>
            <select
              className="input-field"
              required
              value={newTx.formateurId}
              onChange={(e) => setNewTx({ ...newTx, formateurId: e.target.value })}
            >
              <option value="">Sélectionner le formateur...</option>
              {formateurs.map((f) => (
                <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="label">Montant (FCFA)</label>
              <input
                type="number"
                required
                min={1}
                placeholder="Ex: 25000"
                className="input-field"
                value={newTx.montant}
                onChange={(e) => setNewTx({ ...newTx, montant: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="input-field"
                value={newTx.type}
                onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
              >
                <option value="DEPLACEMENT">Déplacement</option>
                <option value="HONORAIRES">Honoraires</option>
                <option value="FRAIS_PEDAGOGIQUES">Frais pédagogiques</option>
                <option value="MATERIEL">Matériel</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              rows={3}
              required
              placeholder="Ex: Paiement Moov Money du 09/07 — déplacement Kara…"
              className="input-field"
              value={newTx.description}
              onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-[#004b57]" />
              Justificatif <span className="text-slate-400 font-normal">(recommandé)</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Photo du reçu, PDF ou document. Optionnel à la saisie — sans fichier, la ligne reste en rouge jusqu’à l’ajout. Le formateur peut valider quand même.
            </p>
            {!proofFile && (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Sans justificatif, formateur et directeur verront « information manquante » en rouge. Vous pourrez le joindre plus tard.
              </div>
            )}
            <MediaDropZone
              compact
              files={proofFiles}
              onChange={setProofFiles}
              accept={ACCEPTED_PROOF}
              maxSizeMb={10}
              label=""
              hint="Photo, PDF, Word ou Excel — glisser-déposer ou Ctrl+V"
              disabled={creating}
            />
          </div>
        </form>
      </Modal>

      {/* Détail / aperçu justificatif */}
      <Modal
        open={!!detailTx}
        title="Détail de la transaction"
        size="lg"
        onClose={() => setDetailTx(null)}
        footer={
          <button type="button" onClick={() => setDetailTx(null)} className="btn-ghost w-full sm:w-auto justify-center">
            Fermer
          </button>
        }
      >
        {detailTx && (
          <div className="space-y-4">
            {!detailTx.justificatifUrl && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Information manquante — justificatif</p>
                  <p className="text-red-700/90 text-xs mt-0.5">
                    {isFormateur
                      ? 'Vous pouvez quand même valider si vous le souhaitez. Dès que le comptable joint le document, vous serez notifié.'
                      : isDirecteur
                        ? 'Consultation uniquement. Le comptable doit joindre le document — vous pouvez exporter / imprimer les rapports.'
                        : 'Visible pour le formateur et le directeur. Joignez le document quand il est disponible — le formateur sera notifié.'}
                  </p>
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-xs text-slate-500">Bénéficiaire</p>
                <p className="font-semibold text-slate-900">
                  {detailTx.formateur?.prenom} {detailTx.formateur?.nom}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-xs text-slate-500">Montant</p>
                <p className="font-semibold text-slate-900">
                  {detailTx.montant.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-xs text-slate-500">Type</p>
                <p className="font-semibold text-slate-900">{getTypeLabel(detailTx.type)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-xs text-slate-500">Statut</p>
                <div className="mt-0.5">{getStatusBadge(detailTx.statut)}</div>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{detailTx.description}</p>
            </div>

            <div className={`border rounded-xl p-4 bg-white ${
              detailTx.justificatifUrl ? 'border-slate-200' : 'border-red-200'
            }`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-[#004b57]" />
                  Justificatif
                </h3>
              </div>

              {detailTx.justificatifUrl ? (
                <SecureProofViewer tx={detailTx} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-700 font-medium">Aucun justificatif joint.</p>
                  {canAttachLater && (
                    <MediaDropZone
                      compact
                      files={lateProofFiles}
                      onChange={async (files) => {
                        setLateProofFiles(files);
                        if (files[0] && detailTx) {
                          await handleLateUpload(detailTx, files[0]);
                          setLateProofFiles([]);
                        }
                      }}
                      accept={ACCEPTED_PROOF}
                      maxSizeMb={10}
                      hint="Glisser-déposer ou Ctrl+V"
                      disabled={uploadingProofId === detailTx.id}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmAction != null}
        title={confirmAction?.type === 'refuse' ? 'Refuser la transaction ?' : 'Valider la transaction ?'}
        message={
          confirmAction?.type === 'refuse'
            ? 'Cette transaction sera marquée comme refusée.'
            : confirmAction?.missingProof
              ? 'Le justificatif est manquant. Voulez-vous quand même valider cette transaction ?'
              : 'Cette transaction sera marquée comme validée.'
        }
        confirmLabel={confirmAction?.type === 'refuse' ? 'Refuser' : 'Valider'}
        danger={confirmAction?.type === 'refuse'}
        onConfirm={() => {
          if (!confirmAction) return;
          const action = confirmAction;
          setConfirmAction(null);
          if (action.type === 'refuse') {
            void confirmRefuser(action.transactionId);
          } else {
            void confirmValider(action.transactionId);
          }
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
