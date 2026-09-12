import type {
  DecisionOutcome,
  Milestone,
  TopicSource,
  TopicStatus,
} from "./topics";
import { areaScopeLabel } from "./areas";

export { areaLabel, areaScopeLabel } from "./areas";

export const statusLabels: Record<TopicStatus, string> = {
  idea: "Idee",
  announced: "Angekündigt",
  open: "Offen",
  consultation: "Beteiligung",
  committee: "Im Ausschuss",
  council: "Im Rat",
  decided: "Beschlossen",
  implementation: "In Umsetzung",
  active: "Aktiv",
  completed: "Abgeschlossen",
  paused: "Pausiert",
  rejected: "Abgelehnt",
};

export const decisionOutcomeLabels: Record<DecisionOutcome, string> = {
  adopted: "Beschlossen",
  rejected: "Abgelehnt",
  withdrawn: "Zurückgezogen",
  deferred: "Vertagt",
  noted: "Zur Kenntnis genommen",
  "no-decision": "Ohne Beschluss",
};

export const categoryLabels: Record<string, string> = {
  accessibility: "Barrierefreiheit",
  administration: "Verwaltung",
  cemeteries: "Friedhöfe",
  children: "Kinder und Jugend",
  childcare: "Kinderbetreuung",
  climate: "Klima",
  community: "Dorfgemeinschaft",
  construction: "Bauen",
  culture: "Kultur",
  digitalization: "Digitalisierung",
  drainage: "Entwässerung",
  elections: "Wahlen",
  energy: "Energie",
  environment: "Umwelt",
  finance: "Finanzen",
  "fire-protection": "Feuerschutz",
  "flood-protection": "Hochwasserschutz",
  grants: "Förderung",
  housing: "Wohnen",
  "intergovernmental-cooperation": "Interkommunale Zusammenarbeit",
  mobility: "Mobilität",
  "municipal-law": "Kommunalrecht",
  "municipal-property": "Gemeindeeigentum",
  "noise-protection": "Lärmschutz",
  playgrounds: "Spielplätze",
  "postal-services": "Postversorgung",
  procurement: "Beschaffung",
  "public-facilities": "Öffentliche Einrichtungen",
  "public-services": "Daseinsvorsorge",
  "public-space": "Öffentlicher Raum",
  rail: "Bahn",
  "regional-planning": "Regionalplanung",
  "renewable-energy": "Erneuerbare Energien",
  renovation: "Sanierung",
  "road-safety": "Verkehrssicherheit",
  schools: "Schulen",
  sports: "Sport",
  "strategic-planning": "Strategische Planung",
  taxes: "Steuern",
  "urban-planning": "Ortsentwicklung",
  vehicles: "Fahrzeuge",
  waste: "Abfall",
  "water-management": "Wasserwirtschaft",
  "winter-service": "Winterdienst",
};

export const sourceTypeLabels: Record<TopicSource["sourceType"], string> = {
  agenda: "Tagesordnung",
  proposal: "Vorlage",
  minutes: "Protokoll",
  resolution: "Beschluss",
  budget: "Haushalt",
  planningDocument: "Planungsunterlage",
  pressRelease: "Pressemitteilung",
  website: "Webseite",
  other: "Weitere Quelle",
};

export const milestoneStatusLabels: Record<Milestone["status"], string> = {
  planned: "Geplant",
  reached: "Erreicht",
  postponed: "Verschoben",
  cancelled: "Abgesagt",
};

export function categoryLabel(category: string): string {
  return categoryLabels[category] ?? category;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatCompactDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function topicAreaLabel(areaIds: string[]): string {
  return areaScopeLabel(areaIds);
}
