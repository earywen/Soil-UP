"use client";

import React, { useState } from "react";
import WorkflowPanel from "@/components/WorkflowPanel";
import Map from "@/components/Map";
import {
  AddressResultItem,
  CadastralParcelFeature,
  SiteEmpriseResult,
  StudyRecord,
  GeoJsonObject,
} from "@/types";
import { fetchCadastreParcels, validateCustomEmprise } from "@/lib/api";

export default function Home() {
  // Center coordinates (defaults to France center or Paris)
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Cadastre parcels & selection
  const [parcels, setParcels] = useState<CadastralParcelFeature[]>([]);
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());
  const [empriseResult, setEmpriseResult] = useState<SiteEmpriseResult | null>(null);

  // Drawing mode state
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);

  // Investigation buffer
  const [bufferMeters, setBufferMeters] = useState<number>(200);

  // Active study & collected data
  const [study, setStudy] = useState<StudyRecord | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressResultItem | null>(null);

  const handleAddressSelect = (item: AddressResultItem) => {
    setSelectedAddress(item);
    setMapCenter([item.latitude, item.longitude]);
    setMapZoom(17);
    setSelectedParcelIds(new Set());
    setEmpriseResult(null);
    setStudy(null);
  };

  const getParcelKey = (p: CadastralParcelFeature) =>
    p.properties.idu || p.id || `${p.properties.section}-${p.properties.numero}`;

  const handleParcelsLoaded = (loadedParcels: CadastralParcelFeature[]) => {
    setParcels(loadedParcels);
    // Pre-select the first parcel nearest to coordinate
    if (loadedParcels.length > 0) {
      setSelectedParcelIds(new Set([getParcelKey(loadedParcels[0])]));
    } else {
      setSelectedParcelIds(new Set());
    }
  };

  const handleToggleParcel = (parcel: CadastralParcelFeature) => {
    const key = getParcelKey(parcel);
    setSelectedParcelIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Direct map click to select a cadastral parcel
  const handleMapClick = async (lat: number, lon: number) => {
    try {
      const cadastreData = await fetchCadastreParcels(lat, lon);
      const loaded = cadastreData.features || [];
      if (loaded.length > 0) {
        setParcels(loaded);
        setSelectedParcelIds(new Set([getParcelKey(loaded[0])]));
        setMapCenter([lat, lon]);

        if (!selectedAddress) {
          const com = loaded[0].properties.nom_com || "Commune";
          const sec = loaded[0].properties.section || "";
          const num = loaded[0].properties.numero || "";
          setSelectedAddress({
            label: `Parcelle Section ${sec} n°${num}, ${com}`,
            city: com,
            latitude: lat,
            longitude: lon,
            postcode: loaded[0].properties.code_insee || "",
            citycode: loaded[0].properties.code_insee || "",
            score: 1.0,
          });
        }
      }
    } catch (err) {
      console.warn("Erreur chargement cadastre au clic :", err);
    }
  };

  // Custom freehand polygon drawn
  const handleCustomPolygonDrawn = async (geometry: GeoJsonObject) => {
    try {
      const result = await validateCustomEmprise(geometry as Record<string, unknown>);
      setEmpriseResult(result);
      setSelectedParcelIds(new Set());

      // If no address selected, create synthetic label from first vertex
      if (!selectedAddress) {
        const coords = (geometry as { coordinates: number[][][] }).coordinates?.[0]?.[0] || [mapCenter[1], mapCenter[0]];
        const lon = coords[0];
        const lat = coords[1];
        setSelectedAddress({
          label: `Emprise tracée librement (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          city: "Site d'étude",
          latitude: lat,
          longitude: lon,
          postcode: "",
          citycode: "",
          score: 1.0,
        });
      }
    } catch (err) {
      console.error("Erreur validation emprise personnalisée :", err);
    }
  };

  const casiasSites = study?.collected_data?.casias || [];
  const icpeSites = study?.collected_data?.icpe || [];
  const bssBoreholes = study?.collected_data?.bss || [];
  const piezometres = study?.collected_data?.piezometrie || [];

  return (
    <main className="h-screen w-screen flex flex-row overflow-hidden bg-slate-100">
      {/* Left Split-Screen Panel: Workflow, BAN Search, Cadastre, Georisques & Docx */}
      <div className="w-[450px] shrink-0 h-full">
        <WorkflowPanel
          onAddressSelect={handleAddressSelect}
          onParcelsLoaded={handleParcelsLoaded}
          selectedParcelIds={selectedParcelIds}
          onToggleParcel={handleToggleParcel}
          parcels={parcels}
          empriseResult={empriseResult}
          onEmpriseComputed={setEmpriseResult}
          study={study}
          onStudyUpdated={setStudy}
          bufferMeters={bufferMeters}
          onBufferChange={setBufferMeters}
          isDrawingMode={isDrawingMode}
          onToggleDrawingMode={setIsDrawingMode}
          externalSelectedAddress={selectedAddress}
        />
      </div>

      {/* Right Split-Screen Panel: Interactive GIS Leaflet Map */}
      <div className="flex-1 h-full relative">
        <Map
          center={mapCenter}
          zoom={mapZoom}
          parcels={parcels}
          selectedParcelIds={selectedParcelIds}
          onToggleParcel={handleToggleParcel}
          empriseGeoJson={empriseResult?.geometry || null}
          bufferMeters={bufferMeters}
          casiasSites={casiasSites}
          icpeSites={icpeSites}
          bssBoreholes={bssBoreholes}
          piezometres={piezometres}
          onMapClick={handleMapClick}
          isDrawingMode={isDrawingMode}
          onToggleDrawingMode={setIsDrawingMode}
          onCustomPolygonDrawn={handleCustomPolygonDrawn}
        />
      </div>
    </main>
  );
}
