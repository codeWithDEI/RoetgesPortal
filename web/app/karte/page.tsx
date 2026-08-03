import type { Metadata } from "next";
import { MapExplorer } from "@/components/map-explorer";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import mapManifestData from "../../public/data/views/council-map/manifest.json";

export const metadata: Metadata = {
  title: "Ratsthemen auf der Karte",
  description:
    "Kommunale Themen aus Rötgesbüttel mit nachvollziehbarem Ortsbezug auf einer interaktiven Karte.",
};

type CouncilMapManifest = {
  presentation: {
    map: {
      center: {
        longitude: number;
        latitude: number;
      };
      zoom: number;
      minZoom?: number;
      maxZoom?: number;
    };
    layers: Array<{
      id: string;
      data: string;
      featureCount: number;
      topicCount: number;
    }>;
  };
};

const mapManifest = mapManifestData as CouncilMapManifest;
const mapConfiguration = mapManifest.presentation.map;
const topicLayer = mapManifest.presentation.layers.find(
  (layer) => layer.id === "council-topics",
);

if (!topicLayer) {
  throw new Error("The council topic map layer is missing");
}

export default function MapPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="map-hero">
          <div className="map-hero__inner">
            <div>
              <p className="eyebrow">Rötgesbüttel räumlich verstehen</p>
              <h1>Wo werden Entscheidungen sichtbar?</h1>
            </div>
            <p>
              Manche Ratsthemen betreffen einen konkreten Ort. Diese Ansicht
              verbindet den dokumentierten Sachstand mit seiner räumlichen
              Wirkung – ohne Themen künstlich auf einen Kartenpunkt zu
              reduzieren.
            </p>
          </div>
          <div className="map-hero__baseline">
            <span>{topicLayer.topicCount} verortete Themen</span>
            <span>Kartendaten: OpenStreetMap</span>
            <span>Ortsbezüge redaktionell geprüft</span>
          </div>
        </section>

        <div className="map-page-shell">
          <MapExplorer
            center={[
              mapConfiguration.center.longitude,
              mapConfiguration.center.latitude,
            ]}
            dataUrl={`/data/views/council-map/${topicLayer.data}`}
            maxZoom={mapConfiguration.maxZoom ?? 19}
            minZoom={mapConfiguration.minZoom ?? 0}
            zoom={mapConfiguration.zoom}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
