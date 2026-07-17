import React, { useEffect, useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { mediaUrl } from '../../utils/media';
import type { User } from '../../types';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

const iconSizes: Record<AvatarSize, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-9 h-9',
};

interface UserAvatarProps {
  user?: Pick<User, 'prenom' | 'nom' | 'avatar'> | null;
  prenom?: string;
  nom?: string;
  avatar?: string | null;
  size?: AvatarSize;
  className?: string;
  rounded?: 'full' | 'xl' | '2xl';
}

function initials(prenom?: string, nom?: string): string {
  const a = (prenom || '').trim().charAt(0);
  const b = (nom || '').trim().charAt(0);
  const value = `${a}${b}`.toUpperCase();
  return value || '';
}

/**
 * Avatar utilisateur : photo de profil si présente, sinon initiales.
 */
export default function UserAvatar({
  user,
  prenom,
  nom,
  avatar,
  size = 'md',
  className = '',
  rounded = 'full',
}: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const p = prenom ?? user?.prenom;
  const n = nom ?? user?.nom;
  const src = mediaUrl(avatar ?? user?.avatar);
  // Reinitialise l'etat "image cassee" a chaque changement de photo (ex: apres
  // un nouvel upload) : sans cela, une seule erreur de chargement (reseau,
  // cache) bloquait definitivement l'affichage de la photo dans cette session,
  // meme apres un upload reussi ulterieur, tant que le composant n'etait pas
  // demonte (listes d'utilisateurs, dossier formateur...).
  useEffect(() => {
    setBroken(false);
  }, [src]);
  const showImage = Boolean(src) && !broken;
  const letters = initials(p, n);
  const radius =
    rounded === 'full' ? 'rounded-full' : rounded === '2xl' ? 'rounded-2xl' : 'rounded-xl';

  return (
    <div
      className={`${sizeClasses[size]} ${radius} shrink-0 overflow-hidden bg-primary-50 border border-primary-200 text-primary-700 font-bold flex items-center justify-center ${className}`}
      title={p || n ? `${p || ''} ${n || ''}`.trim() : undefined}
    >
      {showImage ? (
        <img
          src={src}
          alt={p || n ? `${p || ''} ${n || ''}`.trim() : 'Photo de profil'}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : letters ? (
        <span className="select-none leading-none">{letters}</span>
      ) : (
        <UserIcon className={iconSizes[size]} />
      )}
    </div>
  );
}
