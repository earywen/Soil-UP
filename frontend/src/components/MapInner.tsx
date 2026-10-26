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
import { PenTool, Undo2, Check, MousePointer } from "lucide-react";

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
  onMapClick?: (lat: number, lon: number) => void;
  isDrawingMode?: boolean;
  onToggleDrawingMode?: (active: boolean) => void;
  onCustomPolygonDrawn?: (geometry: GeoJsonObject) => void;
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
  onMapClick,
  isDrawingMode = false,
  onToggleDrawingMode,
  onCustomPolygonDrawn,
}: MapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Basemap & overlay state
  const [activeBasemap, setActiveBasemap] = useState<"osm" | "ortho">("osm");
  const [showCadastreOverlay, setShowCadastreOverlay] = useState<boolean>(true);
  const [showBdlisaOverlay, setShowBdlisaOverlay] = useState<boolean>(false);
  const [showRemnappeOverlay, setShowRemnappeOverlay] = useState<boolean>(false);

  // Freehand drawing state
  const [drawingPoints, setDrawingPoints] = useState<L.LatLng[]>([]);
  const drawingLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Layer groups for dynamic updates
  const osmTileLayerRef = useRef<L.TileLayer | null>(null);
  const orthoTileLayerRef = useRef<L.TileLayer | null>(null);
  const cadastreWMTSRef = useRef<L.TileLayer | null>(null);
  const bdlisaWmsRef = useRef<L.TileLayer.WMS | null>(null);
  const remnappeWmsRef = useRef<L.TileLayer.WMS | null>(null);
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
      doubleClickZoom: !isDrawingMode,
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

    // 3. National Cadastre WMTS Transparent Overlay Layer
    const cadastreLayer = L.tileLayer(
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
      {
        attribution: '&copy; <a href="https://www.cadastre.gouv.fr/">IGN Parcellaire Express</a>',
        maxZoom: 20,
        minZoom: 14,
        opacity: 0.85,
      }
    );

    // 4. BDLISA Hydrogeology WMS Layer (Sandre / BRGM)
    const bdlisaLayer = L.tileLayer.wms("https://services.sandre.eaufrance.fr/geo/saq", {
      layers: "EntiteHydroGeol_FXX",
      format: "image/png",
      transparent: true,
      opacity: 0.6,
      attribution: '&copy; <a href="https://bdlisa.eaufrance.fr/">Sandre / BRGM (BDLISA)</a>',
    });

    // 5. Remontées de Nappes WMS Layer (BRGM)
    const remnappeLayer = L.tileLayer.wms("https://geoservices.brgm.fr/risques", {
      layers: "REMNAPPE",
      format: "image/png",
      transparent: true,
      opacity: 0.65,
      attribution: '&copy; <a href="https://georisques.gouv.fr/">BRGM (Remontées de nappe)</a>',
    });

    osmLayer.addTo(map);
    cadastreLayer.addTo(map);

    osmTileLayerRef.current = osmLayer;
    orthoTileLayerRef.current = orthoLayer;
    cadastreWMTSRef.current = cadastreLayer;
    bdlisaWmsRef.current = bdlisaLayer;
    remnappeWmsRef.current = remnappeLayer;

    // Controls
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    parcelsLayerGroupRef.current = L.layerGroup().addTo(map);
    empriseLayerGroupRef.current = L.layerGroup().addTo(map);
    bufferLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    drawingLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map Click Listener (Direct parcel selection OR Drawing vertex)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Toggle doubleClickZoom according to drawing mode
    if (isDrawingMode) {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (isDrawingMode) {
        setDrawingPoints((prev) => [...prev, e.latlng]);
      } else if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [isDrawingMode, onMapClick]);

  // Render Drawing in progress
  useEffect(() => {
    const drawGroup = drawingLayerGroupRef.current;
    if (!drawGroup) return;

    drawGroup.clearLayers();

    if (drawingPoints.length === 0) return;

    // Draw markers on vertices
    drawingPoints.forEach((pt, idx) => {
      L.circleMarker(pt, {
        radius: idx === 0 ? 6 : 4,
        color: idx === 0 ? "#1b4332" : "#2563eb",
        fillColor: idx === 0 ? "#2d6a4f" : "#ffffff",
        fillOpacity: 1,
        weight: 2,
      }).addTo(drawGroup);
    });

    // Draw polyline connecting vertices
    if (drawingPoints.length > 1) {
      L.polyline(drawingPoints, {
        color: "#1b4332",
        weight: 2.5,
        dashArray: "4, 4",
      }).addTo(drawGroup);
    }
  }, [drawingPoints]);

  const handleFinishDrawing = () => {
    if (drawingPoints.length < 3) return;

    // Close polygon
    const closedCoords = [
      ...drawingPoints.map((pt) => [pt.lng, pt.lat]),
      [drawingPoints[0].lng, drawingPoints[0].lat],
    ];

    const geoJsonPolygon: GeoJsonObject = {
      type: "Polygon",
      coordinates: [closedCoords],
    };

    setDrawingPoints([]);
    if (onCustomPolygonDrawn) {
      onCustomPolygonDrawn(geoJsonPolygon);
    }
    if (onToggleDrawingMode) {
      onToggleDrawingMode(false);
    }
  };

  const handleCancelDrawing = () => {
    setDrawingPoints([]);
    if (onToggleDrawingMode) {
      onToggleDrawingMode(false);
    }
  };

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

  // Toggle Cadastre WMTS Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    const cadastreLayer = cadastreWMTSRef.current;
    if (!map || !cadastreLayer) return;

    if (showCadastreOverlay) {
      if (!map.hasLayer(cadastreLayer)) cadastreLayer.addTo(map);
    } else {
      if (map.hasLayer(cadastreLayer)) map.removeLayer(cadastreLayer);
    }
  }, [showCadastreOverlay]);

  // Toggle BDLISA Aquifers Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    const bdlisaLayer = bdlisaWmsRef.current;
    if (!map || !bdlisaLayer) return;

    if (showBdlisaOverlay) {
      if (!map.hasLayer(bdlisaLayer)) bdlisaLayer.addTo(map);
    } else {
      if (map.hasLayer(bdlisaLayer)) map.removeLayer(bdlisaLayer);
    }
  }, [showBdlisaOverlay]);

  // Toggle Remontée de Nappes Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    const remnappeLayer = remnappeWmsRef.current;
    if (!map || !remnappeLayer) return;

    if (showRemnappeOverlay) {
      if (!map.hasLayer(remnappeLayer)) remnappeLayer.addTo(map);
    } else {
      if (map.hasLayer(remnappeLayer)) map.removeLayer(remnappeLayer);
    }
  }, [showRemnappeOverlay]);

  // Update view on center change
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  // Render Cadastral Parcels vector overlays
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
        fillOpacity: isSelected ? 0.45 : 0.15,
        dashArray: isSelected ? undefined : "3, 3",
      };

      const geoJsonLayer = L.geoJSON(parcel as unknown as GeoJSON.GeoJsonObject, {
        style,
        onEachFeature: (feature, layer) => {
          const props = (feature.properties || {}) as Record<string, unknown>;
          const label = `Section ${props.section || ""} n°${props.numero || ""} (${props.contenance ? `${props.contenance} m²` : "surface n.d."})`;
          layer.bindTooltip(label, { sticky: true });
          layer.on("click", (e) => {
            if (!isDrawingMode) {
              L.DomEvent.stopPropagation(e);
              onToggleParcel(parcel);
            }
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

    if (bounds.isValid() && !empriseGeoJson && !isDrawingMode) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }
  }, [parcels, selectedParcelIds, onToggleParcel, empriseGeoJson, showCadastreOverlay, activeBasemap, isDrawingMode]);

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
    if (bounds.isValid() && !isDrawingMode) {
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
  }, [empriseGeoJson, bufferMeters, isDrawingMode]);

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

    // 3. Forages BSS BRGM
    bssBoreholes.forEach((b) => {
      if (b.latitude && b.longitude) {
        const hasCoupe = b.coupe_disponible;
        const hasWater = b.prof_eau_sol !== undefined && b.prof_eau_sol !== null;
        const marker = L.circleMarker([b.latitude, b.longitude], {
          radius: hasWater ? 7.5 : 6.5,
          fillColor: hasWater ? "#0284c7" : hasCoupe ? "#059669" : "#2563eb",
          color: hasWater ? "#38bdf8" : "#ffffff",
          weight: hasWater ? 2.5 : 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        const waterInfo = hasWater
          ? `
            <div class="mt-1 p-1.5 bg-cyan-50 border border-cyan-200 rounded text-[11px] text-cyan-900 font-medium">
              💧 <b>Eau mesurée :</b> ${b.prof_eau_sol} m / sol
              ${b.date_eau_sol ? `<span class="text-slate-500 text-[10px] block">Date : ${b.date_eau_sol}</span>` : ""}
              ${b.cote_eau_calculee !== undefined && b.cote_eau_calculee !== null ? `<span class="text-cyan-800 font-mono text-[10px] block">Cote nappe : ${b.cote_eau_calculee} m NGF</span>` : ""}
            </div>
          `
          : "";

        const content = `
          <div class="p-3 text-xs text-slate-800 font-sans max-w-xs">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-slate-900">Forage BSS (BRGM)</span>
              ${hasWater ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">Eau relevée</span>' : hasCoupe ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Coupe dispo</span>' : ""}
            </div>
            <div class="font-mono text-slate-700 font-semibold">${b.reference}</div>
            <div class="text-slate-600 my-1">
              <b>Nature :</b> ${b.nature || "FORAGE"}<br/>
              <b>Profondeur atteinte :</b> ${b.prof_atteinte !== undefined && b.prof_atteinte !== null ? `${b.prof_atteinte} m` : "n.d."}<br/>
              <b>Distance au site :</b> ${Math.round(b.distance_meters)} m
            </div>
            ${waterInfo}
            <a href="${b.url_infoterre}" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline">
              Consulter la fiche InfoTerre &rarr;
            </a>
          </div>
        `;
        marker.bindPopup(content).addTo(markersGroup);
      }
    });

    // 4. Piézomètres Hub'Eau
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

        const profStr = pz.profondeur_nappe !== undefined && pz.profondeur_nappe !== null ? `${pz.profondeur_nappe} m sous sol` : "non mesurée";
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
    <div className={`relative w-full h-full min-h-[400px] ${isDrawingMode ? "cursor-crosshair" : ""}`}>
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Floating Bar: Drawing Mode Actions OR Basemap Switcher */}
      {isDrawingMode ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1000 bg-white/95 backdrop-blur-xs px-4 py-2.5 rounded-lg shadow-lg border border-[#1b4332] text-xs font-sans flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <PenTool className="h-4 w-4 text-[#1b4332] animate-pulse" />
            <span>Mode Tracé libre : {drawingPoints.length} point(s) posé(s)</span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <button
            type="button"
            disabled={drawingPoints.length < 3}
            onClick={handleFinishDrawing}
            className="py-1 px-3 rounded bg-[#1b4332] text-white hover:bg-[#2d6a4f] disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            Fermer le polygone
          </button>

          <button
            type="button"
            onClick={handleCancelDrawing}
            className="py-1 px-2.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Annuler
          </button>
        </div>
      ) : (
        <div className="absolute top-4 left-4 z-1000 bg-white/95 backdrop-blur-xs p-1 rounded-md shadow-md border border-slate-200 text-xs font-sans flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleDrawingMode && onToggleDrawingMode(true)}
            className="px-2.5 py-1.5 rounded text-xs font-semibold bg-[#1b4332] text-white hover:bg-[#2d6a4f] flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Tracer une emprise libre (polygone personnalisé)"
          >
            <PenTool className="h-3.5 w-3.5" />
            Tracer un polygone
          </button>
          <span className="text-[11px] text-slate-500 px-2 flex items-center gap-1">
            <MousePointer className="h-3 w-3" /> Clic sur carte pour cadastre
          </span>
        </div>
      )}

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

        <div className="pt-1 border-t border-slate-200/80 space-y-1.5">
          <label className="flex items-center gap-2 px-1 cursor-pointer select-none text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={showCadastreOverlay}
              onChange={(e) => setShowCadastreOverlay(e.target.checked)}
              className="rounded border-slate-300 text-[#1b4332] focus:ring-[#1b4332]"
            />
            Surcouche Cadastre (IGN)
          </label>

          <label className="flex items-center gap-2 px-1 cursor-pointer select-none text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={showBdlisaOverlay}
              onChange={(e) => setShowBdlisaOverlay(e.target.checked)}
              className="rounded border-slate-300 text-cyan-700 focus:ring-cyan-700"
            />
            Aquifères (BDLISA)
          </label>

          <label className="flex items-center gap-2 px-1 cursor-pointer select-none text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={showRemnappeOverlay}
              onChange={(e) => setShowRemnappeOverlay(e.target.checked)}
              className="rounded border-slate-300 text-amber-700 focus:ring-amber-700"
            />
            Remontées de nappes (BRGM)
          </label>
        </div>
      </div>
    </div>
  );
}
