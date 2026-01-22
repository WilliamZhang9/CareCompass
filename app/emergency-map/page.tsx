'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useTTS } from '../lib/hooks/useTTS';
import type { SpeechPayload } from '../lib/voice/types';
import { GoogleMaps } from '../components/google-maps';

// McGill University default location
const MCGILL_LOCATION = { lat: 45.5047, lng: -73.5771 };

interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'emergency' | 'urgent_care' | 'clinic';
  phone: string;
  distance: number;
  eta: number;
  rating: number;
  services: string[];
  waitTime: number;
  waitTimeSource?: 'live' | 'estimated';
  occupancyRate?: number;
  waitingCount?: number;
  isOpen?: boolean;
  ratingCount?: number;
}

// Fallback data in case API fails
const FALLBACK_HOSPITALS: Hospital[] = [
  {
    id: 'royal-victoria',
    name: 'Royal Victoria Hospital',
    address: '687 Pine Avenue W, Montreal, QC H3A 1A1',
    lat: 45.5020,
    lng: -73.5791,
    type: 'emergency',
    phone: '+1-514-934-1934',
    distance: 0.6,
    eta: 4,
    rating: 4.4,
    services: ['Emergency', 'Trauma', 'Cardiology', 'Neurology'],
    waitTime: 45,
  },
  {
    id: 'jewish-general',
    name: 'Jewish General Hospital',
    address: '3755 Côte-Sainte-Catherine Rd, Montreal, QC',
    lat: 45.4870,
    lng: -73.6120,
    type: 'emergency',
    phone: '+1-514-340-8222',
    distance: 2.1,
    eta: 12,
    rating: 4.3,
    services: ['Emergency', 'Oncology', 'Orthopedics'],
    waitTime: 50,
  },
  {
    id: 'hopital-general',
    name: 'Hôpital Général de Montréal',
    address: '1650 Cedar Avenue, Montreal, QC',
    lat: 45.5090,
    lng: -73.5750,
    type: 'urgent_care',
    phone: '+1-514-934-8084',
    distance: 0.9,
    eta: 5,
    rating: 4.2,
    services: ['Urgent Care', 'Minor Injuries', 'Flu Shots'],
    waitTime: 25,
  },
];

