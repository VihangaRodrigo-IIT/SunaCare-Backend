"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  markers,
  categoryConfig,
  MAP_CENTER,
  MAP_ZOOM,
  typeFilterOptions,
  radiusFilterOptions,
  bottomTabs,
  MapMarker,
  MarkerCategory,
} from "./mapData";
import styles from "./InteractiveMap.module.css";

/* ─── Custom marker icon factory ─── */
function createMarkerIcon(category: MarkerCategory): L.DivIcon {
  const config = categoryConfig[category];
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${config.color};
      border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:15px;line-height:1;
    ">${config.icon}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

/* ─── Haversine distance ─── */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ─── Map recenter helper ─── */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

/* ─── Search bar component ─── */
function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={styles.searchBar}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#999"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder="Search..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.searchInput}
      />
      {value && (
        <button
          className={styles.clearBtn}
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ─── Custom dropdown component ─── */
function Dropdown({
  options,
  value,
  onChange,
  isOpen,
  onToggle,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel =
    options.find((o) => o.value === value)?.label || options[0].label;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isOpen) onToggle();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onToggle]);

  return (
    <div className={styles.dropdown} ref={ref}>
      <button
        className={`${styles.dropdownBtn} ${isOpen ? styles.dropdownBtnOpen : ""}`}
        onClick={onToggle}
      >
        <span>{selectedLabel}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {options
            .filter((o) => o.value !== "")
            .map((option) => (
              <button
                key={option.value}
                className={`${styles.dropdownItem} ${
                  value === option.value ? styles.dropdownItemActive : ""
                }`}
                onClick={() => {
                  onChange(option.value);
                  onToggle();
                }}
              >
                {option.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ─── GPS button ─── */
function GpsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className={styles.gpsButton}
      onClick={onClick}
      aria-label="Go to my location"
      title="My Location"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F5A623"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    </button>
  );
}

/* ─── Main Component ─── */
export default function InteractiveMap() {
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [radiusFilter, setRadiusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<MarkerCategory | "">(
    "animal-report"
  );
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [radiusDropdownOpen, setRadiusDropdownOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_CENTER);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [notificationCount] = useState(3);

  /* ─── Filter markers ─── */
  const filteredMarkers = useMemo(() => {
    let result = markers;

    // Active bottom tab filter
    if (activeTab) {
      result = result.filter((m) => m.category === activeTab);
    }

    // Type filter from Search Options
    if (typeFilter) {
      result = result.filter((m) => m.category === typeFilter);
    }

    // Radius filter
    if (radiusFilter && radiusFilter !== "none") {
      const radiusKm = parseInt(radiusFilter, 10);
      result = result.filter(
        (m) =>
          haversineKm(MAP_CENTER[0], MAP_CENTER[1], m.lat, m.lng) <= radiusKm
      );
    }

    // Search text filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (m) =>
          m.label.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q))
      );
    }

    return result;
  }, [activeTab, typeFilter, radiusFilter, searchText]);

  /* ─── Handle tab click ─── */
  const handleTabClick = useCallback(
    (tabCategory: MarkerCategory) => {
      if (activeTab === tabCategory) {
        setActiveTab("");
      } else {
        setActiveTab(tabCategory);
        setTypeFilter("");
      }
    },
    [activeTab]
  );

  /* ─── Handle type filter change ─── */
  const handleTypeChange = useCallback((val: string) => {
    setTypeFilter(val);
    setActiveTab(val as MarkerCategory);
  }, []);

  /* ─── GPS locate ─── */
  const handleGpsClick = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [
            pos.coords.latitude,
            pos.coords.longitude,
          ];
          setUserLocation(loc);
          setMapCenter(loc);
        },
        () => {
          alert("Unable to get your location. Please enable location services.");
        }
      );
    }
  }, []);

  /* ─── Marker icons cache ─── */
  const markerIcons = useMemo(() => {
    const icons: Record<string, L.DivIcon> = {};
    for (const cat of Object.keys(categoryConfig) as MarkerCategory[]) {
      icons[cat] = createMarkerIcon(cat);
    }
    return icons;
  }, []);

  const userIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="
        width:20px;height:20px;border-radius:50%;
        background:#4285F4;border:3px solid white;
        box-shadow:0 0 0 2px rgba(66,133,244,0.3), 0 2px 6px rgba(0,0,0,0.25);
      "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
    []
  );

  return (
    <div className={styles.container}>
      {/* ─── Header ─── */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Map</h1>
        <button className={styles.notificationBtn}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notificationCount > 0 && (
            <span className={styles.notificationBadge}></span>
          )}
        </button>
      </header>

      {/* ─── Map Area ─── */}
      <div className={styles.mapWrapper}>
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          className={styles.mapContainer}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <RecenterMap lat={mapCenter[0]} lng={mapCenter[1]} />

          {filteredMarkers.map((marker) => (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={markerIcons[marker.category]}
            >
              <Popup>
                <div className={styles.popupContent}>
                  <div
                    className={styles.popupBadge}
                    style={{
                      background:
                        categoryConfig[marker.category].color + "18",
                      color: categoryConfig[marker.category].color,
                    }}
                  >
                    {categoryConfig[marker.category].icon}{" "}
                    {categoryConfig[marker.category].label}
                  </div>
                  <strong className={styles.popupTitle}>{marker.label}</strong>
                  {marker.description && (
                    <p className={styles.popupDesc}>{marker.description}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Radius circle */}
          {radiusFilter && radiusFilter !== "none" && (
            <Circle
              center={MAP_CENTER}
              radius={parseInt(radiusFilter, 10) * 1000}
              pathOptions={{
                color: "#F5A623",
                fillColor: "#F5A623",
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: "6 4",
              }}
            />
          )}

          {/* User location marker */}
          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup>
                <strong>Your Location</strong>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* ─── Search Bar Overlay ─── */}
        <div className={styles.searchOverlay}>
          <SearchBar value={searchText} onChange={setSearchText} />
        </div>

        {/* ─── Search Options Panel ─── */}
        <div className={styles.searchOptionsPanel}>
          <h3 className={styles.searchOptionsTitle}>Search Options</h3>
          <div className={styles.searchOptionsFilters}>
            <Dropdown
              options={typeFilterOptions}
              value={typeFilter}
              onChange={handleTypeChange}
              isOpen={typeDropdownOpen}
              onToggle={() => {
                setTypeDropdownOpen((p) => !p);
                setRadiusDropdownOpen(false);
              }}
            />
            <Dropdown
              options={radiusFilterOptions}
              value={radiusFilter}
              onChange={setRadiusFilter}
              isOpen={radiusDropdownOpen}
              onToggle={() => {
                setRadiusDropdownOpen((p) => !p);
                setTypeDropdownOpen(false);
              }}
            />
          </div>
        </div>

        {/* ─── GPS Button ─── */}
        <div className={styles.gpsWrapper}>
          <GpsButton onClick={handleGpsClick} />
        </div>
      </div>

      {/* ─── Bottom Tab Bar ─── */}
      <nav className={styles.bottomBar}>
        {bottomTabs.map((tab) => {
          const isActive = activeTab === tab.filterCategory;
          return (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
              onClick={() =>
                handleTabClick(tab.filterCategory as MarkerCategory)
              }
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
