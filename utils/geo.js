'use strict';

const CITY_COORDINATES = {
  Guntur: { lat: 16.3067, lng: 80.4365 },
  Vijayawada: { lat: 16.5062, lng: 80.648 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  Ongole: { lat: 15.5057, lng: 80.0499 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Warangal: { lat: 17.9784, lng: 79.5941 },
  Tenali: { lat: 16.243, lng: 80.64 },
  Mangalagiri: { lat: 16.4307, lng: 80.5525 },
};

const DEFAULT_RADIUS_KM = Number(process.env.NEARBY_RADIUS_KM) || 10;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseMapLocation(value) {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function getPropertyCoordinates(property) {
  if (!property) return null;
  const fromMap = parseMapLocation(property.mapLocation);
  if (fromMap) return fromMap;
  const city = property.city ? String(property.city).trim() : '';
  if (city && CITY_COORDINATES[city]) return CITY_COORDINATES[city];
  return null;
}

function applyNearbyFilter(items, latitude, longitude, radiusKm = DEFAULT_RADIUS_KM, detectedCity) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const radius = Number(radiusKm) || DEFAULT_RADIUS_KM;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return items;

  const cityKey = detectedCity ? String(detectedCity).trim().toLowerCase() : '';

  const enriched = items.map((item) => {
    const coords = getPropertyCoordinates(item);
    let distanceKm = coords ? haversineDistanceKm(lat, lng, coords.lat, coords.lng) : null;
    const sameCity = cityKey && String(item.city || '').trim().toLowerCase() === cityKey;
    if (distanceKm == null && sameCity) distanceKm = 0;
    return distanceKm != null ? { ...item, distanceKm: Number(distanceKm.toFixed(2)) } : item;
  });

  const inRadius = enriched.filter((item) => {
    if (item.distanceKm != null) return item.distanceKm <= radius;
    if (cityKey) return String(item.city || '').trim().toLowerCase() === cityKey;
    return false;
  });

  inRadius.sort((a, b) => {
    const aCity = cityKey && String(a.city || '').trim().toLowerCase() === cityKey ? 0 : 1;
    const bCity = cityKey && String(b.city || '').trim().toLowerCase() === cityKey ? 0 : 1;
    if (aCity !== bCity) return aCity - bCity;
    const aDist = a.distanceKm != null ? a.distanceKm : Number.POSITIVE_INFINITY;
    const bDist = b.distanceKm != null ? b.distanceKm : Number.POSITIVE_INFINITY;
    return aDist - bDist;
  });

  return inRadius;
}

module.exports = {
  CITY_COORDINATES,
  DEFAULT_RADIUS_KM,
  haversineDistanceKm,
  parseMapLocation,
  getPropertyCoordinates,
  applyNearbyFilter,
};
