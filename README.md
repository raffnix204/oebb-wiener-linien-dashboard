# ÖBB & Wiener Linien Dashboard

Ein modernes Dashboard zur Anzeige von Live-Verbindungen für ÖBB und Wiener Linien.

<img width="1500" height="1222" alt="oebb-dashboard" src="https://github.com/user-attachments/assets/d22986f4-330f-41a8-be8c-2a8111ea3a07" />

## Features

- 🚆 Live-Verbindungen von ÖBB
- 🚇 Integration von Wiener Linien (U-Bahn, Straßenbahn, Bus)
- 🔄 Automatische Aktualisierung alle 2 Minuten
- 📍 Intelligente Stationssuche mit Autocomplete
- ⏱️ Echtzeit-Verspätungsanzeige
- 🎯 Drag & Drop zum Neuordnen der Verbindungen
- 💾 Speicherung der Verbindungen im Browser (LocalStorage)

## Schnellstart mit Docker Compose

### Voraussetzungen

- Docker
- Docker Compose

### Installation und Start

1. Repository klonen oder Dateien herunterladen

2. Im Projektverzeichnis ausführen:
```bash
docker compose up -d
```

3. Dashboard öffnen:
```
http://localhost:3007
```

### Docker Befehle

```bash
# Dashboard starten
docker compose up -d

# Logs anzeigen
docker compose logs -f

# Dashboard stoppen
docker compose down

# Dashboard neu bauen (nach Code-Änderungen)
docker compose up -d --build

# Status prüfen
docker compose ps
```

## Verwendung

1. **Verbindung hinzufügen:**
   - Startstation eingeben (z.B. "Wien Hbf")
   - Zielstation eingeben (z.B. "Salzburg Hbf")
   - "Verbindung hinzufügen" klicken

2. **Verbindungen verwalten:**
   - **Drag & Drop:** Karten anklicken und ziehen, um Reihenfolge zu ändern
   - **Aktualisieren:** Aktuellste Daten abrufen
   - **Auf ÖBB öffnen:** Verbindung auf ÖBB-Website anzeigen
   - **Entfernen:** Verbindung vom Dashboard löschen

3. **Informationen:**
   - Zeigt Abfahrts- und Ankunftszeiten
   - Zeigt Gleise bei Zügen und S-Bahnen
   - Zeigt Richtung bei allen Verkehrsmitteln
   - Zeigt Verspätungen in Echtzeit
   - Zeigt alle Umstiege mit Details

## Entwicklung ohne Docker

Für lokale Entwicklung:

```bash
# Dependencies installieren
npm install

# Server starten
npm start
```

Das Dashboard ist dann erreichbar unter: http://localhost:3007

## Technologie

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **API:** hafas-client (ÖBB HAFAS API)
- **Container:** Docker, Docker Compose

## Port

- Standard-Port: **3007**
- Ändern in `docker-compose.yml` unter `ports: - "3007:3000"`

## Credits

**Verkehrsmeldungen:** Die Echtzeitstörungen für Wien werden bereitgestellt von [Origamihase/wien-oepnv](https://github.com/Origamihase/wien-oepnv) - ein RSS-Feed mit aktuellen Störungsmeldungen für den Wiener Öffentlichen Verkehr.

## Hinweis

Dies ist ein inoffizielles Tool und nutzt die öffentliche ÖBB HAFAS API.
