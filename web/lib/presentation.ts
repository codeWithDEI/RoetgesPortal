import type {
  Milestone,
  TopicSource,
  TopicStatus,
} from "./topics";
import { areaScopeLabel } from "./areas";

export { areaLabel, areaScopeLabel } from "./areas";

export const statusLabels: Record<TopicStatus, string> = {
  idea: "Idee",
  announced: "Angekündigt",
  consultation: "Beteiligung",
  committee: "Im Ausschuss",
  council: "Im Rat",
  decided: "Beschlossen",
  implementation: "In Umsetzung",
  completed: "Abgeschlossen",
  paused: "Pausiert",
  rejected: "Abgelehnt",
};

export const categoryLabels: Record<string, string> = {
  childcare: "Kinderbetreuung",
  community: "Dorfgemeinschaft",
  drainage: "Entwässerung",
  environment: "Umwelt",
  finance: "Finanzen",
  housing: "Wohnen",
  mobility: "Mobilität",
  "municipal-property": "Gemeindeeigentum",
  "noise-protection": "Lärmschutz",
  "public-facilities": "Öffentliche Einrichtungen",
  "public-space": "Öffentlicher Raum",
  "regional-planning": "Regionalplanung",
  "renewable-energy": "Erneuerbare Energien",
  renovation: "Sanierung",
  "road-safety": "Verkehrssicherheit",
  sports: "Sport",
  "urban-planning": "Ortsentwicklung",
  waste: "Abfall",
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
