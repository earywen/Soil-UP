"use client";

import React, { useState } from "react";
import WorkflowPanel from "@/components/WorkflowPanel";
import Map from "@/components/Map";
import {
  AddressResultItem,
  CadastralParcelFeature,
  SiteEmpriseResult,
  StudyRecord,
} from "@/types";

export default function Home() {
  // Center coordinates (defaults to France center or Paris)
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState<number>(14);

  // Cadastre parcels & selection
  const [parcels, setParcels] = useState<CadastralParcelFeature[]>([]);
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());
  const [empriseResult, setEmpriseResult] = useState<SiteEmpriseResult | null>(null);

  // Investigation buffer
  const [bufferMeters, setBufferMeters] = useState<number>(200);

  // Active study & collected data
  const [study, setStudy] = useState<StudyRecord | null>(null);

  const handleAddressSelect = (item: AddressResultItem) => {
    setMapCenter([item.latitude, item.longitude]);
    setMapZoom(17);
    setSelectedParcelIds(new Set());
    setEmpriseResult(null);
    setStudy(null);
  };

  const handleParcelsLoaded = (loadedParcels: CadastralParcelFeature[]) => {
    setParcels(loadedParcels);
    // Pre-select the first parcel nearest to coordinate
    if (loadedParcels.length > 0) {
      setSelectedParcelIds(new Set([loadedParcels[0].properties.id]));
    } else {
      setSelectedParcelIds(new Set());
    }
  };

  const handleToggleParcel = (parcel: CadastralParcelFeature) => {
    setSelectedParcelIds((prev) => {
      const next = new Set(prev);
      if (next.has(parcel.properties.id)) {
        next.delete(parcel.properties.id);
      } else {
        next.add(parcel.properties.id);
      }
      return next;
    });
  };

  const casiasSites = study?.collected_data?.casias || [];
  const icpeSites = study?.collected_data?.icpe || [];

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
        />
      </div>
    </main>
  );
}
