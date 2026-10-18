"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { CadastralParcelFeature, CasiasItem, IcpeItem, GeoJsonObject } from "@/types";

interface MapInnerProps {
  center: [number, number]; // [lat, lon]
  zoom: number;
  parcels: CadastralParcelFeature[];
  selectedParcelIds: Set<string>;
  onToggleParcel: (parcel: CadastralParcelFeature) => void;
  empriseGeoJson: GeoJsonObject | null;
  bufferMeters: number;
  casiasSites: CasiasItem[];
  icpeSites: IcpeItem[];
}

export default function MapInner({
  center,
  zoom,
  parcels,
  selectedParcelIds,
  onToggleParcel,
  empriseGeoJson,
  bufferMeters,
  casiasSites,
  icpeSites,
}: MapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups for dynamic updates without destroying the map
  const parcelsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const empriseLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const bufferLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: false,
    });

    // Elegant, clean, high-contrast CartoDB Positron base tiles
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    // Zoom control at bottom right to avoid cluttering header
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    parcelsLayerGroupRef.current = L.layerGroup().addTo(map);
    empriseLayerGroupRef.current = L.layerGroup().addTo(map);
    bufferLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update view on center change
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  // Render Cadastral Parcels
  useEffect(() => {
    const layerGroup = parcelsLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layerGroup || !map) return;

    layerGroup.clearLayers();

    if (parcels.length === 0) return;

    const bounds = L.latLngBounds([]);

    parcels.forEach((parcel) => {
      const isSelected = selectedParcelIds.has(parcel.properties.id);

      const style: L.PathOptions = {
        color: isSelected ? "#1b4332" : "#d97706",
        weight: isSelected ? 3 : 1.5,
        fillColor: isSelected ? "#2d6a4f" : "#fef3c7",
        fillOpacity: isSelected ? 0.35 : 0.15,
        dashArray: isSelected ? undefined : "3, 3",
      };

      const geoJsonLayer = L.geoJSON(parcel as unknown as GeoJSON.GeoJsonObject, {
        style,
        onEachFeature: (feature, layer) => {
          const props = (feature.properties || {}) as Record<string, unknown>;
          const label = `Section ${props.section || ""} n°${props.numero || ""} (${props.contenance ? `${props.contenance} m²` : "surface n.d."})`;
          layer.bindTooltip(label, { sticky: true });
          layer.on("click", () => {
            onToggleParcel(parcel);
          });
        },
      });

      geoJsonLayer.addTo(layerGroup);

      geoJsonLayer.eachLayer((l) => {
        if ("getBounds" in l && typeof (l as L.Polygon).getBounds === "function") {
          bounds.extend((l as L.Polygon).getBounds());
        }
      });
    });

    if (bounds.isValid() && !empriseGeoJson) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }
  }, [parcels, selectedParcelIds, onToggleParcel, empriseGeoJson]);

  // Render Site Emprise & Buffer
  useEffect(() => {
    const empriseGroup = empriseLayerGroupRef.current;
    const bufferGroup = bufferLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!empriseGroup || !bufferGroup || !map) return;

    empriseGroup.clearLayers();
    bufferGroup.clearLayers();

    if (!empriseGeoJson) return;

    const empriseLayer = L.geoJSON(empriseGeoJson as unknown as GeoJSON.GeoJsonObject, {
      style: {
        color: "#1b4332",
        weight: 3.5,
        fillColor: "#2d6a4f",
        fillOpacity: 0.35,
      },
      onEachFeature: (_feature, layer) => {
        layer.bindTooltip("Emprise d'étude validée", { permanent: false, sticky: true });
      },
    }).addTo(empriseGroup);

    const bounds = empriseLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });

      // Represent the investigation buffer around emprise center
      if (bufferMeters > 0) {
        const centerLatLng = bounds.getCenter();
        L.circle(centerLatLng, {
          radius: bufferMeters,
          color: "#2563eb",
          weight: 1.5,
          dashArray: "6, 6",
          fillColor: "#3b82f6",
          fillOpacity: 0.05,
        })
          .bindTooltip(`Périmètre d'investigation : ${bufferMeters} m`, { sticky: true })
          .addTo(bufferGroup);
      }
    }
  }, [empriseGeoJson, bufferMeters]);

  // Render Casias & ICPE Markers
  useEffect(() => {
    const markersGroup = markersLayerGroupRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    // Render CASIAS Sites (Amber)
    casiasSites.forEach((site) => {
      if (site.geometry && site.geometry.coordinates) {
        const [lon, lat] = site.geometry.coordinates;
        const marker = L.circleMarker([lat, lon], {
          radius: 7,
          fillColor: "#d97706",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        const distanceText =
          site.distance_emprise_m !== undefined
            ? `<b>Distance à l'emprise :</b> ${Math.round(site.distance_emprise_m)} m<br/>`
            : "";

        const content = `
          <div class="p-3 text-xs text-slate-800 font-sans max-w-xs">
            <div class="font-bold text-amber-800 mb-1">Site CASIAS / BASIAS</div>
            <div class="font-semibold text-slate-900">${site.nom_usuel || site.identifiant || "Site sans nom"}</div>
            <div class="text-slate-600 my-1">${site.activite_principale || "Activité non précisée"}</div>
            ${distanceText}
            ${site.statut ? `<div class="mt-1 text-slate-500 italic text-[11px]">Statut : ${site.statut}</div>` : ""}
          </div>
        `;
        marker.bindPopup(content);
        marker.addTo(markersGroup);
      }
    });

    // Render ICPE Installations (Crimson)
    icpeSites.forEach((icpe) => {
      if (icpe.geometry && icpe.geometry.coordinates) {
        const [lon, lat] = icpe.geometry.coordinates;
        const marker = L.circleMarker([lat, lon], {
          radius: 7,
          fillColor: "#b91c1c",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        const distanceText =
          icpe.distance_emprise_m !== undefined
            ? `<b>Distance à l'emprise :</b> ${Math.round(icpe.distance_emprise_m)} m<br/>`
            : "";

        const content = `
          <div class="p-3 text-xs text-slate-800 font-sans max-w-xs">
            <div class="font-bold text-red-800 mb-1">Installation Classée (ICPE)</div>
            <div class="font-semibold text-slate-900">${icpe.nom_etablissement || icpe.numero_s3ic || "Installation"}</div>
            <div class="text-slate-600 my-1">Régime : ${icpe.regime || "Non renseigné"}</div>
            ${distanceText}
            ${icpe.statut_activite ? `<div class="mt-1 text-slate-500 italic text-[11px]">Activité : ${icpe.statut_activite}</div>` : ""}
          </div>
        `;
        marker.bindPopup(content);
        marker.addTo(markersGroup);
      }
    });
  }, [casiasSites, icpeSites]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
