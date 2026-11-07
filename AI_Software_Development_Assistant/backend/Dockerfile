# ==========================================
# DevPilot AI - Backend Dockerfile
# Spring Boot 3.5.7 / Java 21
# ==========================================

# Stage 1: Build application
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy Maven configuration
COPY pom.xml .

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build executable JAR
RUN mvn clean package -DskipTests -B

# Stage 2: Run application
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=builder /app/target/ai-software-assistant-1.0.0.jar app.jar

# Render provides PORT dynamically
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
