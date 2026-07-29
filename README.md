# RötgesPortal

RötgesPortal soll kommunale Themen in Rötgesbüttel neutral, nachvollziehbar
und mit ihrem räumlichen Bezug darstellen. Das Projekt startet bewusst als
statisch erzeugtes Portal: redaktionelle Inhalte werden als YAML gepflegt,
Geodaten als GeoJSON. Eine Datenbank ist für das MVP nicht vorgesehen.

## Architekturprinzip

> YAML ist die redaktionelle Source of Truth. Beim Build entstehen optimierte
> JSON-, GeoJSON- und Suchdaten für die Webanwendung.

Damit bleiben Änderungen über Git prüfbar, das Hosting einfach und die
Angriffsfläche klein. Eine spätere Datenbank kann hinter einer klaren
Datenzugriffsschicht ergänzt werden, falls Redaktionsoberfläche, Rollen,
Bürgerbeiträge oder automatisierte Importe dies erfordern.

## Architektur

### Systemarchitektur

[PlantUML-Quelldatei](docs/architecture/system-architecture.puml)

![Systemarchitektur](docs/architecture/system-architecture.svg)

### Domänenmodell

[PlantUML-Quelldatei](docs/architecture/domain-model.puml)

![Domänenmodell](docs/architecture/domain-model.svg)

Die eingecheckten SVG-Dateien sind zunächst Platzhalter. Nach Installation von
[PlantUML](https://plantuml.com/starting) werden sie aus den Quelldateien neu
erzeugt:

```bash
plantuml -tsvg docs/architecture/*.puml
```

## Verzeichnisstruktur

```text
.
├── content/
│   ├── locations/       # manuell gepflegte GeoJSON-Quellen
│   └── topics/          # ein kommunales Thema je YAML-Datei
├── docs/architecture/   # PlantUML-Quellen und gerenderte SVGs
├── generated/           # generierte Laufzeit- und Importdaten
├── schemas/             # maschinenlesbare Inhaltsverträge
├── tools/               # Validierung, Build und historische Importe
└── web/                 # zukünftige statische Webanwendung
```

## Rötgesmarkt-Daten übernehmen

Die bestehende GeoJSON-Transformation bleibt als Importwerkzeug erhalten. Sie
korrigiert vertauschte Längen- und Breitengrade, entfernt generierte IDs und
erzeugt zusätzlich eine CSV-Datei für Google My Maps.

```bash
python3 tools/import_roetgesmarkt.py
```

Eingabe:

```text
content/locations/roetgesmarkt_input.geojson
```

Ausgaben:

```text
generated/roetgesmarkt_upload.geojson
generated/roetgesmarkt_upload_google_maps.csv
```

Das Werkzeug benötigt Python 3.9 oder neuer und keine externen Pakete.

## Themen pflegen

Eine Themendatei folgt dem Vertrag in
[`schemas/topic.schema.json`](schemas/topic.schema.json). Das erste Beispiel
liegt unter [`content/topics/example.yaml`](content/topics/example.yaml) und
bleibt als Entwurf unveröffentlicht.

Fakten, räumliche Auswirkungen und öffentlich belegte Positionen werden
getrennt modelliert. Jede veröffentlichte Position und jedes Thema benötigt
mindestens eine nachvollziehbare Quelle.

## Status

Dies ist die initiale Projektstruktur. Webanwendung, Content-Validator und
Build-Generator folgen in separaten, kleinen Ausbauschritten.
