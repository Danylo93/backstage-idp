FROM eclipse-temurin:${{ values.javaVersion }}-jre
WORKDIR /app
COPY target/*.jar app.jar
CMD ["java", "-jar", "app.jar"]
