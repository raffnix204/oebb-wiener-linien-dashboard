# Node.js LTS Version als Basis
FROM node:18-alpine

# Arbeitsverzeichnis erstellen
WORKDIR /app

# Package.json und package-lock.json kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm ci --only=production

# Anwendungscode kopieren
COPY . .

# Port freigeben
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/stations?query=wien', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Server starten
CMD ["npm", "start"]
