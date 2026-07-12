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
ENTRYPOINT ["java", "-jar", "app.jar"]
