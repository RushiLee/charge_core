/* global L */

const DEFAULT_CENTER = { lat: -1.286389, lng: 36.817223 }; // Nairobi fallback
const DEFAULT_ZOOM = 13;

const API = {
  swapStations: "/api/stations",
  // You can point this to a future Java endpoint, e.g. "/api/service-centers"
  serviceStations: "/api/service-stations",
};

/** @typedef {{lat:number,lng:number}} LatLng */
/** @typedef {{id:string,name:string,location:LatLng,batteryAvailability?:number,totalBatteries?:number,queueTimeMins?:number,status?:string,lastUpdated?:string,type:"swap"|"service",tags?:string[]}} Station */

const el = {
  btnLocate: document.getElementById("btnLocate"),
  btnRefresh: document.getElementById("btnRefresh"),
  btnBack: document.getElementById("btnBack"),
  btnBackTop: document.getElementById("btnBackTop"),
  statusText: document.getElementById("statusText"),
  markerCount: document.getElementById("markerCount"),
  mapTitle: document.getElementById("mapTitle"),
  homeView: document.getElementById("homeView"),
  mapView: document.getElementById("mapView"),
  openSwap: document.getElementById("openSwap"),
  openService: document.getElementById("openService"),
};

let map;
let userMarker;
let markerLayer;
let mapReady = false;
let lastAutoFitKey = "";
let state = {
  activeType: "swap",
  userLocation: /** @type {LatLng} */ (DEFAULT_CENTER),
  stations: /** @type {Station[]} */ ([]), // stations for the currently selected view only
  filtered: /** @type {Station[]} */ ([]),
};

function setStatus(text) {
  el.statusText.textContent = text;
}

function showHome() {
  if (el.mapView) {
    el.mapView.classList.add("is-hidden");
    el.mapView.hidden = true;
  }
  if (el.homeView) {
    el.homeView.classList.remove("is-hidden");
    el.homeView.hidden = false;
  }
  if (el.btnBackTop) el.btnBackTop.classList.add("is-hidden");
}

function showMap() {
  if (el.homeView) {
    el.homeView.classList.add("is-hidden");
    el.homeView.hidden = true;
  }
  if (el.mapView) {
    el.mapView.classList.remove("is-hidden");
    el.mapView.hidden = false;
  }
  if (el.btnBackTop) el.btnBackTop.classList.remove("is-hidden");
  ensureMapReady();
}

function setMapTitle() {
  if (!el.mapTitle) return;
  el.mapTitle.textContent = state.activeType === "swap" ? "Smart Swap Stations" : "Service Centers";
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLng / 2);
  const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function pickColor(station) {
  if (station.type === "service") return "#16a34a";
  // swap: use availability to tint
  const avail = station.batteryAvailability ?? 0;
  if (avail <= 0) return "#64748b";
  if (avail <= 2) return "#f59e0b";
  return "#22c55e";
}