export default function EmergencyMap() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [filter, setFilter] = useState<'all' | 'emergency' | 'urgent_care' | 'clinic'>('all');
  const [speaking, setSpeaking] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'fallback'>('fallback');
  const hospitalListRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [locationName, setLocationName] = useState('Montreal Area');

  // Search for a location and fetch nearby hospitals
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      // Use Google Geocoding API to get coordinates
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const formattedAddress = data.results[0].formatted_address;

        // Update location and fetch hospitals
        setUserLocation({ lat: location.lat, lng: location.lng });
        setLocationName(formattedAddress.split(',').slice(0, 2).join(','));
        await fetchHospitals(location.lat, location.lng);
      } else {
        alert('Location not found. Please try a different search.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Error searching for location. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch hospitals from Google Places API
  const fetchHospitals = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          radius: 5000, // 5km radius
          types: ['hospital'], // Valid Google Places types
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hospitals');
      }

      const data = await response.json();

      if (data.hospitals && data.hospitals.length > 0) {
        setHospitals(data.hospitals);
        setDataSource('live');
      } else {
        // No results from API, use fallback
        setHospitals(FALLBACK_HOSPITALS);
        setDataSource('fallback');
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      // Use fallback data on error
      setHospitals(FALLBACK_HOSPITALS);
      setDataSource('fallback');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          fetchHospitals(loc.lat, loc.lng);
        },
        () => {
          // Default to McGill University if location denied
          setUserLocation(MCGILL_LOCATION);
          fetchHospitals(MCGILL_LOCATION.lat, MCGILL_LOCATION.lng);
        }
      );
    } else {
      // Default to McGill University if geolocation not supported
      setUserLocation(MCGILL_LOCATION);
      fetchHospitals(MCGILL_LOCATION.lat, MCGILL_LOCATION.lng);
    }
  }, [fetchHospitals]);

  const filteredHospitals = hospitals.filter(
    (h) => filter === 'all' || h.type === filter
  ).sort((a, b) => (a.eta + a.waitTime) - (b.eta + b.waitTime));

  // Scroll selected hospital into view when clicked from list or map
  useEffect(() => {
    if (selectedHospital) {
      const hospitalElement = document.getElementById(`hospital-${selectedHospital.id}`);
      if (hospitalElement && hospitalListRef.current) {
        hospitalElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedHospital]);

  // Handle marker click from map - select hospital in list
  const handleMarkerClick = (hospitalId: string) => {
    const hospital = filteredHospitals.find((h) => h.id === hospitalId);
    if (hospital) {
      setSelectedHospital(hospital);
    }
  };

  const { speak } = useTTS();

  const handleSpeak = async () => {
    setSpeaking(true);
    try {
      // Convert plain text to SpeechPayload format
      const payload: SpeechPayload = {
        type: "caregiver_summary",
        locale: "en",
        voice: "calm",
        data: {
          severity: "moderate", // Default since we don't have severity info here
          facilityName: selectedHospital?.name || "",
          facilityType: selectedHospital?.type || "emergency",
          etaMin: selectedHospital?.eta,
          address: selectedHospital?.address,
        },
      };
      await speak(payload);
    } catch (error) {
      console.error('Speech error:', error);
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Hospital Map</h1>
            </div>
            <div className="flex items-center gap-3">
              {dataSource === 'live' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live Data
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  Demo Data
                </span>
              )}n              <p className="text-sm text-gray-600">{locationName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search location (e.g., 'Downtown Montreal', '1234 Main St')..."
                    className="w-full px-4 py-3 pl-12 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                  <svg
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                >
                  {searchLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </button>
                {userLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserLocation(MCGILL_LOCATION);
                      setLocationName('McGill University Area');
                      fetchHospitals(MCGILL_LOCATION.lat, MCGILL_LOCATION.lng);
                      setSearchQuery('');
                    }}
                    className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                    title="Reset to default location"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
              </div>
            </form>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[600px] border border-gray-200">
              {/* Reuse GoogleMaps component - same as triage-results page */}
              {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                // Fallback UI when API key is missing
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-8 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Hospital Map</h3>
                  <p className="text-gray-600 mb-1">View the hospital list on the right to see details about nearby medical facilities.</p>
                  <p className="text-sm text-gray-500 mt-2">(Interactive Google Map requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)</p>
                </div>
              ) : (
                <GoogleMaps
                  hospitals={filteredHospitals.map((h) => ({
                    id: h.id,
                    name: h.name,
                    lat: h.lat,
                    lng: h.lng,
                    type: h.type,
                    phone: h.phone,
                    distance: h.distance,
                    eta: h.eta,
                  }))}
                  onMarkerClick={handleMarkerClick}
                  userLocation={userLocation}
                  selectedHospitalId={selectedHospital?.id}
                />
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Legend</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-700">Emergency Room</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <span className="text-sm text-gray-700">Urgent Care</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-700">Clinic</span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700">Your Location (McGill)</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Hospitals List */}
          <div className="space-y-6">
            {/* Filter Buttons */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Filter by Type</h3>
              <div className="space-y-2">
                {[
                  { key: 'all', label: 'All Hospitals' },
                  { key: 'emergency', label: 'Emergency' },
                  { key: 'urgent_care', label: 'Urgent Care' },
                  { key: 'clinic', label: 'Clinics' },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setFilter(option.key as any)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                      filter === option.key
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hospitals List */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Nearby Hospitals</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {loading ? 'Searching...' : `${filteredHospitals.length} found`}
                </p>
              </div>

              <div ref={hospitalListRef} className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-500">Fetching nearby hospitals...</p>
                  </div>
                ) : filteredHospitals.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No hospitals found for this filter.
                  </div>
                ) : (
                  filteredHospitals.map((hospital) => (
                    <div
                      key={hospital.id}
                      id={`hospital-${hospital.id}`}
                      onClick={() => setSelectedHospital(hospital)}
                      className={`p-4 border-b cursor-pointer transition-all ${
                        selectedHospital?.id === hospital.id
                          ? 'bg-blue-50 border-l-4 border-l-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{hospital.name}</h4>
                          {hospital.isOpen !== undefined && (
                            <span className={`text-xs ${hospital.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                              {hospital.isOpen ? 'Open now' : 'Closed'}
                            </span>
                          )}
                        </div>
                        <span
                          className={`ml-2 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                            hospital.type === 'emergency'
                              ? 'bg-red-100 text-red-700'
                              : hospital.type === 'urgent_care'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {hospital.type === 'emergency' ? 'ER' : hospital.type === 'urgent_care' ? 'Urgent' : 'Clinic'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600">
                          <p>{hospital.distance} km • {hospital.eta} min drive</p>
                          <p className="flex items-center gap-1">
                            {hospital.waitTimeSource === 'live' ? (
                              <>
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-green-700 font-medium">Wait: {hospital.waitTime} min</span>
                              </>
                            ) : (
                              <span className="text-gray-400">Wait: No data</span>
                            )}
                          </p>
                          {hospital.occupancyRate !== undefined && (
                            <p className={`font-medium ${
                              hospital.occupancyRate > 150 ? 'text-red-600' :
                              hospital.occupancyRate > 100 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {hospital.occupancyRate}% occupancy
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 text-right">
                          <p className="font-medium">⭐ {hospital.rating.toFixed(1)}</p>
                          {hospital.ratingCount && (
                            <p className="text-gray-400">({hospital.ratingCount})</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Hospital Details */}
        {selectedHospital && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{selectedHospital.name}</h2>
                  <p className="text-blue-100">{selectedHospital.address}</p>
                </div>
                {selectedHospital.isOpen !== undefined && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedHospital.isOpen
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}>
                    {selectedHospital.isOpen ? 'Open Now' : 'Closed'}
                  </span>
                )}
              </div>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-5 gap-6 mb-8">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">DISTANCE</p>
                  <p className="text-3xl font-bold text-gray-900">{selectedHospital.distance} km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold">ETA</p>
                  <p className="text-3xl font-bold text-gray-900">{selectedHospital.eta} min</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-semibold flex items-center gap-2">
                    WAIT TIME
                    {selectedHospital.waitTimeSource === 'live' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    )}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {selectedHospital.waitTimeSource === 'live' ? `${selectedHospital.waitTime} min` : 'No data'}
                  </p>
                  {selectedHospital.waitTimeSource !== 'live' && (
                    <p className="text-xs text-gray-400 mt-1">Call to confirm</p>
                  )}
                  {selectedHospital.waitTimeSource === 'live' && (
                    <p className="text-xs text-green-600 mt-1">From Index Santé Québec</p>
                  )}
                </div>
                {selectedHospital.occupancyRate !== undefined && (
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">OCCUPANCY</p>
                    <p className={`text-3xl font-bold ${
                      selectedHospital.occupancyRate > 150 ? 'text-red-600' :
                      selectedHospital.occupancyRate > 100 ? 'text-orange-500' : 'text-green-600'
                    }`}>
                      {selectedHospital.occupancyRate}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedHospital.occupancyRate > 150 ? 'Very busy' :
                       selectedHospital.occupancyRate > 100 ? 'Busy' : 'Normal'}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 font-semibold">RATING</p>
                  <p className="text-3xl font-bold text-gray-900">⭐ {selectedHospital.rating.toFixed(1)}</p>
                  {selectedHospital.ratingCount && (
                    <p className="text-xs text-gray-400 mt-1">{selectedHospital.ratingCount} reviews</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Services</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedHospital.services.map((service) => (
                      <span
                        key={service}
                        className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Contact & Directions</h4>
                  <div className="space-y-3">
                    <a
                      href={`tel:${selectedHospital.phone}`}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773c.32.588.902 1.33 1.901 2.329s1.74 1.581 2.328 1.901l.773-1.548a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a2 2 0 01-2 2h-2.5A8.5 8.5 0 013.5 2.5V0z" />
                      </svg>
                      {selectedHospital.phone}
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(selectedHospital.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      Get Directions
                    </a>
                  </div>
                </div>
              </div>

              {/* Voice Button */}
              <button
                onClick={handleSpeak}
                disabled={speaking || !selectedHospital}
                className="mt-4 flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-all disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 20h14a2 2 0 002-2V4a2 2 0 00-2-2H3a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {speaking ? 'Speaking...' : 'Hear Hospital Info'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
