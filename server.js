import express from 'express';
import cors from 'cors';
import { createClient } from 'hafas-client';
import { profile as oebbProfile } from 'hafas-client/p/oebb/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// HAFAS Client für ÖBB erstellen
const client = createClient(oebbProfile, 'oebb-dashboard');

// API Endpunkt für Verbindungen
app.post('/api/connections', async (req, res) => {
    try {
        const { fromStation, toStation, datetime } = req.body;

        const when = datetime ? new Date(datetime) : new Date();

        console.log(`Suche Verbindungen von ${fromStation} nach ${toStation} um ${when.toISOString()}`);

        const journeys = await client.journeys(fromStation, toStation, {
            results: 5,
            departure: when,
            stopovers: true
        });

        console.log(`Gefunden: ${journeys.journeys.length} Verbindungen`);

        // Daten in das erwartete Format konvertieren
        const connections = journeys.journeys.map(journey => {
            return {
                from: {
                    departure: journey.legs[0].departure,
                    name: journey.legs[0].origin.name
                },
                to: {
                    arrival: journey.legs[journey.legs.length - 1].arrival,
                    name: journey.legs[journey.legs.length - 1].destination.name
                },
                duration: Math.round((new Date(journey.legs[journey.legs.length - 1].arrival) - new Date(journey.legs[0].departure)) / 60000),
                switches: journey.legs.filter(leg => leg.walking !== true && leg.line).length - 1,
                sections: journey.legs.map(leg => {
                    if (leg.walking) {
                        return {
                            category: {
                                name: 'Fußweg',
                                type: 'walking'
                            },
                            from: {
                                name: leg.origin?.name || '',
                                departure: leg.departure,
                                platform: null
                            },
                            to: {
                                name: leg.destination?.name || '',
                                arrival: leg.arrival,
                                platform: null
                            },
                            duration: leg.duration ? Math.round(leg.duration / 60) : null
                        };
                    }

                    if (leg.line) {
                        const transportType = getTransportType(leg.line);

                        // Richtung ermitteln: Nutze mehrere Quellen
                        // 1. leg.direction (oft vorhanden)
                        // 2. line.direction (alternative Quelle)
                        // 3. destination.name (Fallback - Endstation dieses Legs)
                        const direction = leg.direction || leg.line?.direction || leg.destination?.name || '';

                        return {
                            category: {
                                name: getTransportName(leg.line),
                                type: transportType,
                                lineNumber: leg.line.name
                            },
                            direction: direction,
                            from: {
                                name: leg.origin?.name || '',
                                departure: leg.departure,
                                departurePlanned: leg.plannedDeparture,
                                departureDelay: leg.departureDelay,
                                platform: leg.departurePlatform || leg.origin?.platform,
                                platformPlanned: leg.plannedDeparturePlatform
                            },
                            to: {
                                name: leg.destination?.name || '',
                                arrival: leg.arrival,
                                arrivalPlanned: leg.plannedArrival,
                                arrivalDelay: leg.arrivalDelay,
                                platform: leg.arrivalPlatform || leg.destination?.platform,
                                platformPlanned: leg.plannedArrivalPlatform
                            }
                        };
                    }

                    return null;
                }).filter(section => section !== null)
            };
        });

        res.json({ connections });
    } catch (error) {
        console.error('Fehler:', error);
        res.status(500).json({ error: error.message });
    }
});

// API Endpunkt für Stationssuche (inkl. Wiener Linien)
app.get('/api/stations', async (req, res) => {
    try {
        const { query } = req.query;

        console.log(`Suche Stationen: ${query}`);

        const locations = await client.locations(query, {
            results: 20,  // Mehr Ergebnisse für bessere Abdeckung
            poi: false,   // Keine Points of Interest
            addresses: false,  // Keine Adressen
            stops: true,  // Haltestellen einschließen
            linesOfStops: false
        });

        // Filtern und anreichern mit Typ-Information
        const enrichedLocations = locations.map(loc => ({
            ...loc,
            displayType: getStationType(loc)
        }));

        res.json(enrichedLocations);
    } catch (error) {
        console.error('Fehler:', error);
        res.status(500).json({ error: error.message });
    }
});

// API Endpunkt für Verkehrsmeldungen (RSS Feed Proxy)
app.get('/api/traffic-alerts', async (req, res) => {
    try {
        const response = await fetch('https://origamihase.github.io/wien-oepnv/feed.xml');
        const xmlText = await response.text();
        res.set('Content-Type', 'application/xml');
        res.send(xmlText);
    } catch (error) {
        console.error('Fehler beim Laden der Verkehrsmeldungen:', error);
        res.status(500).json({ error: error.message });
    }
});

// Hilfs-Funktion zur Bestimmung des Verkehrsmitteltyps
function getTransportType(line) {
    const product = line.product || line.mode;

    if (product === 'subway' || line.name?.startsWith('U')) return 'subway';
    if (product === 'tram') return 'tram';
    if (product === 'bus') return 'bus';
    if (product === 'suburban' || line.name?.startsWith('S')) return 'suburban';
    if (product === 'regional' || product === 'regionalExp') return 'regional';
    if (product === 'national' || product === 'nationalExpress') return 'national';

    return 'train';
}

// Hilfs-Funktion zur Bestimmung des Anzeigenamens
function getTransportName(line) {
    const product = line.product || line.mode;
    const lineName = line.name || '';

    // Wiener Linien U-Bahn
    if (product === 'subway' || lineName.match(/^U[1-6]$/)) {
        return `U-Bahn ${lineName}`;
    }

    // Wiener Linien Straßenbahn
    if (product === 'tram' || lineName.match(/^\d{1,2}$/)) {
        return `Straßenbahn ${lineName}`;
    }

    // Wiener Linien Bus
    if (product === 'bus' && lineName.match(/^\d{1,3}[A-Z]?$/)) {
        return `Bus ${lineName}`;
    }

    // S-Bahn: Nur Liniennummer ohne Zugnummer
    // Extrahiert "S 80" aus "S 80 (Zug-Nr. 25025)"
    if (product === 'suburban' || lineName.startsWith('S')) {
        const cleanName = lineName.replace(/\s*\(.*?\).*$/, '').trim();
        return `S-Bahn ${cleanName}`;
    }

    // Regionalzüge
    if (line.productName) {
        return line.productName;
    }

    return lineName || 'Zug';
}

// Hilfs-Funktion zur Bestimmung des Stationstyps
function getStationType(location) {
    if (!location.products) return 'Station';

    // Wiener Linien: U-Bahn, Straßenbahn, Bus
    if (location.products.subway) return 'U-Bahn';
    if (location.products.tram) return 'Straßenbahn';
    if (location.products.bus) return 'Bus';

    // ÖBB Züge
    if (location.products.nationalExpress || location.products.national) return 'Fernzug';
    if (location.products.regionalExp || location.products.regional) return 'Regionalzug';
    if (location.products.suburban) return 'S-Bahn';

    return 'Station';
}

// Serve Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server starten
app.listen(PORT, () => {
    console.log(`\n✅ ÖBB Dashboard läuft auf http://localhost:${PORT}\n`);
    console.log('Drücken Sie Ctrl+C zum Beenden\n');
});
