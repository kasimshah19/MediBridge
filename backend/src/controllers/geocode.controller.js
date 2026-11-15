import axios from 'axios';
import asyncHandler from '../middleware/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

// In-memory cache with 10-minute TTL
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Nominatim requires max 1 request per second to respect usage policy
let lastRequestTime = 0;
const THROTTLE_MS = 1050;

/**
 * Throttle helper ensuring consecutive Nominatim requests wait at least 1 second.
 */
const throttleNominatim = async () => {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < THROTTLE_MS) {
    const delay = THROTTLE_MS - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastRequestTime = Date.now();
};

/**
 * Format raw Nominatim response into consistent location object.
 */
const formatAddress = (item) => {
  const addr = item.address || {};
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.suburb ||
    addr.county ||
    addr.state_district ||
    '';

  const state = addr.state || '';
  const pincode = addr.postcode || '';

  return {
    label: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    city,
    state,
    pincode,
    road: addr.road || addr.street || '',
    suburb: addr.suburb || addr.neighbourhood || '',
  };
};

/**
 * Search locations in India via OpenStreetMap Nominatim with caching & rate limiting.
 * @route GET /api/geocode/search?q=
 */
export const searchLocation = asyncHandler(async (req, res, next) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) {
    return next(new ApiError(400, 'Search query must be at least 2 characters.'));
  }

  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json(
      new ApiResponse(200, { results: cached.data }, 'Location results (cached).')
    );
  }

  try {
    await throttleNominatim();

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q,
        format: 'jsonv2',
        countrycodes: 'in',
        limit: 5,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'MediBridge/1.0 (student project - medicine redistribution platform)',
        Accept: 'application/json',
      },
      timeout: 8000,
    });

    const results = (response.data || []).map(formatAddress);

    cache.set(cacheKey, { data: results, timestamp: Date.now() });

    // Clean old cache entries if map exceeds 200 items
    if (cache.size > 200) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    res.status(200).json(
      new ApiResponse(200, { results }, 'Locations retrieved successfully.')
    );
  } catch (err) {
    console.error('⚠️ Nominatim Geocode Error:', err.message);
    return next(
      new ApiError(
        502,
        'Geocoding service is temporarily busy. Please enter your address details manually.'
      )
    );
  }
});

/**
 * Reverse geocode coordinates [lat, lng] to address details via Nominatim.
 * @route GET /api/geocode/reverse?lat=&lng=
 */
export const reverseGeocode = asyncHandler(async (req, res, next) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return next(new ApiError(400, 'Valid numeric latitude and longitude are required.'));
  }

  // India bounding box validation: Lat: 6-38, Lng: 68-98
  if (lat < 6 || lat > 38 || lng < 68 || lng > 98) {
    return next(
      new ApiError(
        400,
        'Coordinates are outside the supported service region (India: 6°-38°N, 68°-98°E).'
      )
    );
  }

  // Cache rounded to 4 decimals (~11 meters resolution)
  const cacheKey = `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json(
      new ApiResponse(200, { location: cached.data }, 'Location reverse details (cached).')
    );
  }

  try {
    await throttleNominatim();

    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon: lng,
        format: 'jsonv2',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'MediBridge/1.0 (student project - medicine redistribution platform)',
        Accept: 'application/json',
      },
      timeout: 8000,
    });

    const location = formatAddress(response.data || {});

    cache.set(cacheKey, { data: location, timestamp: Date.now() });

    res.status(200).json(
      new ApiResponse(200, { location }, 'Location reverse details retrieved.')
    );
  } catch (err) {
    console.error('⚠️ Nominatim Reverse Geocode Error:', err.message);
    return next(
      new ApiError(
        502,
        'Reverse geocoding service is temporarily busy. Please enter city and state manually.'
      )
    );
  }
});

export default {
  searchLocation,
  reverseGeocode,
};

