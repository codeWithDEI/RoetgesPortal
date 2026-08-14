import areaData from "../public/data/areas.json";

export const DEFAULT_AREA_ID = "municipality-roetgesbuettel";
export const JOINT_MUNICIPALITY_AREA_ID = "joint-municipality-papenteich";

export type AdministrativeArea = {
  id: string;
  name: string;
  type: "jointMunicipality" | "municipality";
  parent?: string;
};

type AreaData = {
  areas: AdministrativeArea[];
};

export const administrativeAreas = (areaData as AreaData).areas;

const areaById = new Map(
  administrativeAreas.map((area) => [area.id, area]),
);

export function areaLabel(areaId: string): string {
  return areaById.get(areaId)?.name ?? areaId;
}

export function areaScopeLabel(areaIds: string[]): string {
  if (areaIds.length === 1) return areaLabel(areaIds[0]);
  return `${areaIds.length} Gemeinden`;
}

export function filterAreas(areaIds: string[]): AdministrativeArea[] {
  return areaIds
    .map((areaId) => areaById.get(areaId))
    .filter((area): area is AdministrativeArea => area !== undefined)
    .sort((left, right) => {
      if (left.id === DEFAULT_AREA_ID) return -1;
      if (right.id === DEFAULT_AREA_ID) return 1;
      if (left.id === JOINT_MUNICIPALITY_AREA_ID) return -1;
      if (right.id === JOINT_MUNICIPALITY_AREA_ID) return 1;
      return left.name.localeCompare(right.name, "de-DE");
    });
}
