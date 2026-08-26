export const SITE_NAME = "RötgesPortal";
export const SITE_ORIGIN = "https://roetgesportal.de";
export const SITE_DESCRIPTION =
  "Kommunale Themen aus Rötgesbüttel verständlich, transparent und mit Quellen aufbereitet.";

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_ORIGIN).toString();
}
