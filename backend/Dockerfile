# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
# Copie du pom.xml et téléchargement des dépendances (pour utiliser le cache Docker)
COPY pom.xml .
RUN mvn dependency:go-offline -B
# Copie du code source et compilation
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
