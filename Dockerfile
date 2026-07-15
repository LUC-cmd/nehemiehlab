# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
# Copie du pom.xml et téléchargement des dépendances (pour utiliser le cache Docker)
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
# Copie du code source et compilation
COPY backend/src ./src
RUN mvn clean verify -B

# Run stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN useradd --system --uid 10001 --no-create-home appuser
COPY --from=build --chown=appuser:appuser /app/target/*.jar app.jar
USER appuser
EXPOSE 8080
# Limite mémoire JVM adaptée à un petit conteneur (Railway) : la JVM n'utilise que
# 75% de la RAM du conteneur, ce qui évite l'OOM-kill du conteneur.
# JAVA_TOOL_OPTIONS peut être surchargé via une variable Railway sans rebuild.
# Force IPv4 pour les connexions sortantes (SMTP notamment) : sur Railway,
# l'IPv6 sortant existe dans l'interface mais est black-holed (timeout au lieu
# d'un rejet immediat), ce qui bloquait l'envoi des OTP par email vers Gmail.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -Djava.net.preferIPv4Stack=true"
ENTRYPOINT ["java", "-jar", "app.jar"]
