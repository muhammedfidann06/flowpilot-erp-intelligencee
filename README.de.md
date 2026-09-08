# FlowPilot · Deutsche Übersicht

FlowPilot ist eine funktionsfähige Portfolio-Anwendung zur Analyse von ERP-Betriebsdaten mit türkischer, englischer und deutscher Oberfläche. Synthetische Beschaffungs-, Bestands-, Vertriebs- und Lieferdaten werden zu nachvollziehbaren Befunden und lokal gespeicherten Maßnahmen verbunden.

## Start und Veröffentlichung

ZIP entpacken und den Inhalt in das Stammverzeichnis des Repositories hochladen. `index.html` muss neben `dist/` liegen. Unter **GitHub Settings → Pages** die Quelle **Deploy from a branch → main → / (root)** wählen. Für die statische Website sind weder Node noch Python, API-Schlüssel oder Datenbank erforderlich. Der optionale manuelle Pages-Workflow veröffentlicht nur `dist/`.

Lokal im Projektverzeichnis `python -m http.server 8080` ausführen und `http://localhost:8080` öffnen. HTML nicht per `file://` starten.

## Funktionen

- Übersicht mit berechneten KPIs, Periodenvergleich und priorisierten Befunden.
- Beschaffung mit Lieferantenleistung, Einkaufsvolumen und verknüpften Bestellungen.
- Bestand mit Reservierungen, verfügbarer Menge, prognostizierter Reichweite und Meldebestand.
- Vertrieb mit realisiertem Umsatz, Wochenwerten und Kunden- / Produktbeiträgen.
- Logistik mit Spediteur- und Regionalleistung sowie Lieferdetails.
- Geschäftseinblicke mit beobachteten Beiträgen, Belegen, Annahmen und Maßnahmenvorschlägen.
- Datenexplorer mit kombinierten Filtern, Sortierung, Seiten, Spaltenauswahl und CSV-Export.
- Maßnahmen mit Verantwortlichen, Fälligkeit, Notizen und Status im Browserspeicher.
- Globale Suche / Strg+K, priorisierte Benachrichtigungen, Architektur- und Produktseite.

## Architektur und Daten

**ERP Integration Ready Architecture** bezeichnet eine getrennte Datenschnittstelle, keine vorhandene SAP-Anbindung. HTML, CSS und native JavaScript-Module bilden den Client. `engine.js` enthält reine Analysefunktionen. Eine optionale Python-Mock-REST-API stellt dieselben Daten und vorberechnete Analyseergebnisse bereit. Das PostgreSQL-Schema ist eine Referenz und wird von der Anwendung nicht verwendet.

30 Lieferanten, 120 Produkte, 24 Kunden, 360 Vertriebsaufträge und 120 Bestellungen bilden das synthetische Szenario für August–September 2026. Der Lagerbestand stammt aus einer festen Aufnahme vom 30. September.

Umsatz wird nach tatsächlichem Lieferdatum ausgewertet. Termintreue verwendet abgeschlossene Lieferungen im gewählten Monat. Verfügbare Menge ist Bestand minus Reservierungen. Die geschätzte Verzögerungswirkung basiert auf Menge × Stückkosten × Verzugstage × 0,5 %; sie ist kein realisierter Verlust. Der Nachschubbetrag ist ein Budgetansatz. Der annualisierte Lagerumschlag verwendet den aktuellen Bestand, da kein durchschnittlicher Bestand vorliegt.

## Qualität und Grenzen

Prüfung: `npm ci`, `npm run validate`, `npm test` und `python -m unittest discover -s tests -p 'test_*.py' -v`. Der [Testbericht](TESTING.md) dokumentiert die Abdeckung. DOM-Tests ersetzen keine visuellen Browserprüfungen. Die Desktopansicht und ein 390-px-Rahmen wurden in Chrome einschließlich Maßnahmenspeicherung geprüft. Docker und PostgreSQL wurden nicht ausgeführt. TESTING.md dokumentiert 198 automatische Tests und weitere Grenzen.

Produktive Anmeldung, Mandantentrennung, echte SAP-Anbindung, zentrale Maßnahmenspeicherung und Live-Synchronisierung sind nicht implementiert. Keine vertraulichen ERP-Daten in den öffentlichen statischen Datensatz aufnehmen. Die [türkische Hauptdokumentation](../README.md) enthält alle Formeln und technischen Einzelheiten.