function stationPopupHtml(station, distKm) {
  const dist = distKm != null ? `<div class="popupRow">Distance: <b>${formatDistance(distKm)}</b></div>` : "";
  const status = station.status ? `<span class="badge">${escapeHtml(station.status)}</span>` : "";

  const swapRow =
    station.type === "swap"
      ? `<div class="popupRow">Batteries: <b>${station.batteryAvailability ?? 0}</b> / ${station.totalBatteries ?? "—"}</div>
         ${station.queueTimeMins != null ? `<div class="popupRow">Queue: <b>${station.queueTimeMins} min</b></div>` : ""}`
      : `<div class="popupRow">Services: <b>${escapeHtml((station.tags || []).join(", ") || "General")}</b></div>`;

  return `
    <div class="popupTitle">${escapeHtml(station.name)} ${status}</div>
    <div class="popupMeta">${station.type === "swap" ? "Smart Swap Station" : "Service Center"}</div>
    ${swapRow}
    ${dist}
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function initMap() {
  map = L.map("map", { zoomControl: true }).setView([state.userLocation.lat, state.userLocation.lng], DEFAULT_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  renderUserMarker();
}

function ensureMapReady() {
  if (mapReady) {
    // Leaflet needs a nudge when map was hidden
    setTimeout(() => map && map.invalidateSize(), 0);
    return;
  }
  initMap();
  mapReady = true;
  setTimeout(() => map && map.invalidateSize(), 0);
}

function renderUserMarker() {
  if (!map) return;
  if (userMarker) userMarker.remove();

  userMarker = L.circleMarker([state.userLocation.lat, state.userLocation.lng], {
    radius: 8,
    color: "#2563eb",
    weight: 2,
    fillColor: "#60a5fa",
    fillOpacity: 0.9,
  })
    .addTo(map)
    .bindPopup("You are here");
}

function clearMarkers() {
  markerLayer.clearLayers();
}

function autoFitToStations(stations) {
  if (!mapReady || !map) return;
  if (!stations?.length) return;

  // Only refit when the displayed set changes (type/count/first+last ids).
  const key = `${state.activeType}:${stations.length}:${stations[0]?.id ?? ""}:${stations[stations.length - 1]?.id ?? ""}`;
  if (key === lastAutoFitKey) return;
  lastAutoFitKey = key;

  const bounds = L.latLngBounds([]);
  for (const s of stations) bounds.extend([s.location.lat, s.location.lng]);
  // Include user location if we have it.
  if (state.userLocation?.lat != null && state.userLocation?.lng != null) {
    bounds.extend([state.userLocation.lat, state.userLocation.lng]);
  }

  map.fitBounds(bounds, {
    paddingTopLeft: [24, 24],
    paddingBottomRight: [260, 120], // keep pins visible under the top-right panel
    maxZoom: 15,
    animate: true,
  });
}

function addStationMarkers(stations) {
  clearMarkers();

  stations.forEach((s) => {
    const distKm = haversineKm(state.userLocation, s.location);
    const color = pickColor(s);
    const marker = L.circleMarker([s.location.lat, s.location.lng], {
      radius: 10,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.25,
    });

    marker.on("mouseover", () => marker.openPopup());
    marker.on("mouseout", () => marker.closePopup());
    marker.bindPopup(stationPopupHtml(s, distKm), { closeButton: false, offset: [0, -6] });
    marker.addTo(markerLayer);
  });

  if (el.markerCount) el.markerCount.textContent = `${stations.length}`;
  autoFitToStations(stations);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Expected backend shape: { success: boolean, data: Station[], error?: string } */
async function loadSwapStations() {
  try {
    const payload = await fetchJson(API.swapStations);
    if (!payload?.success) throw new Error(payload?.error || "Failed to load stations");
    const list = Array.isArray(payload.data) ? payload.data : [];

    /** @type {Station[]} */
    const mapped = list
      .filter((s) => s?.location?.lat != null && s?.location?.lng != null)
      .map((s) => ({
        id: String(s.id),
        name: String(s.name ?? "Swap Station"),
        location: { lat: Number(s.location.lat), lng: Number(s.location.lng) },
        batteryAvailability: Number(s.batteryAvailability ?? 0),
        totalBatteries: Number(s.totalBatteries ?? 0),
        // Support either `queueTimeMins` or a legacy `"Queue-time"` field.
        queueTimeMins: Number(s.queueTimeMins ?? s["Queue-time"] ?? NaN),
        status: String(s.status ?? ""),
        lastUpdated: s.lastUpdated,
        type: "swap",
      }))
      .map((s) => ({
        ...s,
        queueTimeMins: Number.isFinite(s.queueTimeMins) ? s.queueTimeMins : undefined,
      }));

    return mapped;
  } catch {
    return mockSwapStations();
  }
}

/**
 * Prototype fallback data for swap stations.
 * Replace by wiring your Java endpoint to return a compatible structure.
 */
function mockSwapStations() {
  /** @type {Station[]} */
  return [
    {
      id: "station_123",
      name: "Main Street Station",
      location: { lat: -1.2864, lng: 36.8172 },
      batteryAvailability: 8,
      totalBatteries: 12,
      queueTimeMins: 3,
      status: "operational",
      lastUpdated: "2026-04-18T10:30:00Z",
      type: "swap",
    },
    {
      id: "station_456",
      name: "Juja Road Station",
      location: { lat: -1.1046, lng: 37.0131 },
      batteryAvailability: 4,
      totalBatteries: 10,
      queueTimeMins: 5,
      status: "operational",
      lastUpdated: "2026-04-18T11:05:00Z",
      type: "swap",
    },
    {
      id: "station_westlands_001",
      name: "Westlands Station — Sarit",
      location: { lat: -1.2576, lng: 36.8016 },
      batteryAvailability: 6,
      totalBatteries: 14,
      queueTimeMins: 4,
      status: "operational",
      lastUpdated: "2026-04-18T11:20:00Z",
      type: "swap",
    },
    {
      id: "station_westlands_002",
      name: "Westlands Station — Waiyaki Way",
      location: { lat: -1.2673, lng: 36.7919 },
      batteryAvailability: 9,
      totalBatteries: 16,
      queueTimeMins: 2,
      status: "operational",
      lastUpdated: "2026-04-18T11:24:00Z",
      type: "swap",
    },
    {
      id: "station_busia_001",
      name: "Busia Station — Border",
      location: { lat: 0.4605, lng: 34.1110 },
      batteryAvailability: 5,
      totalBatteries: 10,
      queueTimeMins: 6,
      status: "operational",
      lastUpdated: "2026-04-18T10:55:00Z",
      type: "swap",
    },
    {
      id: "station_kisumu_001",
      name: "Kisumu Station — CBD",
      location: { lat: -0.1022, lng: 34.7617 },
      batteryAvailability: 7,
      totalBatteries: 12,
      queueTimeMins: 3,
      status: "operational",
      lastUpdated: "2026-04-18T11:10:00Z",
      type: "swap",
    },
    {
      id: "station_nakuru_001",
      name: "Nakuru Station — Town",
      location: { lat: -0.3031, lng: 36.0800 },
      batteryAvailability: 3,
      totalBatteries: 10,
      queueTimeMins: 8,
      status: "operational",
      lastUpdated: "2026-04-18T10:40:00Z",
      type: "swap",
    },
    {
      id: "station_nairobi_001",
      name: "Nairobi Station — Upper Hill",
      location: { lat: -1.3004, lng: 36.8121 },
      batteryAvailability: 10,
      totalBatteries: 18,
      queueTimeMins: 1,
      status: "operational",
      lastUpdated: "2026-04-18T11:28:00Z",
      type: "swap",
    },
    {
      id: "station_nairobi_002",
      name: "Nairobi Station — Industrial Area",
      location: { lat: -1.3096, lng: 36.8616 },
      batteryAvailability: 2,
      totalBatteries: 12,
      queueTimeMins: 12,
      status: "operational",
      lastUpdated: "2026-04-18T11:02:00Z",
      type: "swap",
    },
  ];
}

/**
 * Prototype fallback data for service centers.
 * Replace by wiring your Java endpoint to return a compatible structure.
 */
function mockServiceStations() {
  /** @type {Station[]} */
  return [
    {
      id: "svc-gikomba",
      name: "Gikomba Center",
      location: { lat: -1.2837, lng: 36.8388 },
      status: "Open",
      type: "service",
      tags: ["Tires/Brakes", "Electrical", "Motor Repair"],
    },
    {
      id: "svc-juja",
      name: "Juja Rd Station",
      location: { lat: -1.1046, lng: 37.0131 },
      status: "Open",
      type: "service",
      tags: ["Electrical", "Battery", "Motor Repair"],
    },
  ];
}

async function loadServiceStations() {
  // If you add a Java endpoint later, return it here and keep the mapping consistent.
  // Example expected shape: { success: true, data: [{ id, name, location:{lat,lng}, status, tags:[] }] }
  try {
    const payload = await fetchJson(API.serviceStations);
    if (!payload?.success) throw new Error(payload?.error || "Failed to load service stations");
    const list = Array.isArray(payload.data) ? payload.data : [];
    return list.map((s) => ({
      id: String(s.id),
      name: String(s.name ?? "Service Center"),
      location: { lat: Number(s.location?.lat), lng: Number(s.location?.lng) },
      status: String(s.status ?? "Open"),
      type: "service",
      tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
    }));
  } catch {
    return mockServiceStations();
  }
}

function applyFiltersAndRender() {
  if (!mapReady) return;
  const withDistance = state.stations
    .map((s) => ({ s, d: haversineKm(state.userLocation, s.location) }))
    .sort((a, b) => a.d - b.d)
    .map(({ s }) => s);

  state.filtered = withDistance;
  addStationMarkers(withDistance);
}

async function refreshData() {
  setStatus("Loading…");
  try {
    // Only load the dataset for the view the user selected (swap OR service)
    state.stations = state.activeType === "swap" ? await loadSwapStations() : await loadServiceStations();
    setStatus("Ready");
    setMapTitle();
    applyFiltersAndRender();
  } catch (e) {
    setStatus("Error");
    if (el.markerCount) el.markerCount.textContent = "—";
    if (mapReady) clearMarkers();
  }
}

function setActiveType(type) {
  state.activeType = type;
  setMapTitle();
}

async function locateUser() {
  setStatus("Locating…");

  if (!("geolocation" in navigator)) {
    setStatus("No GPS (using default)");
    return;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (mapReady) {
          renderUserMarker();
          map.setView([state.userLocation.lat, state.userLocation.lng], 14, { animate: true });
        }
        setStatus("Ready");
        applyFiltersAndRender();
        resolve();
      },
      () => {
        setStatus("GPS blocked (using default)");
        resolve();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    );
  });
}

function bindUi() {
  el.btnLocate.addEventListener("click", async () => {
    await locateUser();
    setTimeout(() => map && map.invalidateSize(), 0);
  });
  el.btnRefresh.addEventListener("click", () => refreshData());

  if (el.openSwap) {
    el.openSwap.addEventListener("click", async () => {
      setActiveType("swap");
      showMap();
      await refreshData();
    });
  }
  if (el.openService) {
    el.openService.addEventListener("click", async () => {
      setActiveType("service");
      showMap();
      await refreshData();
    });
  }
  if (el.btnBack) {
    el.btnBack.addEventListener("click", () => showHome());
  }
  if (el.btnBackTop) {
    el.btnBackTop.addEventListener("click", () => showHome());
  }
}

async function boot() {
  bindUi();
  setMapTitle();
  showHome();
}

boot();

