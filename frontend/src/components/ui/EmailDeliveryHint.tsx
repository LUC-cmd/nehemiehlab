import React from 'react';
import { Mail } from 'lucide-react';

type Props = {
  email?: string;
  className?: string;
};

/**
 * Rappel affiché après envoi d'un email transactionnel (OTP, inscription…).
 */
export default function EmailDeliveryHint({ email, className = '' }: Props) {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
      role="note"
    >
      <p className="font-semibold flex items-center gap-2">
        <Mail className="w-4 h-4 shrink-0" />
        Vous ne voyez pas l&apos;email dans Gmail ?
      </p>
      <ul className="mt-2 space-y-1.5 text-amber-900/90 leading-relaxed">
        <li>
          Ouvrez le dossier <strong>Courrier indésirable</strong> ou <strong>Spam</strong>
        </li>
        <li>
          Recherchez <strong>« Smart Kids Academy »</strong>
        </li>
        {email ? (
          <li>
            Vérifiez que l&apos;adresse est bien <strong>{email}</strong>
          </li>
        ) : null}
        <li>
          Cliquez sur <strong>« Non spam »</strong> pour recevoir les prochains messages dans la boîte principale
        </li>
      </ul>
    </div>
  );
}
