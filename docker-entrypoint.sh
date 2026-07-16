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

# Important : "su" reinitialise le PATH par defaut et ne trouve donc plus le
# binaire java (installe hors des repertoires standards par l'image
# eclipse-temurin). On propage explicitement le PATH courant (celui defini
# par l'image, qui inclut le JDK) dans l'environnement de la commande executee
# en tant qu'appuser.
exec su -s /bin/sh appuser -c "PATH=\"$PATH\" exec java -jar /app/app.jar"
