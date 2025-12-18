#!/bin/bash

# ÖBB Dashboard Update Script

echo "🔄 Aktualisiere ÖBB Dashboard..."

# Neueste Änderungen holen
echo "📥 Lade neueste Änderungen von GitHub..."
git pull

# Container neu bauen und starten
echo "🔨 Baue und starte Container neu..."
docker compose down
docker compose up -d --build

# Status anzeigen
echo "✅ Update abgeschlossen!"
echo ""
docker compose ps
