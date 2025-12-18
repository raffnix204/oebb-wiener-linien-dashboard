let connections = [];
const API_URL = '/api';

// Drag & Drop State
let draggedElement = null;
let draggedIndex = null;

// Ausgewählte Stationen speichern
let selectedStations = {
    from: null,
    to: null
};

// Debounce Timer
let searchTimers = {
    from: null,
    to: null
};

// Stationen suchen
async function searchStations(type) {
    const inputId = type === 'from' ? 'fromStation' : 'toStation';
    const resultsId = type === 'from' ? 'fromStationResults' : 'toStationResults';

    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    const query = input.value.trim();

    // Zurücksetzen der Auswahl wenn Benutzer tippt
    selectedStations[type] = null;

    // Timer clearen
    if (searchTimers[type]) {
        clearTimeout(searchTimers[type]);
    }

    if (query.length < 2) {
        results.classList.remove('show');
        return;
    }

    // Debounce: 300ms warten bevor gesucht wird
    searchTimers[type] = setTimeout(async () => {
        results.innerHTML = '<div class="autocomplete-loading">Suche Stationen...</div>';
        results.classList.add('show');

        try {
            const response = await fetch(`${API_URL}/stations?query=${encodeURIComponent(query)}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const stations = await response.json();

            if (stations.length === 0) {
                results.innerHTML = '<div class="autocomplete-no-results">Keine Stationen gefunden</div>';
                return;
            }

            results.innerHTML = stations
                .filter(station => station.type === 'station' || station.type === 'stop')
                .slice(0, 15)
                .map(station => {
                    const displayType = station.displayType || 'Station';
                    const typeIcon = getStationIcon(displayType);
                    return `
                        <div class="autocomplete-item" onclick="selectStation('${type}', '${escapeHtml(station.id)}', '${escapeHtml(station.name)}')">
                            <div class="autocomplete-item-name">
                                <span class="station-icon">${typeIcon}</span>
                                ${escapeHtml(station.name)}
                            </div>
                            <div class="autocomplete-item-id">${displayType}</div>
                        </div>
                    `;
                }).join('');

        } catch (error) {
            console.error('Fehler beim Suchen:', error);
            results.innerHTML = '<div class="autocomplete-no-results">Fehler beim Laden der Stationen</div>';
        }
    }, 300);
}

// Station auswählen
function selectStation(type, id, name) {
    const inputId = type === 'from' ? 'fromStation' : 'toStation';
    const resultsId = type === 'from' ? 'fromStationResults' : 'toStationResults';

    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);

    input.value = name;
    selectedStations[type] = { id, name };
    results.classList.remove('show');
}

// HTML escapen
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Icon für Stationstyp
function getStationIcon(type) {
    const icons = {
        'U-Bahn': '🚇',
        'Straßenbahn': '🚊',
        'Bus': '🚌',
        'S-Bahn': '🚈',
        'Fernzug': '🚄',
        'Regionalzug': '🚆',
        'Station': '🚉'
    };
    return icons[type] || '🚉';
}

// Badge-Farbe für Verkehrsmittel
function getTransportColor(type) {
    const colors = {
        'subway': '#e74c3c',      // Rot für U-Bahn
        'tram': '#e67e22',        // Orange für Straßenbahn
        'bus': '#9b59b6',         // Lila für Bus
        'suburban': '#3498db',    // Blau für S-Bahn
        'regional': '#27ae60',    // Grün für Regionalzug
        'national': '#2c3e50',    // Dunkelgrau für Fernzug
        'walking': '#95a5a6',     // Hellgrau für Fußweg
        'train': '#667eea'        // Default Lila
    };
    return colors[type] || '#667eea';
}

// Click außerhalb schließt Dropdown
document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) {
        document.querySelectorAll('.autocomplete-results').forEach(el => {
            el.classList.remove('show');
        });
    }
});

// Drag & Drop Funktionen
function handleDragStart(e, index) {
    draggedElement = e.target;
    draggedIndex = index;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (e.target.classList.contains('connection-card')) {
        e.target.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if (e.target.classList.contains('connection-card')) {
        e.target.classList.remove('drag-over');
    }
}

function handleDrop(e, dropIndex) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    e.target.classList.remove('drag-over');

    if (draggedIndex !== dropIndex) {
        // Element aus Array entfernen und an neuer Position einfügen
        const draggedConnection = connections[draggedIndex];
        connections.splice(draggedIndex, 1);
        connections.splice(dropIndex, 0, draggedConnection);

        saveConnections();
        renderConnections();
    }

    return false;
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.connection-card').forEach(card => {
        card.classList.remove('drag-over');
    });
}

// Verbindungen laden
function loadConnections() {
    const saved = localStorage.getItem('oebbConnections');
    if (saved) {
        connections = JSON.parse(saved);
        renderConnections();
    }
}

// Verbindungen speichern
function saveConnections() {
    localStorage.setItem('oebbConnections', JSON.stringify(connections));
}

// Verbindung hinzufügen
function addConnection() {
    if (!selectedStations.from || !selectedStations.to) {
        alert('Bitte wählen Sie eine Start- und Zielstation aus der Liste aus!');
        return;
    }

    const connection = {
        id: Date.now(),
        fromStation: selectedStations.from.id,
        fromName: selectedStations.from.name,
        toStation: selectedStations.to.id,
        toName: selectedStations.to.name
    };

    connections.push(connection);
    saveConnections();
    renderConnections();

    // Felder leeren
    document.getElementById('fromStation').value = '';
    document.getElementById('toStation').value = '';
    selectedStations.from = null;
    selectedStations.to = null;
}

// Verbindung entfernen
function removeConnection(id) {
    if (confirm('Möchten Sie diese Verbindung wirklich entfernen?')) {
        connections = connections.filter(c => c.id !== id);
        saveConnections();
        renderConnections();
    }
}

// Verbindung aktualisieren
function refreshConnection(id) {
    const conn = connections.find(c => c.id === id);
    if (conn) {
        loadConnectionData(conn);
    }
}

// ÖBB-Link öffnen
function openOebbLink(fromStation, toStation) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    const url = `https://live.oebb.at/journey-view?from=${fromStation}&to=${toStation}&date=${date}&time=${time}`;
    window.open(url, '_blank');
}

// Zeit formatieren
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

// Dauer formatieren
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
}

// Verbindungsdaten von API laden
async function loadConnectionData(conn) {
    const containerId = `connection-${conn.id}`;
    const container = document.getElementById(containerId);

    container.innerHTML = '<div class="loading"><div class="spinner"></div><span>Lade Verbindungen...</span></div>';

    try {
        const response = await fetch(`${API_URL}/connections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fromStation: conn.fromStation,
                toStation: conn.toStation
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        renderJourneys(data.connections || [], containerId);
    } catch (error) {
        container.innerHTML = `
            <div class="error">
                <strong>Fehler beim Laden:</strong> ${error.message}
            </div>
            <div style="margin-top: 15px;">
                <button class="btn btn-link" onclick="openOebbLink('${conn.fromStation}', '${conn.toStation}')">
                    Auf ÖBB-Website öffnen
                </button>
            </div>
        `;
    }
}

// Verbindungen rendern
function renderJourneys(journeys, containerId) {
    const container = document.getElementById(containerId);

    if (!journeys || journeys.length === 0) {
        container.innerHTML = '<div class="error">Keine Verbindungen gefunden.</div>';
        return;
    }

    container.innerHTML = journeys.map(journey => {
        const departureTime = formatTime(journey.from.departure);
        const arrivalTime = formatTime(journey.to.arrival);
        const duration = formatDuration(journey.duration);
        const switches = journey.switches || 0;

        const sections = journey.sections.map(section => {
            const category = section.category?.name || 'Zug';
            const type = section.category?.type || 'train';
            const color = getTransportColor(type);

            // Walking section
            if (type === 'walking') {
                const duration = section.duration ? ` (${section.duration} min)` : '';
                return `
                    <div class="section walking-section">
                        <div class="train-badge" style="background: ${color};">${category}</div>
                        <div class="section-info">
                            <div class="station-row">
                                <span class="station-name">${section.from?.name || ''}</span>
                                <span class="arrow">→</span>
                                <span class="station-name">${section.to?.name || ''}</span>
                            </div>
                            <div class="walking-duration">Fußweg${duration}</div>
                        </div>
                    </div>
                `;
            }

            // Transport section with platform and time details
            const fromPlatform = section.from?.platform;
            const toPlatform = section.to?.platform;
            const direction = section.direction || '';

            // Wiener Linien (U-Bahn, Straßenbahn, Bus) zeigen Richtung statt Gleis
            const isWienerLinien = ['subway', 'tram', 'bus'].includes(type);

            // Abfahrt: Nutze geplante Zeit, falls vorhanden, sonst tatsächliche
            const fromTimePlanned = section.from?.departurePlanned ? formatTime(section.from.departurePlanned) : null;
            const fromTimeActual = section.from?.departure ? formatTime(section.from.departure) : '';
            const departureDelay = section.from?.departureDelay ? Math.round(section.from.departureDelay / 60) : 0;

            // Ankunft: Nutze geplante Zeit, falls vorhanden, sonst tatsächliche
            const toTimePlanned = section.to?.arrivalPlanned ? formatTime(section.to.arrivalPlanned) : null;
            const toTimeActual = section.to?.arrival ? formatTime(section.to.arrival) : '';
            const arrivalDelay = section.to?.arrivalDelay ? Math.round(section.to.arrivalDelay / 60) : 0;

            // Formatierung der Abfahrtszeit
            let fromTimeDisplay = '';
            if (fromTimePlanned && departureDelay && departureDelay > 0) {
                // Verspätung vorhanden: Zeige geplante Zeit durchgestrichen + neue Zeit in Rot
                fromTimeDisplay = `
                    <span class="station-time">
                        <span class="time-cancelled">${fromTimePlanned}</span>
                        <span class="time-delayed">${fromTimeActual}</span>
                    </span>
                `;
            } else {
                // Keine Verspätung oder keine geplante Zeit
                fromTimeDisplay = `<span class="station-time">${fromTimeActual}</span>`;
            }

            // Formatierung der Ankunftszeit
            let toTimeDisplay = '';
            if (toTimePlanned && arrivalDelay && arrivalDelay > 0) {
                toTimeDisplay = `
                    <span class="station-time">
                        <span class="time-cancelled">${toTimePlanned}</span>
                        <span class="time-delayed">${toTimeActual}</span>
                    </span>
                `;
            } else {
                toTimeDisplay = `<span class="station-time">${toTimeActual}</span>`;
            }

            // Verspätungstext
            const delayText = departureDelay && departureDelay > 0
                ? `<span class="delay">+${departureDelay} min Verspätung</span>`
                : '';

            // Richtungsanzeige vorbereiten
            const directionBadge = direction ? `<span class="direction">Richtung ${direction}</span>` : '';

            // Für Wiener Linien: Richtung statt Gleis anzeigen
            // Für Züge: Gleis UND Richtung anzeigen
            let platformOrDirectionFrom = '';
            let platformOrDirectionTo = '';

            if (isWienerLinien) {
                // Wiener Linien: Nur Richtung, kein Gleis
                platformOrDirectionFrom = directionBadge;
            } else {
                // Züge: Gleis und Richtung
                platformOrDirectionFrom = fromPlatform ? `<span class="platform">Gleis ${fromPlatform}</span>` : '';
                if (direction && !platformOrDirectionFrom) {
                    platformOrDirectionFrom = directionBadge;
                }
            }

            return `
                <div class="section">
                    <div class="train-badge" style="background: ${color};">${category}</div>
                    <div class="section-details">
                        <div class="leg-station">
                            <div class="station-header">
                                ${fromTimeDisplay}
                                <span class="station-name">${section.from?.name || ''}</span>
                                ${platformOrDirectionFrom}
                                ${!isWienerLinien && direction ? directionBadge : ''}
                            </div>
                            ${delayText}
                        </div>
                        <div class="leg-arrow">↓</div>
                        <div class="leg-station">
                            <div class="station-header">
                                ${toTimeDisplay}
                                <span class="station-name">${section.to?.name || ''}</span>
                                ${!isWienerLinien && toPlatform ? `<span class="platform">Gleis ${toPlatform}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="journey">
                <div class="journey-header">
                    <div class="journey-time">
                        <div class="time-info">
                            <div class="time-label">Abfahrt</div>
                            <div class="time-value">${departureTime}</div>
                        </div>
                        <div class="time-info">
                            <div class="time-label">Ankunft</div>
                            <div class="time-value">${arrivalTime}</div>
                        </div>
                    </div>
                    <div class="duration">${duration}</div>
                </div>
                <div class="journey-details">
                    ${sections}
                    ${switches > 0 ? `<div class="switches-info">${switches} Umstieg${switches > 1 ? 'e' : ''}</div>` : '<div class="switches-info">Direkte Verbindung</div>'}
                </div>
            </div>
        `;
    }).join('');
}

// Verbindungen anzeigen
function renderConnections() {
    const container = document.getElementById('connectionsContainer');

    if (connections.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Keine Verbindungen vorhanden</h3>
                <p>Fügen Sie Ihre erste Verbindung hinzu, um live Fahrpläne zu sehen.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = connections.map((conn, index) => `
        <div class="connection-card"
             draggable="true"
             data-index="${index}">
            <div class="connection-header">
                <div class="drag-handle" title="Ziehen Sie diese Karte, um die Position zu ändern">⋮⋮</div>
                <div class="connection-info">
                    <div class="connection-route">${conn.fromName} → ${conn.toName}</div>
                    <div class="connection-stations">ID: ${conn.fromStation} → ${conn.toStation}</div>
                </div>
                <div class="button-group">
                    <button class="btn btn-link" onclick="openOebbLink('${conn.fromStation}', '${conn.toStation}')">Auf ÖBB öffnen</button>
                    <button class="btn btn-refresh" onclick="refreshConnection(${conn.id})">Aktualisieren</button>
                    <button class="btn btn-danger" onclick="removeConnection(${conn.id})">Entfernen</button>
                </div>
            </div>
            <div class="connection-content" id="connection-${conn.id}">
                <div class="loading">
                    <div class="spinner"></div>
                    <span>Lade Verbindungen...</span>
                </div>
            </div>
        </div>
    `).join('');

    // Drag & Drop Event Listeners hinzufügen
    const cards = container.querySelectorAll('.connection-card');
    cards.forEach((card, index) => {
        card.addEventListener('dragstart', (e) => handleDragStart(e, index));
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', (e) => handleDrop(e, index));
        card.addEventListener('dragend', handleDragEnd);
    });

    connections.forEach(conn => loadConnectionData(conn));
}

// Auto-Refresh alle 2 Minuten
setInterval(() => {
    if (connections.length > 0) {
        connections.forEach(conn => loadConnectionData(conn));
    }
}, 120000);

// Verkehrsmeldungen laden
async function loadTrafficAlerts() {
    try {
        const response = await fetch(`${API_URL}/traffic-alerts`);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const items = xmlDoc.querySelectorAll('item');
        const alerts = Array.from(items).slice(0, 5).map(item => ({
            title: item.querySelector('title')?.textContent || '',
            description: item.querySelector('description')?.textContent || '',
            pubDate: item.querySelector('pubDate')?.textContent || '',
            link: item.querySelector('link')?.textContent || ''
        }));

        renderTrafficAlerts(alerts);
    } catch (error) {
        console.error('Fehler beim Laden der Verkehrsmeldungen:', error);
    }
}

// Verkehrsmeldungen anzeigen
function renderTrafficAlerts(alerts) {
    const container = document.getElementById('trafficAlerts');

    if (!alerts || alerts.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = `
        <div class="alerts-header">
            <h3>🚨 Aktuelle Verkehrsmeldungen</h3>
            <small>Quelle: <a href="https://github.com/Origamihase/wien-oepnv" target="_blank">Origamihase/wien-oepnv</a></small>
        </div>
        <div class="alerts-list">
            ${alerts.map(alert => `
                <div class="alert-item">
                    <div class="alert-title">${alert.title}</div>
                    <div class="alert-description">${alert.description}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadConnections();
    loadTrafficAlerts();

    // Verkehrsmeldungen alle 5 Minuten aktualisieren
    setInterval(loadTrafficAlerts, 5 * 60 * 1000);

    // Enter-Taste zum Hinzufügen
    const inputs = ['fromStation', 'toStation'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addConnection();
            }
        });
    });
});
