"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  CadastralParcelFeature,
  CasiasItem,
  IcpeItem,
  BssBoreholeItem,
  PiezometreItem,
  GeoJsonObject,
} from "@/types";

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
  bssBoreholes?: BssBoreholeItem[];
  piezometres?: PiezometreItem[];
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
  bssBoreholes = [],
  piezometres = [],
}: MapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Basemap switcher state
  const [activeBasemap, setActiveBasemap] = useState<"osm" | "ortho">("osm");
  const [showCadastreOverlay, setShowCadastreOverlay] = useState<boolean>(true);

  // Layer groups for dynamic updates
  const osmTileLayerRef = useRef<L.TileLayer | null>(null);
  const orthoTileLayerRef = useRef<L.TileLayer | null>(null);
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

    // 1. OpenStreetMap Tile Layer
    const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });

    // 2. IGN Géoplateforme Orthophoto HD WMTS Layer
    const orthoLayer = L.tileLayer(
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
      {
        attribution: '&copy; <a href="https://www.ign.fr/">IGN Géoplateforme</a>',
        maxZoom: 19,
      }
    );

    osmLayer.addTo(map);
    osmTileLayerRef.current = osmLayer;
    orthoTileLayerRef.current = orthoLayer;

    // Controls
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

  // Switch Basemap
  useEffect(() => {
    const map = mapInstanceRef.current;
    const osm = osmTileLayerRef.current;
    const ortho = orthoTileLayerRef.current;
    if (!map || !osm || !ortho) return;

    if (activeBasemap === "osm") {
      if (map.hasLayer(ortho)) map.removeLayer(ortho);
      if (!map.hasLayer(osm)) osm.addTo(map);
    } else {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(ortho)) ortho.addTo(map);
    }
  }, [activeBasemap]);

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

    if (!showCadastreOverlay || parcels.length === 0) return;

    const bounds = L.latLngBounds([]);

    parcels.forEach((parcel) => {
      const parcelKey =
        parcel.properties.idu ||
        parcel.id ||
        `${parcel.properties.section}-${parcel.properties.numero}`;
      const isSelected = selectedParcelIds.has(parcelKey);

      const style: L.PathOptions = {
        color: isSelected ? "#1b4332" : activeBasemap === "ortho" ? "#f59e0b" : "#d97706",
        weight: isSelected ? 3 : 1.5,
        fillColor: isSelected ? "#2d6a4f" : activeBasemap === "ortho" ? "#fbbf24" : "#fef3c7",
        fillOpacity: isSelected ? 0.4 : 0.15,
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
  }, [parcels, selectedParcelIds, onToggleParcel, empriseGeoJson, showCadastreOverlay, activeBasemap]);

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

      // Investigation buffer
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

  // Render Markers (CASIAS, ICPE, BSS, Piezomètres)
  useEffect(() => {
    const markersGroup = markersLayerGroupRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    // 1. CASIAS (Ambre)
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

        const distText = site.distance_emprise_m !== undefined ? `<b>Distance :</b> ${Math.round(site.distance_emprise_m)} m<br/>` : "";
        const content = `
          <div class="p-3 text-xs text-slate-800 font-sans max-w-xs">
            <div class="font-bold text-amber-800 mb-1">Site Industriel Historique (CASIAS)</div>
            <div class="font-semibold text-slate-900">${site.nom_usuel || site.identifiant || "Site sans nom"}</div>
            <div class="text-slate-600 my-1">${site.activite_principale || "Activité non précisée"}</div>
            ${distText}
            ${site.statut ? `<div class="mt-1 text-slate-500 italic text-[11px]">Statut : ${site.statut}</div>` : ""}
          </div>
        `;
        marker.bindPopup(content).addTo(markersGroup);
      }
    });

    // 2. ICPE (Rouge)
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

        const distText = icpe.distance_emprise_m !== undefined ? `<b>Distance :</b> ${Math.round(icpe.distance_emprise_m)} m<br/>` : "";
        const content = `
          <div class="p-3 text-xs text-slate-800 font-sans max-w-xs">
            <div class="font-bold text-red-800 mb-1">Installation Classée (ICPE)</div>
            <div class="font-semibold text-slate-900">${icpe.nom_etablissement || icpe.numero_s3ic || "Installation"}</div>
            <div class="text-slate-600 my-1">Régime : ${icpe.regime || "Non renseigné"}</div>
            ${distText}
            ${icpe.statut_activite ? `<div class="mt-1 text-slate-500 italic text-[11px]">Activité : ${icpe.statut_activite}</div>` : ""}
          </div>
        `;
        marker.bindPopup(content).addTo(markersGroup);
      }
    });

    // 3. Forages BSS BRGM (Vert émeraude si coupe lithologique présente, Bleu sinon)
    bssBoreholes.forEach((b) => {
      if (b.latitude && b.longitude) {
        const hasCoupe = b.coupe_disponible;
        const marker = L.circleMarker([b.latitude, b.longitude], {
          radius: 6.5,
          fillColor: hasCoupe ? "#059669" : "#2563eb",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        const content = `
          <div class="p-3 text-xs text-slate-800 font-sans max-w-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-slate-900">Forage BSS (BRGM)</span>
              ${hasCoupe ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Coupe dispo</span>' : ""}
            </div>
            <div class="font-mono text-slate-700 font-semibold">${b.reference}</div>
            <div class="text-slate-600 my-1">
              <b>Nature :</b> ${b.nature || "FORAGE"}<br/>
              <b>Profondeur :</b> ${b.prof_atteinte !== undefined && b.prof_atteinte !== null ? `${b.prof_atteinte} m` : "n.d."}<br/>
              <b>Distance à l'emprise :</b> ${Math.round(b.distance_meters)} m
            </div>
            <a href="${b.url_infoterre}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline">
              Consulter la fiche InfoTerre &rarr;
            </a>
          </div>
        `;
        marker.bindPopup(content).addTo(markersGroup);
      }
    });

    // 4. Piézomètres Hub'Eau (Cyan)
    piezometres.forEach((pz) => {
      if (pz.latitude && pz.longitude) {
        const marker = L.circleMarker([pz.latitude, pz.longitude], {
          radius: 7,
          fillColor: "#0891b2",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        const profStr = pz.profondeur_nappe !== undefined && pz.profondeur_nappe !== null ? `${pz.profondeur_nappe} m sous le sol` : "non mesurée";
        const coteStr = pz.cote_ngf !== undefined && pz.cote_ngf !== null ? `${pz.cote_ngf} m NGF` : "non renseignée";

        const content = `
          <div class="p-3 text-xs text-slate-800 font-sans max-w-xs">
            <div class="font-bold text-cyan-800 mb-1">Piézomètre (Hub'Eau Nappes)</div>
            <div class="font-mono font-semibold text-slate-900">${pz.code_bss}</div>
            <div class="text-slate-600 my-1">
              <b>Commune :</b> ${pz.nom_commune || "—"}<br/>
              <b>Niveau d'eau :</b> ${profStr}<br/>
              <b>Cote piézométrique :</b> ${coteStr}<br/>
              <b>Distance :</b> ${Math.round(pz.distance_meters)} m
            </div>
            ${pz.date_mesure ? `<div class="text-[10px] text-slate-400">Dernière mesure : ${pz.date_mesure}</div>` : ""}
          </div>
        `;
        marker.bindPopup(content).addTo(markersGroup);
      }
    });
  }, [casiasSites, icpeSites, bssBoreholes, piezometres]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Basemap & Overlay Switcher */}
      <div className="absolute top-4 right-4 z-1000 bg-white/95 backdrop-blur-xs p-2 rounded-lg shadow-md border border-slate-200 text-xs font-sans space-y-2">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => setActiveBasemap("osm")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeBasemap === "osm"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Plan OSM
          </button>
          <button
            type="button"
            onClick={() => setActiveBasemap("ortho")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeBasemap === "ortho"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Photo IGN HD
          </button>
        </div>

        <label className="flex items-center gap-2 px-1 cursor-pointer select-none text-slate-700 font-medium">
          <input
            type="checkbox"
            checked={showCadastreOverlay}
            onChange={(e) => setShowCadastreOverlay(e.target.checked)}
            className="rounded border-slate-300 text-[#1b4332] focus:ring-[#1b4332]"
          />
          Surcouche Cadastre
        </label>
      </div>
    </div>
  );
}
