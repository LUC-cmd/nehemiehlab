#!/bin/sh
set -e

# Le volume persistant Railway est monte sur /data et appartient a root:root
# par defaut. Le conteneur tourne pourtant en utilisateur non-root (appuser)
# pour des raisons de securite, ce qui l'empechait d'ecrire dans /data/uploads
# (AccessDeniedException lors de l'upload d'avatar, de CNI, de supports de
# cours, etc.). On corrige les permissions du point de montage au demarrage,
# en root, puis on abandonne les privileges pour lancer l'application avec
# l'utilisateur non-root habituel.
if [ -d /data ]; then
  mkdir -p /data/uploads
  chown appuser:appuser /data /data/uploads
fi

exec su -s /bin/sh appuser -c "exec java -jar /app/app.jar"
