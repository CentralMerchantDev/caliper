// CALIPER Asset Registry Metadata
// Restructured per docs/specs/LIBRARY-STRUCTURE.md: 4 clean axes (design, size, finish f1-f4, rank A1-F4)

export function deriveScaleClass(foot, levels) {
  const vol = (foot?.w || 1) * (foot?.d || 1) * (levels || 1);
  if (vol <= 16) return 'A';
  if (vol <= 64) return 'B';
  if (vol <= 200) return 'C';
  if (vol <= 600) return 'D';
  if (vol <= 1500) return 'E';
  return 'F';
}

export function deriveRank(foot, levels, finish) {
  const scale = deriveScaleClass(foot, levels);
  const prestige = typeof finish === 'number' ? finish : (parseInt(String(finish).replace(/\D/g, ''), 10) || 1);
  return `${scale}${prestige}`;
}

export const ASSET_REGISTRY = {
  'av-f1-advanced-fighter-jet': {
    "id": "av-f1-advanced-fighter-jet",
    "name": "Basic: Highend: Advanced Fighter Jet",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'av-f2-advanced-fighter-jet': {
    "id": "av-f2-advanced-fighter-jet",
    "name": "Standard: Highend: Advanced Fighter Jet",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'av-f3-advanced-fighter-jet': {
    "id": "av-f3-advanced-fighter-jet",
    "name": "Premium: Highend: Advanced Fighter Jet",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'av-f4-advanced-fighter-jet': {
    "id": "av-f4-advanced-fighter-jet",
    "name": "Elite: Highend: Advanced Fighter Jet",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'av-f1-aerobatic-monoplane': {
    "id": "av-f1-aerobatic-monoplane",
    "name": "Basic: Highend: Aerobatic Monoplane",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 9.45,
      "d": 7.88,
      "h": 2.73
    },
    "options": {}
  },
  'av-f2-aerobatic-monoplane': {
    "id": "av-f2-aerobatic-monoplane",
    "name": "Standard: Highend: Aerobatic Monoplane",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 9.45,
      "d": 7.88,
      "h": 2.73
    },
    "options": {}
  },
  'av-f3-aerobatic-monoplane': {
    "id": "av-f3-aerobatic-monoplane",
    "name": "Premium: Highend: Aerobatic Monoplane",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 9.45,
      "d": 7.88,
      "h": 2.73
    },
    "options": {}
  },
  'av-f4-aerobatic-monoplane': {
    "id": "av-f4-aerobatic-monoplane",
    "name": "Elite: Highend: Aerobatic Monoplane",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 9.45,
      "d": 7.88,
      "h": 2.73
    },
    "options": {}
  },
  'av-f1-aircraft-hangar-dome': {
    "id": "av-f1-aircraft-hangar-dome",
    "name": "Basic: Highend: Aircraft Hangar Dome",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 47.25,
      "d": 42,
      "h": 37.8
    },
    "options": {}
  },
  'av-f2-aircraft-hangar-dome': {
    "id": "av-f2-aircraft-hangar-dome",
    "name": "Standard: Highend: Aircraft Hangar Dome",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 47.25,
      "d": 42,
      "h": 37.8
    },
    "options": {}
  },
  'av-f3-aircraft-hangar-dome': {
    "id": "av-f3-aircraft-hangar-dome",
    "name": "Premium: Highend: Aircraft Hangar Dome",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 47.25,
      "d": 42,
      "h": 37.8
    },
    "options": {}
  },
  'av-f4-aircraft-hangar-dome': {
    "id": "av-f4-aircraft-hangar-dome",
    "name": "Elite: Highend: Aircraft Hangar Dome",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 47.25,
      "d": 42,
      "h": 37.8
    },
    "options": {}
  },
  'av-f1-airport-control-tower': {
    "id": "av-f1-airport-control-tower",
    "name": "Basic: Highend: Airport Control Tower",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 47.25
    },
    "options": {}
  },
  'av-f2-airport-control-tower': {
    "id": "av-f2-airport-control-tower",
    "name": "Standard: Highend: Airport Control Tower",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 47.25
    },
    "options": {}
  },
  'av-f3-airport-control-tower': {
    "id": "av-f3-airport-control-tower",
    "name": "Premium: Highend: Airport Control Tower",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 47.25
    },
    "options": {}
  },
  'av-f4-airport-control-tower': {
    "id": "av-f4-airport-control-tower",
    "name": "Elite: Highend: Airport Control Tower",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 47.25
    },
    "options": {}
  },
  'av-f1-airport-radar-tower': {
    "id": "av-f1-airport-radar-tower",
    "name": "Basic: Highend: Airport Radar Tower",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 12.6,
      "h": 37.8
    },
    "options": {}
  },
  'av-f2-airport-radar-tower': {
    "id": "av-f2-airport-radar-tower",
    "name": "Standard: Highend: Airport Radar Tower",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 12.6,
      "h": 37.8
    },
    "options": {}
  },
  'av-f3-airport-radar-tower': {
    "id": "av-f3-airport-radar-tower",
    "name": "Premium: Highend: Airport Radar Tower",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 12.6,
      "h": 37.8
    },
    "options": {}
  },
  'av-f4-airport-radar-tower': {
    "id": "av-f4-airport-radar-tower",
    "name": "Elite: Highend: Airport Radar Tower",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 12.6,
      "h": 37.8
    },
    "options": {}
  },
  'av-f1-amphibious-flying-boat': {
    "id": "av-f1-amphibious-flying-boat",
    "name": "Basic: Highend: Amphibious Flying Boat",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 21,
      "h": 6.83
    },
    "options": {}
  },
  'av-f2-amphibious-flying-boat': {
    "id": "av-f2-amphibious-flying-boat",
    "name": "Standard: Highend: Amphibious Flying Boat",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 21,
      "h": 6.83
    },
    "options": {}
  },
  'av-f3-amphibious-flying-boat': {
    "id": "av-f3-amphibious-flying-boat",
    "name": "Premium: Highend: Amphibious Flying Boat",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 21,
      "h": 6.83
    },
    "options": {}
  },
  'av-f4-amphibious-flying-boat': {
    "id": "av-f4-amphibious-flying-boat",
    "name": "Elite: Highend: Amphibious Flying Boat",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 21,
      "h": 6.83
    },
    "options": {}
  },
  'av-f1-autogyro-gyrocopter': {
    "id": "av-f1-autogyro-gyrocopter",
    "name": "Basic: Highend: Autogyro Gyrocopter",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 5.78,
      "h": 2.94
    },
    "options": {}
  },
  'av-f2-autogyro-gyrocopter': {
    "id": "av-f2-autogyro-gyrocopter",
    "name": "Standard: Highend: Autogyro Gyrocopter",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 5.78,
      "h": 2.94
    },
    "options": {}
  },
  'av-f3-autogyro-gyrocopter': {
    "id": "av-f3-autogyro-gyrocopter",
    "name": "Premium: Highend: Autogyro Gyrocopter",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 5.78,
      "h": 2.94
    },
    "options": {}
  },
  'av-f4-autogyro-gyrocopter': {
    "id": "av-f4-autogyro-gyrocopter",
    "name": "Elite: Highend: Autogyro Gyrocopter",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 5.78,
      "h": 2.94
    },
    "options": {}
  },
  'av-f1-aviation-fuel-tanker': {
    "id": "av-f1-aviation-fuel-tanker",
    "name": "Basic: Highend: Aviation Fuel Tanker",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.94,
      "d": 9.45,
      "h": 3.36
    },
    "options": {}
  },
  'av-f2-aviation-fuel-tanker': {
    "id": "av-f2-aviation-fuel-tanker",
    "name": "Standard: Highend: Aviation Fuel Tanker",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.94,
      "d": 9.45,
      "h": 3.36
    },
    "options": {}
  },
  'av-f3-aviation-fuel-tanker': {
    "id": "av-f3-aviation-fuel-tanker",
    "name": "Premium: Highend: Aviation Fuel Tanker",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.94,
      "d": 9.45,
      "h": 3.36
    },
    "options": {}
  },
  'av-f4-aviation-fuel-tanker': {
    "id": "av-f4-aviation-fuel-tanker",
    "name": "Elite: Highend: Aviation Fuel Tanker",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.94,
      "d": 9.45,
      "h": 3.36
    },
    "options": {}
  },
  'av-f1-baggage-cargo-train': {
    "id": "av-f1-baggage-cargo-train",
    "name": "Basic: Highend: Baggage Cargo Train",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.1,
      "d": 14.7,
      "h": 1.89
    },
    "options": {}
  },
  'av-f2-baggage-cargo-train': {
    "id": "av-f2-baggage-cargo-train",
    "name": "Standard: Highend: Baggage Cargo Train",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.1,
      "d": 14.7,
      "h": 1.89
    },
    "options": {}
  },
  'av-f3-baggage-cargo-train': {
    "id": "av-f3-baggage-cargo-train",
    "name": "Premium: Highend: Baggage Cargo Train",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.1,
      "d": 14.7,
      "h": 1.89
    },
    "options": {}
  },
  'av-f4-baggage-cargo-train': {
    "id": "av-f4-baggage-cargo-train",
    "name": "Elite: Highend: Baggage Cargo Train",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.1,
      "d": 14.7,
      "h": 1.89
    },
    "options": {}
  },
  'av-f1-bush-plane-taildragger': {
    "id": "av-f1-bush-plane-taildragger",
    "name": "Basic: Highend: Bush Plane Taildragger",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 11.55,
      "d": 8.61,
      "h": 3.36
    },
    "options": {}
  },
  'av-f2-bush-plane-taildragger': {
    "id": "av-f2-bush-plane-taildragger",
    "name": "Standard: Highend: Bush Plane Taildragger",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 11.55,
      "d": 8.61,
      "h": 3.36
    },
    "options": {}
  },
  'av-f3-bush-plane-taildragger': {
    "id": "av-f3-bush-plane-taildragger",
    "name": "Premium: Highend: Bush Plane Taildragger",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 11.55,
      "d": 8.61,
      "h": 3.36
    },
    "options": {}
  },
  'av-f4-bush-plane-taildragger': {
    "id": "av-f4-bush-plane-taildragger",
    "name": "Elite: Highend: Bush Plane Taildragger",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 11.55,
      "d": 8.61,
      "h": 3.36
    },
    "options": {}
  },
  'av-f1-cargo-feeder-turboprop': {
    "id": "av-f1-cargo-feeder-turboprop",
    "name": "Basic: Highend: Cargo Feeder Turboprop",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 14.7,
      "h": 5.25
    },
    "options": {}
  },
  'av-f2-cargo-feeder-turboprop': {
    "id": "av-f2-cargo-feeder-turboprop",
    "name": "Standard: Highend: Cargo Feeder Turboprop",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 14.7,
      "h": 5.25
    },
    "options": {}
  },
  'av-f3-cargo-feeder-turboprop': {
    "id": "av-f3-cargo-feeder-turboprop",
    "name": "Premium: Highend: Cargo Feeder Turboprop",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 14.7,
      "h": 5.25
    },
    "options": {}
  },
  'av-f4-cargo-feeder-turboprop': {
    "id": "av-f4-cargo-feeder-turboprop",
    "name": "Elite: Highend: Cargo Feeder Turboprop",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 14.7,
      "h": 5.25
    },
    "options": {}
  },
  'av-f1-corporate-twin-turboprop': {
    "id": "av-f1-corporate-twin-turboprop",
    "name": "Basic: Highend: Corporate Twin Turboprop",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 5.78
    },
    "options": {}
  },
  'av-f2-corporate-twin-turboprop': {
    "id": "av-f2-corporate-twin-turboprop",
    "name": "Standard: Highend: Corporate Twin Turboprop",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 5.78
    },
    "options": {}
  },
  'av-f3-corporate-twin-turboprop': {
    "id": "av-f3-corporate-twin-turboprop",
    "name": "Premium: Highend: Corporate Twin Turboprop",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 5.78
    },
    "options": {}
  },
  'av-f4-corporate-twin-turboprop': {
    "id": "av-f4-corporate-twin-turboprop",
    "name": "Elite: Highend: Corporate Twin Turboprop",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 5.78
    },
    "options": {}
  },
  'av-f1-crop-duster-plane': {
    "id": "av-f1-crop-duster-plane",
    "name": "Basic: Highend: Crop Duster Plane",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 9.45,
      "h": 3.68
    },
    "options": {}
  },
  'av-f2-crop-duster-plane': {
    "id": "av-f2-crop-duster-plane",
    "name": "Standard: Highend: Crop Duster Plane",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 9.45,
      "h": 3.68
    },
    "options": {}
  },
  'av-f3-crop-duster-plane': {
    "id": "av-f3-crop-duster-plane",
    "name": "Premium: Highend: Crop Duster Plane",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 9.45,
      "h": 3.68
    },
    "options": {}
  },
  'av-f4-crop-duster-plane': {
    "id": "av-f4-crop-duster-plane",
    "name": "Elite: Highend: Crop Duster Plane",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 9.45,
      "h": 3.68
    },
    "options": {}
  },
  'av-f1-double-deck-jumbo': {
    "id": "av-f1-double-deck-jumbo",
    "name": "Basic: Highend: Double Deck Jumbo",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 63,
      "d": 65.1,
      "h": 18.9
    },
    "options": {}
  },
  'av-f2-double-deck-jumbo': {
    "id": "av-f2-double-deck-jumbo",
    "name": "Standard: Highend: Double Deck Jumbo",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 63,
      "d": 65.1,
      "h": 18.9
    },
    "options": {}
  },
  'av-f3-double-deck-jumbo': {
    "id": "av-f3-double-deck-jumbo",
    "name": "Premium: Highend: Double Deck Jumbo",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 63,
      "d": 65.1,
      "h": 18.9
    },
    "options": {}
  },
  'av-f4-double-deck-jumbo': {
    "id": "av-f4-double-deck-jumbo",
    "name": "Elite: Highend: Double Deck Jumbo",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 63,
      "d": 65.1,
      "h": 18.9
    },
    "options": {}
  },
  'av-f1-evtol-airtaxi-passenger': {
    "id": "av-f1-evtol-airtaxi-passenger",
    "name": "Basic: Highend: Evtol Airtaxi Passenger",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 3.99
    },
    "options": {}
  },
  'av-f2-evtol-airtaxi-passenger': {
    "id": "av-f2-evtol-airtaxi-passenger",
    "name": "Standard: Highend: Evtol Airtaxi Passenger",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 3.99
    },
    "options": {}
  },
  'av-f3-evtol-airtaxi-passenger': {
    "id": "av-f3-evtol-airtaxi-passenger",
    "name": "Premium: Highend: Evtol Airtaxi Passenger",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 3.99
    },
    "options": {}
  },
  'av-f4-evtol-airtaxi-passenger': {
    "id": "av-f4-evtol-airtaxi-passenger",
    "name": "Elite: Highend: Evtol Airtaxi Passenger",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 3.99
    },
    "options": {}
  },
  'av-f1-executive-twin-helicopter': {
    "id": "av-f1-executive-twin-helicopter",
    "name": "Basic: Highend: Executive Twin Helicopter",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 15.75,
      "h": 4.73
    },
    "options": {}
  },
  'av-f2-executive-twin-helicopter': {
    "id": "av-f2-executive-twin-helicopter",
    "name": "Standard: Highend: Executive Twin Helicopter",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 15.75,
      "h": 4.73
    },
    "options": {}
  },
  'av-f3-executive-twin-helicopter': {
    "id": "av-f3-executive-twin-helicopter",
    "name": "Premium: Highend: Executive Twin Helicopter",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 15.75,
      "h": 4.73
    },
    "options": {}
  },
  'av-f4-executive-twin-helicopter': {
    "id": "av-f4-executive-twin-helicopter",
    "name": "Elite: Highend: Executive Twin Helicopter",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 15.75,
      "h": 4.73
    },
    "options": {}
  },
  'av-f1-floatplane-lake': {
    "id": "av-f1-floatplane-lake",
    "name": "Basic: Highend: Floatplane Lake",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.08,
      "d": 9.45,
      "h": 3.99
    },
    "options": {}
  },
  'av-f2-floatplane-lake': {
    "id": "av-f2-floatplane-lake",
    "name": "Standard: Highend: Floatplane Lake",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.08,
      "d": 9.45,
      "h": 3.99
    },
    "options": {}
  },
  'av-f3-floatplane-lake': {
    "id": "av-f3-floatplane-lake",
    "name": "Premium: Highend: Floatplane Lake",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.08,
      "d": 9.45,
      "h": 3.99
    },
    "options": {}
  },
  'av-f4-floatplane-lake': {
    "id": "av-f4-floatplane-lake",
    "name": "Elite: Highend: Floatplane Lake",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.08,
      "d": 9.45,
      "h": 3.99
    },
    "options": {}
  },
  'av-f1-glider-sailplane': {
    "id": "av-f1-glider-sailplane",
    "name": "Basic: Highend: Glider Sailplane",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 7.88,
      "h": 2.27
    },
    "options": {}
  },
  'av-f2-glider-sailplane': {
    "id": "av-f2-glider-sailplane",
    "name": "Standard: Highend: Glider Sailplane",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 7.88,
      "h": 2.27
    },
    "options": {}
  },
  'av-f3-glider-sailplane': {
    "id": "av-f3-glider-sailplane",
    "name": "Premium: Highend: Glider Sailplane",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 7.88,
      "h": 2.27
    },
    "options": {}
  },
  'av-f4-glider-sailplane': {
    "id": "av-f4-glider-sailplane",
    "name": "Elite: Highend: Glider Sailplane",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 7.88,
      "h": 2.27
    },
    "options": {}
  },
  'av-f1-heavy-freight-cargo': {
    "id": "av-f1-heavy-freight-cargo",
    "name": "Basic: Highend: Heavy Freight Cargo",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 52.5,
      "d": 60.9,
      "h": 15.75
    },
    "options": {}
  },
  'av-f2-heavy-freight-cargo': {
    "id": "av-f2-heavy-freight-cargo",
    "name": "Standard: Highend: Heavy Freight Cargo",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 52.5,
      "d": 60.9,
      "h": 15.75
    },
    "options": {}
  },
  'av-f3-heavy-freight-cargo': {
    "id": "av-f3-heavy-freight-cargo",
    "name": "Premium: Highend: Heavy Freight Cargo",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 52.5,
      "d": 60.9,
      "h": 15.75
    },
    "options": {}
  },
  'av-f4-heavy-freight-cargo': {
    "id": "av-f4-heavy-freight-cargo",
    "name": "Elite: Highend: Heavy Freight Cargo",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 52.5,
      "d": 60.9,
      "h": 15.75
    },
    "options": {}
  },
  'av-f1-heavy-lift-helicopter': {
    "id": "av-f1-heavy-lift-helicopter",
    "name": "Basic: Highend: Heavy Lift Helicopter",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 27.3,
      "h": 7.35
    },
    "options": {}
  },
  'av-f2-heavy-lift-helicopter': {
    "id": "av-f2-heavy-lift-helicopter",
    "name": "Standard: Highend: Heavy Lift Helicopter",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 27.3,
      "h": 7.35
    },
    "options": {}
  },
  'av-f3-heavy-lift-helicopter': {
    "id": "av-f3-heavy-lift-helicopter",
    "name": "Premium: Highend: Heavy Lift Helicopter",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 27.3,
      "h": 7.35
    },
    "options": {}
  },
  'av-f4-heavy-lift-helicopter': {
    "id": "av-f4-heavy-lift-helicopter",
    "name": "Elite: Highend: Heavy Lift Helicopter",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 27.3,
      "h": 7.35
    },
    "options": {}
  },
  'av-f1-helipad-elevated-deck': {
    "id": "av-f1-helipad-elevated-deck",
    "name": "Basic: Highend: Helipad Elevated Deck",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 6.3
    },
    "options": {}
  },
  'av-f2-helipad-elevated-deck': {
    "id": "av-f2-helipad-elevated-deck",
    "name": "Standard: Highend: Helipad Elevated Deck",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 6.3
    },
    "options": {}
  },
  'av-f3-helipad-elevated-deck': {
    "id": "av-f3-helipad-elevated-deck",
    "name": "Premium: Highend: Helipad Elevated Deck",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 6.3
    },
    "options": {}
  },
  'av-f4-helipad-elevated-deck': {
    "id": "av-f4-helipad-elevated-deck",
    "name": "Elite: Highend: Helipad Elevated Deck",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 6.3
    },
    "options": {}
  },
  'av-f1-hot-air-balloon': {
    "id": "av-f1-hot-air-balloon",
    "name": "Basic: Highend: Hot Air Balloon",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 23.1
    },
    "options": {}
  },
  'av-f2-hot-air-balloon': {
    "id": "av-f2-hot-air-balloon",
    "name": "Standard: Highend: Hot Air Balloon",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 23.1
    },
    "options": {}
  },
  'av-f3-hot-air-balloon': {
    "id": "av-f3-hot-air-balloon",
    "name": "Premium: Highend: Hot Air Balloon",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 23.1
    },
    "options": {}
  },
  'av-f4-hot-air-balloon': {
    "id": "av-f4-hot-air-balloon",
    "name": "Elite: Highend: Hot Air Balloon",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 23.1
    },
    "options": {}
  },
  'av-f1-jumbo-jet-quad': {
    "id": "av-f1-jumbo-jet-quad",
    "name": "Basic: Highend: Jumbo Jet Quad",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 57.75,
      "d": 63,
      "h": 16.8
    },
    "options": {}
  },
  'av-f2-jumbo-jet-quad': {
    "id": "av-f2-jumbo-jet-quad",
    "name": "Standard: Highend: Jumbo Jet Quad",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 57.75,
      "d": 63,
      "h": 16.8
    },
    "options": {}
  },
  'av-f3-jumbo-jet-quad': {
    "id": "av-f3-jumbo-jet-quad",
    "name": "Premium: Highend: Jumbo Jet Quad",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 57.75,
      "d": 63,
      "h": 16.8
    },
    "options": {}
  },
  'av-f4-jumbo-jet-quad': {
    "id": "av-f4-jumbo-jet-quad",
    "name": "Elite: Highend: Jumbo Jet Quad",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 57.75,
      "d": 63,
      "h": 16.8
    },
    "options": {}
  },
  'av-f1-light-helicopter': {
    "id": "av-f1-light-helicopter",
    "name": "Basic: Highend: Light Helicopter",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 9.45,
      "d": 11.55,
      "h": 3.68
    },
    "options": {}
  },
  'av-f2-light-helicopter': {
    "id": "av-f2-light-helicopter",
    "name": "Standard: Highend: Light Helicopter",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 9.45,
      "d": 11.55,
      "h": 3.68
    },
    "options": {}
  },
  'av-f3-light-helicopter': {
    "id": "av-f3-light-helicopter",
    "name": "Premium: Highend: Light Helicopter",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 9.45,
      "d": 11.55,
      "h": 3.68
    },
    "options": {}
  },
  'av-f4-light-helicopter': {
    "id": "av-f4-light-helicopter",
    "name": "Elite: Highend: Light Helicopter",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 9.45,
      "d": 11.55,
      "h": 3.68
    },
    "options": {}
  },
  'av-f1-light-single-engine': {
    "id": "av-f1-light-single-engine",
    "name": "Basic: Highend: Light Single Engine",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 11.55,
      "d": 8.4,
      "h": 3.15
    },
    "options": {}
  },
  'av-f2-light-single-engine': {
    "id": "av-f2-light-single-engine",
    "name": "Standard: Highend: Light Single Engine",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 11.55,
      "d": 8.4,
      "h": 3.15
    },
    "options": {}
  },
  'av-f3-light-single-engine': {
    "id": "av-f3-light-single-engine",
    "name": "Premium: Highend: Light Single Engine",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 11.55,
      "d": 8.4,
      "h": 3.15
    },
    "options": {}
  },
  'av-f4-light-single-engine': {
    "id": "av-f4-light-single-engine",
    "name": "Elite: Highend: Light Single Engine",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 11.55,
      "d": 8.4,
      "h": 3.15
    },
    "options": {}
  },
  'av-f1-long-range-scout-drone': {
    "id": "av-f1-long-range-scout-drone",
    "name": "Basic: Highend: Long Range Scout Drone",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 8.4,
      "h": 2.62
    },
    "options": {}
  },
  'av-f2-long-range-scout-drone': {
    "id": "av-f2-long-range-scout-drone",
    "name": "Standard: Highend: Long Range Scout Drone",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 8.4,
      "h": 2.62
    },
    "options": {}
  },
  'av-f3-long-range-scout-drone': {
    "id": "av-f3-long-range-scout-drone",
    "name": "Premium: Highend: Long Range Scout Drone",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 8.4,
      "h": 2.62
    },
    "options": {}
  },
  'av-f4-long-range-scout-drone': {
    "id": "av-f4-long-range-scout-drone",
    "name": "Elite: Highend: Long Range Scout Drone",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 8.4,
      "h": 2.62
    },
    "options": {}
  },
  'av-f1-luxury-bizjet-heavy': {
    "id": "av-f1-luxury-bizjet-heavy",
    "name": "Basic: Highend: Luxury Bizjet Heavy",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 27.3,
      "h": 7.35
    },
    "options": {}
  },
  'av-f2-luxury-bizjet-heavy': {
    "id": "av-f2-luxury-bizjet-heavy",
    "name": "Standard: Highend: Luxury Bizjet Heavy",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 27.3,
      "h": 7.35
    },
    "options": {}
  },
  'av-f3-luxury-bizjet-heavy': {
    "id": "av-f3-luxury-bizjet-heavy",
    "name": "Premium: Highend: Luxury Bizjet Heavy",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 27.3,
      "h": 7.35
    },
    "options": {}
  },
  'av-f4-luxury-bizjet-heavy': {
    "id": "av-f4-luxury-bizjet-heavy",
    "name": "Elite: Highend: Luxury Bizjet Heavy",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 27.3,
      "h": 7.35
    },
    "options": {}
  },
  'av-f1-passenger-jetway-bridge': {
    "id": "av-f1-passenger-jetway-bridge",
    "name": "Basic: Highend: Passenger Jetway Bridge",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 25.2,
      "h": 6.3
    },
    "options": {}
  },
  'av-f2-passenger-jetway-bridge': {
    "id": "av-f2-passenger-jetway-bridge",
    "name": "Standard: Highend: Passenger Jetway Bridge",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 25.2,
      "h": 6.3
    },
    "options": {}
  },
  'av-f3-passenger-jetway-bridge': {
    "id": "av-f3-passenger-jetway-bridge",
    "name": "Premium: Highend: Passenger Jetway Bridge",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 25.2,
      "h": 6.3
    },
    "options": {}
  },
  'av-f4-passenger-jetway-bridge': {
    "id": "av-f4-passenger-jetway-bridge",
    "name": "Elite: Highend: Passenger Jetway Bridge",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 25.2,
      "h": 6.3
    },
    "options": {}
  },
  'av-f1-pushback-tug-tractor': {
    "id": "av-f1-pushback-tug-tractor",
    "name": "Basic: Highend: Pushback Tug Tractor",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.15,
      "d": 6.83,
      "h": 2.1
    },
    "options": {}
  },
  'av-f2-pushback-tug-tractor': {
    "id": "av-f2-pushback-tug-tractor",
    "name": "Standard: Highend: Pushback Tug Tractor",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.15,
      "d": 6.83,
      "h": 2.1
    },
    "options": {}
  },
  'av-f3-pushback-tug-tractor': {
    "id": "av-f3-pushback-tug-tractor",
    "name": "Premium: Highend: Pushback Tug Tractor",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.15,
      "d": 6.83,
      "h": 2.1
    },
    "options": {}
  },
  'av-f4-pushback-tug-tractor': {
    "id": "av-f4-pushback-tug-tractor",
    "name": "Elite: Highend: Pushback Tug Tractor",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.15,
      "d": 6.83,
      "h": 2.1
    },
    "options": {}
  },
  'av-f1-regional-jetliner': {
    "id": "av-f1-regional-jetliner",
    "name": "Basic: Highend: Regional Jetliner",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 26.25,
      "d": 31.5,
      "h": 7.88
    },
    "options": {}
  },
  'av-f2-regional-jetliner': {
    "id": "av-f2-regional-jetliner",
    "name": "Standard: Highend: Regional Jetliner",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 26.25,
      "d": 31.5,
      "h": 7.88
    },
    "options": {}
  },
  'av-f3-regional-jetliner': {
    "id": "av-f3-regional-jetliner",
    "name": "Premium: Highend: Regional Jetliner",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 26.25,
      "d": 31.5,
      "h": 7.88
    },
    "options": {}
  },
  'av-f4-regional-jetliner': {
    "id": "av-f4-regional-jetliner",
    "name": "Elite: Highend: Regional Jetliner",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 26.25,
      "d": 31.5,
      "h": 7.88
    },
    "options": {}
  },
  'av-f1-runway-threshold-lighting': {
    "id": "av-f1-runway-threshold-lighting",
    "name": "Basic: Highend: Runway Threshold Lighting",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.2,
      "d": 12.6,
      "h": 1.58
    },
    "options": {}
  },
  'av-f2-runway-threshold-lighting': {
    "id": "av-f2-runway-threshold-lighting",
    "name": "Standard: Highend: Runway Threshold Lighting",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.2,
      "d": 12.6,
      "h": 1.58
    },
    "options": {}
  },
  'av-f3-runway-threshold-lighting': {
    "id": "av-f3-runway-threshold-lighting",
    "name": "Premium: Highend: Runway Threshold Lighting",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.2,
      "d": 12.6,
      "h": 1.58
    },
    "options": {}
  },
  'av-f4-runway-threshold-lighting': {
    "id": "av-f4-runway-threshold-lighting",
    "name": "Elite: Highend: Runway Threshold Lighting",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.2,
      "d": 12.6,
      "h": 1.58
    },
    "options": {}
  },
  'av-f1-search-rescue-helicopter': {
    "id": "av-f1-search-rescue-helicopter",
    "name": "Basic: Highend: Search Rescue Helicopter",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 18.9,
      "h": 5.46
    },
    "options": {}
  },
  'av-f2-search-rescue-helicopter': {
    "id": "av-f2-search-rescue-helicopter",
    "name": "Standard: Highend: Search Rescue Helicopter",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 18.9,
      "h": 5.46
    },
    "options": {}
  },
  'av-f3-search-rescue-helicopter': {
    "id": "av-f3-search-rescue-helicopter",
    "name": "Premium: Highend: Search Rescue Helicopter",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 18.9,
      "h": 5.46
    },
    "options": {}
  },
  'av-f4-search-rescue-helicopter': {
    "id": "av-f4-search-rescue-helicopter",
    "name": "Elite: Highend: Search Rescue Helicopter",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 18.9,
      "h": 5.46
    },
    "options": {}
  },
  'av-f1-stealth-strategic-bomber': {
    "id": "av-f1-stealth-strategic-bomber",
    "name": "Basic: Highend: Stealth Strategic Bomber",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 42,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'av-f2-stealth-strategic-bomber': {
    "id": "av-f2-stealth-strategic-bomber",
    "name": "Standard: Highend: Stealth Strategic Bomber",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 42,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'av-f3-stealth-strategic-bomber': {
    "id": "av-f3-stealth-strategic-bomber",
    "name": "Premium: Highend: Stealth Strategic Bomber",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 42,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'av-f4-stealth-strategic-bomber': {
    "id": "av-f4-stealth-strategic-bomber",
    "name": "Elite: Highend: Stealth Strategic Bomber",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 42,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'av-f1-suborbital-spaceplane': {
    "id": "av-f1-suborbital-spaceplane",
    "name": "Basic: Highend: Suborbital Spaceplane",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 37.8,
      "h": 8.4
    },
    "options": {}
  },
  'av-f2-suborbital-spaceplane': {
    "id": "av-f2-suborbital-spaceplane",
    "name": "Standard: Highend: Suborbital Spaceplane",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 37.8,
      "h": 8.4
    },
    "options": {}
  },
  'av-f3-suborbital-spaceplane': {
    "id": "av-f3-suborbital-spaceplane",
    "name": "Premium: Highend: Suborbital Spaceplane",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 37.8,
      "h": 8.4
    },
    "options": {}
  },
  'av-f4-suborbital-spaceplane': {
    "id": "av-f4-suborbital-spaceplane",
    "name": "Elite: Highend: Suborbital Spaceplane",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 37.8,
      "h": 8.4
    },
    "options": {}
  },
  'av-f1-supersonic-passenger-jet': {
    "id": "av-f1-supersonic-passenger-jet",
    "name": "Basic: Highend: Supersonic Passenger Jet",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 31.5,
      "d": 57.75,
      "h": 9.45
    },
    "options": {}
  },
  'av-f2-supersonic-passenger-jet': {
    "id": "av-f2-supersonic-passenger-jet",
    "name": "Standard: Highend: Supersonic Passenger Jet",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 31.5,
      "d": 57.75,
      "h": 9.45
    },
    "options": {}
  },
  'av-f3-supersonic-passenger-jet': {
    "id": "av-f3-supersonic-passenger-jet",
    "name": "Premium: Highend: Supersonic Passenger Jet",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 31.5,
      "d": 57.75,
      "h": 9.45
    },
    "options": {}
  },
  'av-f4-supersonic-passenger-jet': {
    "id": "av-f4-supersonic-passenger-jet",
    "name": "Elite: Highend: Supersonic Passenger Jet",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 31.5,
      "d": 57.75,
      "h": 9.45
    },
    "options": {}
  },
  'av-f1-tiltrotor-military-transport': {
    "id": "av-f1-tiltrotor-military-transport",
    "name": "Basic: Highend: Tiltrotor Military Transport",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 6.83
    },
    "options": {}
  },
  'av-f2-tiltrotor-military-transport': {
    "id": "av-f2-tiltrotor-military-transport",
    "name": "Standard: Highend: Tiltrotor Military Transport",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 6.83
    },
    "options": {}
  },
  'av-f3-tiltrotor-military-transport': {
    "id": "av-f3-tiltrotor-military-transport",
    "name": "Premium: Highend: Tiltrotor Military Transport",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 6.83
    },
    "options": {}
  },
  'av-f4-tiltrotor-military-transport': {
    "id": "av-f4-tiltrotor-military-transport",
    "name": "Elite: Highend: Tiltrotor Military Transport",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 6.83
    },
    "options": {}
  },
  'av-f1-twin-utility-turboprop': {
    "id": "av-f1-twin-utility-turboprop",
    "name": "Basic: Highend: Twin Utility Turboprop",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 6.3
    },
    "options": {}
  },
  'av-f2-twin-utility-turboprop': {
    "id": "av-f2-twin-utility-turboprop",
    "name": "Standard: Highend: Twin Utility Turboprop",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 6.3
    },
    "options": {}
  },
  'av-f3-twin-utility-turboprop': {
    "id": "av-f3-twin-utility-turboprop",
    "name": "Premium: Highend: Twin Utility Turboprop",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 6.3
    },
    "options": {}
  },
  'av-f4-twin-utility-turboprop': {
    "id": "av-f4-twin-utility-turboprop",
    "name": "Elite: Highend: Twin Utility Turboprop",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 6.3
    },
    "options": {}
  },
  'av-f1-vintage-biplane': {
    "id": "av-f1-vintage-biplane",
    "name": "Basic: Highend: Vintage Biplane",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 8.93,
      "h": 3.68
    },
    "options": {}
  },
  'av-f2-vintage-biplane': {
    "id": "av-f2-vintage-biplane",
    "name": "Standard: Highend: Vintage Biplane",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 8.93,
      "h": 3.68
    },
    "options": {}
  },
  'av-f3-vintage-biplane': {
    "id": "av-f3-vintage-biplane",
    "name": "Premium: Highend: Vintage Biplane",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 8.93,
      "h": 3.68
    },
    "options": {}
  },
  'av-f4-vintage-biplane': {
    "id": "av-f4-vintage-biplane",
    "name": "Elite: Highend: Vintage Biplane",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 8.93,
      "h": 3.68
    },
    "options": {}
  },
  'av-f1-widebody-airliner': {
    "id": "av-f1-widebody-airliner",
    "name": "Basic: Highend: Widebody Airliner",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 47.25,
      "d": 52.5,
      "h": 14.7
    },
    "options": {}
  },
  'av-f2-widebody-airliner': {
    "id": "av-f2-widebody-airliner",
    "name": "Standard: Highend: Widebody Airliner",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 47.25,
      "d": 52.5,
      "h": 14.7
    },
    "options": {}
  },
  'av-f3-widebody-airliner': {
    "id": "av-f3-widebody-airliner",
    "name": "Premium: Highend: Widebody Airliner",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 47.25,
      "d": 52.5,
      "h": 14.7
    },
    "options": {}
  },
  'av-f4-widebody-airliner': {
    "id": "av-f4-widebody-airliner",
    "name": "Elite: Highend: Widebody Airliner",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 47.25,
      "d": 52.5,
      "h": 14.7
    },
    "options": {}
  },
  'av-f1-windsock-mast-station': {
    "id": "av-f1-windsock-mast-station",
    "name": "Basic: Highend: Windsock Mast Station",
    "category": "aviation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 7.35
    },
    "options": {}
  },
  'av-f2-windsock-mast-station': {
    "id": "av-f2-windsock-mast-station",
    "name": "Standard: Highend: Windsock Mast Station",
    "category": "aviation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 7.35
    },
    "options": {}
  },
  'av-f3-windsock-mast-station': {
    "id": "av-f3-windsock-mast-station",
    "name": "Premium: Highend: Windsock Mast Station",
    "category": "aviation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 7.35
    },
    "options": {}
  },
  'av-f4-windsock-mast-station': {
    "id": "av-f4-windsock-mast-station",
    "name": "Elite: Highend: Windsock Mast Station",
    "category": "aviation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 7.35
    },
    "options": {}
  },
  'bnd-f1-acoustic-timber-wall': {
    "id": "bnd-f1-acoustic-timber-wall",
    "name": "Basic: Highend: Acoustic Timber Wall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 3.15
    },
    "options": {}
  },
  'bnd-f2-acoustic-timber-wall': {
    "id": "bnd-f2-acoustic-timber-wall",
    "name": "Standard: Highend: Acoustic Timber Wall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 3.15
    },
    "options": {}
  },
  'bnd-f3-acoustic-timber-wall': {
    "id": "bnd-f3-acoustic-timber-wall",
    "name": "Premium: Highend: Acoustic Timber Wall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 3.15
    },
    "options": {}
  },
  'bnd-f4-acoustic-timber-wall': {
    "id": "bnd-f4-acoustic-timber-wall",
    "name": "Elite: Highend: Acoustic Timber Wall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 3.15
    },
    "options": {}
  },
  'bnd-f1-bamboo-screen-fence': {
    "id": "bnd-f1-bamboo-screen-fence",
    "name": "Basic: Highend: Bamboo Screen Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 0.32,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f2-bamboo-screen-fence': {
    "id": "bnd-f2-bamboo-screen-fence",
    "name": "Standard: Highend: Bamboo Screen Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 0.32,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f3-bamboo-screen-fence': {
    "id": "bnd-f3-bamboo-screen-fence",
    "name": "Premium: Highend: Bamboo Screen Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 0.32,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f4-bamboo-screen-fence': {
    "id": "bnd-f4-bamboo-screen-fence",
    "name": "Elite: Highend: Bamboo Screen Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 0.32,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f1-boom-barrier-gate': {
    "id": "bnd-f1-boom-barrier-gate",
    "name": "Basic: Highend: Boom Barrier Gate",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.73,
      "d": 0.53,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f2-boom-barrier-gate': {
    "id": "bnd-f2-boom-barrier-gate",
    "name": "Standard: Highend: Boom Barrier Gate",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.73,
      "d": 0.53,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f3-boom-barrier-gate': {
    "id": "bnd-f3-boom-barrier-gate",
    "name": "Premium: Highend: Boom Barrier Gate",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.73,
      "d": 0.53,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f4-boom-barrier-gate': {
    "id": "bnd-f4-boom-barrier-gate",
    "name": "Elite: Highend: Boom Barrier Gate",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.73,
      "d": 0.53,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f1-brick-courtyard-wall': {
    "id": "bnd-f1-brick-courtyard-wall",
    "name": "Basic: Highend: Brick Courtyard Wall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.63,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f2-brick-courtyard-wall': {
    "id": "bnd-f2-brick-courtyard-wall",
    "name": "Standard: Highend: Brick Courtyard Wall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.63,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f3-brick-courtyard-wall': {
    "id": "bnd-f3-brick-courtyard-wall",
    "name": "Premium: Highend: Brick Courtyard Wall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.63,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f4-brick-courtyard-wall': {
    "id": "bnd-f4-brick-courtyard-wall",
    "name": "Elite: Highend: Brick Courtyard Wall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.63,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f1-brick-pier-iron-infill': {
    "id": "bnd-f1-brick-pier-iron-infill",
    "name": "Basic: Highend: Brick Pier Iron Infill",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f2-brick-pier-iron-infill': {
    "id": "bnd-f2-brick-pier-iron-infill",
    "name": "Standard: Highend: Brick Pier Iron Infill",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f3-brick-pier-iron-infill': {
    "id": "bnd-f3-brick-pier-iron-infill",
    "name": "Premium: Highend: Brick Pier Iron Infill",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f4-brick-pier-iron-infill': {
    "id": "bnd-f4-brick-pier-iron-infill",
    "name": "Elite: Highend: Brick Pier Iron Infill",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f1-cedar-privacy-fence': {
    "id": "bnd-f1-cedar-privacy-fence",
    "name": "Basic: Highend: Cedar Privacy Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f2-cedar-privacy-fence': {
    "id": "bnd-f2-cedar-privacy-fence",
    "name": "Standard: Highend: Cedar Privacy Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f3-cedar-privacy-fence': {
    "id": "bnd-f3-cedar-privacy-fence",
    "name": "Premium: Highend: Cedar Privacy Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f4-cedar-privacy-fence': {
    "id": "bnd-f4-cedar-privacy-fence",
    "name": "Elite: Highend: Cedar Privacy Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f1-chainlink-barbed-fence': {
    "id": "bnd-f1-chainlink-barbed-fence",
    "name": "Basic: Highend: Chainlink Barbed Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f2-chainlink-barbed-fence': {
    "id": "bnd-f2-chainlink-barbed-fence",
    "name": "Standard: Highend: Chainlink Barbed Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f3-chainlink-barbed-fence': {
    "id": "bnd-f3-chainlink-barbed-fence",
    "name": "Premium: Highend: Chainlink Barbed Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f4-chainlink-barbed-fence': {
    "id": "bnd-f4-chainlink-barbed-fence",
    "name": "Elite: Highend: Chainlink Barbed Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f1-coastal-rope-bollard-fence': {
    "id": "bnd-f1-coastal-rope-bollard-fence",
    "name": "Basic: Highend: Coastal Rope Bollard Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 1.05
    },
    "options": {}
  },
  'bnd-f2-coastal-rope-bollard-fence': {
    "id": "bnd-f2-coastal-rope-bollard-fence",
    "name": "Standard: Highend: Coastal Rope Bollard Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 1.05
    },
    "options": {}
  },
  'bnd-f3-coastal-rope-bollard-fence': {
    "id": "bnd-f3-coastal-rope-bollard-fence",
    "name": "Premium: Highend: Coastal Rope Bollard Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 1.05
    },
    "options": {}
  },
  'bnd-f4-coastal-rope-bollard-fence': {
    "id": "bnd-f4-coastal-rope-bollard-fence",
    "name": "Elite: Highend: Coastal Rope Bollard Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 1.05
    },
    "options": {}
  },
  'bnd-f1-concrete-blast-wall': {
    "id": "bnd-f1-concrete-blast-wall",
    "name": "Basic: Highend: Concrete Blast Wall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 1.05,
      "h": 3.68
    },
    "options": {}
  },
  'bnd-f2-concrete-blast-wall': {
    "id": "bnd-f2-concrete-blast-wall",
    "name": "Standard: Highend: Concrete Blast Wall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 1.05,
      "h": 3.68
    },
    "options": {}
  },
  'bnd-f3-concrete-blast-wall': {
    "id": "bnd-f3-concrete-blast-wall",
    "name": "Premium: Highend: Concrete Blast Wall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 1.05,
      "h": 3.68
    },
    "options": {}
  },
  'bnd-f4-concrete-blast-wall': {
    "id": "bnd-f4-concrete-blast-wall",
    "name": "Elite: Highend: Concrete Blast Wall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 1.05,
      "h": 3.68
    },
    "options": {}
  },
  'bnd-f1-corrugated-metal-fence': {
    "id": "bnd-f1-corrugated-metal-fence",
    "name": "Basic: Highend: Corrugated Metal Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f2-corrugated-metal-fence': {
    "id": "bnd-f2-corrugated-metal-fence",
    "name": "Standard: Highend: Corrugated Metal Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f3-corrugated-metal-fence': {
    "id": "bnd-f3-corrugated-metal-fence",
    "name": "Premium: Highend: Corrugated Metal Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f4-corrugated-metal-fence': {
    "id": "bnd-f4-corrugated-metal-fence",
    "name": "Elite: Highend: Corrugated Metal Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f1-corten-steel-screen': {
    "id": "bnd-f1-corten-steel-screen",
    "name": "Basic: Highend: Corten Steel Screen",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 0.26,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f2-corten-steel-screen': {
    "id": "bnd-f2-corten-steel-screen",
    "name": "Standard: Highend: Corten Steel Screen",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 0.26,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f3-corten-steel-screen': {
    "id": "bnd-f3-corten-steel-screen",
    "name": "Premium: Highend: Corten Steel Screen",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 0.26,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f4-corten-steel-screen': {
    "id": "bnd-f4-corten-steel-screen",
    "name": "Elite: Highend: Corten Steel Screen",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 0.26,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f1-crowd-control-barricade': {
    "id": "bnd-f1-crowd-control-barricade",
    "name": "Basic: Highend: Crowd Control Barricade",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.68,
      "d": 0.42,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f2-crowd-control-barricade': {
    "id": "bnd-f2-crowd-control-barricade",
    "name": "Standard: Highend: Crowd Control Barricade",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.68,
      "d": 0.42,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f3-crowd-control-barricade': {
    "id": "bnd-f3-crowd-control-barricade",
    "name": "Premium: Highend: Crowd Control Barricade",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.68,
      "d": 0.42,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f4-crowd-control-barricade': {
    "id": "bnd-f4-crowd-control-barricade",
    "name": "Elite: Highend: Crowd Control Barricade",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.68,
      "d": 0.42,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f1-decorative-chain-bollard': {
    "id": "bnd-f1-decorative-chain-bollard",
    "name": "Basic: Highend: Decorative Chain Bollard",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 0.42,
      "h": 0.95
    },
    "options": {}
  },
  'bnd-f2-decorative-chain-bollard': {
    "id": "bnd-f2-decorative-chain-bollard",
    "name": "Standard: Highend: Decorative Chain Bollard",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 0.42,
      "h": 0.95
    },
    "options": {}
  },
  'bnd-f3-decorative-chain-bollard': {
    "id": "bnd-f3-decorative-chain-bollard",
    "name": "Premium: Highend: Decorative Chain Bollard",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 0.42,
      "h": 0.95
    },
    "options": {}
  },
  'bnd-f4-decorative-chain-bollard': {
    "id": "bnd-f4-decorative-chain-bollard",
    "name": "Elite: Highend: Decorative Chain Bollard",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 0.42,
      "h": 0.95
    },
    "options": {}
  },
  'bnd-f1-decorative-hedge-arch': {
    "id": "bnd-f1-decorative-hedge-arch",
    "name": "Basic: Highend: Decorative Hedge Arch",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.15,
      "d": 0.84,
      "h": 3.36
    },
    "options": {}
  },
  'bnd-f2-decorative-hedge-arch': {
    "id": "bnd-f2-decorative-hedge-arch",
    "name": "Standard: Highend: Decorative Hedge Arch",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.15,
      "d": 0.84,
      "h": 3.36
    },
    "options": {}
  },
  'bnd-f3-decorative-hedge-arch': {
    "id": "bnd-f3-decorative-hedge-arch",
    "name": "Premium: Highend: Decorative Hedge Arch",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.15,
      "d": 0.84,
      "h": 3.36
    },
    "options": {}
  },
  'bnd-f4-decorative-hedge-arch': {
    "id": "bnd-f4-decorative-hedge-arch",
    "name": "Elite: Highend: Decorative Hedge Arch",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.15,
      "d": 0.84,
      "h": 3.36
    },
    "options": {}
  },
  'bnd-f1-drystone-field-wall': {
    "id": "bnd-f1-drystone-field-wall",
    "name": "Basic: Highend: Drystone Field Wall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.73,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f2-drystone-field-wall': {
    "id": "bnd-f2-drystone-field-wall",
    "name": "Standard: Highend: Drystone Field Wall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.73,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f3-drystone-field-wall': {
    "id": "bnd-f3-drystone-field-wall",
    "name": "Premium: Highend: Drystone Field Wall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.73,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f4-drystone-field-wall': {
    "id": "bnd-f4-drystone-field-wall",
    "name": "Elite: Highend: Drystone Field Wall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.73,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f1-gabion-mesh-seatwall': {
    "id": "bnd-f1-gabion-mesh-seatwall",
    "name": "Basic: Highend: Gabion Mesh Seatwall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.73,
      "d": 0.73,
      "h": 0.63
    },
    "options": {}
  },
  'bnd-f2-gabion-mesh-seatwall': {
    "id": "bnd-f2-gabion-mesh-seatwall",
    "name": "Standard: Highend: Gabion Mesh Seatwall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.73,
      "d": 0.73,
      "h": 0.63
    },
    "options": {}
  },
  'bnd-f3-gabion-mesh-seatwall': {
    "id": "bnd-f3-gabion-mesh-seatwall",
    "name": "Premium: Highend: Gabion Mesh Seatwall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.73,
      "d": 0.73,
      "h": 0.63
    },
    "options": {}
  },
  'bnd-f4-gabion-mesh-seatwall': {
    "id": "bnd-f4-gabion-mesh-seatwall",
    "name": "Elite: Highend: Gabion Mesh Seatwall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.73,
      "d": 0.73,
      "h": 0.63
    },
    "options": {}
  },
  'bnd-f1-gabion-rock-wall': {
    "id": "bnd-f1-gabion-rock-wall",
    "name": "Basic: Highend: Gabion Rock Wall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 0.84,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f2-gabion-rock-wall': {
    "id": "bnd-f2-gabion-rock-wall",
    "name": "Standard: Highend: Gabion Rock Wall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 0.84,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f3-gabion-rock-wall': {
    "id": "bnd-f3-gabion-rock-wall",
    "name": "Premium: Highend: Gabion Rock Wall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 0.84,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f4-gabion-rock-wall': {
    "id": "bnd-f4-gabion-rock-wall",
    "name": "Elite: Highend: Gabion Rock Wall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 0.84,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f1-gabion-vegetated-wall': {
    "id": "bnd-f1-gabion-vegetated-wall",
    "name": "Basic: Highend: Gabion Vegetated Wall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 0.84,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f2-gabion-vegetated-wall': {
    "id": "bnd-f2-gabion-vegetated-wall",
    "name": "Standard: Highend: Gabion Vegetated Wall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 0.84,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f3-gabion-vegetated-wall': {
    "id": "bnd-f3-gabion-vegetated-wall",
    "name": "Premium: Highend: Gabion Vegetated Wall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 0.84,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f4-gabion-vegetated-wall': {
    "id": "bnd-f4-gabion-vegetated-wall",
    "name": "Elite: Highend: Gabion Vegetated Wall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 0.84,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f1-glass-balustrade-rail': {
    "id": "bnd-f1-glass-balustrade-rail",
    "name": "Basic: Highend: Glass Balustrade Rail",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 0.21,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f2-glass-balustrade-rail': {
    "id": "bnd-f2-glass-balustrade-rail",
    "name": "Standard: Highend: Glass Balustrade Rail",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 0.21,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f3-glass-balustrade-rail': {
    "id": "bnd-f3-glass-balustrade-rail",
    "name": "Premium: Highend: Glass Balustrade Rail",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 0.21,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f4-glass-balustrade-rail': {
    "id": "bnd-f4-glass-balustrade-rail",
    "name": "Elite: Highend: Glass Balustrade Rail",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 0.21,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f1-ha-ha-sunken-wall': {
    "id": "bnd-f1-ha-ha-sunken-wall",
    "name": "Basic: Highend: Ha Ha Sunken Wall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 1.58,
      "h": 1.68
    },
    "options": {}
  },
  'bnd-f2-ha-ha-sunken-wall': {
    "id": "bnd-f2-ha-ha-sunken-wall",
    "name": "Standard: Highend: Ha Ha Sunken Wall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 1.58,
      "h": 1.68
    },
    "options": {}
  },
  'bnd-f3-ha-ha-sunken-wall': {
    "id": "bnd-f3-ha-ha-sunken-wall",
    "name": "Premium: Highend: Ha Ha Sunken Wall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 1.58,
      "h": 1.68
    },
    "options": {}
  },
  'bnd-f4-ha-ha-sunken-wall': {
    "id": "bnd-f4-ha-ha-sunken-wall",
    "name": "Elite: Highend: Ha Ha Sunken Wall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 1.58,
      "h": 1.68
    },
    "options": {}
  },
  'bnd-f1-lattice-garden-screen': {
    "id": "bnd-f1-lattice-garden-screen",
    "name": "Basic: Highend: Lattice Garden Screen",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.2,
      "d": 0.26,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f2-lattice-garden-screen': {
    "id": "bnd-f2-lattice-garden-screen",
    "name": "Standard: Highend: Lattice Garden Screen",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.2,
      "d": 0.26,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f3-lattice-garden-screen': {
    "id": "bnd-f3-lattice-garden-screen",
    "name": "Premium: Highend: Lattice Garden Screen",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.2,
      "d": 0.26,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f4-lattice-garden-screen': {
    "id": "bnd-f4-lattice-garden-screen",
    "name": "Elite: Highend: Lattice Garden Screen",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.2,
      "d": 0.26,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f1-living-ivy-trellis': {
    "id": "bnd-f1-living-ivy-trellis",
    "name": "Basic: Highend: Living Ivy Trellis",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.73,
      "d": 0.32,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f2-living-ivy-trellis': {
    "id": "bnd-f2-living-ivy-trellis",
    "name": "Standard: Highend: Living Ivy Trellis",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.73,
      "d": 0.32,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f3-living-ivy-trellis': {
    "id": "bnd-f3-living-ivy-trellis",
    "name": "Premium: Highend: Living Ivy Trellis",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.73,
      "d": 0.32,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f4-living-ivy-trellis': {
    "id": "bnd-f4-living-ivy-trellis",
    "name": "Elite: Highend: Living Ivy Trellis",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.73,
      "d": 0.32,
      "h": 2.1
    },
    "options": {}
  },
  'bnd-f1-manicured-boxwood-hedge': {
    "id": "bnd-f1-manicured-boxwood-hedge",
    "name": "Basic: Highend: Manicured Boxwood Hedge",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.84,
      "h": 1.68
    },
    "options": {}
  },
  'bnd-f2-manicured-boxwood-hedge': {
    "id": "bnd-f2-manicured-boxwood-hedge",
    "name": "Standard: Highend: Manicured Boxwood Hedge",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.84,
      "h": 1.68
    },
    "options": {}
  },
  'bnd-f3-manicured-boxwood-hedge': {
    "id": "bnd-f3-manicured-boxwood-hedge",
    "name": "Premium: Highend: Manicured Boxwood Hedge",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.84,
      "h": 1.68
    },
    "options": {}
  },
  'bnd-f4-manicured-boxwood-hedge': {
    "id": "bnd-f4-manicured-boxwood-hedge",
    "name": "Elite: Highend: Manicured Boxwood Hedge",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.84,
      "h": 1.68
    },
    "options": {}
  },
  'bnd-f1-marble-parapet-wall': {
    "id": "bnd-f1-marble-parapet-wall",
    "name": "Basic: Highend: Marble Parapet Wall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f2-marble-parapet-wall': {
    "id": "bnd-f2-marble-parapet-wall",
    "name": "Standard: Highend: Marble Parapet Wall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f3-marble-parapet-wall': {
    "id": "bnd-f3-marble-parapet-wall",
    "name": "Premium: Highend: Marble Parapet Wall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f4-marble-parapet-wall': {
    "id": "bnd-f4-marble-parapet-wall",
    "name": "Elite: Highend: Marble Parapet Wall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.53,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f1-modern-slat-fence': {
    "id": "bnd-f1-modern-slat-fence",
    "name": "Basic: Highend: Modern Slat Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.26,
      "h": 1.99
    },
    "options": {}
  },
  'bnd-f2-modern-slat-fence': {
    "id": "bnd-f2-modern-slat-fence",
    "name": "Standard: Highend: Modern Slat Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.26,
      "h": 1.99
    },
    "options": {}
  },
  'bnd-f3-modern-slat-fence': {
    "id": "bnd-f3-modern-slat-fence",
    "name": "Premium: Highend: Modern Slat Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.26,
      "h": 1.99
    },
    "options": {}
  },
  'bnd-f4-modern-slat-fence': {
    "id": "bnd-f4-modern-slat-fence",
    "name": "Elite: Highend: Modern Slat Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.26,
      "h": 1.99
    },
    "options": {}
  },
  'bnd-f1-motorized-sliding-gate': {
    "id": "bnd-f1-motorized-sliding-gate",
    "name": "Basic: Highend: Motorized Sliding Gate",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.83,
      "d": 0.53,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f2-motorized-sliding-gate': {
    "id": "bnd-f2-motorized-sliding-gate",
    "name": "Standard: Highend: Motorized Sliding Gate",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.83,
      "d": 0.53,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f3-motorized-sliding-gate': {
    "id": "bnd-f3-motorized-sliding-gate",
    "name": "Premium: Highend: Motorized Sliding Gate",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.83,
      "d": 0.53,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f4-motorized-sliding-gate': {
    "id": "bnd-f4-motorized-sliding-gate",
    "name": "Elite: Highend: Motorized Sliding Gate",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.83,
      "d": 0.53,
      "h": 2.31
    },
    "options": {}
  },
  'bnd-f1-ornamental-iron-railing': {
    "id": "bnd-f1-ornamental-iron-railing",
    "name": "Basic: Highend: Ornamental Iron Railing",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f2-ornamental-iron-railing': {
    "id": "bnd-f2-ornamental-iron-railing",
    "name": "Standard: Highend: Ornamental Iron Railing",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f3-ornamental-iron-railing': {
    "id": "bnd-f3-ornamental-iron-railing",
    "name": "Premium: Highend: Ornamental Iron Railing",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f4-ornamental-iron-railing': {
    "id": "bnd-f4-ornamental-iron-railing",
    "name": "Elite: Highend: Ornamental Iron Railing",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f1-palisade-security-fence': {
    "id": "bnd-f1-palisade-security-fence",
    "name": "Basic: Highend: Palisade Security Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.73
    },
    "options": {}
  },
  'bnd-f2-palisade-security-fence': {
    "id": "bnd-f2-palisade-security-fence",
    "name": "Standard: Highend: Palisade Security Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.73
    },
    "options": {}
  },
  'bnd-f3-palisade-security-fence': {
    "id": "bnd-f3-palisade-security-fence",
    "name": "Premium: Highend: Palisade Security Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.73
    },
    "options": {}
  },
  'bnd-f4-palisade-security-fence': {
    "id": "bnd-f4-palisade-security-fence",
    "name": "Elite: Highend: Palisade Security Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.32,
      "h": 2.73
    },
    "options": {}
  },
  'bnd-f1-picket-white-fence': {
    "id": "bnd-f1-picket-white-fence",
    "name": "Basic: Highend: Picket White Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 0.26,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f2-picket-white-fence': {
    "id": "bnd-f2-picket-white-fence",
    "name": "Standard: Highend: Picket White Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 0.26,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f3-picket-white-fence': {
    "id": "bnd-f3-picket-white-fence",
    "name": "Premium: Highend: Picket White Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 0.26,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f4-picket-white-fence': {
    "id": "bnd-f4-picket-white-fence",
    "name": "Elite: Highend: Picket White Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 0.26,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f1-ranch-post-rail-fence': {
    "id": "bnd-f1-ranch-post-rail-fence",
    "name": "Basic: Highend: Ranch Post Rail Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 1.37
    },
    "options": {}
  },
  'bnd-f2-ranch-post-rail-fence': {
    "id": "bnd-f2-ranch-post-rail-fence",
    "name": "Standard: Highend: Ranch Post Rail Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 1.37
    },
    "options": {}
  },
  'bnd-f3-ranch-post-rail-fence': {
    "id": "bnd-f3-ranch-post-rail-fence",
    "name": "Premium: Highend: Ranch Post Rail Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 1.37
    },
    "options": {}
  },
  'bnd-f4-ranch-post-rail-fence': {
    "id": "bnd-f4-ranch-post-rail-fence",
    "name": "Elite: Highend: Ranch Post Rail Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 1.37
    },
    "options": {}
  },
  'bnd-f1-retaining-wall-block': {
    "id": "bnd-f1-retaining-wall-block",
    "name": "Basic: Highend: Retaining Wall Block",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.84,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f2-retaining-wall-block': {
    "id": "bnd-f2-retaining-wall-block",
    "name": "Standard: Highend: Retaining Wall Block",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.84,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f3-retaining-wall-block': {
    "id": "bnd-f3-retaining-wall-block",
    "name": "Premium: Highend: Retaining Wall Block",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.84,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f4-retaining-wall-block': {
    "id": "bnd-f4-retaining-wall-block",
    "name": "Elite: Highend: Retaining Wall Block",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.84,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f1-rustic-split-rail': {
    "id": "bnd-f1-rustic-split-rail",
    "name": "Basic: Highend: Rustic Split Rail",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f2-rustic-split-rail': {
    "id": "bnd-f2-rustic-split-rail",
    "name": "Standard: Highend: Rustic Split Rail",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f3-rustic-split-rail': {
    "id": "bnd-f3-rustic-split-rail",
    "name": "Premium: Highend: Rustic Split Rail",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f4-rustic-split-rail': {
    "id": "bnd-f4-rustic-split-rail",
    "name": "Elite: Highend: Rustic Split Rail",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.42,
      "h": 1.26
    },
    "options": {}
  },
  'bnd-f1-security-perimeter-fence': {
    "id": "bnd-f1-security-perimeter-fence",
    "name": "Basic: Highend: Security Perimeter Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 0.42,
      "h": 3.36
    },
    "options": {}
  },
  'bnd-f2-security-perimeter-fence': {
    "id": "bnd-f2-security-perimeter-fence",
    "name": "Standard: Highend: Security Perimeter Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 0.42,
      "h": 3.36
    },
    "options": {}
  },
  'bnd-f3-security-perimeter-fence': {
    "id": "bnd-f3-security-perimeter-fence",
    "name": "Premium: Highend: Security Perimeter Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 0.42,
      "h": 3.36
    },
    "options": {}
  },
  'bnd-f4-security-perimeter-fence': {
    "id": "bnd-f4-security-perimeter-fence",
    "name": "Elite: Highend: Security Perimeter Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 0.42,
      "h": 3.36
    },
    "options": {}
  },
  'bnd-f1-security-turnstile-barrier': {
    "id": "bnd-f1-security-turnstile-barrier",
    "name": "Basic: Highend: Security Turnstile Barrier",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.15,
      "d": 1.58,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f2-security-turnstile-barrier': {
    "id": "bnd-f2-security-turnstile-barrier",
    "name": "Standard: Highend: Security Turnstile Barrier",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.15,
      "d": 1.58,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f3-security-turnstile-barrier': {
    "id": "bnd-f3-security-turnstile-barrier",
    "name": "Premium: Highend: Security Turnstile Barrier",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.15,
      "d": 1.58,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f4-security-turnstile-barrier': {
    "id": "bnd-f4-security-turnstile-barrier",
    "name": "Elite: Highend: Security Turnstile Barrier",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.15,
      "d": 1.58,
      "h": 2.52
    },
    "options": {}
  },
  'bnd-f1-soundproof-highway-barrier': {
    "id": "bnd-f1-soundproof-highway-barrier",
    "name": "Basic: Highend: Soundproof Highway Barrier",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 0.53,
      "h": 4.2
    },
    "options": {}
  },
  'bnd-f2-soundproof-highway-barrier': {
    "id": "bnd-f2-soundproof-highway-barrier",
    "name": "Standard: Highend: Soundproof Highway Barrier",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 0.53,
      "h": 4.2
    },
    "options": {}
  },
  'bnd-f3-soundproof-highway-barrier': {
    "id": "bnd-f3-soundproof-highway-barrier",
    "name": "Premium: Highend: Soundproof Highway Barrier",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 0.53,
      "h": 4.2
    },
    "options": {}
  },
  'bnd-f4-soundproof-highway-barrier': {
    "id": "bnd-f4-soundproof-highway-barrier",
    "name": "Elite: Highend: Soundproof Highway Barrier",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 0.53,
      "h": 4.2
    },
    "options": {}
  },
  'bnd-f1-stone-balustrade': {
    "id": "bnd-f1-stone-balustrade",
    "name": "Basic: Highend: Stone Balustrade",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 0.53,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f2-stone-balustrade': {
    "id": "bnd-f2-stone-balustrade",
    "name": "Standard: Highend: Stone Balustrade",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 0.53,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f3-stone-balustrade': {
    "id": "bnd-f3-stone-balustrade",
    "name": "Premium: Highend: Stone Balustrade",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 0.53,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f4-stone-balustrade': {
    "id": "bnd-f4-stone-balustrade",
    "name": "Elite: Highend: Stone Balustrade",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 0.53,
      "h": 1.16
    },
    "options": {}
  },
  'bnd-f1-stone-castle-wall': {
    "id": "bnd-f1-stone-castle-wall",
    "name": "Basic: Highend: Stone Castle Wall",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 1.26,
      "h": 4.73
    },
    "options": {}
  },
  'bnd-f2-stone-castle-wall': {
    "id": "bnd-f2-stone-castle-wall",
    "name": "Standard: Highend: Stone Castle Wall",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 1.26,
      "h": 4.73
    },
    "options": {}
  },
  'bnd-f3-stone-castle-wall': {
    "id": "bnd-f3-stone-castle-wall",
    "name": "Premium: Highend: Stone Castle Wall",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 1.26,
      "h": 4.73
    },
    "options": {}
  },
  'bnd-f4-stone-castle-wall': {
    "id": "bnd-f4-stone-castle-wall",
    "name": "Elite: Highend: Stone Castle Wall",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 1.26,
      "h": 4.73
    },
    "options": {}
  },
  'bnd-f1-temporary-construction-barrier': {
    "id": "bnd-f1-temporary-construction-barrier",
    "name": "Basic: Highend: Temporary Construction Barrier",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.2,
      "d": 0.42,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f2-temporary-construction-barrier': {
    "id": "bnd-f2-temporary-construction-barrier",
    "name": "Standard: Highend: Temporary Construction Barrier",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.2,
      "d": 0.42,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f3-temporary-construction-barrier': {
    "id": "bnd-f3-temporary-construction-barrier",
    "name": "Premium: Highend: Temporary Construction Barrier",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.2,
      "d": 0.42,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f4-temporary-construction-barrier': {
    "id": "bnd-f4-temporary-construction-barrier",
    "name": "Elite: Highend: Temporary Construction Barrier",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.2,
      "d": 0.42,
      "h": 1.89
    },
    "options": {}
  },
  'bnd-f1-wire-farm-fence': {
    "id": "bnd-f1-wire-farm-fence",
    "name": "Basic: Highend: Wire Farm Fence",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 0.21,
      "h": 1.47
    },
    "options": {}
  },
  'bnd-f2-wire-farm-fence': {
    "id": "bnd-f2-wire-farm-fence",
    "name": "Standard: Highend: Wire Farm Fence",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 0.21,
      "h": 1.47
    },
    "options": {}
  },
  'bnd-f3-wire-farm-fence': {
    "id": "bnd-f3-wire-farm-fence",
    "name": "Premium: Highend: Wire Farm Fence",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 0.21,
      "h": 1.47
    },
    "options": {}
  },
  'bnd-f4-wire-farm-fence': {
    "id": "bnd-f4-wire-farm-fence",
    "name": "Elite: Highend: Wire Farm Fence",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 0.21,
      "h": 1.47
    },
    "options": {}
  },
  'bnd-f1-wrought-iron-estate-gate': {
    "id": "bnd-f1-wrought-iron-estate-gate",
    "name": "Basic: Highend: Wrought Iron Estate Gate",
    "category": "boundary",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 0.63,
      "h": 2.94
    },
    "options": {}
  },
  'bnd-f2-wrought-iron-estate-gate': {
    "id": "bnd-f2-wrought-iron-estate-gate",
    "name": "Standard: Highend: Wrought Iron Estate Gate",
    "category": "boundary",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 0.63,
      "h": 2.94
    },
    "options": {}
  },
  'bnd-f3-wrought-iron-estate-gate': {
    "id": "bnd-f3-wrought-iron-estate-gate",
    "name": "Premium: Highend: Wrought Iron Estate Gate",
    "category": "boundary",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 0.63,
      "h": 2.94
    },
    "options": {}
  },
  'bnd-f4-wrought-iron-estate-gate': {
    "id": "bnd-f4-wrought-iron-estate-gate",
    "name": "Elite: Highend: Wrought Iron Estate Gate",
    "category": "boundary",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 0.63,
      "h": 2.94
    },
    "options": {}
  },
  'brg-f1-bascule-drawbridge': {
    "id": "brg-f1-bascule-drawbridge",
    "name": "Basic: Highend: Bascule Drawbridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 57.75,
      "h": 23.1
    },
    "options": {}
  },
  'brg-f2-bascule-drawbridge': {
    "id": "brg-f2-bascule-drawbridge",
    "name": "Standard: Highend: Bascule Drawbridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 57.75,
      "h": 23.1
    },
    "options": {}
  },
  'brg-f3-bascule-drawbridge': {
    "id": "brg-f3-bascule-drawbridge",
    "name": "Premium: Highend: Bascule Drawbridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 57.75,
      "h": 23.1
    },
    "options": {}
  },
  'brg-f4-bascule-drawbridge': {
    "id": "brg-f4-bascule-drawbridge",
    "name": "Elite: Highend: Bascule Drawbridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 57.75,
      "h": 23.1
    },
    "options": {}
  },
  'brg-f1-bowstring-arch': {
    "id": "brg-f1-bowstring-arch",
    "name": "Basic: Highend: Bowstring Arch",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 21
    },
    "options": {}
  },
  'brg-f2-bowstring-arch': {
    "id": "brg-f2-bowstring-arch",
    "name": "Standard: Highend: Bowstring Arch",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 21
    },
    "options": {}
  },
  'brg-f3-bowstring-arch': {
    "id": "brg-f3-bowstring-arch",
    "name": "Premium: Highend: Bowstring Arch",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 21
    },
    "options": {}
  },
  'brg-f4-bowstring-arch': {
    "id": "brg-f4-bowstring-arch",
    "name": "Elite: Highend: Bowstring Arch",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 21
    },
    "options": {}
  },
  'brg-f1-canal-aqueduct-crossing': {
    "id": "brg-f1-canal-aqueduct-crossing",
    "name": "Basic: Highend: Canal Aqueduct Crossing",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 47.25,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f2-canal-aqueduct-crossing': {
    "id": "brg-f2-canal-aqueduct-crossing",
    "name": "Standard: Highend: Canal Aqueduct Crossing",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 47.25,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f3-canal-aqueduct-crossing': {
    "id": "brg-f3-canal-aqueduct-crossing",
    "name": "Premium: Highend: Canal Aqueduct Crossing",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 47.25,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f4-canal-aqueduct-crossing': {
    "id": "brg-f4-canal-aqueduct-crossing",
    "name": "Elite: Highend: Canal Aqueduct Crossing",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 47.25,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f1-cantilevered-lookout-span': {
    "id": "brg-f1-cantilevered-lookout-span",
    "name": "Basic: Highend: Cantilevered Lookout Span",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 47.25,
      "h": 16.8
    },
    "options": {}
  },
  'brg-f2-cantilevered-lookout-span': {
    "id": "brg-f2-cantilevered-lookout-span",
    "name": "Standard: Highend: Cantilevered Lookout Span",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 47.25,
      "h": 16.8
    },
    "options": {}
  },
  'brg-f3-cantilevered-lookout-span': {
    "id": "brg-f3-cantilevered-lookout-span",
    "name": "Premium: Highend: Cantilevered Lookout Span",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 47.25,
      "h": 16.8
    },
    "options": {}
  },
  'brg-f4-cantilevered-lookout-span': {
    "id": "brg-f4-cantilevered-lookout-span",
    "name": "Elite: Highend: Cantilevered Lookout Span",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 47.25,
      "h": 16.8
    },
    "options": {}
  },
  'brg-f1-concrete-girder-viaduct': {
    "id": "brg-f1-concrete-girder-viaduct",
    "name": "Basic: Highend: Concrete Girder Viaduct",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f2-concrete-girder-viaduct': {
    "id": "brg-f2-concrete-girder-viaduct",
    "name": "Standard: Highend: Concrete Girder Viaduct",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f3-concrete-girder-viaduct': {
    "id": "brg-f3-concrete-girder-viaduct",
    "name": "Premium: Highend: Concrete Girder Viaduct",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f4-concrete-girder-viaduct': {
    "id": "brg-f4-concrete-girder-viaduct",
    "name": "Elite: Highend: Concrete Girder Viaduct",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f1-continuous-beam-highway': {
    "id": "brg-f1-continuous-beam-highway",
    "name": "Basic: Highend: Continuous Beam Highway",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 57.75,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f2-continuous-beam-highway': {
    "id": "brg-f2-continuous-beam-highway",
    "name": "Standard: Highend: Continuous Beam Highway",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 57.75,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f3-continuous-beam-highway': {
    "id": "brg-f3-continuous-beam-highway",
    "name": "Premium: Highend: Continuous Beam Highway",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 57.75,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f4-continuous-beam-highway': {
    "id": "brg-f4-continuous-beam-highway",
    "name": "Elite: Highend: Continuous Beam Highway",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 57.75,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f1-covered-timber-bridge': {
    "id": "brg-f1-covered-timber-bridge",
    "name": "Basic: Highend: Covered Timber Bridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 47.25,
      "h": 10.5
    },
    "options": {}
  },
  'brg-f2-covered-timber-bridge': {
    "id": "brg-f2-covered-timber-bridge",
    "name": "Standard: Highend: Covered Timber Bridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 47.25,
      "h": 10.5
    },
    "options": {}
  },
  'brg-f3-covered-timber-bridge': {
    "id": "brg-f3-covered-timber-bridge",
    "name": "Premium: Highend: Covered Timber Bridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 47.25,
      "h": 10.5
    },
    "options": {}
  },
  'brg-f4-covered-timber-bridge': {
    "id": "brg-f4-covered-timber-bridge",
    "name": "Elite: Highend: Covered Timber Bridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 47.25,
      "h": 10.5
    },
    "options": {}
  },
  'brg-f1-culvert-channel-bridge': {
    "id": "brg-f1-culvert-channel-bridge",
    "name": "Basic: Highend: Culvert Channel Bridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'brg-f2-culvert-channel-bridge': {
    "id": "brg-f2-culvert-channel-bridge",
    "name": "Standard: Highend: Culvert Channel Bridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'brg-f3-culvert-channel-bridge': {
    "id": "brg-f3-culvert-channel-bridge",
    "name": "Premium: Highend: Culvert Channel Bridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'brg-f4-culvert-channel-bridge': {
    "id": "brg-f4-culvert-channel-bridge",
    "name": "Elite: Highend: Culvert Channel Bridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'brg-f1-curved-box-girder': {
    "id": "brg-f1-curved-box-girder",
    "name": "Basic: Highend: Curved Box Girder",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 68.25,
      "h": 15.75
    },
    "options": {}
  },
  'brg-f2-curved-box-girder': {
    "id": "brg-f2-curved-box-girder",
    "name": "Standard: Highend: Curved Box Girder",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 68.25,
      "h": 15.75
    },
    "options": {}
  },
  'brg-f3-curved-box-girder': {
    "id": "brg-f3-curved-box-girder",
    "name": "Premium: Highend: Curved Box Girder",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 68.25,
      "h": 15.75
    },
    "options": {}
  },
  'brg-f4-curved-box-girder': {
    "id": "brg-f4-curved-box-girder",
    "name": "Elite: Highend: Curved Box Girder",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 68.25,
      "h": 15.75
    },
    "options": {}
  },
  'brg-f1-double-deck-truss': {
    "id": "brg-f1-double-deck-truss",
    "name": "Basic: Highend: Double Deck Truss",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 84,
      "h": 29.4
    },
    "options": {}
  },
  'brg-f2-double-deck-truss': {
    "id": "brg-f2-double-deck-truss",
    "name": "Standard: Highend: Double Deck Truss",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 84,
      "h": 29.4
    },
    "options": {}
  },
  'brg-f3-double-deck-truss': {
    "id": "brg-f3-double-deck-truss",
    "name": "Premium: Highend: Double Deck Truss",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 84,
      "h": 29.4
    },
    "options": {}
  },
  'brg-f4-double-deck-truss': {
    "id": "brg-f4-double-deck-truss",
    "name": "Elite: Highend: Double Deck Truss",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 84,
      "h": 29.4
    },
    "options": {}
  },
  'brg-f1-fan-cable-stayed': {
    "id": "brg-f1-fan-cable-stayed",
    "name": "Basic: Highend: Fan Cable Stayed",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 35.7
    },
    "options": {}
  },
  'brg-f2-fan-cable-stayed': {
    "id": "brg-f2-fan-cable-stayed",
    "name": "Standard: Highend: Fan Cable Stayed",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 35.7
    },
    "options": {}
  },
  'brg-f3-fan-cable-stayed': {
    "id": "brg-f3-fan-cable-stayed",
    "name": "Premium: Highend: Fan Cable Stayed",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 35.7
    },
    "options": {}
  },
  'brg-f4-fan-cable-stayed': {
    "id": "brg-f4-fan-cable-stayed",
    "name": "Elite: Highend: Fan Cable Stayed",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 35.7
    },
    "options": {}
  },
  'brg-f1-harp-cable-stayed': {
    "id": "brg-f1-harp-cable-stayed",
    "name": "Basic: Highend: Harp Cable Stayed",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 94.5,
      "h": 47.25
    },
    "options": {}
  },
  'brg-f2-harp-cable-stayed': {
    "id": "brg-f2-harp-cable-stayed",
    "name": "Standard: Highend: Harp Cable Stayed",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 94.5,
      "h": 47.25
    },
    "options": {}
  },
  'brg-f3-harp-cable-stayed': {
    "id": "brg-f3-harp-cable-stayed",
    "name": "Premium: Highend: Harp Cable Stayed",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 94.5,
      "h": 47.25
    },
    "options": {}
  },
  'brg-f4-harp-cable-stayed': {
    "id": "brg-f4-harp-cable-stayed",
    "name": "Elite: Highend: Harp Cable Stayed",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 94.5,
      "h": 47.25
    },
    "options": {}
  },
  'brg-f1-highway-overpass-span': {
    "id": "brg-f1-highway-overpass-span",
    "name": "Basic: Highend: Highway Overpass Span",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 42,
      "h": 10.5
    },
    "options": {}
  },
  'brg-f2-highway-overpass-span': {
    "id": "brg-f2-highway-overpass-span",
    "name": "Standard: Highend: Highway Overpass Span",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 42,
      "h": 10.5
    },
    "options": {}
  },
  'brg-f3-highway-overpass-span': {
    "id": "brg-f3-highway-overpass-span",
    "name": "Premium: Highend: Highway Overpass Span",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 42,
      "h": 10.5
    },
    "options": {}
  },
  'brg-f4-highway-overpass-span': {
    "id": "brg-f4-highway-overpass-span",
    "name": "Elite: Highend: Highway Overpass Span",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 42,
      "h": 10.5
    },
    "options": {}
  },
  'brg-f1-masonry-arch-culvert': {
    "id": "brg-f1-masonry-arch-culvert",
    "name": "Basic: Highend: Masonry Arch Culvert",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 31.5,
      "h": 8.4
    },
    "options": {}
  },
  'brg-f2-masonry-arch-culvert': {
    "id": "brg-f2-masonry-arch-culvert",
    "name": "Standard: Highend: Masonry Arch Culvert",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 31.5,
      "h": 8.4
    },
    "options": {}
  },
  'brg-f3-masonry-arch-culvert': {
    "id": "brg-f3-masonry-arch-culvert",
    "name": "Premium: Highend: Masonry Arch Culvert",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 31.5,
      "h": 8.4
    },
    "options": {}
  },
  'brg-f4-masonry-arch-culvert': {
    "id": "brg-f4-masonry-arch-culvert",
    "name": "Elite: Highend: Masonry Arch Culvert",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 31.5,
      "h": 8.4
    },
    "options": {}
  },
  'brg-f1-monumental-deck-truss': {
    "id": "brg-f1-monumental-deck-truss",
    "name": "Basic: Highend: Monumental Deck Truss",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 89.25,
      "h": 27.3
    },
    "options": {}
  },
  'brg-f2-monumental-deck-truss': {
    "id": "brg-f2-monumental-deck-truss",
    "name": "Standard: Highend: Monumental Deck Truss",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 89.25,
      "h": 27.3
    },
    "options": {}
  },
  'brg-f3-monumental-deck-truss': {
    "id": "brg-f3-monumental-deck-truss",
    "name": "Premium: Highend: Monumental Deck Truss",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 89.25,
      "h": 27.3
    },
    "options": {}
  },
  'brg-f4-monumental-deck-truss': {
    "id": "brg-f4-monumental-deck-truss",
    "name": "Elite: Highend: Monumental Deck Truss",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 89.25,
      "h": 27.3
    },
    "options": {}
  },
  'brg-f1-multi-span-concrete': {
    "id": "brg-f1-multi-span-concrete",
    "name": "Basic: Highend: Multi Span Concrete",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 84,
      "h": 16.8
    },
    "options": {}
  },
  'brg-f2-multi-span-concrete': {
    "id": "brg-f2-multi-span-concrete",
    "name": "Standard: Highend: Multi Span Concrete",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 84,
      "h": 16.8
    },
    "options": {}
  },
  'brg-f3-multi-span-concrete': {
    "id": "brg-f3-multi-span-concrete",
    "name": "Premium: Highend: Multi Span Concrete",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 84,
      "h": 16.8
    },
    "options": {}
  },
  'brg-f4-multi-span-concrete': {
    "id": "brg-f4-multi-span-concrete",
    "name": "Elite: Highend: Multi Span Concrete",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 84,
      "h": 16.8
    },
    "options": {}
  },
  'brg-f1-pedestrian-flat-bridge': {
    "id": "brg-f1-pedestrian-flat-bridge",
    "name": "Basic: Highend: Pedestrian Flat Bridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 26.25,
      "h": 5.25
    },
    "options": {}
  },
  'brg-f2-pedestrian-flat-bridge': {
    "id": "brg-f2-pedestrian-flat-bridge",
    "name": "Standard: Highend: Pedestrian Flat Bridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 26.25,
      "h": 5.25
    },
    "options": {}
  },
  'brg-f3-pedestrian-flat-bridge': {
    "id": "brg-f3-pedestrian-flat-bridge",
    "name": "Premium: Highend: Pedestrian Flat Bridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 26.25,
      "h": 5.25
    },
    "options": {}
  },
  'brg-f4-pedestrian-flat-bridge': {
    "id": "brg-f4-pedestrian-flat-bridge",
    "name": "Elite: Highend: Pedestrian Flat Bridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 26.25,
      "h": 5.25
    },
    "options": {}
  },
  'brg-f1-pedestrian-spiral-ramp': {
    "id": "brg-f1-pedestrian-spiral-ramp",
    "name": "Basic: Highend: Pedestrian Spiral Ramp",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 36.75,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f2-pedestrian-spiral-ramp': {
    "id": "brg-f2-pedestrian-spiral-ramp",
    "name": "Standard: Highend: Pedestrian Spiral Ramp",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 36.75,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f3-pedestrian-spiral-ramp': {
    "id": "brg-f3-pedestrian-spiral-ramp",
    "name": "Premium: Highend: Pedestrian Spiral Ramp",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 36.75,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f4-pedestrian-spiral-ramp': {
    "id": "brg-f4-pedestrian-spiral-ramp",
    "name": "Elite: Highend: Pedestrian Spiral Ramp",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 36.75,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f1-pontoons-floating-bridge': {
    "id": "brg-f1-pontoons-floating-bridge",
    "name": "Basic: Highend: Pontoons Floating Bridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 3.15
    },
    "options": {}
  },
  'brg-f2-pontoons-floating-bridge': {
    "id": "brg-f2-pontoons-floating-bridge",
    "name": "Standard: Highend: Pontoons Floating Bridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 3.15
    },
    "options": {}
  },
  'brg-f3-pontoons-floating-bridge': {
    "id": "brg-f3-pontoons-floating-bridge",
    "name": "Premium: Highend: Pontoons Floating Bridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 3.15
    },
    "options": {}
  },
  'brg-f4-pontoons-floating-bridge': {
    "id": "brg-f4-pontoons-floating-bridge",
    "name": "Elite: Highend: Pontoons Floating Bridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 3.15
    },
    "options": {}
  },
  'brg-f1-pony-truss-river': {
    "id": "brg-f1-pony-truss-river",
    "name": "Basic: Highend: Pony Truss River",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f2-pony-truss-river': {
    "id": "brg-f2-pony-truss-river",
    "name": "Standard: Highend: Pony Truss River",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f3-pony-truss-river': {
    "id": "brg-f3-pony-truss-river",
    "name": "Premium: Highend: Pony Truss River",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f4-pony-truss-river': {
    "id": "brg-f4-pony-truss-river",
    "name": "Elite: Highend: Pony Truss River",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f1-rib-arch-canyon': {
    "id": "brg-f1-rib-arch-canyon",
    "name": "Basic: Highend: Rib Arch Canyon",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 84,
      "h": 33.6
    },
    "options": {}
  },
  'brg-f2-rib-arch-canyon': {
    "id": "brg-f2-rib-arch-canyon",
    "name": "Standard: Highend: Rib Arch Canyon",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 84,
      "h": 33.6
    },
    "options": {}
  },
  'brg-f3-rib-arch-canyon': {
    "id": "brg-f3-rib-arch-canyon",
    "name": "Premium: Highend: Rib Arch Canyon",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 84,
      "h": 33.6
    },
    "options": {}
  },
  'brg-f4-rib-arch-canyon': {
    "id": "brg-f4-rib-arch-canyon",
    "name": "Elite: Highend: Rib Arch Canyon",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 84,
      "h": 33.6
    },
    "options": {}
  },
  'brg-f1-rustic-log-bridge': {
    "id": "brg-f1-rustic-log-bridge",
    "name": "Basic: Highend: Rustic Log Bridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 18.9,
      "h": 4.2
    },
    "options": {}
  },
  'brg-f2-rustic-log-bridge': {
    "id": "brg-f2-rustic-log-bridge",
    "name": "Standard: Highend: Rustic Log Bridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 18.9,
      "h": 4.2
    },
    "options": {}
  },
  'brg-f3-rustic-log-bridge': {
    "id": "brg-f3-rustic-log-bridge",
    "name": "Premium: Highend: Rustic Log Bridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 18.9,
      "h": 4.2
    },
    "options": {}
  },
  'brg-f4-rustic-log-bridge': {
    "id": "brg-f4-rustic-log-bridge",
    "name": "Elite: Highend: Rustic Log Bridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 18.9,
      "h": 4.2
    },
    "options": {}
  },
  'brg-f1-signature-pedestrian-skyway': {
    "id": "brg-f1-signature-pedestrian-skyway",
    "name": "Basic: Highend: Signature Pedestrian Skyway",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f2-signature-pedestrian-skyway': {
    "id": "brg-f2-signature-pedestrian-skyway",
    "name": "Standard: Highend: Signature Pedestrian Skyway",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f3-signature-pedestrian-skyway': {
    "id": "brg-f3-signature-pedestrian-skyway",
    "name": "Premium: Highend: Signature Pedestrian Skyway",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f4-signature-pedestrian-skyway': {
    "id": "brg-f4-signature-pedestrian-skyway",
    "name": "Elite: Highend: Signature Pedestrian Skyway",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f1-single-girder-flyover': {
    "id": "brg-f1-single-girder-flyover",
    "name": "Basic: Highend: Single Girder Flyover",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 31.5,
      "h": 8.4
    },
    "options": {}
  },
  'brg-f2-single-girder-flyover': {
    "id": "brg-f2-single-girder-flyover",
    "name": "Standard: Highend: Single Girder Flyover",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 31.5,
      "h": 8.4
    },
    "options": {}
  },
  'brg-f3-single-girder-flyover': {
    "id": "brg-f3-single-girder-flyover",
    "name": "Premium: Highend: Single Girder Flyover",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 31.5,
      "h": 8.4
    },
    "options": {}
  },
  'brg-f4-single-girder-flyover': {
    "id": "brg-f4-single-girder-flyover",
    "name": "Elite: Highend: Single Girder Flyover",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 31.5,
      "h": 8.4
    },
    "options": {}
  },
  'brg-f1-single-pylon-sundial': {
    "id": "brg-f1-single-pylon-sundial",
    "name": "Basic: Highend: Single Pylon Sundial",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 73.5,
      "h": 42
    },
    "options": {}
  },
  'brg-f2-single-pylon-sundial': {
    "id": "brg-f2-single-pylon-sundial",
    "name": "Standard: Highend: Single Pylon Sundial",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 73.5,
      "h": 42
    },
    "options": {}
  },
  'brg-f3-single-pylon-sundial': {
    "id": "brg-f3-single-pylon-sundial",
    "name": "Premium: Highend: Single Pylon Sundial",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 73.5,
      "h": 42
    },
    "options": {}
  },
  'brg-f4-single-pylon-sundial': {
    "id": "brg-f4-single-pylon-sundial",
    "name": "Elite: Highend: Single Pylon Sundial",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 73.5,
      "h": 42
    },
    "options": {}
  },
  'brg-f1-skeletal-spine-overpass': {
    "id": "brg-f1-skeletal-spine-overpass",
    "name": "Basic: Highend: Skeletal Spine Overpass",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 29.4
    },
    "options": {}
  },
  'brg-f2-skeletal-spine-overpass': {
    "id": "brg-f2-skeletal-spine-overpass",
    "name": "Standard: Highend: Skeletal Spine Overpass",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 29.4
    },
    "options": {}
  },
  'brg-f3-skeletal-spine-overpass': {
    "id": "brg-f3-skeletal-spine-overpass",
    "name": "Premium: Highend: Skeletal Spine Overpass",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 29.4
    },
    "options": {}
  },
  'brg-f4-skeletal-spine-overpass': {
    "id": "brg-f4-skeletal-spine-overpass",
    "name": "Elite: Highend: Skeletal Spine Overpass",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 29.4
    },
    "options": {}
  },
  'brg-f1-steel-girder-span': {
    "id": "brg-f1-steel-girder-span",
    "name": "Basic: Highend: Steel Girder Span",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 36.75,
      "h": 8.93
    },
    "options": {}
  },
  'brg-f2-steel-girder-span': {
    "id": "brg-f2-steel-girder-span",
    "name": "Standard: Highend: Steel Girder Span",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 36.75,
      "h": 8.93
    },
    "options": {}
  },
  'brg-f3-steel-girder-span': {
    "id": "brg-f3-steel-girder-span",
    "name": "Premium: Highend: Steel Girder Span",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 36.75,
      "h": 8.93
    },
    "options": {}
  },
  'brg-f4-steel-girder-span': {
    "id": "brg-f4-steel-girder-span",
    "name": "Elite: Highend: Steel Girder Span",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 36.75,
      "h": 8.93
    },
    "options": {}
  },
  'brg-f1-stepped-canal-footbridge': {
    "id": "brg-f1-stepped-canal-footbridge",
    "name": "Basic: Highend: Stepped Canal Footbridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 21,
      "h": 6.83
    },
    "options": {}
  },
  'brg-f2-stepped-canal-footbridge': {
    "id": "brg-f2-stepped-canal-footbridge",
    "name": "Standard: Highend: Stepped Canal Footbridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 21,
      "h": 6.83
    },
    "options": {}
  },
  'brg-f3-stepped-canal-footbridge': {
    "id": "brg-f3-stepped-canal-footbridge",
    "name": "Premium: Highend: Stepped Canal Footbridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 21,
      "h": 6.83
    },
    "options": {}
  },
  'brg-f4-stepped-canal-footbridge': {
    "id": "brg-f4-stepped-canal-footbridge",
    "name": "Elite: Highend: Stepped Canal Footbridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 21,
      "h": 6.83
    },
    "options": {}
  },
  'brg-f1-stepping-stone-causeway': {
    "id": "brg-f1-stepping-stone-causeway",
    "name": "Basic: Highend: Stepping Stone Causeway",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 26.25,
      "h": 2.1
    },
    "options": {}
  },
  'brg-f2-stepping-stone-causeway': {
    "id": "brg-f2-stepping-stone-causeway",
    "name": "Standard: Highend: Stepping Stone Causeway",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 26.25,
      "h": 2.1
    },
    "options": {}
  },
  'brg-f3-stepping-stone-causeway': {
    "id": "brg-f3-stepping-stone-causeway",
    "name": "Premium: Highend: Stepping Stone Causeway",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 26.25,
      "h": 2.1
    },
    "options": {}
  },
  'brg-f4-stepping-stone-causeway': {
    "id": "brg-f4-stepping-stone-causeway",
    "name": "Elite: Highend: Stepping Stone Causeway",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 26.25,
      "h": 2.1
    },
    "options": {}
  },
  'brg-f1-stone-triple-arch': {
    "id": "brg-f1-stone-triple-arch",
    "name": "Basic: Highend: Stone Triple Arch",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 63,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f2-stone-triple-arch': {
    "id": "brg-f2-stone-triple-arch",
    "name": "Standard: Highend: Stone Triple Arch",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 63,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f3-stone-triple-arch': {
    "id": "brg-f3-stone-triple-arch",
    "name": "Premium: Highend: Stone Triple Arch",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 63,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f4-stone-triple-arch': {
    "id": "brg-f4-stone-triple-arch",
    "name": "Elite: Highend: Stone Triple Arch",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 63,
      "h": 14.7
    },
    "options": {}
  },
  'brg-f1-suspension-footbridge': {
    "id": "brg-f1-suspension-footbridge",
    "name": "Basic: Highend: Suspension Footbridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 52.5,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f2-suspension-footbridge': {
    "id": "brg-f2-suspension-footbridge",
    "name": "Standard: Highend: Suspension Footbridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 52.5,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f3-suspension-footbridge': {
    "id": "brg-f3-suspension-footbridge",
    "name": "Premium: Highend: Suspension Footbridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 52.5,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f4-suspension-footbridge': {
    "id": "brg-f4-suspension-footbridge",
    "name": "Elite: Highend: Suspension Footbridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 52.5,
      "h": 12.6
    },
    "options": {}
  },
  'brg-f1-suspension-twin-tower': {
    "id": "brg-f1-suspension-twin-tower",
    "name": "Basic: Highend: Suspension Twin Tower",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 27.3,
      "d": 115.5,
      "h": 54.6
    },
    "options": {}
  },
  'brg-f2-suspension-twin-tower': {
    "id": "brg-f2-suspension-twin-tower",
    "name": "Standard: Highend: Suspension Twin Tower",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 27.3,
      "d": 115.5,
      "h": 54.6
    },
    "options": {}
  },
  'brg-f3-suspension-twin-tower': {
    "id": "brg-f3-suspension-twin-tower",
    "name": "Premium: Highend: Suspension Twin Tower",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 27.3,
      "d": 115.5,
      "h": 54.6
    },
    "options": {}
  },
  'brg-f4-suspension-twin-tower': {
    "id": "brg-f4-suspension-twin-tower",
    "name": "Elite: Highend: Suspension Twin Tower",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 27.3,
      "d": 115.5,
      "h": 54.6
    },
    "options": {}
  },
  'brg-f1-through-arch-steel': {
    "id": "brg-f1-through-arch-steel",
    "name": "Basic: Highend: Through Arch Steel",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 25.2
    },
    "options": {}
  },
  'brg-f2-through-arch-steel': {
    "id": "brg-f2-through-arch-steel",
    "name": "Standard: Highend: Through Arch Steel",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 25.2
    },
    "options": {}
  },
  'brg-f3-through-arch-steel': {
    "id": "brg-f3-through-arch-steel",
    "name": "Premium: Highend: Through Arch Steel",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 25.2
    },
    "options": {}
  },
  'brg-f4-through-arch-steel': {
    "id": "brg-f4-through-arch-steel",
    "name": "Elite: Highend: Through Arch Steel",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 78.75,
      "h": 25.2
    },
    "options": {}
  },
  'brg-f1-tied-arch-waterway': {
    "id": "brg-f1-tied-arch-waterway",
    "name": "Basic: Highend: Tied Arch Waterway",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f2-tied-arch-waterway': {
    "id": "brg-f2-tied-arch-waterway",
    "name": "Standard: Highend: Tied Arch Waterway",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f3-tied-arch-waterway': {
    "id": "brg-f3-tied-arch-waterway",
    "name": "Premium: Highend: Tied Arch Waterway",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f4-tied-arch-waterway': {
    "id": "brg-f4-tied-arch-waterway",
    "name": "Elite: Highend: Tied Arch Waterway",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f1-tiered-aqueduct-viaduct': {
    "id": "brg-f1-tiered-aqueduct-viaduct",
    "name": "Basic: Highend: Tiered Aqueduct Viaduct",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 99.75,
      "h": 39.9
    },
    "options": {}
  },
  'brg-f2-tiered-aqueduct-viaduct': {
    "id": "brg-f2-tiered-aqueduct-viaduct",
    "name": "Standard: Highend: Tiered Aqueduct Viaduct",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 99.75,
      "h": 39.9
    },
    "options": {}
  },
  'brg-f3-tiered-aqueduct-viaduct': {
    "id": "brg-f3-tiered-aqueduct-viaduct",
    "name": "Premium: Highend: Tiered Aqueduct Viaduct",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 99.75,
      "h": 39.9
    },
    "options": {}
  },
  'brg-f4-tiered-aqueduct-viaduct': {
    "id": "brg-f4-tiered-aqueduct-viaduct",
    "name": "Elite: Highend: Tiered Aqueduct Viaduct",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 99.75,
      "h": 39.9
    },
    "options": {}
  },
  'brg-f1-timber-trestle-rail': {
    "id": "brg-f1-timber-trestle-rail",
    "name": "Basic: Highend: Timber Trestle Rail",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 68.25,
      "h": 21
    },
    "options": {}
  },
  'brg-f2-timber-trestle-rail': {
    "id": "brg-f2-timber-trestle-rail",
    "name": "Standard: Highend: Timber Trestle Rail",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 68.25,
      "h": 21
    },
    "options": {}
  },
  'brg-f3-timber-trestle-rail': {
    "id": "brg-f3-timber-trestle-rail",
    "name": "Premium: Highend: Timber Trestle Rail",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 68.25,
      "h": 21
    },
    "options": {}
  },
  'brg-f4-timber-trestle-rail': {
    "id": "brg-f4-timber-trestle-rail",
    "name": "Elite: Highend: Timber Trestle Rail",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 68.25,
      "h": 21
    },
    "options": {}
  },
  'brg-f1-twin-mast-viaduct': {
    "id": "brg-f1-twin-mast-viaduct",
    "name": "Basic: Highend: Twin Mast Viaduct",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 89.25,
      "h": 37.8
    },
    "options": {}
  },
  'brg-f2-twin-mast-viaduct': {
    "id": "brg-f2-twin-mast-viaduct",
    "name": "Standard: Highend: Twin Mast Viaduct",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 89.25,
      "h": 37.8
    },
    "options": {}
  },
  'brg-f3-twin-mast-viaduct': {
    "id": "brg-f3-twin-mast-viaduct",
    "name": "Premium: Highend: Twin Mast Viaduct",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 89.25,
      "h": 37.8
    },
    "options": {}
  },
  'brg-f4-twin-mast-viaduct': {
    "id": "brg-f4-twin-mast-viaduct",
    "name": "Elite: Highend: Twin Mast Viaduct",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 89.25,
      "h": 37.8
    },
    "options": {}
  },
  'brg-f1-warren-truss-rail': {
    "id": "brg-f1-warren-truss-rail",
    "name": "Basic: Highend: Warren Truss Rail",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 73.5,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f2-warren-truss-rail': {
    "id": "brg-f2-warren-truss-rail",
    "name": "Standard: Highend: Warren Truss Rail",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 73.5,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f3-warren-truss-rail': {
    "id": "brg-f3-warren-truss-rail",
    "name": "Premium: Highend: Warren Truss Rail",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 73.5,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f4-warren-truss-rail': {
    "id": "brg-f4-warren-truss-rail",
    "name": "Elite: Highend: Warren Truss Rail",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 73.5,
      "h": 18.9
    },
    "options": {}
  },
  'brg-f1-winged-swing-bridge': {
    "id": "brg-f1-winged-swing-bridge",
    "name": "Basic: Highend: Winged Swing Bridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 23.1
    },
    "options": {}
  },
  'brg-f2-winged-swing-bridge': {
    "id": "brg-f2-winged-swing-bridge",
    "name": "Standard: Highend: Winged Swing Bridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 23.1
    },
    "options": {}
  },
  'brg-f3-winged-swing-bridge': {
    "id": "brg-f3-winged-swing-bridge",
    "name": "Premium: Highend: Winged Swing Bridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 23.1
    },
    "options": {}
  },
  'brg-f4-winged-swing-bridge': {
    "id": "brg-f4-winged-swing-bridge",
    "name": "Elite: Highend: Winged Swing Bridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 23.1
    },
    "options": {}
  },
  'brg-f1-wooden-beam-bridge': {
    "id": "brg-f1-wooden-beam-bridge",
    "name": "Basic: Highend: Wooden Beam Bridge",
    "category": "bridges",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 31.5,
      "h": 6.3
    },
    "options": {}
  },
  'brg-f2-wooden-beam-bridge': {
    "id": "brg-f2-wooden-beam-bridge",
    "name": "Standard: Highend: Wooden Beam Bridge",
    "category": "bridges",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 31.5,
      "h": 6.3
    },
    "options": {}
  },
  'brg-f3-wooden-beam-bridge': {
    "id": "brg-f3-wooden-beam-bridge",
    "name": "Premium: Highend: Wooden Beam Bridge",
    "category": "bridges",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 31.5,
      "h": 6.3
    },
    "options": {}
  },
  'brg-f4-wooden-beam-bridge': {
    "id": "brg-f4-wooden-beam-bridge",
    "name": "Elite: Highend: Wooden Beam Bridge",
    "category": "bridges",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 31.5,
      "h": 6.3
    },
    "options": {}
  },
  'civic-f1-amphitheatre-shell': {
    "id": "civic-f1-amphitheatre-shell",
    "name": "Basic: Highend: Amphitheatre Shell",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 47.25,
      "d": 47.25,
      "h": 21
    },
    "options": {}
  },
  'civic-f2-amphitheatre-shell': {
    "id": "civic-f2-amphitheatre-shell",
    "name": "Standard: Highend: Amphitheatre Shell",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 47.25,
      "d": 47.25,
      "h": 21
    },
    "options": {}
  },
  'civic-f3-amphitheatre-shell': {
    "id": "civic-f3-amphitheatre-shell",
    "name": "Premium: Highend: Amphitheatre Shell",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 47.25,
      "d": 47.25,
      "h": 21
    },
    "options": {}
  },
  'civic-f4-amphitheatre-shell': {
    "id": "civic-f4-amphitheatre-shell",
    "name": "Elite: Highend: Amphitheatre Shell",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 47.25,
      "d": 47.25,
      "h": 21
    },
    "options": {}
  },
  'civic-f1-amusement-rollercoaster': {
    "id": "civic-f1-amusement-rollercoaster",
    "name": "Basic: Highend: Amusement Rollercoaster",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 68.25,
      "d": 68.25,
      "h": 42
    },
    "options": {}
  },
  'civic-f2-amusement-rollercoaster': {
    "id": "civic-f2-amusement-rollercoaster",
    "name": "Standard: Highend: Amusement Rollercoaster",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 68.25,
      "d": 68.25,
      "h": 42
    },
    "options": {}
  },
  'civic-f3-amusement-rollercoaster': {
    "id": "civic-f3-amusement-rollercoaster",
    "name": "Premium: Highend: Amusement Rollercoaster",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 68.25,
      "d": 68.25,
      "h": 42
    },
    "options": {}
  },
  'civic-f4-amusement-rollercoaster': {
    "id": "civic-f4-amusement-rollercoaster",
    "name": "Elite: Highend: Amusement Rollercoaster",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 68.25,
      "d": 68.25,
      "h": 42
    },
    "options": {}
  },
  'civic-f1-animal-shelter-facility': {
    "id": "civic-f1-animal-shelter-facility",
    "name": "Basic: Highend: Animal Shelter Facility",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 18.9,
      "h": 10.5
    },
    "options": {}
  },
  'civic-f2-animal-shelter-facility': {
    "id": "civic-f2-animal-shelter-facility",
    "name": "Standard: Highend: Animal Shelter Facility",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 18.9,
      "h": 10.5
    },
    "options": {}
  },
  'civic-f3-animal-shelter-facility': {
    "id": "civic-f3-animal-shelter-facility",
    "name": "Premium: Highend: Animal Shelter Facility",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 18.9,
      "h": 10.5
    },
    "options": {}
  },
  'civic-f4-animal-shelter-facility': {
    "id": "civic-f4-animal-shelter-facility",
    "name": "Elite: Highend: Animal Shelter Facility",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 18.9,
      "h": 10.5
    },
    "options": {}
  },
  'civic-f1-auditorium-hall': {
    "id": "civic-f1-auditorium-hall",
    "name": "Basic: Highend: Auditorium Hall",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 37.8,
      "d": 29.4,
      "h": 21
    },
    "options": {}
  },
  'civic-f2-auditorium-hall': {
    "id": "civic-f2-auditorium-hall",
    "name": "Standard: Highend: Auditorium Hall",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 37.8,
      "d": 29.4,
      "h": 21
    },
    "options": {}
  },
  'civic-f3-auditorium-hall': {
    "id": "civic-f3-auditorium-hall",
    "name": "Premium: Highend: Auditorium Hall",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 37.8,
      "d": 29.4,
      "h": 21
    },
    "options": {}
  },
  'civic-f4-auditorium-hall': {
    "id": "civic-f4-auditorium-hall",
    "name": "Elite: Highend: Auditorium Hall",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 37.8,
      "d": 29.4,
      "h": 21
    },
    "options": {}
  },
  'civic-f1-biome-botanical-domes': {
    "id": "civic-f1-biome-botanical-domes",
    "name": "Basic: Highend: Biome Botanical Domes",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 57.75,
      "d": 57.75,
      "h": 51.97
    },
    "options": {}
  },
  'civic-f2-biome-botanical-domes': {
    "id": "civic-f2-biome-botanical-domes",
    "name": "Standard: Highend: Biome Botanical Domes",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 57.75,
      "d": 57.75,
      "h": 51.97
    },
    "options": {}
  },
  'civic-f3-biome-botanical-domes': {
    "id": "civic-f3-biome-botanical-domes",
    "name": "Premium: Highend: Biome Botanical Domes",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 57.75,
      "d": 57.75,
      "h": 51.97
    },
    "options": {}
  },
  'civic-f4-biome-botanical-domes': {
    "id": "civic-f4-biome-botanical-domes",
    "name": "Elite: Highend: Biome Botanical Domes",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 57.75,
      "d": 57.75,
      "h": 51.97
    },
    "options": {}
  },
  'civic-f1-botanical-orangery': {
    "id": "civic-f1-botanical-orangery",
    "name": "Basic: Highend: Botanical Orangery",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 36.75,
      "d": 25.2,
      "h": 16.8
    },
    "options": {}
  },
  'civic-f2-botanical-orangery': {
    "id": "civic-f2-botanical-orangery",
    "name": "Standard: Highend: Botanical Orangery",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 36.75,
      "d": 25.2,
      "h": 16.8
    },
    "options": {}
  },
  'civic-f3-botanical-orangery': {
    "id": "civic-f3-botanical-orangery",
    "name": "Premium: Highend: Botanical Orangery",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 36.75,
      "d": 25.2,
      "h": 16.8
    },
    "options": {}
  },
  'civic-f4-botanical-orangery': {
    "id": "civic-f4-botanical-orangery",
    "name": "Elite: Highend: Botanical Orangery",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 36.75,
      "d": 25.2,
      "h": 16.8
    },
    "options": {}
  },
  'civic-f1-cathedral-spire': {
    "id": "civic-f1-cathedral-spire",
    "name": "Basic: Highend: Cathedral Spire",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 42,
      "d": 68.25,
      "h": 78.75
    },
    "options": {}
  },
  'civic-f2-cathedral-spire': {
    "id": "civic-f2-cathedral-spire",
    "name": "Standard: Highend: Cathedral Spire",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 42,
      "d": 68.25,
      "h": 78.75
    },
    "options": {}
  },
  'civic-f3-cathedral-spire': {
    "id": "civic-f3-cathedral-spire",
    "name": "Premium: Highend: Cathedral Spire",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 42,
      "d": 68.25,
      "h": 78.75
    },
    "options": {}
  },
  'civic-f4-cathedral-spire': {
    "id": "civic-f4-cathedral-spire",
    "name": "Elite: Highend: Cathedral Spire",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 42,
      "d": 68.25,
      "h": 78.75
    },
    "options": {}
  },
  'civic-f1-cemetery-chapel': {
    "id": "civic-f1-cemetery-chapel",
    "name": "Basic: Highend: Cemetery Chapel",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 16.8,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f2-cemetery-chapel': {
    "id": "civic-f2-cemetery-chapel",
    "name": "Standard: Highend: Cemetery Chapel",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 16.8,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f3-cemetery-chapel': {
    "id": "civic-f3-cemetery-chapel",
    "name": "Premium: Highend: Cemetery Chapel",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 16.8,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f4-cemetery-chapel': {
    "id": "civic-f4-cemetery-chapel",
    "name": "Elite: Highend: Cemetery Chapel",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 16.8,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f1-central-library-wave': {
    "id": "civic-f1-central-library-wave",
    "name": "Basic: Highend: Central Library Wave",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 50.4,
      "d": 42,
      "h": 31.5
    },
    "options": {}
  },
  'civic-f2-central-library-wave': {
    "id": "civic-f2-central-library-wave",
    "name": "Standard: Highend: Central Library Wave",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 50.4,
      "d": 42,
      "h": 31.5
    },
    "options": {}
  },
  'civic-f3-central-library-wave': {
    "id": "civic-f3-central-library-wave",
    "name": "Premium: Highend: Central Library Wave",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 50.4,
      "d": 42,
      "h": 31.5
    },
    "options": {}
  },
  'civic-f4-central-library-wave': {
    "id": "civic-f4-central-library-wave",
    "name": "Elite: Highend: Central Library Wave",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 50.4,
      "d": 42,
      "h": 31.5
    },
    "options": {}
  },
  'civic-f1-central-terminal-station': {
    "id": "civic-f1-central-terminal-station",
    "name": "Basic: Highend: Central Terminal Station",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 73.5,
      "d": 47.25,
      "h": 37.8
    },
    "options": {}
  },
  'civic-f2-central-terminal-station': {
    "id": "civic-f2-central-terminal-station",
    "name": "Standard: Highend: Central Terminal Station",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 73.5,
      "d": 47.25,
      "h": 37.8
    },
    "options": {}
  },
  'civic-f3-central-terminal-station': {
    "id": "civic-f3-central-terminal-station",
    "name": "Premium: Highend: Central Terminal Station",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 73.5,
      "d": 47.25,
      "h": 37.8
    },
    "options": {}
  },
  'civic-f4-central-terminal-station': {
    "id": "civic-f4-central-terminal-station",
    "name": "Elite: Highend: Central Terminal Station",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 73.5,
      "d": 47.25,
      "h": 37.8
    },
    "options": {}
  },
  'civic-f1-civic-monument-plaza': {
    "id": "civic-f1-civic-monument-plaza",
    "name": "Basic: Highend: Civic Monument Plaza",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f2-civic-monument-plaza': {
    "id": "civic-f2-civic-monument-plaza",
    "name": "Standard: Highend: Civic Monument Plaza",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f3-civic-monument-plaza': {
    "id": "civic-f3-civic-monument-plaza",
    "name": "Premium: Highend: Civic Monument Plaza",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f4-civic-monument-plaza': {
    "id": "civic-f4-civic-monument-plaza",
    "name": "Elite: Highend: Civic Monument Plaza",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f1-civic-tower-clock': {
    "id": "civic-f1-civic-tower-clock",
    "name": "Basic: Highend: Civic Tower Clock",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 57.75
    },
    "options": {}
  },
  'civic-f2-civic-tower-clock': {
    "id": "civic-f2-civic-tower-clock",
    "name": "Standard: Highend: Civic Tower Clock",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 57.75
    },
    "options": {}
  },
  'civic-f3-civic-tower-clock': {
    "id": "civic-f3-civic-tower-clock",
    "name": "Premium: Highend: Civic Tower Clock",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 57.75
    },
    "options": {}
  },
  'civic-f4-civic-tower-clock': {
    "id": "civic-f4-civic-tower-clock",
    "name": "Elite: Highend: Civic Tower Clock",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 57.75
    },
    "options": {}
  },
  'civic-f1-community-art-center': {
    "id": "civic-f1-community-art-center",
    "name": "Basic: Highend: Community Art Center",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 27.3,
      "d": 23.1,
      "h": 15.75
    },
    "options": {}
  },
  'civic-f2-community-art-center': {
    "id": "civic-f2-community-art-center",
    "name": "Standard: Highend: Community Art Center",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 27.3,
      "d": 23.1,
      "h": 15.75
    },
    "options": {}
  },
  'civic-f3-community-art-center': {
    "id": "civic-f3-community-art-center",
    "name": "Premium: Highend: Community Art Center",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 27.3,
      "d": 23.1,
      "h": 15.75
    },
    "options": {}
  },
  'civic-f4-community-art-center': {
    "id": "civic-f4-community-art-center",
    "name": "Elite: Highend: Community Art Center",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 27.3,
      "d": 23.1,
      "h": 15.75
    },
    "options": {}
  },
  'civic-f1-contemporary-art-wing': {
    "id": "civic-f1-contemporary-art-wing",
    "name": "Basic: Highend: Contemporary Art Wing",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 44.1,
      "d": 36.75,
      "h": 25.2
    },
    "options": {}
  },
  'civic-f2-contemporary-art-wing': {
    "id": "civic-f2-contemporary-art-wing",
    "name": "Standard: Highend: Contemporary Art Wing",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 44.1,
      "d": 36.75,
      "h": 25.2
    },
    "options": {}
  },
  'civic-f3-contemporary-art-wing': {
    "id": "civic-f3-contemporary-art-wing",
    "name": "Premium: Highend: Contemporary Art Wing",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 44.1,
      "d": 36.75,
      "h": 25.2
    },
    "options": {}
  },
  'civic-f4-contemporary-art-wing': {
    "id": "civic-f4-contemporary-art-wing",
    "name": "Elite: Highend: Contemporary Art Wing",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 44.1,
      "d": 36.75,
      "h": 25.2
    },
    "options": {}
  },
  'civic-f1-convention-expo-dome': {
    "id": "civic-f1-convention-expo-dome",
    "name": "Basic: Highend: Convention Expo Dome",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 78.75,
      "d": 78.75,
      "h": 70.88
    },
    "options": {}
  },
  'civic-f2-convention-expo-dome': {
    "id": "civic-f2-convention-expo-dome",
    "name": "Standard: Highend: Convention Expo Dome",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 78.75,
      "d": 78.75,
      "h": 70.88
    },
    "options": {}
  },
  'civic-f3-convention-expo-dome': {
    "id": "civic-f3-convention-expo-dome",
    "name": "Premium: Highend: Convention Expo Dome",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 78.75,
      "d": 78.75,
      "h": 70.88
    },
    "options": {}
  },
  'civic-f4-convention-expo-dome': {
    "id": "civic-f4-convention-expo-dome",
    "name": "Elite: Highend: Convention Expo Dome",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 78.75,
      "d": 78.75,
      "h": 70.88
    },
    "options": {}
  },
  'civic-f1-fire-headquarters': {
    "id": "civic-f1-fire-headquarters",
    "name": "Basic: Highend: Fire Headquarters",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 31.5,
      "d": 25.2,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f2-fire-headquarters': {
    "id": "civic-f2-fire-headquarters",
    "name": "Standard: Highend: Fire Headquarters",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 31.5,
      "d": 25.2,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f3-fire-headquarters': {
    "id": "civic-f3-fire-headquarters",
    "name": "Premium: Highend: Fire Headquarters",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 31.5,
      "d": 25.2,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f4-fire-headquarters': {
    "id": "civic-f4-fire-headquarters",
    "name": "Elite: Highend: Fire Headquarters",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 31.5,
      "d": 25.2,
      "h": 18.9
    },
    "options": {}
  },
  'civic-f1-harbor-pier-palace': {
    "id": "civic-f1-harbor-pier-palace",
    "name": "Basic: Highend: Harbor Pier Palace",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 57.75,
      "d": 31.5,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f2-harbor-pier-palace': {
    "id": "civic-f2-harbor-pier-palace",
    "name": "Standard: Highend: Harbor Pier Palace",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 57.75,
      "d": 31.5,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f3-harbor-pier-palace': {
    "id": "civic-f3-harbor-pier-palace",
    "name": "Premium: Highend: Harbor Pier Palace",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 57.75,
      "d": 31.5,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f4-harbor-pier-palace': {
    "id": "civic-f4-harbor-pier-palace",
    "name": "Elite: Highend: Harbor Pier Palace",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 57.75,
      "d": 31.5,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f1-hydro-transit-terminal': {
    "id": "civic-f1-hydro-transit-terminal",
    "name": "Basic: Highend: Hydro Transit Terminal",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 52.5,
      "d": 44.1,
      "h": 25.2
    },
    "options": {}
  },
  'civic-f2-hydro-transit-terminal': {
    "id": "civic-f2-hydro-transit-terminal",
    "name": "Standard: Highend: Hydro Transit Terminal",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 52.5,
      "d": 44.1,
      "h": 25.2
    },
    "options": {}
  },
  'civic-f3-hydro-transit-terminal': {
    "id": "civic-f3-hydro-transit-terminal",
    "name": "Premium: Highend: Hydro Transit Terminal",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 52.5,
      "d": 44.1,
      "h": 25.2
    },
    "options": {}
  },
  'civic-f4-hydro-transit-terminal': {
    "id": "civic-f4-hydro-transit-terminal",
    "name": "Elite: Highend: Hydro Transit Terminal",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 52.5,
      "d": 44.1,
      "h": 25.2
    },
    "options": {}
  },
  'civic-f1-marina-clubhouse': {
    "id": "civic-f1-marina-clubhouse",
    "name": "Basic: Highend: Marina Clubhouse",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 29.4,
      "d": 21,
      "h": 16.8
    },
    "options": {}
  },
  'civic-f2-marina-clubhouse': {
    "id": "civic-f2-marina-clubhouse",
    "name": "Standard: Highend: Marina Clubhouse",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 29.4,
      "d": 21,
      "h": 16.8
    },
    "options": {}
  },
  'civic-f3-marina-clubhouse': {
    "id": "civic-f3-marina-clubhouse",
    "name": "Premium: Highend: Marina Clubhouse",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 29.4,
      "d": 21,
      "h": 16.8
    },
    "options": {}
  },
  'civic-f4-marina-clubhouse': {
    "id": "civic-f4-marina-clubhouse",
    "name": "Elite: Highend: Marina Clubhouse",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 29.4,
      "d": 21,
      "h": 16.8
    },
    "options": {}
  },
  'civic-f1-municipal-courthouse': {
    "id": "civic-f1-municipal-courthouse",
    "name": "Basic: Highend: Municipal Courthouse",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 44.1,
      "d": 33.6,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f2-municipal-courthouse': {
    "id": "civic-f2-municipal-courthouse",
    "name": "Standard: Highend: Municipal Courthouse",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 44.1,
      "d": 33.6,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f3-municipal-courthouse': {
    "id": "civic-f3-municipal-courthouse",
    "name": "Premium: Highend: Municipal Courthouse",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 44.1,
      "d": 33.6,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f4-municipal-courthouse': {
    "id": "civic-f4-municipal-courthouse",
    "name": "Elite: Highend: Municipal Courthouse",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 44.1,
      "d": 33.6,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f1-national-museum-canyon': {
    "id": "civic-f1-national-museum-canyon",
    "name": "Basic: Highend: National Museum Canyon",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 57.75,
      "d": 52.5,
      "h": 33.6
    },
    "options": {}
  },
  'civic-f2-national-museum-canyon': {
    "id": "civic-f2-national-museum-canyon",
    "name": "Standard: Highend: National Museum Canyon",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 57.75,
      "d": 52.5,
      "h": 33.6
    },
    "options": {}
  },
  'civic-f3-national-museum-canyon': {
    "id": "civic-f3-national-museum-canyon",
    "name": "Premium: Highend: National Museum Canyon",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 57.75,
      "d": 52.5,
      "h": 33.6
    },
    "options": {}
  },
  'civic-f4-national-museum-canyon': {
    "id": "civic-f4-national-museum-canyon",
    "name": "Elite: Highend: National Museum Canyon",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 57.75,
      "d": 52.5,
      "h": 33.6
    },
    "options": {}
  },
  'civic-f1-observation-ferris-wheel': {
    "id": "civic-f1-observation-ferris-wheel",
    "name": "Basic: Highend: Observation Ferris Wheel",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 47.25,
      "d": 21,
      "h": 63
    },
    "options": {}
  },
  'civic-f2-observation-ferris-wheel': {
    "id": "civic-f2-observation-ferris-wheel",
    "name": "Standard: Highend: Observation Ferris Wheel",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 47.25,
      "d": 21,
      "h": 63
    },
    "options": {}
  },
  'civic-f3-observation-ferris-wheel': {
    "id": "civic-f3-observation-ferris-wheel",
    "name": "Premium: Highend: Observation Ferris Wheel",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 47.25,
      "d": 21,
      "h": 63
    },
    "options": {}
  },
  'civic-f4-observation-ferris-wheel': {
    "id": "civic-f4-observation-ferris-wheel",
    "name": "Elite: Highend: Observation Ferris Wheel",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 47.25,
      "d": 21,
      "h": 63
    },
    "options": {}
  },
  'civic-f1-observation-tower': {
    "id": "civic-f1-observation-tower",
    "name": "Basic: Highend: Observation Tower",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 50.4
    },
    "options": {}
  },
  'civic-f2-observation-tower': {
    "id": "civic-f2-observation-tower",
    "name": "Standard: Highend: Observation Tower",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 50.4
    },
    "options": {}
  },
  'civic-f3-observation-tower': {
    "id": "civic-f3-observation-tower",
    "name": "Premium: Highend: Observation Tower",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 50.4
    },
    "options": {}
  },
  'civic-f4-observation-tower': {
    "id": "civic-f4-observation-tower",
    "name": "Elite: Highend: Observation Tower",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 14.7,
      "h": 50.4
    },
    "options": {}
  },
  'civic-f1-olympic-aquatic-centre': {
    "id": "civic-f1-olympic-aquatic-centre",
    "name": "Basic: Highend: Olympic Aquatic Centre",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 63,
      "d": 47.25,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f2-olympic-aquatic-centre': {
    "id": "civic-f2-olympic-aquatic-centre",
    "name": "Standard: Highend: Olympic Aquatic Centre",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 63,
      "d": 47.25,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f3-olympic-aquatic-centre': {
    "id": "civic-f3-olympic-aquatic-centre",
    "name": "Premium: Highend: Olympic Aquatic Centre",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 63,
      "d": 47.25,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f4-olympic-aquatic-centre': {
    "id": "civic-f4-olympic-aquatic-centre",
    "name": "Elite: Highend: Olympic Aquatic Centre",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 63,
      "d": 47.25,
      "h": 27.3
    },
    "options": {}
  },
  'civic-f1-olympic-stadium-arena': {
    "id": "civic-f1-olympic-stadium-arena",
    "name": "Basic: Highend: Olympic Stadium Arena",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 99.75,
      "d": 84,
      "h": 44.1
    },
    "options": {}
  },
  'civic-f2-olympic-stadium-arena': {
    "id": "civic-f2-olympic-stadium-arena",
    "name": "Standard: Highend: Olympic Stadium Arena",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 99.75,
      "d": 84,
      "h": 44.1
    },
    "options": {}
  },
  'civic-f3-olympic-stadium-arena': {
    "id": "civic-f3-olympic-stadium-arena",
    "name": "Premium: Highend: Olympic Stadium Arena",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 99.75,
      "d": 84,
      "h": 44.1
    },
    "options": {}
  },
  'civic-f4-olympic-stadium-arena': {
    "id": "civic-f4-olympic-stadium-arena",
    "name": "Elite: Highend: Olympic Stadium Arena",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 99.75,
      "d": 84,
      "h": 44.1
    },
    "options": {}
  },
  'civic-f1-opera-symphony-hall': {
    "id": "civic-f1-opera-symphony-hall",
    "name": "Basic: Highend: Opera Symphony Hall",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 68.25,
      "d": 52.5,
      "h": 39.9
    },
    "options": {}
  },
  'civic-f2-opera-symphony-hall': {
    "id": "civic-f2-opera-symphony-hall",
    "name": "Standard: Highend: Opera Symphony Hall",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 68.25,
      "d": 52.5,
      "h": 39.9
    },
    "options": {}
  },
  'civic-f3-opera-symphony-hall': {
    "id": "civic-f3-opera-symphony-hall",
    "name": "Premium: Highend: Opera Symphony Hall",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 68.25,
      "d": 52.5,
      "h": 39.9
    },
    "options": {}
  },
  'civic-f4-opera-symphony-hall': {
    "id": "civic-f4-opera-symphony-hall",
    "name": "Elite: Highend: Opera Symphony Hall",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 68.25,
      "d": 52.5,
      "h": 39.9
    },
    "options": {}
  },
  'civic-f1-parliament-rotunda': {
    "id": "civic-f1-parliament-rotunda",
    "name": "Basic: Highend: Parliament Rotunda",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 57.75,
      "d": 57.75,
      "h": 51.97
    },
    "options": {}
  },
  'civic-f2-parliament-rotunda': {
    "id": "civic-f2-parliament-rotunda",
    "name": "Standard: Highend: Parliament Rotunda",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 57.75,
      "d": 57.75,
      "h": 51.97
    },
    "options": {}
  },
  'civic-f3-parliament-rotunda': {
    "id": "civic-f3-parliament-rotunda",
    "name": "Premium: Highend: Parliament Rotunda",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 57.75,
      "d": 57.75,
      "h": 51.97
    },
    "options": {}
  },
  'civic-f4-parliament-rotunda': {
    "id": "civic-f4-parliament-rotunda",
    "name": "Elite: Highend: Parliament Rotunda",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 57.75,
      "d": 57.75,
      "h": 51.97
    },
    "options": {}
  },
  'civic-f1-planetarium-dome': {
    "id": "civic-f1-planetarium-dome",
    "name": "Basic: Highend: Planetarium Dome",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 34.02
    },
    "options": {}
  },
  'civic-f2-planetarium-dome': {
    "id": "civic-f2-planetarium-dome",
    "name": "Standard: Highend: Planetarium Dome",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 34.02
    },
    "options": {}
  },
  'civic-f3-planetarium-dome': {
    "id": "civic-f3-planetarium-dome",
    "name": "Premium: Highend: Planetarium Dome",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 34.02
    },
    "options": {}
  },
  'civic-f4-planetarium-dome': {
    "id": "civic-f4-planetarium-dome",
    "name": "Elite: Highend: Planetarium Dome",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 34.02
    },
    "options": {}
  },
  'civic-f1-plaza-grand-fountain': {
    "id": "civic-f1-plaza-grand-fountain",
    "name": "Basic: Highend: Plaza Grand Fountain",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f2-plaza-grand-fountain': {
    "id": "civic-f2-plaza-grand-fountain",
    "name": "Standard: Highend: Plaza Grand Fountain",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f3-plaza-grand-fountain': {
    "id": "civic-f3-plaza-grand-fountain",
    "name": "Premium: Highend: Plaza Grand Fountain",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f4-plaza-grand-fountain': {
    "id": "civic-f4-plaza-grand-fountain",
    "name": "Elite: Highend: Plaza Grand Fountain",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f1-police-headquarters': {
    "id": "civic-f1-police-headquarters",
    "name": "Basic: Highend: Police Headquarters",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 33.6,
      "d": 27.3,
      "h": 23.1
    },
    "options": {}
  },
  'civic-f2-police-headquarters': {
    "id": "civic-f2-police-headquarters",
    "name": "Standard: Highend: Police Headquarters",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 33.6,
      "d": 27.3,
      "h": 23.1
    },
    "options": {}
  },
  'civic-f3-police-headquarters': {
    "id": "civic-f3-police-headquarters",
    "name": "Premium: Highend: Police Headquarters",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 33.6,
      "d": 27.3,
      "h": 23.1
    },
    "options": {}
  },
  'civic-f4-police-headquarters': {
    "id": "civic-f4-police-headquarters",
    "name": "Elite: Highend: Police Headquarters",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 33.6,
      "d": 27.3,
      "h": 23.1
    },
    "options": {}
  },
  'civic-f1-postal-headquarters': {
    "id": "civic-f1-postal-headquarters",
    "name": "Basic: Highend: Postal Headquarters",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 39.9,
      "d": 31.5,
      "h": 23.1
    },
    "options": {}
  },
  'civic-f2-postal-headquarters': {
    "id": "civic-f2-postal-headquarters",
    "name": "Standard: Highend: Postal Headquarters",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 39.9,
      "d": 31.5,
      "h": 23.1
    },
    "options": {}
  },
  'civic-f3-postal-headquarters': {
    "id": "civic-f3-postal-headquarters",
    "name": "Premium: Highend: Postal Headquarters",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 39.9,
      "d": 31.5,
      "h": 23.1
    },
    "options": {}
  },
  'civic-f4-postal-headquarters': {
    "id": "civic-f4-postal-headquarters",
    "name": "Elite: Highend: Postal Headquarters",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 39.9,
      "d": 31.5,
      "h": 23.1
    },
    "options": {}
  },
  'civic-f1-public-archives-rotunda': {
    "id": "civic-f1-public-archives-rotunda",
    "name": "Basic: Highend: Public Archives Rotunda",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 26.46
    },
    "options": {}
  },
  'civic-f2-public-archives-rotunda': {
    "id": "civic-f2-public-archives-rotunda",
    "name": "Standard: Highend: Public Archives Rotunda",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 26.46
    },
    "options": {}
  },
  'civic-f3-public-archives-rotunda': {
    "id": "civic-f3-public-archives-rotunda",
    "name": "Premium: Highend: Public Archives Rotunda",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 26.46
    },
    "options": {}
  },
  'civic-f4-public-archives-rotunda': {
    "id": "civic-f4-public-archives-rotunda",
    "name": "Elite: Highend: Public Archives Rotunda",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 26.46
    },
    "options": {}
  },
  'civic-f1-public-pool-complex': {
    "id": "civic-f1-public-pool-complex",
    "name": "Basic: Highend: Public Pool Complex",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 39.9,
      "d": 29.4,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f2-public-pool-complex': {
    "id": "civic-f2-public-pool-complex",
    "name": "Standard: Highend: Public Pool Complex",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 39.9,
      "d": 29.4,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f3-public-pool-complex': {
    "id": "civic-f3-public-pool-complex",
    "name": "Premium: Highend: Public Pool Complex",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 39.9,
      "d": 29.4,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f4-public-pool-complex': {
    "id": "civic-f4-public-pool-complex",
    "name": "Elite: Highend: Public Pool Complex",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 39.9,
      "d": 29.4,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f1-scout-camp-lodge': {
    "id": "civic-f1-scout-camp-lodge",
    "name": "Basic: Highend: Scout Camp Lodge",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 16.8,
      "h": 12.6
    },
    "options": {}
  },
  'civic-f2-scout-camp-lodge': {
    "id": "civic-f2-scout-camp-lodge",
    "name": "Standard: Highend: Scout Camp Lodge",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 16.8,
      "h": 12.6
    },
    "options": {}
  },
  'civic-f3-scout-camp-lodge': {
    "id": "civic-f3-scout-camp-lodge",
    "name": "Premium: Highend: Scout Camp Lodge",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 16.8,
      "h": 12.6
    },
    "options": {}
  },
  'civic-f4-scout-camp-lodge': {
    "id": "civic-f4-scout-camp-lodge",
    "name": "Elite: Highend: Scout Camp Lodge",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 16.8,
      "h": 12.6
    },
    "options": {}
  },
  'civic-f1-skatepark-bowl': {
    "id": "civic-f1-skatepark-bowl",
    "name": "Basic: Highend: Skatepark Bowl",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 31.5,
      "d": 26.25,
      "h": 6.3
    },
    "options": {}
  },
  'civic-f2-skatepark-bowl': {
    "id": "civic-f2-skatepark-bowl",
    "name": "Standard: Highend: Skatepark Bowl",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 31.5,
      "d": 26.25,
      "h": 6.3
    },
    "options": {}
  },
  'civic-f3-skatepark-bowl': {
    "id": "civic-f3-skatepark-bowl",
    "name": "Premium: Highend: Skatepark Bowl",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 31.5,
      "d": 26.25,
      "h": 6.3
    },
    "options": {}
  },
  'civic-f4-skatepark-bowl': {
    "id": "civic-f4-skatepark-bowl",
    "name": "Elite: Highend: Skatepark Bowl",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 31.5,
      "d": 26.25,
      "h": 6.3
    },
    "options": {}
  },
  'civic-f1-tennis-center-grandstand': {
    "id": "civic-f1-tennis-center-grandstand",
    "name": "Basic: Highend: Tennis Center Grandstand",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 36.75,
      "d": 29.4,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f2-tennis-center-grandstand': {
    "id": "civic-f2-tennis-center-grandstand",
    "name": "Standard: Highend: Tennis Center Grandstand",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 36.75,
      "d": 29.4,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f3-tennis-center-grandstand': {
    "id": "civic-f3-tennis-center-grandstand",
    "name": "Premium: Highend: Tennis Center Grandstand",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 36.75,
      "d": 29.4,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f4-tennis-center-grandstand': {
    "id": "civic-f4-tennis-center-grandstand",
    "name": "Elite: Highend: Tennis Center Grandstand",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 36.75,
      "d": 29.4,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f1-town-hall-classic': {
    "id": "civic-f1-town-hall-classic",
    "name": "Basic: Highend: Town Hall Classic",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 33.6,
      "d": 25.2,
      "h": 29.4
    },
    "options": {}
  },
  'civic-f2-town-hall-classic': {
    "id": "civic-f2-town-hall-classic",
    "name": "Standard: Highend: Town Hall Classic",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 33.6,
      "d": 25.2,
      "h": 29.4
    },
    "options": {}
  },
  'civic-f3-town-hall-classic': {
    "id": "civic-f3-town-hall-classic",
    "name": "Premium: Highend: Town Hall Classic",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 33.6,
      "d": 25.2,
      "h": 29.4
    },
    "options": {}
  },
  'civic-f4-town-hall-classic': {
    "id": "civic-f4-town-hall-classic",
    "name": "Elite: Highend: Town Hall Classic",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 33.6,
      "d": 25.2,
      "h": 29.4
    },
    "options": {}
  },
  'civic-f1-triumphal-arch': {
    "id": "civic-f1-triumphal-arch",
    "name": "Basic: Highend: Triumphal Arch",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 33.6,
      "d": 16.8,
      "h": 31.5
    },
    "options": {}
  },
  'civic-f2-triumphal-arch': {
    "id": "civic-f2-triumphal-arch",
    "name": "Standard: Highend: Triumphal Arch",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 33.6,
      "d": 16.8,
      "h": 31.5
    },
    "options": {}
  },
  'civic-f3-triumphal-arch': {
    "id": "civic-f3-triumphal-arch",
    "name": "Premium: Highend: Triumphal Arch",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 33.6,
      "d": 16.8,
      "h": 31.5
    },
    "options": {}
  },
  'civic-f4-triumphal-arch': {
    "id": "civic-f4-triumphal-arch",
    "name": "Elite: Highend: Triumphal Arch",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 33.6,
      "d": 16.8,
      "h": 31.5
    },
    "options": {}
  },
  'civic-f1-velodrome-arena': {
    "id": "civic-f1-velodrome-arena",
    "name": "Basic: Highend: Velodrome Arena",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 57.75,
      "d": 42,
      "h": 37.8
    },
    "options": {}
  },
  'civic-f2-velodrome-arena': {
    "id": "civic-f2-velodrome-arena",
    "name": "Standard: Highend: Velodrome Arena",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 57.75,
      "d": 42,
      "h": 37.8
    },
    "options": {}
  },
  'civic-f3-velodrome-arena': {
    "id": "civic-f3-velodrome-arena",
    "name": "Premium: Highend: Velodrome Arena",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 57.75,
      "d": 42,
      "h": 37.8
    },
    "options": {}
  },
  'civic-f4-velodrome-arena': {
    "id": "civic-f4-velodrome-arena",
    "name": "Elite: Highend: Velodrome Arena",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 57.75,
      "d": 42,
      "h": 37.8
    },
    "options": {}
  },
  'civic-f1-youth-recreation-center': {
    "id": "civic-f1-youth-recreation-center",
    "name": "Basic: Highend: Youth Recreation Center",
    "category": "civic",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 27.3,
      "d": 21,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f2-youth-recreation-center': {
    "id": "civic-f2-youth-recreation-center",
    "name": "Standard: Highend: Youth Recreation Center",
    "category": "civic",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 27.3,
      "d": 21,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f3-youth-recreation-center': {
    "id": "civic-f3-youth-recreation-center",
    "name": "Premium: Highend: Youth Recreation Center",
    "category": "civic",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 27.3,
      "d": 21,
      "h": 14.7
    },
    "options": {}
  },
  'civic-f4-youth-recreation-center': {
    "id": "civic-f4-youth-recreation-center",
    "name": "Elite: Highend: Youth Recreation Center",
    "category": "civic",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 27.3,
      "d": 21,
      "h": 14.7
    },
    "options": {}
  },
  'fur-f1-ash-receptacle': {
    "id": "fur-f1-ash-receptacle",
    "name": "Basic: Highend: Ash Receptacle",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.42,
      "d": 0.42,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f2-ash-receptacle': {
    "id": "fur-f2-ash-receptacle",
    "name": "Standard: Highend: Ash Receptacle",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.42,
      "d": 0.42,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f3-ash-receptacle': {
    "id": "fur-f3-ash-receptacle",
    "name": "Premium: Highend: Ash Receptacle",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.42,
      "d": 0.42,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f4-ash-receptacle': {
    "id": "fur-f4-ash-receptacle",
    "name": "Elite: Highend: Ash Receptacle",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.42,
      "d": 0.42,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f1-bike-rack-shelter': {
    "id": "fur-f1-bike-rack-shelter",
    "name": "Basic: Highend: Bike Rack Shelter",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.68,
      "d": 2.31,
      "h": 2.52
    },
    "options": {}
  },
  'fur-f2-bike-rack-shelter': {
    "id": "fur-f2-bike-rack-shelter",
    "name": "Standard: Highend: Bike Rack Shelter",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.68,
      "d": 2.31,
      "h": 2.52
    },
    "options": {}
  },
  'fur-f3-bike-rack-shelter': {
    "id": "fur-f3-bike-rack-shelter",
    "name": "Premium: Highend: Bike Rack Shelter",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.68,
      "d": 2.31,
      "h": 2.52
    },
    "options": {}
  },
  'fur-f4-bike-rack-shelter': {
    "id": "fur-f4-bike-rack-shelter",
    "name": "Elite: Highend: Bike Rack Shelter",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.68,
      "d": 2.31,
      "h": 2.52
    },
    "options": {}
  },
  'fur-f1-bike-repair-station': {
    "id": "fur-f1-bike-repair-station",
    "name": "Basic: Highend: Bike Repair Station",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.26,
      "d": 0.63,
      "h": 1.68
    },
    "options": {}
  },
  'fur-f2-bike-repair-station': {
    "id": "fur-f2-bike-repair-station",
    "name": "Standard: Highend: Bike Repair Station",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.26,
      "d": 0.63,
      "h": 1.68
    },
    "options": {}
  },
  'fur-f3-bike-repair-station': {
    "id": "fur-f3-bike-repair-station",
    "name": "Premium: Highend: Bike Repair Station",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.26,
      "d": 0.63,
      "h": 1.68
    },
    "options": {}
  },
  'fur-f4-bike-repair-station': {
    "id": "fur-f4-bike-repair-station",
    "name": "Elite: Highend: Bike Repair Station",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.26,
      "d": 0.63,
      "h": 1.68
    },
    "options": {}
  },
  'fur-f1-brass-street-signpost': {
    "id": "fur-f1-brass-street-signpost",
    "name": "Basic: Highend: Brass Street Signpost",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.26,
      "d": 0.42,
      "h": 3.36
    },
    "options": {}
  },
  'fur-f2-brass-street-signpost': {
    "id": "fur-f2-brass-street-signpost",
    "name": "Standard: Highend: Brass Street Signpost",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.26,
      "d": 0.42,
      "h": 3.36
    },
    "options": {}
  },
  'fur-f3-brass-street-signpost': {
    "id": "fur-f3-brass-street-signpost",
    "name": "Premium: Highend: Brass Street Signpost",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.26,
      "d": 0.42,
      "h": 3.36
    },
    "options": {}
  },
  'fur-f4-brass-street-signpost': {
    "id": "fur-f4-brass-street-signpost",
    "name": "Elite: Highend: Brass Street Signpost",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.26,
      "d": 0.42,
      "h": 3.36
    },
    "options": {}
  },
  'fur-f1-bronze-statue-plinth': {
    "id": "fur-f1-bronze-statue-plinth",
    "name": "Basic: Highend: Bronze Statue Plinth",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.31,
      "d": 2.31,
      "h": 4.41
    },
    "options": {}
  },
  'fur-f2-bronze-statue-plinth': {
    "id": "fur-f2-bronze-statue-plinth",
    "name": "Standard: Highend: Bronze Statue Plinth",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.31,
      "d": 2.31,
      "h": 4.41
    },
    "options": {}
  },
  'fur-f3-bronze-statue-plinth': {
    "id": "fur-f3-bronze-statue-plinth",
    "name": "Premium: Highend: Bronze Statue Plinth",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.31,
      "d": 2.31,
      "h": 4.41
    },
    "options": {}
  },
  'fur-f4-bronze-statue-plinth': {
    "id": "fur-f4-bronze-statue-plinth",
    "name": "Elite: Highend: Bronze Statue Plinth",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.31,
      "d": 2.31,
      "h": 4.41
    },
    "options": {}
  },
  'fur-f1-bus-stop-shelter': {
    "id": "fur-f1-bus-stop-shelter",
    "name": "Basic: Highend: Bus Stop Shelter",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.99,
      "d": 1.89,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f2-bus-stop-shelter': {
    "id": "fur-f2-bus-stop-shelter",
    "name": "Standard: Highend: Bus Stop Shelter",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.99,
      "d": 1.89,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f3-bus-stop-shelter': {
    "id": "fur-f3-bus-stop-shelter",
    "name": "Premium: Highend: Bus Stop Shelter",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.99,
      "d": 1.89,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f4-bus-stop-shelter': {
    "id": "fur-f4-bus-stop-shelter",
    "name": "Elite: Highend: Bus Stop Shelter",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.99,
      "d": 1.89,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f1-cafe-patio-table-chairs': {
    "id": "fur-f1-cafe-patio-table-chairs",
    "name": "Basic: Highend: Cafe Patio Table Chairs",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.89,
      "d": 1.89,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f2-cafe-patio-table-chairs': {
    "id": "fur-f2-cafe-patio-table-chairs",
    "name": "Standard: Highend: Cafe Patio Table Chairs",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.89,
      "d": 1.89,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f3-cafe-patio-table-chairs': {
    "id": "fur-f3-cafe-patio-table-chairs",
    "name": "Premium: Highend: Cafe Patio Table Chairs",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.89,
      "d": 1.89,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f4-cafe-patio-table-chairs': {
    "id": "fur-f4-cafe-patio-table-chairs",
    "name": "Elite: Highend: Cafe Patio Table Chairs",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.89,
      "d": 1.89,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f1-chess-table-stools': {
    "id": "fur-f1-chess-table-stools",
    "name": "Basic: Highend: Chess Table Stools",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.89,
      "d": 1.89,
      "h": 0.84
    },
    "options": {}
  },
  'fur-f2-chess-table-stools': {
    "id": "fur-f2-chess-table-stools",
    "name": "Standard: Highend: Chess Table Stools",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.89,
      "d": 1.89,
      "h": 0.84
    },
    "options": {}
  },
  'fur-f3-chess-table-stools': {
    "id": "fur-f3-chess-table-stools",
    "name": "Premium: Highend: Chess Table Stools",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.89,
      "d": 1.89,
      "h": 0.84
    },
    "options": {}
  },
  'fur-f4-chess-table-stools': {
    "id": "fur-f4-chess-table-stools",
    "name": "Elite: Highend: Chess Table Stools",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.89,
      "d": 1.89,
      "h": 0.84
    },
    "options": {}
  },
  'fur-f1-curved-park-bench': {
    "id": "fur-f1-curved-park-bench",
    "name": "Basic: Highend: Curved Park Bench",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.31,
      "d": 0.95,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f2-curved-park-bench': {
    "id": "fur-f2-curved-park-bench",
    "name": "Standard: Highend: Curved Park Bench",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.31,
      "d": 0.95,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f3-curved-park-bench': {
    "id": "fur-f3-curved-park-bench",
    "name": "Premium: Highend: Curved Park Bench",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.31,
      "d": 0.95,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f4-curved-park-bench': {
    "id": "fur-f4-curved-park-bench",
    "name": "Elite: Highend: Curved Park Bench",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.31,
      "d": 0.95,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f1-decorative-clock-pillar': {
    "id": "fur-f1-decorative-clock-pillar",
    "name": "Basic: Highend: Decorative Clock Pillar",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.26,
      "d": 1.26,
      "h": 5.04
    },
    "options": {}
  },
  'fur-f2-decorative-clock-pillar': {
    "id": "fur-f2-decorative-clock-pillar",
    "name": "Standard: Highend: Decorative Clock Pillar",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.26,
      "d": 1.26,
      "h": 5.04
    },
    "options": {}
  },
  'fur-f3-decorative-clock-pillar': {
    "id": "fur-f3-decorative-clock-pillar",
    "name": "Premium: Highend: Decorative Clock Pillar",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.26,
      "d": 1.26,
      "h": 5.04
    },
    "options": {}
  },
  'fur-f4-decorative-clock-pillar': {
    "id": "fur-f4-decorative-clock-pillar",
    "name": "Elite: Highend: Decorative Clock Pillar",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.26,
      "d": 1.26,
      "h": 5.04
    },
    "options": {}
  },
  'fur-f1-digital-wayfinding-kiosk': {
    "id": "fur-f1-digital-wayfinding-kiosk",
    "name": "Basic: Highend: Digital Wayfinding Kiosk",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.26,
      "d": 0.53,
      "h": 2.52
    },
    "options": {}
  },
  'fur-f2-digital-wayfinding-kiosk': {
    "id": "fur-f2-digital-wayfinding-kiosk",
    "name": "Standard: Highend: Digital Wayfinding Kiosk",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.26,
      "d": 0.53,
      "h": 2.52
    },
    "options": {}
  },
  'fur-f3-digital-wayfinding-kiosk': {
    "id": "fur-f3-digital-wayfinding-kiosk",
    "name": "Premium: Highend: Digital Wayfinding Kiosk",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.26,
      "d": 0.53,
      "h": 2.52
    },
    "options": {}
  },
  'fur-f4-digital-wayfinding-kiosk': {
    "id": "fur-f4-digital-wayfinding-kiosk",
    "name": "Elite: Highend: Digital Wayfinding Kiosk",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.26,
      "d": 0.53,
      "h": 2.52
    },
    "options": {}
  },
  'fur-f1-electric-vehicle-charger': {
    "id": "fur-f1-electric-vehicle-charger",
    "name": "Basic: Highend: Electric Vehicle Charger",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.84,
      "d": 0.63,
      "h": 1.89
    },
    "options": {}
  },
  'fur-f2-electric-vehicle-charger': {
    "id": "fur-f2-electric-vehicle-charger",
    "name": "Standard: Highend: Electric Vehicle Charger",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.84,
      "d": 0.63,
      "h": 1.89
    },
    "options": {}
  },
  'fur-f3-electric-vehicle-charger': {
    "id": "fur-f3-electric-vehicle-charger",
    "name": "Premium: Highend: Electric Vehicle Charger",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.84,
      "d": 0.63,
      "h": 1.89
    },
    "options": {}
  },
  'fur-f4-electric-vehicle-charger': {
    "id": "fur-f4-electric-vehicle-charger",
    "name": "Elite: Highend: Electric Vehicle Charger",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.84,
      "d": 0.63,
      "h": 1.89
    },
    "options": {}
  },
  'fur-f1-emergency-phone-pillar': {
    "id": "fur-f1-emergency-phone-pillar",
    "name": "Basic: Highend: Emergency Phone Pillar",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f2-emergency-phone-pillar': {
    "id": "fur-f2-emergency-phone-pillar",
    "name": "Standard: Highend: Emergency Phone Pillar",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f3-emergency-phone-pillar': {
    "id": "fur-f3-emergency-phone-pillar",
    "name": "Premium: Highend: Emergency Phone Pillar",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f4-emergency-phone-pillar': {
    "id": "fur-f4-emergency-phone-pillar",
    "name": "Elite: Highend: Emergency Phone Pillar",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f1-fire-hydrant-pillar': {
    "id": "fur-f1-fire-hydrant-pillar",
    "name": "Basic: Highend: Fire Hydrant Pillar",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 0.95
    },
    "options": {}
  },
  'fur-f2-fire-hydrant-pillar': {
    "id": "fur-f2-fire-hydrant-pillar",
    "name": "Standard: Highend: Fire Hydrant Pillar",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 0.95
    },
    "options": {}
  },
  'fur-f3-fire-hydrant-pillar': {
    "id": "fur-f3-fire-hydrant-pillar",
    "name": "Premium: Highend: Fire Hydrant Pillar",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 0.95
    },
    "options": {}
  },
  'fur-f4-fire-hydrant-pillar': {
    "id": "fur-f4-fire-hydrant-pillar",
    "name": "Elite: Highend: Fire Hydrant Pillar",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 0.95
    },
    "options": {}
  },
  'fur-f1-highmast-floodlight': {
    "id": "fur-f1-highmast-floodlight",
    "name": "Basic: Highend: Highmast Floodlight",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.1,
      "d": 2.1,
      "h": 16.8
    },
    "options": {}
  },
  'fur-f2-highmast-floodlight': {
    "id": "fur-f2-highmast-floodlight",
    "name": "Standard: Highend: Highmast Floodlight",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.1,
      "d": 2.1,
      "h": 16.8
    },
    "options": {}
  },
  'fur-f3-highmast-floodlight': {
    "id": "fur-f3-highmast-floodlight",
    "name": "Premium: Highend: Highmast Floodlight",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.1,
      "d": 2.1,
      "h": 16.8
    },
    "options": {}
  },
  'fur-f4-highmast-floodlight': {
    "id": "fur-f4-highmast-floodlight",
    "name": "Elite: Highend: Highmast Floodlight",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.1,
      "d": 2.1,
      "h": 16.8
    },
    "options": {}
  },
  'fur-f1-illuminated-house-number': {
    "id": "fur-f1-illuminated-house-number",
    "name": "Basic: Highend: Illuminated House Number",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.84,
      "d": 0.21,
      "h": 0.53
    },
    "options": {}
  },
  'fur-f2-illuminated-house-number': {
    "id": "fur-f2-illuminated-house-number",
    "name": "Standard: Highend: Illuminated House Number",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.84,
      "d": 0.21,
      "h": 0.53
    },
    "options": {}
  },
  'fur-f3-illuminated-house-number': {
    "id": "fur-f3-illuminated-house-number",
    "name": "Premium: Highend: Illuminated House Number",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.84,
      "d": 0.21,
      "h": 0.53
    },
    "options": {}
  },
  'fur-f4-illuminated-house-number': {
    "id": "fur-f4-illuminated-house-number",
    "name": "Elite: Highend: Illuminated House Number",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.84,
      "d": 0.21,
      "h": 0.53
    },
    "options": {}
  },
  'fur-f1-info-bulletin-board': {
    "id": "fur-f1-info-bulletin-board",
    "name": "Basic: Highend: Info Bulletin Board",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.1,
      "d": 0.42,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f2-info-bulletin-board': {
    "id": "fur-f2-info-bulletin-board",
    "name": "Standard: Highend: Info Bulletin Board",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.1,
      "d": 0.42,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f3-info-bulletin-board': {
    "id": "fur-f3-info-bulletin-board",
    "name": "Premium: Highend: Info Bulletin Board",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.1,
      "d": 0.42,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f4-info-bulletin-board': {
    "id": "fur-f4-info-bulletin-board",
    "name": "Elite: Highend: Info Bulletin Board",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.1,
      "d": 0.42,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f1-modern-led-road-light': {
    "id": "fur-f1-modern-led-road-light",
    "name": "Basic: Highend: Modern Led Road Light",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.05,
      "d": 2.31,
      "h": 8.4
    },
    "options": {}
  },
  'fur-f2-modern-led-road-light': {
    "id": "fur-f2-modern-led-road-light",
    "name": "Standard: Highend: Modern Led Road Light",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.05,
      "d": 2.31,
      "h": 8.4
    },
    "options": {}
  },
  'fur-f3-modern-led-road-light': {
    "id": "fur-f3-modern-led-road-light",
    "name": "Premium: Highend: Modern Led Road Light",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.05,
      "d": 2.31,
      "h": 8.4
    },
    "options": {}
  },
  'fur-f4-modern-led-road-light': {
    "id": "fur-f4-modern-led-road-light",
    "name": "Elite: Highend: Modern Led Road Light",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.05,
      "d": 2.31,
      "h": 8.4
    },
    "options": {}
  },
  'fur-f1-modern-waste-bin': {
    "id": "fur-f1-modern-waste-bin",
    "name": "Basic: Highend: Modern Waste Bin",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.73,
      "d": 0.73,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f2-modern-waste-bin': {
    "id": "fur-f2-modern-waste-bin",
    "name": "Standard: Highend: Modern Waste Bin",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.73,
      "d": 0.73,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f3-modern-waste-bin': {
    "id": "fur-f3-modern-waste-bin",
    "name": "Premium: Highend: Modern Waste Bin",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.73,
      "d": 0.73,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f4-modern-waste-bin': {
    "id": "fur-f4-modern-waste-bin",
    "name": "Elite: Highend: Modern Waste Bin",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.73,
      "d": 0.73,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f1-outdoor-dining-parasol': {
    "id": "fur-f1-outdoor-dining-parasol",
    "name": "Basic: Highend: Outdoor Dining Parasol",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.94,
      "d": 2.94,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f2-outdoor-dining-parasol': {
    "id": "fur-f2-outdoor-dining-parasol",
    "name": "Standard: Highend: Outdoor Dining Parasol",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.94,
      "d": 2.94,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f3-outdoor-dining-parasol': {
    "id": "fur-f3-outdoor-dining-parasol",
    "name": "Premium: Highend: Outdoor Dining Parasol",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.94,
      "d": 2.94,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f4-outdoor-dining-parasol': {
    "id": "fur-f4-outdoor-dining-parasol",
    "name": "Elite: Highend: Outdoor Dining Parasol",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.94,
      "d": 2.94,
      "h": 2.73
    },
    "options": {}
  },
  'fur-f1-parcel-drop-locker': {
    "id": "fur-f1-parcel-drop-locker",
    "name": "Basic: Highend: Parcel Drop Locker",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.89,
      "d": 0.84,
      "h": 2.1
    },
    "options": {}
  },
  'fur-f2-parcel-drop-locker': {
    "id": "fur-f2-parcel-drop-locker",
    "name": "Standard: Highend: Parcel Drop Locker",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.89,
      "d": 0.84,
      "h": 2.1
    },
    "options": {}
  },
  'fur-f3-parcel-drop-locker': {
    "id": "fur-f3-parcel-drop-locker",
    "name": "Premium: Highend: Parcel Drop Locker",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.89,
      "d": 0.84,
      "h": 2.1
    },
    "options": {}
  },
  'fur-f4-parcel-drop-locker': {
    "id": "fur-f4-parcel-drop-locker",
    "name": "Elite: Highend: Parcel Drop Locker",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.89,
      "d": 0.84,
      "h": 2.1
    },
    "options": {}
  },
  'fur-f1-park-pergola-canopy': {
    "id": "fur-f1-park-pergola-canopy",
    "name": "Basic: Highend: Park Pergola Canopy",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.73,
      "d": 3.15,
      "h": 2.94
    },
    "options": {}
  },
  'fur-f2-park-pergola-canopy': {
    "id": "fur-f2-park-pergola-canopy",
    "name": "Standard: Highend: Park Pergola Canopy",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.73,
      "d": 3.15,
      "h": 2.94
    },
    "options": {}
  },
  'fur-f3-park-pergola-canopy': {
    "id": "fur-f3-park-pergola-canopy",
    "name": "Premium: Highend: Park Pergola Canopy",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.73,
      "d": 3.15,
      "h": 2.94
    },
    "options": {}
  },
  'fur-f4-park-pergola-canopy': {
    "id": "fur-f4-park-pergola-canopy",
    "name": "Elite: Highend: Park Pergola Canopy",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.73,
      "d": 3.15,
      "h": 2.94
    },
    "options": {}
  },
  'fur-f1-parking-meter-dual': {
    "id": "fur-f1-parking-meter-dual",
    "name": "Basic: Highend: Parking Meter Dual",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.53,
      "d": 0.42,
      "h": 1.47
    },
    "options": {}
  },
  'fur-f2-parking-meter-dual': {
    "id": "fur-f2-parking-meter-dual",
    "name": "Standard: Highend: Parking Meter Dual",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.53,
      "d": 0.42,
      "h": 1.47
    },
    "options": {}
  },
  'fur-f3-parking-meter-dual': {
    "id": "fur-f3-parking-meter-dual",
    "name": "Premium: Highend: Parking Meter Dual",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.53,
      "d": 0.42,
      "h": 1.47
    },
    "options": {}
  },
  'fur-f4-parking-meter-dual': {
    "id": "fur-f4-parking-meter-dual",
    "name": "Elite: Highend: Parking Meter Dual",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.53,
      "d": 0.42,
      "h": 1.47
    },
    "options": {}
  },
  'fur-f1-pedestrian-bollard-row': {
    "id": "fur-f1-pedestrian-bollard-row",
    "name": "Basic: Highend: Pedestrian Bollard Row",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.62,
      "d": 0.42,
      "h": 0.95
    },
    "options": {}
  },
  'fur-f2-pedestrian-bollard-row': {
    "id": "fur-f2-pedestrian-bollard-row",
    "name": "Standard: Highend: Pedestrian Bollard Row",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.62,
      "d": 0.42,
      "h": 0.95
    },
    "options": {}
  },
  'fur-f3-pedestrian-bollard-row': {
    "id": "fur-f3-pedestrian-bollard-row",
    "name": "Premium: Highend: Pedestrian Bollard Row",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.62,
      "d": 0.42,
      "h": 0.95
    },
    "options": {}
  },
  'fur-f4-pedestrian-bollard-row': {
    "id": "fur-f4-pedestrian-bollard-row",
    "name": "Elite: Highend: Pedestrian Bollard Row",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.62,
      "d": 0.42,
      "h": 0.95
    },
    "options": {}
  },
  'fur-f1-picnic-table-bench-set': {
    "id": "fur-f1-picnic-table-bench-set",
    "name": "Basic: Highend: Picnic Table Bench Set",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.1,
      "d": 1.89,
      "h": 0.84
    },
    "options": {}
  },
  'fur-f2-picnic-table-bench-set': {
    "id": "fur-f2-picnic-table-bench-set",
    "name": "Standard: Highend: Picnic Table Bench Set",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.1,
      "d": 1.89,
      "h": 0.84
    },
    "options": {}
  },
  'fur-f3-picnic-table-bench-set': {
    "id": "fur-f3-picnic-table-bench-set",
    "name": "Premium: Highend: Picnic Table Bench Set",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.1,
      "d": 1.89,
      "h": 0.84
    },
    "options": {}
  },
  'fur-f4-picnic-table-bench-set': {
    "id": "fur-f4-picnic-table-bench-set",
    "name": "Elite: Highend: Picnic Table Bench Set",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.1,
      "d": 1.89,
      "h": 0.84
    },
    "options": {}
  },
  'fur-f1-plant-trellis-screen': {
    "id": "fur-f1-plant-trellis-screen",
    "name": "Basic: Highend: Plant Trellis Screen",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.31,
      "d": 0.42,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f2-plant-trellis-screen': {
    "id": "fur-f2-plant-trellis-screen",
    "name": "Standard: Highend: Plant Trellis Screen",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.31,
      "d": 0.42,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f3-plant-trellis-screen': {
    "id": "fur-f3-plant-trellis-screen",
    "name": "Premium: Highend: Plant Trellis Screen",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.31,
      "d": 0.42,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f4-plant-trellis-screen': {
    "id": "fur-f4-plant-trellis-screen",
    "name": "Elite: Highend: Plant Trellis Screen",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.31,
      "d": 0.42,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f1-public-barbecue-grill': {
    "id": "fur-f1-public-barbecue-grill",
    "name": "Basic: Highend: Public Barbecue Grill",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.68,
      "d": 0.84,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f2-public-barbecue-grill': {
    "id": "fur-f2-public-barbecue-grill",
    "name": "Standard: Highend: Public Barbecue Grill",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.68,
      "d": 0.84,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f3-public-barbecue-grill': {
    "id": "fur-f3-public-barbecue-grill",
    "name": "Premium: Highend: Public Barbecue Grill",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.68,
      "d": 0.84,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f4-public-barbecue-grill': {
    "id": "fur-f4-public-barbecue-grill",
    "name": "Elite: Highend: Public Barbecue Grill",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.68,
      "d": 0.84,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f1-public-telescope': {
    "id": "fur-f1-public-telescope",
    "name": "Basic: Highend: Public Telescope",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.84,
      "d": 0.84,
      "h": 1.68
    },
    "options": {}
  },
  'fur-f2-public-telescope': {
    "id": "fur-f2-public-telescope",
    "name": "Standard: Highend: Public Telescope",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.84,
      "d": 0.84,
      "h": 1.68
    },
    "options": {}
  },
  'fur-f3-public-telescope': {
    "id": "fur-f3-public-telescope",
    "name": "Premium: Highend: Public Telescope",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.84,
      "d": 0.84,
      "h": 1.68
    },
    "options": {}
  },
  'fur-f4-public-telescope': {
    "id": "fur-f4-public-telescope",
    "name": "Elite: Highend: Public Telescope",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.84,
      "d": 0.84,
      "h": 1.68
    },
    "options": {}
  },
  'fur-f1-roadside-mailbox': {
    "id": "fur-f1-roadside-mailbox",
    "name": "Basic: Highend: Roadside Mailbox",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 1.37
    },
    "options": {}
  },
  'fur-f2-roadside-mailbox': {
    "id": "fur-f2-roadside-mailbox",
    "name": "Standard: Highend: Roadside Mailbox",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 1.37
    },
    "options": {}
  },
  'fur-f3-roadside-mailbox': {
    "id": "fur-f3-roadside-mailbox",
    "name": "Premium: Highend: Roadside Mailbox",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 1.37
    },
    "options": {}
  },
  'fur-f4-roadside-mailbox': {
    "id": "fur-f4-roadside-mailbox",
    "name": "Elite: Highend: Roadside Mailbox",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.63,
      "d": 0.63,
      "h": 1.37
    },
    "options": {}
  },
  'fur-f1-solar-bollard-light': {
    "id": "fur-f1-solar-bollard-light",
    "name": "Basic: Highend: Solar Bollard Light",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.42,
      "d": 0.42,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f2-solar-bollard-light': {
    "id": "fur-f2-solar-bollard-light",
    "name": "Standard: Highend: Solar Bollard Light",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.42,
      "d": 0.42,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f3-solar-bollard-light': {
    "id": "fur-f3-solar-bollard-light",
    "name": "Premium: Highend: Solar Bollard Light",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.42,
      "d": 0.42,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f4-solar-bollard-light': {
    "id": "fur-f4-solar-bollard-light",
    "name": "Elite: Highend: Solar Bollard Light",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.42,
      "d": 0.42,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f1-stainless-trash-recycler': {
    "id": "fur-f1-stainless-trash-recycler",
    "name": "Basic: Highend: Stainless Trash Recycler",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.47,
      "d": 0.63,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f2-stainless-trash-recycler': {
    "id": "fur-f2-stainless-trash-recycler",
    "name": "Standard: Highend: Stainless Trash Recycler",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.47,
      "d": 0.63,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f3-stainless-trash-recycler': {
    "id": "fur-f3-stainless-trash-recycler",
    "name": "Premium: Highend: Stainless Trash Recycler",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.47,
      "d": 0.63,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f4-stainless-trash-recycler': {
    "id": "fur-f4-stainless-trash-recycler",
    "name": "Elite: Highend: Stainless Trash Recycler",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.47,
      "d": 0.63,
      "h": 1.16
    },
    "options": {}
  },
  'fur-f1-stone-amphitheater-seat': {
    "id": "fur-f1-stone-amphitheater-seat",
    "name": "Basic: Highend: Stone Amphitheater Seat",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.15,
      "d": 1.26,
      "h": 0.63
    },
    "options": {}
  },
  'fur-f2-stone-amphitheater-seat': {
    "id": "fur-f2-stone-amphitheater-seat",
    "name": "Standard: Highend: Stone Amphitheater Seat",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.15,
      "d": 1.26,
      "h": 0.63
    },
    "options": {}
  },
  'fur-f3-stone-amphitheater-seat': {
    "id": "fur-f3-stone-amphitheater-seat",
    "name": "Premium: Highend: Stone Amphitheater Seat",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.15,
      "d": 1.26,
      "h": 0.63
    },
    "options": {}
  },
  'fur-f4-stone-amphitheater-seat': {
    "id": "fur-f4-stone-amphitheater-seat",
    "name": "Elite: Highend: Stone Amphitheater Seat",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.15,
      "d": 1.26,
      "h": 0.63
    },
    "options": {}
  },
  'fur-f1-stone-drinking-fountain': {
    "id": "fur-f1-stone-drinking-fountain",
    "name": "Basic: Highend: Stone Drinking Fountain",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.84,
      "d": 0.84,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f2-stone-drinking-fountain': {
    "id": "fur-f2-stone-drinking-fountain",
    "name": "Standard: Highend: Stone Drinking Fountain",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.84,
      "d": 0.84,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f3-stone-drinking-fountain': {
    "id": "fur-f3-stone-drinking-fountain",
    "name": "Premium: Highend: Stone Drinking Fountain",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.84,
      "d": 0.84,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f4-stone-drinking-fountain': {
    "id": "fur-f4-stone-drinking-fountain",
    "name": "Elite: Highend: Stone Drinking Fountain",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.84,
      "d": 0.84,
      "h": 1.05
    },
    "options": {}
  },
  'fur-f1-street-vendor-cart': {
    "id": "fur-f1-street-vendor-cart",
    "name": "Basic: Highend: Street Vendor Cart",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.52,
      "d": 1.47,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f2-street-vendor-cart': {
    "id": "fur-f2-street-vendor-cart",
    "name": "Standard: Highend: Street Vendor Cart",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.52,
      "d": 1.47,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f3-street-vendor-cart': {
    "id": "fur-f3-street-vendor-cart",
    "name": "Premium: Highend: Street Vendor Cart",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.52,
      "d": 1.47,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f4-street-vendor-cart': {
    "id": "fur-f4-street-vendor-cart",
    "name": "Elite: Highend: Street Vendor Cart",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.52,
      "d": 1.47,
      "h": 2.31
    },
    "options": {}
  },
  'fur-f1-sun-lounger-deckchair': {
    "id": "fur-f1-sun-lounger-deckchair",
    "name": "Basic: Highend: Sun Lounger Deckchair",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.99,
      "d": 0.84,
      "h": 0.73
    },
    "options": {}
  },
  'fur-f2-sun-lounger-deckchair': {
    "id": "fur-f2-sun-lounger-deckchair",
    "name": "Standard: Highend: Sun Lounger Deckchair",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.99,
      "d": 0.84,
      "h": 0.73
    },
    "options": {}
  },
  'fur-f3-sun-lounger-deckchair': {
    "id": "fur-f3-sun-lounger-deckchair",
    "name": "Premium: Highend: Sun Lounger Deckchair",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.99,
      "d": 0.84,
      "h": 0.73
    },
    "options": {}
  },
  'fur-f4-sun-lounger-deckchair': {
    "id": "fur-f4-sun-lounger-deckchair",
    "name": "Elite: Highend: Sun Lounger Deckchair",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.99,
      "d": 0.84,
      "h": 0.73
    },
    "options": {}
  },
  'fur-f1-tiered-marble-fountain': {
    "id": "fur-f1-tiered-marble-fountain",
    "name": "Basic: Highend: Tiered Marble Fountain",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 3.36
    },
    "options": {}
  },
  'fur-f2-tiered-marble-fountain': {
    "id": "fur-f2-tiered-marble-fountain",
    "name": "Standard: Highend: Tiered Marble Fountain",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 3.36
    },
    "options": {}
  },
  'fur-f3-tiered-marble-fountain': {
    "id": "fur-f3-tiered-marble-fountain",
    "name": "Premium: Highend: Tiered Marble Fountain",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 3.36
    },
    "options": {}
  },
  'fur-f4-tiered-marble-fountain': {
    "id": "fur-f4-tiered-marble-fountain",
    "name": "Elite: Highend: Tiered Marble Fountain",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 3.36
    },
    "options": {}
  },
  'fur-f1-traffic-stop-light': {
    "id": "fur-f1-traffic-stop-light",
    "name": "Basic: Highend: Traffic Stop Light",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.84,
      "d": 1.26,
      "h": 5.78
    },
    "options": {}
  },
  'fur-f2-traffic-stop-light': {
    "id": "fur-f2-traffic-stop-light",
    "name": "Standard: Highend: Traffic Stop Light",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.84,
      "d": 1.26,
      "h": 5.78
    },
    "options": {}
  },
  'fur-f3-traffic-stop-light': {
    "id": "fur-f3-traffic-stop-light",
    "name": "Premium: Highend: Traffic Stop Light",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.84,
      "d": 1.26,
      "h": 5.78
    },
    "options": {}
  },
  'fur-f4-traffic-stop-light': {
    "id": "fur-f4-traffic-stop-light",
    "name": "Elite: Highend: Traffic Stop Light",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.84,
      "d": 1.26,
      "h": 5.78
    },
    "options": {}
  },
  'fur-f1-tree-surround-bench': {
    "id": "fur-f1-tree-surround-bench",
    "name": "Basic: Highend: Tree Surround Bench",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.94,
      "d": 2.94,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f2-tree-surround-bench': {
    "id": "fur-f2-tree-surround-bench",
    "name": "Standard: Highend: Tree Surround Bench",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.94,
      "d": 2.94,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f3-tree-surround-bench': {
    "id": "fur-f3-tree-surround-bench",
    "name": "Premium: Highend: Tree Surround Bench",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.94,
      "d": 2.94,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f4-tree-surround-bench': {
    "id": "fur-f4-tree-surround-bench",
    "name": "Elite: Highend: Tree Surround Bench",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.94,
      "d": 2.94,
      "h": 0.89
    },
    "options": {}
  },
  'fur-f1-victorian-street-lamp': {
    "id": "fur-f1-victorian-street-lamp",
    "name": "Basic: Highend: Victorian Street Lamp",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.26,
      "d": 1.26,
      "h": 4.73
    },
    "options": {}
  },
  'fur-f2-victorian-street-lamp': {
    "id": "fur-f2-victorian-street-lamp",
    "name": "Standard: Highend: Victorian Street Lamp",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.26,
      "d": 1.26,
      "h": 4.73
    },
    "options": {}
  },
  'fur-f3-victorian-street-lamp': {
    "id": "fur-f3-victorian-street-lamp",
    "name": "Premium: Highend: Victorian Street Lamp",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.26,
      "d": 1.26,
      "h": 4.73
    },
    "options": {}
  },
  'fur-f4-victorian-street-lamp': {
    "id": "fur-f4-victorian-street-lamp",
    "name": "Elite: Highend: Victorian Street Lamp",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.26,
      "d": 1.26,
      "h": 4.73
    },
    "options": {}
  },
  'fur-f1-wall-house-light': {
    "id": "fur-f1-wall-house-light",
    "name": "Basic: Highend: Wall House Light",
    "category": "furniture",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.53,
      "d": 0.42,
      "h": 0.63
    },
    "options": {}
  },
  'fur-f2-wall-house-light': {
    "id": "fur-f2-wall-house-light",
    "name": "Standard: Highend: Wall House Light",
    "category": "furniture",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.53,
      "d": 0.42,
      "h": 0.63
    },
    "options": {}
  },
  'fur-f3-wall-house-light': {
    "id": "fur-f3-wall-house-light",
    "name": "Premium: Highend: Wall House Light",
    "category": "furniture",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.53,
      "d": 0.42,
      "h": 0.63
    },
    "options": {}
  },
  'fur-f4-wall-house-light': {
    "id": "fur-f4-wall-house-light",
    "name": "Elite: Highend: Wall House Light",
    "category": "furniture",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.53,
      "d": 0.42,
      "h": 0.63
    },
    "options": {}
  },
  'mar-f1-arctic-research-vessel': {
    "id": "mar-f1-arctic-research-vessel",
    "name": "Basic: Highend: Arctic Research Vessel",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 23.1
    },
    "options": {}
  },
  'mar-f2-arctic-research-vessel': {
    "id": "mar-f2-arctic-research-vessel",
    "name": "Standard: Highend: Arctic Research Vessel",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 23.1
    },
    "options": {}
  },
  'mar-f3-arctic-research-vessel': {
    "id": "mar-f3-arctic-research-vessel",
    "name": "Premium: Highend: Arctic Research Vessel",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 23.1
    },
    "options": {}
  },
  'mar-f4-arctic-research-vessel': {
    "id": "mar-f4-arctic-research-vessel",
    "name": "Elite: Highend: Arctic Research Vessel",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 68.25,
      "h": 23.1
    },
    "options": {}
  },
  'mar-f1-barge-flat-deck': {
    "id": "mar-f1-barge-flat-deck",
    "name": "Basic: Highend: Barge Flat Deck",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 44.1,
      "h": 4.2
    },
    "options": {}
  },
  'mar-f2-barge-flat-deck': {
    "id": "mar-f2-barge-flat-deck",
    "name": "Standard: Highend: Barge Flat Deck",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 44.1,
      "h": 4.2
    },
    "options": {}
  },
  'mar-f3-barge-flat-deck': {
    "id": "mar-f3-barge-flat-deck",
    "name": "Premium: Highend: Barge Flat Deck",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 44.1,
      "h": 4.2
    },
    "options": {}
  },
  'mar-f4-barge-flat-deck': {
    "id": "mar-f4-barge-flat-deck",
    "name": "Elite: Highend: Barge Flat Deck",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 44.1,
      "h": 4.2
    },
    "options": {}
  },
  'mar-f1-coastguard-interceptor': {
    "id": "mar-f1-coastguard-interceptor",
    "name": "Basic: Highend: Coastguard Interceptor",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.78,
      "d": 15.75,
      "h": 5.25
    },
    "options": {}
  },
  'mar-f2-coastguard-interceptor': {
    "id": "mar-f2-coastguard-interceptor",
    "name": "Standard: Highend: Coastguard Interceptor",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.78,
      "d": 15.75,
      "h": 5.25
    },
    "options": {}
  },
  'mar-f3-coastguard-interceptor': {
    "id": "mar-f3-coastguard-interceptor",
    "name": "Premium: Highend: Coastguard Interceptor",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.78,
      "d": 15.75,
      "h": 5.25
    },
    "options": {}
  },
  'mar-f4-coastguard-interceptor': {
    "id": "mar-f4-coastguard-interceptor",
    "name": "Elite: Highend: Coastguard Interceptor",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.78,
      "d": 15.75,
      "h": 5.25
    },
    "options": {}
  },
  'mar-f1-commercial-trawler': {
    "id": "mar-f1-commercial-trawler",
    "name": "Basic: Highend: Commercial Trawler",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 11.55,
      "d": 33.6,
      "h": 13.65
    },
    "options": {}
  },
  'mar-f2-commercial-trawler': {
    "id": "mar-f2-commercial-trawler",
    "name": "Standard: Highend: Commercial Trawler",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 11.55,
      "d": 33.6,
      "h": 13.65
    },
    "options": {}
  },
  'mar-f3-commercial-trawler': {
    "id": "mar-f3-commercial-trawler",
    "name": "Premium: Highend: Commercial Trawler",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 11.55,
      "d": 33.6,
      "h": 13.65
    },
    "options": {}
  },
  'mar-f4-commercial-trawler': {
    "id": "mar-f4-commercial-trawler",
    "name": "Elite: Highend: Commercial Trawler",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 11.55,
      "d": 33.6,
      "h": 13.65
    },
    "options": {}
  },
  'mar-f1-container-cargo-ship': {
    "id": "mar-f1-container-cargo-ship",
    "name": "Basic: Highend: Container Cargo Ship",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 31.5,
      "d": 136.5,
      "h": 29.4
    },
    "options": {}
  },
  'mar-f2-container-cargo-ship': {
    "id": "mar-f2-container-cargo-ship",
    "name": "Standard: Highend: Container Cargo Ship",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 31.5,
      "d": 136.5,
      "h": 29.4
    },
    "options": {}
  },
  'mar-f3-container-cargo-ship': {
    "id": "mar-f3-container-cargo-ship",
    "name": "Premium: Highend: Container Cargo Ship",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 31.5,
      "d": 136.5,
      "h": 29.4
    },
    "options": {}
  },
  'mar-f4-container-cargo-ship': {
    "id": "mar-f4-container-cargo-ship",
    "name": "Elite: Highend: Container Cargo Ship",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 31.5,
      "d": 136.5,
      "h": 29.4
    },
    "options": {}
  },
  'mar-f1-container-gantry-crane': {
    "id": "mar-f1-container-gantry-crane",
    "name": "Basic: Highend: Container Gantry Crane",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 42,
      "h": 44.1
    },
    "options": {}
  },
  'mar-f2-container-gantry-crane': {
    "id": "mar-f2-container-gantry-crane",
    "name": "Standard: Highend: Container Gantry Crane",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 42,
      "h": 44.1
    },
    "options": {}
  },
  'mar-f3-container-gantry-crane': {
    "id": "mar-f3-container-gantry-crane",
    "name": "Premium: Highend: Container Gantry Crane",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 42,
      "h": 44.1
    },
    "options": {}
  },
  'mar-f4-container-gantry-crane': {
    "id": "mar-f4-container-gantry-crane",
    "name": "Elite: Highend: Container Gantry Crane",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 42,
      "h": 44.1
    },
    "options": {}
  },
  'mar-f1-deepsea-submersible-tender': {
    "id": "mar-f1-deepsea-submersible-tender",
    "name": "Basic: Highend: Deepsea Submersible Tender",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 54.6,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f2-deepsea-submersible-tender': {
    "id": "mar-f2-deepsea-submersible-tender",
    "name": "Standard: Highend: Deepsea Submersible Tender",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 54.6,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f3-deepsea-submersible-tender': {
    "id": "mar-f3-deepsea-submersible-tender",
    "name": "Premium: Highend: Deepsea Submersible Tender",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 54.6,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f4-deepsea-submersible-tender': {
    "id": "mar-f4-deepsea-submersible-tender",
    "name": "Elite: Highend: Deepsea Submersible Tender",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 54.6,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f1-dry-cargo-coaster': {
    "id": "mar-f1-dry-cargo-coaster",
    "name": "Basic: Highend: Dry Cargo Coaster",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 39.9,
      "h": 9.45
    },
    "options": {}
  },
  'mar-f2-dry-cargo-coaster': {
    "id": "mar-f2-dry-cargo-coaster",
    "name": "Standard: Highend: Dry Cargo Coaster",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 39.9,
      "h": 9.45
    },
    "options": {}
  },
  'mar-f3-dry-cargo-coaster': {
    "id": "mar-f3-dry-cargo-coaster",
    "name": "Premium: Highend: Dry Cargo Coaster",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 39.9,
      "h": 9.45
    },
    "options": {}
  },
  'mar-f4-dry-cargo-coaster': {
    "id": "mar-f4-dry-cargo-coaster",
    "name": "Elite: Highend: Dry Cargo Coaster",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 39.9,
      "h": 9.45
    },
    "options": {}
  },
  'mar-f1-floating-drydock': {
    "id": "mar-f1-floating-drydock",
    "name": "Basic: Highend: Floating Drydock",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 35.7,
      "d": 68.25,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f2-floating-drydock': {
    "id": "mar-f2-floating-drydock",
    "name": "Standard: Highend: Floating Drydock",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 35.7,
      "d": 68.25,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f3-floating-drydock': {
    "id": "mar-f3-floating-drydock",
    "name": "Premium: Highend: Floating Drydock",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 35.7,
      "d": 68.25,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f4-floating-drydock': {
    "id": "mar-f4-floating-drydock",
    "name": "Elite: Highend: Floating Drydock",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 35.7,
      "d": 68.25,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f1-floating-fuel-dock': {
    "id": "mar-f1-floating-fuel-dock",
    "name": "Basic: Highend: Floating Fuel Dock",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 31.5,
      "h": 4.73
    },
    "options": {}
  },
  'mar-f2-floating-fuel-dock': {
    "id": "mar-f2-floating-fuel-dock",
    "name": "Standard: Highend: Floating Fuel Dock",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 31.5,
      "h": 4.73
    },
    "options": {}
  },
  'mar-f3-floating-fuel-dock': {
    "id": "mar-f3-floating-fuel-dock",
    "name": "Premium: Highend: Floating Fuel Dock",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 31.5,
      "h": 4.73
    },
    "options": {}
  },
  'mar-f4-floating-fuel-dock': {
    "id": "mar-f4-floating-fuel-dock",
    "name": "Elite: Highend: Floating Fuel Dock",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 31.5,
      "h": 4.73
    },
    "options": {}
  },
  'mar-f1-floating-swim-platform': {
    "id": "mar-f1-floating-swim-platform",
    "name": "Basic: Highend: Floating Swim Platform",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 1.58
    },
    "options": {}
  },
  'mar-f2-floating-swim-platform': {
    "id": "mar-f2-floating-swim-platform",
    "name": "Standard: Highend: Floating Swim Platform",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 1.58
    },
    "options": {}
  },
  'mar-f3-floating-swim-platform': {
    "id": "mar-f3-floating-swim-platform",
    "name": "Premium: Highend: Floating Swim Platform",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 1.58
    },
    "options": {}
  },
  'mar-f4-floating-swim-platform': {
    "id": "mar-f4-floating-swim-platform",
    "name": "Elite: Highend: Floating Swim Platform",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 1.58
    },
    "options": {}
  },
  'mar-f1-harbor-patrol-cutter': {
    "id": "mar-f1-harbor-patrol-cutter",
    "name": "Basic: Highend: Harbor Patrol Cutter",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 7.35,
      "d": 23.1,
      "h": 7.88
    },
    "options": {}
  },
  'mar-f2-harbor-patrol-cutter': {
    "id": "mar-f2-harbor-patrol-cutter",
    "name": "Standard: Highend: Harbor Patrol Cutter",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 7.35,
      "d": 23.1,
      "h": 7.88
    },
    "options": {}
  },
  'mar-f3-harbor-patrol-cutter': {
    "id": "mar-f3-harbor-patrol-cutter",
    "name": "Premium: Highend: Harbor Patrol Cutter",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 7.35,
      "d": 23.1,
      "h": 7.88
    },
    "options": {}
  },
  'mar-f4-harbor-patrol-cutter': {
    "id": "mar-f4-harbor-patrol-cutter",
    "name": "Elite: Highend: Harbor Patrol Cutter",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 7.35,
      "d": 23.1,
      "h": 7.88
    },
    "options": {}
  },
  'mar-f1-harbor-pilot-boat': {
    "id": "mar-f1-harbor-pilot-boat",
    "name": "Basic: Highend: Harbor Pilot Boat",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 16.8,
      "h": 6.3
    },
    "options": {}
  },
  'mar-f2-harbor-pilot-boat': {
    "id": "mar-f2-harbor-pilot-boat",
    "name": "Standard: Highend: Harbor Pilot Boat",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 16.8,
      "h": 6.3
    },
    "options": {}
  },
  'mar-f3-harbor-pilot-boat': {
    "id": "mar-f3-harbor-pilot-boat",
    "name": "Premium: Highend: Harbor Pilot Boat",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 16.8,
      "h": 6.3
    },
    "options": {}
  },
  'mar-f4-harbor-pilot-boat': {
    "id": "mar-f4-harbor-pilot-boat",
    "name": "Elite: Highend: Harbor Pilot Boat",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 16.8,
      "h": 6.3
    },
    "options": {}
  },
  'mar-f1-harbor-tugboat': {
    "id": "mar-f1-harbor-tugboat",
    "name": "Basic: Highend: Harbor Tugboat",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 27.3,
      "h": 10.5
    },
    "options": {}
  },
  'mar-f2-harbor-tugboat': {
    "id": "mar-f2-harbor-tugboat",
    "name": "Standard: Highend: Harbor Tugboat",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 27.3,
      "h": 10.5
    },
    "options": {}
  },
  'mar-f3-harbor-tugboat': {
    "id": "mar-f3-harbor-tugboat",
    "name": "Premium: Highend: Harbor Tugboat",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 27.3,
      "h": 10.5
    },
    "options": {}
  },
  'mar-f4-harbor-tugboat': {
    "id": "mar-f4-harbor-tugboat",
    "name": "Elite: Highend: Harbor Tugboat",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 27.3,
      "h": 10.5
    },
    "options": {}
  },
  'mar-f1-high-speed-catamaran': {
    "id": "mar-f1-high-speed-catamaran",
    "name": "Basic: Highend: High Speed Catamaran",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 50.4,
      "h": 14.7
    },
    "options": {}
  },
  'mar-f2-high-speed-catamaran': {
    "id": "mar-f2-high-speed-catamaran",
    "name": "Standard: Highend: High Speed Catamaran",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 50.4,
      "h": 14.7
    },
    "options": {}
  },
  'mar-f3-high-speed-catamaran': {
    "id": "mar-f3-high-speed-catamaran",
    "name": "Premium: Highend: High Speed Catamaran",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 50.4,
      "h": 14.7
    },
    "options": {}
  },
  'mar-f4-high-speed-catamaran': {
    "id": "mar-f4-high-speed-catamaran",
    "name": "Elite: Highend: High Speed Catamaran",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 50.4,
      "h": 14.7
    },
    "options": {}
  },
  'mar-f1-historic-ocean-tallship': {
    "id": "mar-f1-historic-ocean-tallship",
    "name": "Basic: Highend: Historic Ocean Tallship",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 15.75,
      "d": 52.5,
      "h": 37.8
    },
    "options": {}
  },
  'mar-f2-historic-ocean-tallship': {
    "id": "mar-f2-historic-ocean-tallship",
    "name": "Standard: Highend: Historic Ocean Tallship",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 15.75,
      "d": 52.5,
      "h": 37.8
    },
    "options": {}
  },
  'mar-f3-historic-ocean-tallship': {
    "id": "mar-f3-historic-ocean-tallship",
    "name": "Premium: Highend: Historic Ocean Tallship",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 15.75,
      "d": 52.5,
      "h": 37.8
    },
    "options": {}
  },
  'mar-f4-historic-ocean-tallship': {
    "id": "mar-f4-historic-ocean-tallship",
    "name": "Elite: Highend: Historic Ocean Tallship",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 15.75,
      "d": 52.5,
      "h": 37.8
    },
    "options": {}
  },
  'mar-f1-hydrofoil-express': {
    "id": "mar-f1-hydrofoil-express",
    "name": "Basic: Highend: Hydrofoil Express",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 25.2,
      "h": 7.35
    },
    "options": {}
  },
  'mar-f2-hydrofoil-express': {
    "id": "mar-f2-hydrofoil-express",
    "name": "Standard: Highend: Hydrofoil Express",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 25.2,
      "h": 7.35
    },
    "options": {}
  },
  'mar-f3-hydrofoil-express': {
    "id": "mar-f3-hydrofoil-express",
    "name": "Premium: Highend: Hydrofoil Express",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 25.2,
      "h": 7.35
    },
    "options": {}
  },
  'mar-f4-hydrofoil-express': {
    "id": "mar-f4-hydrofoil-express",
    "name": "Elite: Highend: Hydrofoil Express",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 25.2,
      "h": 7.35
    },
    "options": {}
  },
  'mar-f1-industrial-dredger-vessel': {
    "id": "mar-f1-industrial-dredger-vessel",
    "name": "Basic: Highend: Industrial Dredger Vessel",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f2-industrial-dredger-vessel': {
    "id": "mar-f2-industrial-dredger-vessel",
    "name": "Standard: Highend: Industrial Dredger Vessel",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f3-industrial-dredger-vessel': {
    "id": "mar-f3-industrial-dredger-vessel",
    "name": "Premium: Highend: Industrial Dredger Vessel",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f4-industrial-dredger-vessel': {
    "id": "mar-f4-industrial-dredger-vessel",
    "name": "Elite: Highend: Industrial Dredger Vessel",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 63,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f1-jet-ski-watercraft': {
    "id": "mar-f1-jet-ski-watercraft",
    "name": "Basic: Highend: Jet Ski Watercraft",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.58,
      "d": 3.36,
      "h": 1.37
    },
    "options": {}
  },
  'mar-f2-jet-ski-watercraft': {
    "id": "mar-f2-jet-ski-watercraft",
    "name": "Standard: Highend: Jet Ski Watercraft",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.58,
      "d": 3.36,
      "h": 1.37
    },
    "options": {}
  },
  'mar-f3-jet-ski-watercraft': {
    "id": "mar-f3-jet-ski-watercraft",
    "name": "Premium: Highend: Jet Ski Watercraft",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.58,
      "d": 3.36,
      "h": 1.37
    },
    "options": {}
  },
  'mar-f4-jet-ski-watercraft': {
    "id": "mar-f4-jet-ski-watercraft",
    "name": "Elite: Highend: Jet Ski Watercraft",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.58,
      "d": 3.36,
      "h": 1.37
    },
    "options": {}
  },
  'mar-f1-kayak-canoe-rack': {
    "id": "mar-f1-kayak-canoe-rack",
    "name": "Basic: Highend: Kayak Canoe Rack",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.15,
      "d": 5.78,
      "h": 2.31
    },
    "options": {}
  },
  'mar-f2-kayak-canoe-rack': {
    "id": "mar-f2-kayak-canoe-rack",
    "name": "Standard: Highend: Kayak Canoe Rack",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.15,
      "d": 5.78,
      "h": 2.31
    },
    "options": {}
  },
  'mar-f3-kayak-canoe-rack': {
    "id": "mar-f3-kayak-canoe-rack",
    "name": "Premium: Highend: Kayak Canoe Rack",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.15,
      "d": 5.78,
      "h": 2.31
    },
    "options": {}
  },
  'mar-f4-kayak-canoe-rack': {
    "id": "mar-f4-kayak-canoe-rack",
    "name": "Elite: Highend: Kayak Canoe Rack",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.15,
      "d": 5.78,
      "h": 2.31
    },
    "options": {}
  },
  'mar-f1-lobster-fishing-boat': {
    "id": "mar-f1-lobster-fishing-boat",
    "name": "Basic: Highend: Lobster Fishing Boat",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.73,
      "d": 12.6,
      "h": 4.73
    },
    "options": {}
  },
  'mar-f2-lobster-fishing-boat': {
    "id": "mar-f2-lobster-fishing-boat",
    "name": "Standard: Highend: Lobster Fishing Boat",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.73,
      "d": 12.6,
      "h": 4.73
    },
    "options": {}
  },
  'mar-f3-lobster-fishing-boat': {
    "id": "mar-f3-lobster-fishing-boat",
    "name": "Premium: Highend: Lobster Fishing Boat",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.73,
      "d": 12.6,
      "h": 4.73
    },
    "options": {}
  },
  'mar-f4-lobster-fishing-boat': {
    "id": "mar-f4-lobster-fishing-boat",
    "name": "Elite: Highend: Lobster Fishing Boat",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.73,
      "d": 12.6,
      "h": 4.73
    },
    "options": {}
  },
  'mar-f1-luxury-motor-yacht': {
    "id": "mar-f1-luxury-motor-yacht",
    "name": "Basic: Highend: Luxury Motor Yacht",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 37.8,
      "h": 11.55
    },
    "options": {}
  },
  'mar-f2-luxury-motor-yacht': {
    "id": "mar-f2-luxury-motor-yacht",
    "name": "Standard: Highend: Luxury Motor Yacht",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 37.8,
      "h": 11.55
    },
    "options": {}
  },
  'mar-f3-luxury-motor-yacht': {
    "id": "mar-f3-luxury-motor-yacht",
    "name": "Premium: Highend: Luxury Motor Yacht",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 37.8,
      "h": 11.55
    },
    "options": {}
  },
  'mar-f4-luxury-motor-yacht': {
    "id": "mar-f4-luxury-motor-yacht",
    "name": "Elite: Highend: Luxury Motor Yacht",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 37.8,
      "h": 11.55
    },
    "options": {}
  },
  'mar-f1-mega-cruise-liner': {
    "id": "mar-f1-mega-cruise-liner",
    "name": "Basic: Highend: Mega Cruise Liner",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 37.8,
      "d": 147,
      "h": 39.9
    },
    "options": {}
  },
  'mar-f2-mega-cruise-liner': {
    "id": "mar-f2-mega-cruise-liner",
    "name": "Standard: Highend: Mega Cruise Liner",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 37.8,
      "d": 147,
      "h": 39.9
    },
    "options": {}
  },
  'mar-f3-mega-cruise-liner': {
    "id": "mar-f3-mega-cruise-liner",
    "name": "Premium: Highend: Mega Cruise Liner",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 37.8,
      "d": 147,
      "h": 39.9
    },
    "options": {}
  },
  'mar-f4-mega-cruise-liner': {
    "id": "mar-f4-mega-cruise-liner",
    "name": "Elite: Highend: Mega Cruise Liner",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 37.8,
      "d": 147,
      "h": 39.9
    },
    "options": {}
  },
  'mar-f1-monumental-harbor-crane': {
    "id": "mar-f1-monumental-harbor-crane",
    "name": "Basic: Highend: Monumental Harbor Crane",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 33.6,
      "h": 47.25
    },
    "options": {}
  },
  'mar-f2-monumental-harbor-crane': {
    "id": "mar-f2-monumental-harbor-crane",
    "name": "Standard: Highend: Monumental Harbor Crane",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 33.6,
      "h": 47.25
    },
    "options": {}
  },
  'mar-f3-monumental-harbor-crane': {
    "id": "mar-f3-monumental-harbor-crane",
    "name": "Premium: Highend: Monumental Harbor Crane",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 33.6,
      "h": 47.25
    },
    "options": {}
  },
  'mar-f4-monumental-harbor-crane': {
    "id": "mar-f4-monumental-harbor-crane",
    "name": "Elite: Highend: Monumental Harbor Crane",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 33.6,
      "h": 47.25
    },
    "options": {}
  },
  'mar-f1-motor-launch': {
    "id": "mar-f1-motor-launch",
    "name": "Basic: Highend: Motor Launch",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.73,
      "d": 12.6,
      "h": 4.2
    },
    "options": {}
  },
  'mar-f2-motor-launch': {
    "id": "mar-f2-motor-launch",
    "name": "Standard: Highend: Motor Launch",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.73,
      "d": 12.6,
      "h": 4.2
    },
    "options": {}
  },
  'mar-f3-motor-launch': {
    "id": "mar-f3-motor-launch",
    "name": "Premium: Highend: Motor Launch",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.73,
      "d": 12.6,
      "h": 4.2
    },
    "options": {}
  },
  'mar-f4-motor-launch': {
    "id": "mar-f4-motor-launch",
    "name": "Elite: Highend: Motor Launch",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.73,
      "d": 12.6,
      "h": 4.2
    },
    "options": {}
  },
  'mar-f1-navigational-buoy': {
    "id": "mar-f1-navigational-buoy",
    "name": "Basic: Highend: Navigational Buoy",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 6.3
    },
    "options": {}
  },
  'mar-f2-navigational-buoy': {
    "id": "mar-f2-navigational-buoy",
    "name": "Standard: Highend: Navigational Buoy",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 6.3
    },
    "options": {}
  },
  'mar-f3-navigational-buoy': {
    "id": "mar-f3-navigational-buoy",
    "name": "Premium: Highend: Navigational Buoy",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 6.3
    },
    "options": {}
  },
  'mar-f4-navigational-buoy': {
    "id": "mar-f4-navigational-buoy",
    "name": "Elite: Highend: Navigational Buoy",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 6.3
    },
    "options": {}
  },
  'mar-f1-ocean-observation-pier': {
    "id": "mar-f1-ocean-observation-pier",
    "name": "Basic: Highend: Ocean Observation Pier",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 78.75,
      "h": 12.6
    },
    "options": {}
  },
  'mar-f2-ocean-observation-pier': {
    "id": "mar-f2-ocean-observation-pier",
    "name": "Standard: Highend: Ocean Observation Pier",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 78.75,
      "h": 12.6
    },
    "options": {}
  },
  'mar-f3-ocean-observation-pier': {
    "id": "mar-f3-ocean-observation-pier",
    "name": "Premium: Highend: Ocean Observation Pier",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 78.75,
      "h": 12.6
    },
    "options": {}
  },
  'mar-f4-ocean-observation-pier': {
    "id": "mar-f4-ocean-observation-pier",
    "name": "Elite: Highend: Ocean Observation Pier",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 78.75,
      "h": 12.6
    },
    "options": {}
  },
  'mar-f1-ocean-oceanliner': {
    "id": "mar-f1-ocean-oceanliner",
    "name": "Basic: Highend: Ocean Oceanliner",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 33.6,
      "d": 126,
      "h": 35.7
    },
    "options": {}
  },
  'mar-f2-ocean-oceanliner': {
    "id": "mar-f2-ocean-oceanliner",
    "name": "Standard: Highend: Ocean Oceanliner",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 33.6,
      "d": 126,
      "h": 35.7
    },
    "options": {}
  },
  'mar-f3-ocean-oceanliner': {
    "id": "mar-f3-ocean-oceanliner",
    "name": "Premium: Highend: Ocean Oceanliner",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 33.6,
      "d": 126,
      "h": 35.7
    },
    "options": {}
  },
  'mar-f4-ocean-oceanliner': {
    "id": "mar-f4-ocean-oceanliner",
    "name": "Elite: Highend: Ocean Oceanliner",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 33.6,
      "d": 126,
      "h": 35.7
    },
    "options": {}
  },
  'mar-f1-offshore-supply-vessel': {
    "id": "mar-f1-offshore-supply-vessel",
    "name": "Basic: Highend: Offshore Supply Vessel",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f2-offshore-supply-vessel': {
    "id": "mar-f2-offshore-supply-vessel",
    "name": "Standard: Highend: Offshore Supply Vessel",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f3-offshore-supply-vessel': {
    "id": "mar-f3-offshore-supply-vessel",
    "name": "Premium: Highend: Offshore Supply Vessel",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f4-offshore-supply-vessel': {
    "id": "mar-f4-offshore-supply-vessel",
    "name": "Elite: Highend: Offshore Supply Vessel",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f1-open-deck-ferry': {
    "id": "mar-f1-open-deck-ferry",
    "name": "Basic: Highend: Open Deck Ferry",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'mar-f2-open-deck-ferry': {
    "id": "mar-f2-open-deck-ferry",
    "name": "Standard: Highend: Open Deck Ferry",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'mar-f3-open-deck-ferry': {
    "id": "mar-f3-open-deck-ferry",
    "name": "Premium: Highend: Open Deck Ferry",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'mar-f4-open-deck-ferry': {
    "id": "mar-f4-open-deck-ferry",
    "name": "Elite: Highend: Open Deck Ferry",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 21,
      "h": 5.25
    },
    "options": {}
  },
  'mar-f1-paddle-riverboat': {
    "id": "mar-f1-paddle-riverboat",
    "name": "Basic: Highend: Paddle Riverboat",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 50.4,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f2-paddle-riverboat': {
    "id": "mar-f2-paddle-riverboat",
    "name": "Standard: Highend: Paddle Riverboat",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 50.4,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f3-paddle-riverboat': {
    "id": "mar-f3-paddle-riverboat",
    "name": "Premium: Highend: Paddle Riverboat",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 50.4,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f4-paddle-riverboat': {
    "id": "mar-f4-paddle-riverboat",
    "name": "Elite: Highend: Paddle Riverboat",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 50.4,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f1-passenger-ferry-single-deck': {
    "id": "mar-f1-passenger-ferry-single-deck",
    "name": "Basic: Highend: Passenger Ferry Single Deck",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 35.7,
      "h": 8.93
    },
    "options": {}
  },
  'mar-f2-passenger-ferry-single-deck': {
    "id": "mar-f2-passenger-ferry-single-deck",
    "name": "Standard: Highend: Passenger Ferry Single Deck",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 35.7,
      "h": 8.93
    },
    "options": {}
  },
  'mar-f3-passenger-ferry-single-deck': {
    "id": "mar-f3-passenger-ferry-single-deck",
    "name": "Premium: Highend: Passenger Ferry Single Deck",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 35.7,
      "h": 8.93
    },
    "options": {}
  },
  'mar-f4-passenger-ferry-single-deck': {
    "id": "mar-f4-passenger-ferry-single-deck",
    "name": "Elite: Highend: Passenger Ferry Single Deck",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 35.7,
      "h": 8.93
    },
    "options": {}
  },
  'mar-f1-polar-icebreaker': {
    "id": "mar-f1-polar-icebreaker",
    "name": "Basic: Highend: Polar Icebreaker",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 78.75,
      "h": 27.3
    },
    "options": {}
  },
  'mar-f2-polar-icebreaker': {
    "id": "mar-f2-polar-icebreaker",
    "name": "Standard: Highend: Polar Icebreaker",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 78.75,
      "h": 27.3
    },
    "options": {}
  },
  'mar-f3-polar-icebreaker': {
    "id": "mar-f3-polar-icebreaker",
    "name": "Premium: Highend: Polar Icebreaker",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 78.75,
      "h": 27.3
    },
    "options": {}
  },
  'mar-f4-polar-icebreaker': {
    "id": "mar-f4-polar-icebreaker",
    "name": "Elite: Highend: Polar Icebreaker",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 78.75,
      "h": 27.3
    },
    "options": {}
  },
  'mar-f1-rigid-inflatable-boat': {
    "id": "mar-f1-rigid-inflatable-boat",
    "name": "Basic: Highend: Rigid Inflatable Boat",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.36,
      "d": 7.88,
      "h": 2.62
    },
    "options": {}
  },
  'mar-f2-rigid-inflatable-boat': {
    "id": "mar-f2-rigid-inflatable-boat",
    "name": "Standard: Highend: Rigid Inflatable Boat",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.36,
      "d": 7.88,
      "h": 2.62
    },
    "options": {}
  },
  'mar-f3-rigid-inflatable-boat': {
    "id": "mar-f3-rigid-inflatable-boat",
    "name": "Premium: Highend: Rigid Inflatable Boat",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.36,
      "d": 7.88,
      "h": 2.62
    },
    "options": {}
  },
  'mar-f4-rigid-inflatable-boat': {
    "id": "mar-f4-rigid-inflatable-boat",
    "name": "Elite: Highend: Rigid Inflatable Boat",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.36,
      "d": 7.88,
      "h": 2.62
    },
    "options": {}
  },
  'mar-f1-roll-on-roll-off-ferry': {
    "id": "mar-f1-roll-on-roll-off-ferry",
    "name": "Basic: Highend: Roll On Roll Off Ferry",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 27.3,
      "d": 89.25,
      "h": 25.2
    },
    "options": {}
  },
  'mar-f2-roll-on-roll-off-ferry': {
    "id": "mar-f2-roll-on-roll-off-ferry",
    "name": "Standard: Highend: Roll On Roll Off Ferry",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 27.3,
      "d": 89.25,
      "h": 25.2
    },
    "options": {}
  },
  'mar-f3-roll-on-roll-off-ferry': {
    "id": "mar-f3-roll-on-roll-off-ferry",
    "name": "Premium: Highend: Roll On Roll Off Ferry",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 27.3,
      "d": 89.25,
      "h": 25.2
    },
    "options": {}
  },
  'mar-f4-roll-on-roll-off-ferry': {
    "id": "mar-f4-roll-on-roll-off-ferry",
    "name": "Elite: Highend: Roll On Roll Off Ferry",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 27.3,
      "d": 89.25,
      "h": 25.2
    },
    "options": {}
  },
  'mar-f1-rowboat-skiff': {
    "id": "mar-f1-rowboat-skiff",
    "name": "Basic: Highend: Rowboat Skiff",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.1,
      "d": 5.25,
      "h": 1.47
    },
    "options": {}
  },
  'mar-f2-rowboat-skiff': {
    "id": "mar-f2-rowboat-skiff",
    "name": "Standard: Highend: Rowboat Skiff",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.1,
      "d": 5.25,
      "h": 1.47
    },
    "options": {}
  },
  'mar-f3-rowboat-skiff': {
    "id": "mar-f3-rowboat-skiff",
    "name": "Premium: Highend: Rowboat Skiff",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.1,
      "d": 5.25,
      "h": 1.47
    },
    "options": {}
  },
  'mar-f4-rowboat-skiff': {
    "id": "mar-f4-rowboat-skiff",
    "name": "Elite: Highend: Rowboat Skiff",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.1,
      "d": 5.25,
      "h": 1.47
    },
    "options": {}
  },
  'mar-f1-sailing-yacht-monohull': {
    "id": "mar-f1-sailing-yacht-monohull",
    "name": "Basic: Highend: Sailing Yacht Monohull",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 7.35,
      "d": 21,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f2-sailing-yacht-monohull': {
    "id": "mar-f2-sailing-yacht-monohull",
    "name": "Standard: Highend: Sailing Yacht Monohull",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 7.35,
      "d": 21,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f3-sailing-yacht-monohull': {
    "id": "mar-f3-sailing-yacht-monohull",
    "name": "Premium: Highend: Sailing Yacht Monohull",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 7.35,
      "d": 21,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f4-sailing-yacht-monohull': {
    "id": "mar-f4-sailing-yacht-monohull",
    "name": "Elite: Highend: Sailing Yacht Monohull",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 7.35,
      "d": 21,
      "h": 18.9
    },
    "options": {}
  },
  'mar-f1-sportfishing-cruiser': {
    "id": "mar-f1-sportfishing-cruiser",
    "name": "Basic: Highend: Sportfishing Cruiser",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.83,
      "d": 18.9,
      "h": 7.88
    },
    "options": {}
  },
  'mar-f2-sportfishing-cruiser': {
    "id": "mar-f2-sportfishing-cruiser",
    "name": "Standard: Highend: Sportfishing Cruiser",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.83,
      "d": 18.9,
      "h": 7.88
    },
    "options": {}
  },
  'mar-f3-sportfishing-cruiser': {
    "id": "mar-f3-sportfishing-cruiser",
    "name": "Premium: Highend: Sportfishing Cruiser",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.83,
      "d": 18.9,
      "h": 7.88
    },
    "options": {}
  },
  'mar-f4-sportfishing-cruiser': {
    "id": "mar-f4-sportfishing-cruiser",
    "name": "Elite: Highend: Sportfishing Cruiser",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.83,
      "d": 18.9,
      "h": 7.88
    },
    "options": {}
  },
  'mar-f1-superyacht-tri-deck': {
    "id": "mar-f1-superyacht-tri-deck",
    "name": "Basic: Highend: Superyacht Tri Deck",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 57.75,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f2-superyacht-tri-deck': {
    "id": "mar-f2-superyacht-tri-deck",
    "name": "Standard: Highend: Superyacht Tri Deck",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 57.75,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f3-superyacht-tri-deck': {
    "id": "mar-f3-superyacht-tri-deck",
    "name": "Premium: Highend: Superyacht Tri Deck",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 57.75,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f4-superyacht-tri-deck': {
    "id": "mar-f4-superyacht-tri-deck",
    "name": "Elite: Highend: Superyacht Tri Deck",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 57.75,
      "h": 16.8
    },
    "options": {}
  },
  'mar-f1-wooden-sailboat': {
    "id": "mar-f1-wooden-sailboat",
    "name": "Basic: Highend: Wooden Sailboat",
    "category": "maritime",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.2,
      "d": 11.55,
      "h": 11.55
    },
    "options": {}
  },
  'mar-f2-wooden-sailboat': {
    "id": "mar-f2-wooden-sailboat",
    "name": "Standard: Highend: Wooden Sailboat",
    "category": "maritime",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.2,
      "d": 11.55,
      "h": 11.55
    },
    "options": {}
  },
  'mar-f3-wooden-sailboat': {
    "id": "mar-f3-wooden-sailboat",
    "name": "Premium: Highend: Wooden Sailboat",
    "category": "maritime",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.2,
      "d": 11.55,
      "h": 11.55
    },
    "options": {}
  },
  'mar-f4-wooden-sailboat': {
    "id": "mar-f4-wooden-sailboat",
    "name": "Elite: Highend: Wooden Sailboat",
    "category": "maritime",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.2,
      "d": 11.55,
      "h": 11.55
    },
    "options": {}
  },
  'road-f1-90deg-road-bend': {
    "id": "road-f1-90deg-road-bend",
    "name": "Basic: Highend: 90Deg Road Bend",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f2-90deg-road-bend': {
    "id": "road-f2-90deg-road-bend",
    "name": "Standard: Highend: 90Deg Road Bend",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f3-90deg-road-bend': {
    "id": "road-f3-90deg-road-bend",
    "name": "Premium: Highend: 90Deg Road Bend",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f4-90deg-road-bend': {
    "id": "road-f4-90deg-road-bend",
    "name": "Elite: Highend: 90Deg Road Bend",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f1-alleyway-service-lane': {
    "id": "road-f1-alleyway-service-lane",
    "name": "Basic: Highend: Alleyway Service Lane",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 2.1
    },
    "options": {}
  },
  'road-f2-alleyway-service-lane': {
    "id": "road-f2-alleyway-service-lane",
    "name": "Standard: Highend: Alleyway Service Lane",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 2.1
    },
    "options": {}
  },
  'road-f3-alleyway-service-lane': {
    "id": "road-f3-alleyway-service-lane",
    "name": "Premium: Highend: Alleyway Service Lane",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 2.1
    },
    "options": {}
  },
  'road-f4-alleyway-service-lane': {
    "id": "road-f4-alleyway-service-lane",
    "name": "Elite: Highend: Alleyway Service Lane",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 2.1
    },
    "options": {}
  },
  'road-f1-asphalt-cycle-track': {
    "id": "road-f1-asphalt-cycle-track",
    "name": "Basic: Highend: Asphalt Cycle Track",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 42,
      "h": 1.58
    },
    "options": {}
  },
  'road-f2-asphalt-cycle-track': {
    "id": "road-f2-asphalt-cycle-track",
    "name": "Standard: Highend: Asphalt Cycle Track",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 42,
      "h": 1.58
    },
    "options": {}
  },
  'road-f3-asphalt-cycle-track': {
    "id": "road-f3-asphalt-cycle-track",
    "name": "Premium: Highend: Asphalt Cycle Track",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 42,
      "h": 1.58
    },
    "options": {}
  },
  'road-f4-asphalt-cycle-track': {
    "id": "road-f4-asphalt-cycle-track",
    "name": "Elite: Highend: Asphalt Cycle Track",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 42,
      "h": 1.58
    },
    "options": {}
  },
  'road-f1-bike-highway-corridor': {
    "id": "road-f1-bike-highway-corridor",
    "name": "Basic: Highend: Bike Highway Corridor",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f2-bike-highway-corridor': {
    "id": "road-f2-bike-highway-corridor",
    "name": "Standard: Highend: Bike Highway Corridor",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f3-bike-highway-corridor': {
    "id": "road-f3-bike-highway-corridor",
    "name": "Premium: Highend: Bike Highway Corridor",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f4-bike-highway-corridor': {
    "id": "road-f4-bike-highway-corridor",
    "name": "Elite: Highend: Bike Highway Corridor",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f1-brick-herringbone-lane': {
    "id": "road-f1-brick-herringbone-lane",
    "name": "Basic: Highend: Brick Herringbone Lane",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f2-brick-herringbone-lane': {
    "id": "road-f2-brick-herringbone-lane",
    "name": "Standard: Highend: Brick Herringbone Lane",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f3-brick-herringbone-lane': {
    "id": "road-f3-brick-herringbone-lane",
    "name": "Premium: Highend: Brick Herringbone Lane",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f4-brick-herringbone-lane': {
    "id": "road-f4-brick-herringbone-lane",
    "name": "Elite: Highend: Brick Herringbone Lane",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f1-cobblestone-plaza-crossing': {
    "id": "road-f1-cobblestone-plaza-crossing",
    "name": "Basic: Highend: Cobblestone Plaza Crossing",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 3.68
    },
    "options": {}
  },
  'road-f2-cobblestone-plaza-crossing': {
    "id": "road-f2-cobblestone-plaza-crossing",
    "name": "Standard: Highend: Cobblestone Plaza Crossing",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 3.68
    },
    "options": {}
  },
  'road-f3-cobblestone-plaza-crossing': {
    "id": "road-f3-cobblestone-plaza-crossing",
    "name": "Premium: Highend: Cobblestone Plaza Crossing",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 3.68
    },
    "options": {}
  },
  'road-f4-cobblestone-plaza-crossing': {
    "id": "road-f4-cobblestone-plaza-crossing",
    "name": "Elite: Highend: Cobblestone Plaza Crossing",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 3.68
    },
    "options": {}
  },
  'road-f1-commercial-main-street': {
    "id": "road-f1-commercial-main-street",
    "name": "Basic: Highend: Commercial Main Street",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 67.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f2-commercial-main-street': {
    "id": "road-f2-commercial-main-street",
    "name": "Standard: Highend: Commercial Main Street",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 67.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f3-commercial-main-street': {
    "id": "road-f3-commercial-main-street",
    "name": "Premium: Highend: Commercial Main Street",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 67.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f4-commercial-main-street': {
    "id": "road-f4-commercial-main-street",
    "name": "Elite: Highend: Commercial Main Street",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 67.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f1-concrete-service-drive': {
    "id": "road-f1-concrete-service-drive",
    "name": "Basic: Highend: Concrete Service Drive",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 36.75,
      "h": 2.1
    },
    "options": {}
  },
  'road-f2-concrete-service-drive': {
    "id": "road-f2-concrete-service-drive",
    "name": "Standard: Highend: Concrete Service Drive",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 36.75,
      "h": 2.1
    },
    "options": {}
  },
  'road-f3-concrete-service-drive': {
    "id": "road-f3-concrete-service-drive",
    "name": "Premium: Highend: Concrete Service Drive",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 36.75,
      "h": 2.1
    },
    "options": {}
  },
  'road-f4-concrete-service-drive': {
    "id": "road-f4-concrete-service-drive",
    "name": "Elite: Highend: Concrete Service Drive",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 36.75,
      "h": 2.1
    },
    "options": {}
  },
  'road-f1-country-gravel-road': {
    "id": "road-f1-country-gravel-road",
    "name": "Basic: Highend: Country Gravel Road",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 14.7,
      "d": 52.5,
      "h": 1.89
    },
    "options": {}
  },
  'road-f2-country-gravel-road': {
    "id": "road-f2-country-gravel-road",
    "name": "Standard: Highend: Country Gravel Road",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 14.7,
      "d": 52.5,
      "h": 1.89
    },
    "options": {}
  },
  'road-f3-country-gravel-road': {
    "id": "road-f3-country-gravel-road",
    "name": "Premium: Highend: Country Gravel Road",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 14.7,
      "d": 52.5,
      "h": 1.89
    },
    "options": {}
  },
  'road-f4-country-gravel-road': {
    "id": "road-f4-country-gravel-road",
    "name": "Elite: Highend: Country Gravel Road",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 14.7,
      "d": 52.5,
      "h": 1.89
    },
    "options": {}
  },
  'road-f1-culdesac-turnaround': {
    "id": "road-f1-culdesac-turnaround",
    "name": "Basic: Highend: Culdesac Turnaround",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 2.62
    },
    "options": {}
  },
  'road-f2-culdesac-turnaround': {
    "id": "road-f2-culdesac-turnaround",
    "name": "Standard: Highend: Culdesac Turnaround",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 2.62
    },
    "options": {}
  },
  'road-f3-culdesac-turnaround': {
    "id": "road-f3-culdesac-turnaround",
    "name": "Premium: Highend: Culdesac Turnaround",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 2.62
    },
    "options": {}
  },
  'road-f4-culdesac-turnaround': {
    "id": "road-f4-culdesac-turnaround",
    "name": "Elite: Highend: Culdesac Turnaround",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 2.62
    },
    "options": {}
  },
  'road-f1-curved-park-drive': {
    "id": "road-f1-curved-park-drive",
    "name": "Basic: Highend: Curved Park Drive",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 63,
      "h": 4.73
    },
    "options": {}
  },
  'road-f2-curved-park-drive': {
    "id": "road-f2-curved-park-drive",
    "name": "Standard: Highend: Curved Park Drive",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 63,
      "h": 4.73
    },
    "options": {}
  },
  'road-f3-curved-park-drive': {
    "id": "road-f3-curved-park-drive",
    "name": "Premium: Highend: Curved Park Drive",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 63,
      "h": 4.73
    },
    "options": {}
  },
  'road-f4-curved-park-drive': {
    "id": "road-f4-curved-park-drive",
    "name": "Elite: Highend: Curved Park Drive",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 63,
      "h": 4.73
    },
    "options": {}
  },
  'road-f1-curved-suburban-bend': {
    "id": "road-f1-curved-suburban-bend",
    "name": "Basic: Highend: Curved Suburban Bend",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 27.3,
      "d": 27.3,
      "h": 3.15
    },
    "options": {}
  },
  'road-f2-curved-suburban-bend': {
    "id": "road-f2-curved-suburban-bend",
    "name": "Standard: Highend: Curved Suburban Bend",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 27.3,
      "d": 27.3,
      "h": 3.15
    },
    "options": {}
  },
  'road-f3-curved-suburban-bend': {
    "id": "road-f3-curved-suburban-bend",
    "name": "Premium: Highend: Curved Suburban Bend",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 27.3,
      "d": 27.3,
      "h": 3.15
    },
    "options": {}
  },
  'road-f4-curved-suburban-bend': {
    "id": "road-f4-curved-suburban-bend",
    "name": "Elite: Highend: Curved Suburban Bend",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 27.3,
      "d": 27.3,
      "h": 3.15
    },
    "options": {}
  },
  'road-f1-curving-harbor-ring': {
    "id": "road-f1-curving-harbor-ring",
    "name": "Basic: Highend: Curving Harbor Ring",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 50.4,
      "d": 50.4,
      "h": 6.3
    },
    "options": {}
  },
  'road-f2-curving-harbor-ring': {
    "id": "road-f2-curving-harbor-ring",
    "name": "Standard: Highend: Curving Harbor Ring",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 50.4,
      "d": 50.4,
      "h": 6.3
    },
    "options": {}
  },
  'road-f3-curving-harbor-ring': {
    "id": "road-f3-curving-harbor-ring",
    "name": "Premium: Highend: Curving Harbor Ring",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 50.4,
      "d": 50.4,
      "h": 6.3
    },
    "options": {}
  },
  'road-f4-curving-harbor-ring': {
    "id": "road-f4-curving-harbor-ring",
    "name": "Elite: Highend: Curving Harbor Ring",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 50.4,
      "d": 50.4,
      "h": 6.3
    },
    "options": {}
  },
  'road-f1-diagonal-avenue-plaza': {
    "id": "road-f1-diagonal-avenue-plaza",
    "name": "Basic: Highend: Diagonal Avenue Plaza",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 46.2,
      "d": 46.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f2-diagonal-avenue-plaza': {
    "id": "road-f2-diagonal-avenue-plaza",
    "name": "Standard: Highend: Diagonal Avenue Plaza",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 46.2,
      "d": 46.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f3-diagonal-avenue-plaza': {
    "id": "road-f3-diagonal-avenue-plaza",
    "name": "Premium: Highend: Diagonal Avenue Plaza",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 46.2,
      "d": 46.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f4-diagonal-avenue-plaza': {
    "id": "road-f4-diagonal-avenue-plaza",
    "name": "Elite: Highend: Diagonal Avenue Plaza",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 46.2,
      "d": 46.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f1-diagonal-turn-pocket': {
    "id": "road-f1-diagonal-turn-pocket",
    "name": "Basic: Highend: Diagonal Turn Pocket",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 50.4,
      "h": 3.15
    },
    "options": {}
  },
  'road-f2-diagonal-turn-pocket': {
    "id": "road-f2-diagonal-turn-pocket",
    "name": "Standard: Highend: Diagonal Turn Pocket",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 50.4,
      "h": 3.15
    },
    "options": {}
  },
  'road-f3-diagonal-turn-pocket': {
    "id": "road-f3-diagonal-turn-pocket",
    "name": "Premium: Highend: Diagonal Turn Pocket",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 50.4,
      "h": 3.15
    },
    "options": {}
  },
  'road-f4-diagonal-turn-pocket': {
    "id": "road-f4-diagonal-turn-pocket",
    "name": "Elite: Highend: Diagonal Turn Pocket",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 50.4,
      "h": 3.15
    },
    "options": {}
  },
  'road-f1-divided-highway-segment': {
    "id": "road-f1-divided-highway-segment",
    "name": "Basic: Highend: Divided Highway Segment",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 31.5,
      "d": 67.2,
      "h": 3.68
    },
    "options": {}
  },
  'road-f2-divided-highway-segment': {
    "id": "road-f2-divided-highway-segment",
    "name": "Standard: Highend: Divided Highway Segment",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 31.5,
      "d": 67.2,
      "h": 3.68
    },
    "options": {}
  },
  'road-f3-divided-highway-segment': {
    "id": "road-f3-divided-highway-segment",
    "name": "Premium: Highend: Divided Highway Segment",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 31.5,
      "d": 67.2,
      "h": 3.68
    },
    "options": {}
  },
  'road-f4-divided-highway-segment': {
    "id": "road-f4-divided-highway-segment",
    "name": "Elite: Highend: Divided Highway Segment",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 31.5,
      "d": 67.2,
      "h": 3.68
    },
    "options": {}
  },
  'road-f1-expressway-interchange': {
    "id": "road-f1-expressway-interchange",
    "name": "Basic: Highend: Expressway Interchange",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 67.2,
      "d": 67.2,
      "h": 16.8
    },
    "options": {}
  },
  'road-f2-expressway-interchange': {
    "id": "road-f2-expressway-interchange",
    "name": "Standard: Highend: Expressway Interchange",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 67.2,
      "d": 67.2,
      "h": 16.8
    },
    "options": {}
  },
  'road-f3-expressway-interchange': {
    "id": "road-f3-expressway-interchange",
    "name": "Premium: Highend: Expressway Interchange",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 67.2,
      "d": 67.2,
      "h": 16.8
    },
    "options": {}
  },
  'road-f4-expressway-interchange': {
    "id": "road-f4-expressway-interchange",
    "name": "Elite: Highend: Expressway Interchange",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 67.2,
      "d": 67.2,
      "h": 16.8
    },
    "options": {}
  },
  'road-f1-flagstone-park-path': {
    "id": "road-f1-flagstone-park-path",
    "name": "Basic: Highend: Flagstone Park Path",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 36.75,
      "h": 1.26
    },
    "options": {}
  },
  'road-f2-flagstone-park-path': {
    "id": "road-f2-flagstone-park-path",
    "name": "Standard: Highend: Flagstone Park Path",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 36.75,
      "h": 1.26
    },
    "options": {}
  },
  'road-f3-flagstone-park-path': {
    "id": "road-f3-flagstone-park-path",
    "name": "Premium: Highend: Flagstone Park Path",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 36.75,
      "h": 1.26
    },
    "options": {}
  },
  'road-f4-flagstone-park-path': {
    "id": "road-f4-flagstone-park-path",
    "name": "Elite: Highend: Flagstone Park Path",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 36.75,
      "h": 1.26
    },
    "options": {}
  },
  'road-f1-garden-stepping-stones': {
    "id": "road-f1-garden-stepping-stones",
    "name": "Basic: Highend: Garden Stepping Stones",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 31.5,
      "h": 1.05
    },
    "options": {}
  },
  'road-f2-garden-stepping-stones': {
    "id": "road-f2-garden-stepping-stones",
    "name": "Standard: Highend: Garden Stepping Stones",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 31.5,
      "h": 1.05
    },
    "options": {}
  },
  'road-f3-garden-stepping-stones': {
    "id": "road-f3-garden-stepping-stones",
    "name": "Premium: Highend: Garden Stepping Stones",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 31.5,
      "h": 1.05
    },
    "options": {}
  },
  'road-f4-garden-stepping-stones': {
    "id": "road-f4-garden-stepping-stones",
    "name": "Elite: Highend: Garden Stepping Stones",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 31.5,
      "h": 1.05
    },
    "options": {}
  },
  'road-f1-grand-boulevard-median': {
    "id": "road-f1-grand-boulevard-median",
    "name": "Basic: Highend: Grand Boulevard Median",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 33.6,
      "d": 67.2,
      "h": 4.2
    },
    "options": {}
  },
  'road-f2-grand-boulevard-median': {
    "id": "road-f2-grand-boulevard-median",
    "name": "Standard: Highend: Grand Boulevard Median",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 33.6,
      "d": 67.2,
      "h": 4.2
    },
    "options": {}
  },
  'road-f3-grand-boulevard-median': {
    "id": "road-f3-grand-boulevard-median",
    "name": "Premium: Highend: Grand Boulevard Median",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 33.6,
      "d": 67.2,
      "h": 4.2
    },
    "options": {}
  },
  'road-f4-grand-boulevard-median': {
    "id": "road-f4-grand-boulevard-median",
    "name": "Elite: Highend: Grand Boulevard Median",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 33.6,
      "d": 67.2,
      "h": 4.2
    },
    "options": {}
  },
  'road-f1-grand-canal-avenue': {
    "id": "road-f1-grand-canal-avenue",
    "name": "Basic: Highend: Grand Canal Avenue",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 37.8,
      "d": 67.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f2-grand-canal-avenue': {
    "id": "road-f2-grand-canal-avenue",
    "name": "Standard: Highend: Grand Canal Avenue",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 37.8,
      "d": 67.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f3-grand-canal-avenue': {
    "id": "road-f3-grand-canal-avenue",
    "name": "Premium: Highend: Grand Canal Avenue",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 37.8,
      "d": 67.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f4-grand-canal-avenue': {
    "id": "road-f4-grand-canal-avenue",
    "name": "Elite: Highend: Grand Canal Avenue",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 37.8,
      "d": 67.2,
      "h": 5.25
    },
    "options": {}
  },
  'road-f1-industrial-collector': {
    "id": "road-f1-industrial-collector",
    "name": "Basic: Highend: Industrial Collector",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 27.3,
      "d": 63,
      "h": 4.2
    },
    "options": {}
  },
  'road-f2-industrial-collector': {
    "id": "road-f2-industrial-collector",
    "name": "Standard: Highend: Industrial Collector",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 27.3,
      "d": 63,
      "h": 4.2
    },
    "options": {}
  },
  'road-f3-industrial-collector': {
    "id": "road-f3-industrial-collector",
    "name": "Premium: Highend: Industrial Collector",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 27.3,
      "d": 63,
      "h": 4.2
    },
    "options": {}
  },
  'road-f4-industrial-collector': {
    "id": "road-f4-industrial-collector",
    "name": "Elite: Highend: Industrial Collector",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 27.3,
      "d": 63,
      "h": 4.2
    },
    "options": {}
  },
  'road-f1-monumental-roundabout': {
    "id": "road-f1-monumental-roundabout",
    "name": "Basic: Highend: Monumental Roundabout",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 58.8,
      "d": 58.8,
      "h": 12.6
    },
    "options": {}
  },
  'road-f2-monumental-roundabout': {
    "id": "road-f2-monumental-roundabout",
    "name": "Standard: Highend: Monumental Roundabout",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 58.8,
      "d": 58.8,
      "h": 12.6
    },
    "options": {}
  },
  'road-f3-monumental-roundabout': {
    "id": "road-f3-monumental-roundabout",
    "name": "Premium: Highend: Monumental Roundabout",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 58.8,
      "d": 58.8,
      "h": 12.6
    },
    "options": {}
  },
  'road-f4-monumental-roundabout': {
    "id": "road-f4-monumental-roundabout",
    "name": "Elite: Highend: Monumental Roundabout",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 58.8,
      "d": 58.8,
      "h": 12.6
    },
    "options": {}
  },
  'road-f1-multi-tier-flyover': {
    "id": "road-f1-multi-tier-flyover",
    "name": "Basic: Highend: Multi Tier Flyover",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 42,
      "d": 67.2,
      "h": 21
    },
    "options": {}
  },
  'road-f2-multi-tier-flyover': {
    "id": "road-f2-multi-tier-flyover",
    "name": "Standard: Highend: Multi Tier Flyover",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 42,
      "d": 67.2,
      "h": 21
    },
    "options": {}
  },
  'road-f3-multi-tier-flyover': {
    "id": "road-f3-multi-tier-flyover",
    "name": "Premium: Highend: Multi Tier Flyover",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 42,
      "d": 67.2,
      "h": 21
    },
    "options": {}
  },
  'road-f4-multi-tier-flyover': {
    "id": "road-f4-multi-tier-flyover",
    "name": "Elite: Highend: Multi Tier Flyover",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 42,
      "d": 67.2,
      "h": 21
    },
    "options": {}
  },
  'road-f1-pavers-pedestrian-walk': {
    "id": "road-f1-pavers-pedestrian-walk",
    "name": "Basic: Highend: Pavers Pedestrian Walk",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 1.58
    },
    "options": {}
  },
  'road-f2-pavers-pedestrian-walk': {
    "id": "road-f2-pavers-pedestrian-walk",
    "name": "Standard: Highend: Pavers Pedestrian Walk",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 1.58
    },
    "options": {}
  },
  'road-f3-pavers-pedestrian-walk': {
    "id": "road-f3-pavers-pedestrian-walk",
    "name": "Premium: Highend: Pavers Pedestrian Walk",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 1.58
    },
    "options": {}
  },
  'road-f4-pavers-pedestrian-walk': {
    "id": "road-f4-pavers-pedestrian-walk",
    "name": "Elite: Highend: Pavers Pedestrian Walk",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 42,
      "h": 1.58
    },
    "options": {}
  },
  'road-f1-pedestrian-mall-walkway': {
    "id": "road-f1-pedestrian-mall-walkway",
    "name": "Basic: Highend: Pedestrian Mall Walkway",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 18.9,
      "d": 52.5,
      "h": 3.15
    },
    "options": {}
  },
  'road-f2-pedestrian-mall-walkway': {
    "id": "road-f2-pedestrian-mall-walkway",
    "name": "Standard: Highend: Pedestrian Mall Walkway",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 18.9,
      "d": 52.5,
      "h": 3.15
    },
    "options": {}
  },
  'road-f3-pedestrian-mall-walkway': {
    "id": "road-f3-pedestrian-mall-walkway",
    "name": "Premium: Highend: Pedestrian Mall Walkway",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 18.9,
      "d": 52.5,
      "h": 3.15
    },
    "options": {}
  },
  'road-f4-pedestrian-mall-walkway': {
    "id": "road-f4-pedestrian-mall-walkway",
    "name": "Elite: Highend: Pedestrian Mall Walkway",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 18.9,
      "d": 52.5,
      "h": 3.15
    },
    "options": {}
  },
  'road-f1-promenade-esplanade': {
    "id": "road-f1-promenade-esplanade",
    "name": "Basic: Highend: Promenade Esplanade",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 29.4,
      "d": 67.2,
      "h": 6.3
    },
    "options": {}
  },
  'road-f2-promenade-esplanade': {
    "id": "road-f2-promenade-esplanade",
    "name": "Standard: Highend: Promenade Esplanade",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 29.4,
      "d": 67.2,
      "h": 6.3
    },
    "options": {}
  },
  'road-f3-promenade-esplanade': {
    "id": "road-f3-promenade-esplanade",
    "name": "Premium: Highend: Promenade Esplanade",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 29.4,
      "d": 67.2,
      "h": 6.3
    },
    "options": {}
  },
  'road-f4-promenade-esplanade': {
    "id": "road-f4-promenade-esplanade",
    "name": "Elite: Highend: Promenade Esplanade",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 29.4,
      "d": 67.2,
      "h": 6.3
    },
    "options": {}
  },
  'road-f1-residential-culdesac': {
    "id": "road-f1-residential-culdesac",
    "name": "Basic: Highend: Residential Culdesac",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 31.5,
      "d": 36.75,
      "h": 2.62
    },
    "options": {}
  },
  'road-f2-residential-culdesac': {
    "id": "road-f2-residential-culdesac",
    "name": "Standard: Highend: Residential Culdesac",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 31.5,
      "d": 36.75,
      "h": 2.62
    },
    "options": {}
  },
  'road-f3-residential-culdesac': {
    "id": "road-f3-residential-culdesac",
    "name": "Premium: Highend: Residential Culdesac",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 31.5,
      "d": 36.75,
      "h": 2.62
    },
    "options": {}
  },
  'road-f4-residential-culdesac': {
    "id": "road-f4-residential-culdesac",
    "name": "Elite: Highend: Residential Culdesac",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 31.5,
      "d": 36.75,
      "h": 2.62
    },
    "options": {}
  },
  'road-f1-standard-2lane-street': {
    "id": "road-f1-standard-2lane-street",
    "name": "Basic: Highend: Standard 2Lane Street",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f2-standard-2lane-street': {
    "id": "road-f2-standard-2lane-street",
    "name": "Standard: Highend: Standard 2Lane Street",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f3-standard-2lane-street': {
    "id": "road-f3-standard-2lane-street",
    "name": "Premium: Highend: Standard 2Lane Street",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f4-standard-2lane-street': {
    "id": "road-f4-standard-2lane-street",
    "name": "Elite: Highend: Standard 2Lane Street",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 52.5,
      "h": 2.62
    },
    "options": {}
  },
  'road-f1-standard-3way-t-junction': {
    "id": "road-f1-standard-3way-t-junction",
    "name": "Basic: Highend: Standard 3Way T Junction",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f2-standard-3way-t-junction': {
    "id": "road-f2-standard-3way-t-junction",
    "name": "Standard: Highend: Standard 3Way T Junction",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f3-standard-3way-t-junction': {
    "id": "road-f3-standard-3way-t-junction",
    "name": "Premium: Highend: Standard 3Way T Junction",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f4-standard-3way-t-junction': {
    "id": "road-f4-standard-3way-t-junction",
    "name": "Elite: Highend: Standard 3Way T Junction",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f1-standard-4way-intersection': {
    "id": "road-f1-standard-4way-intersection",
    "name": "Basic: Highend: Standard 4Way Intersection",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f2-standard-4way-intersection': {
    "id": "road-f2-standard-4way-intersection",
    "name": "Standard: Highend: Standard 4Way Intersection",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f3-standard-4way-intersection': {
    "id": "road-f3-standard-4way-intersection",
    "name": "Premium: Highend: Standard 4Way Intersection",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f4-standard-4way-intersection': {
    "id": "road-f4-standard-4way-intersection",
    "name": "Elite: Highend: Standard 4Way Intersection",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 3.15
    },
    "options": {}
  },
  'road-f1-stone-arch-causeway': {
    "id": "road-f1-stone-arch-causeway",
    "name": "Basic: Highend: Stone Arch Causeway",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 23.1,
      "d": 67.2,
      "h": 10.5
    },
    "options": {}
  },
  'road-f2-stone-arch-causeway': {
    "id": "road-f2-stone-arch-causeway",
    "name": "Standard: Highend: Stone Arch Causeway",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 23.1,
      "d": 67.2,
      "h": 10.5
    },
    "options": {}
  },
  'road-f3-stone-arch-causeway': {
    "id": "road-f3-stone-arch-causeway",
    "name": "Premium: Highend: Stone Arch Causeway",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 23.1,
      "d": 67.2,
      "h": 10.5
    },
    "options": {}
  },
  'road-f4-stone-arch-causeway': {
    "id": "road-f4-stone-arch-causeway",
    "name": "Elite: Highend: Stone Arch Causeway",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 23.1,
      "d": 67.2,
      "h": 10.5
    },
    "options": {}
  },
  'road-f1-suburban-avenue': {
    "id": "road-f1-suburban-avenue",
    "name": "Basic: Highend: Suburban Avenue",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 3.15
    },
    "options": {}
  },
  'road-f2-suburban-avenue': {
    "id": "road-f2-suburban-avenue",
    "name": "Standard: Highend: Suburban Avenue",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 3.15
    },
    "options": {}
  },
  'road-f3-suburban-avenue': {
    "id": "road-f3-suburban-avenue",
    "name": "Premium: Highend: Suburban Avenue",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 3.15
    },
    "options": {}
  },
  'road-f4-suburban-avenue': {
    "id": "road-f4-suburban-avenue",
    "name": "Elite: Highend: Suburban Avenue",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 21,
      "d": 63,
      "h": 3.15
    },
    "options": {}
  },
  'road-f1-sunken-rail-corridor': {
    "id": "road-f1-sunken-rail-corridor",
    "name": "Basic: Highend: Sunken Rail Corridor",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 31.5,
      "d": 67.2,
      "h": 8.4
    },
    "options": {}
  },
  'road-f2-sunken-rail-corridor': {
    "id": "road-f2-sunken-rail-corridor",
    "name": "Standard: Highend: Sunken Rail Corridor",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 31.5,
      "d": 67.2,
      "h": 8.4
    },
    "options": {}
  },
  'road-f3-sunken-rail-corridor': {
    "id": "road-f3-sunken-rail-corridor",
    "name": "Premium: Highend: Sunken Rail Corridor",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 31.5,
      "d": 67.2,
      "h": 8.4
    },
    "options": {}
  },
  'road-f4-sunken-rail-corridor': {
    "id": "road-f4-sunken-rail-corridor",
    "name": "Elite: Highend: Sunken Rail Corridor",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 31.5,
      "d": 67.2,
      "h": 8.4
    },
    "options": {}
  },
  'road-f1-terraced-stone-stairway': {
    "id": "road-f1-terraced-stone-stairway",
    "name": "Basic: Highend: Terraced Stone Stairway",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 42,
      "h": 12.6
    },
    "options": {}
  },
  'road-f2-terraced-stone-stairway': {
    "id": "road-f2-terraced-stone-stairway",
    "name": "Standard: Highend: Terraced Stone Stairway",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 42,
      "h": 12.6
    },
    "options": {}
  },
  'road-f3-terraced-stone-stairway': {
    "id": "road-f3-terraced-stone-stairway",
    "name": "Premium: Highend: Terraced Stone Stairway",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 42,
      "h": 12.6
    },
    "options": {}
  },
  'road-f4-terraced-stone-stairway': {
    "id": "road-f4-terraced-stone-stairway",
    "name": "Elite: Highend: Terraced Stone Stairway",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 42,
      "h": 12.6
    },
    "options": {}
  },
  'road-f1-timber-boardwalk-path': {
    "id": "road-f1-timber-boardwalk-path",
    "name": "Basic: Highend: Timber Boardwalk Path",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 36.75,
      "h": 1.58
    },
    "options": {}
  },
  'road-f2-timber-boardwalk-path': {
    "id": "road-f2-timber-boardwalk-path",
    "name": "Standard: Highend: Timber Boardwalk Path",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 36.75,
      "h": 1.58
    },
    "options": {}
  },
  'road-f3-timber-boardwalk-path': {
    "id": "road-f3-timber-boardwalk-path",
    "name": "Premium: Highend: Timber Boardwalk Path",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 36.75,
      "h": 1.58
    },
    "options": {}
  },
  'road-f4-timber-boardwalk-path': {
    "id": "road-f4-timber-boardwalk-path",
    "name": "Elite: Highend: Timber Boardwalk Path",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 36.75,
      "h": 1.58
    },
    "options": {}
  },
  'road-f1-tram-boulevard': {
    "id": "road-f1-tram-boulevard",
    "name": "Basic: Highend: Tram Boulevard",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 29.4,
      "d": 67.2,
      "h": 6.3
    },
    "options": {}
  },
  'road-f2-tram-boulevard': {
    "id": "road-f2-tram-boulevard",
    "name": "Standard: Highend: Tram Boulevard",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 29.4,
      "d": 67.2,
      "h": 6.3
    },
    "options": {}
  },
  'road-f3-tram-boulevard': {
    "id": "road-f3-tram-boulevard",
    "name": "Premium: Highend: Tram Boulevard",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 29.4,
      "d": 67.2,
      "h": 6.3
    },
    "options": {}
  },
  'road-f4-tram-boulevard': {
    "id": "road-f4-tram-boulevard",
    "name": "Elite: Highend: Tram Boulevard",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 29.4,
      "d": 67.2,
      "h": 6.3
    },
    "options": {}
  },
  'road-f1-tram-interchange-junction': {
    "id": "road-f1-tram-interchange-junction",
    "name": "Basic: Highend: Tram Interchange Junction",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 5.78
    },
    "options": {}
  },
  'road-f2-tram-interchange-junction': {
    "id": "road-f2-tram-interchange-junction",
    "name": "Standard: Highend: Tram Interchange Junction",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 5.78
    },
    "options": {}
  },
  'road-f3-tram-interchange-junction': {
    "id": "road-f3-tram-interchange-junction",
    "name": "Premium: Highend: Tram Interchange Junction",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 5.78
    },
    "options": {}
  },
  'road-f4-tram-interchange-junction': {
    "id": "road-f4-tram-interchange-junction",
    "name": "Elite: Highend: Tram Interchange Junction",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 5.78
    },
    "options": {}
  },
  'road-f1-tree-lined-avenue': {
    "id": "road-f1-tree-lined-avenue",
    "name": "Basic: Highend: Tree Lined Avenue",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 27.3,
      "d": 67.2,
      "h": 7.35
    },
    "options": {}
  },
  'road-f2-tree-lined-avenue': {
    "id": "road-f2-tree-lined-avenue",
    "name": "Standard: Highend: Tree Lined Avenue",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 27.3,
      "d": 67.2,
      "h": 7.35
    },
    "options": {}
  },
  'road-f3-tree-lined-avenue': {
    "id": "road-f3-tree-lined-avenue",
    "name": "Premium: Highend: Tree Lined Avenue",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 27.3,
      "d": 67.2,
      "h": 7.35
    },
    "options": {}
  },
  'road-f4-tree-lined-avenue': {
    "id": "road-f4-tree-lined-avenue",
    "name": "Elite: Highend: Tree Lined Avenue",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 27.3,
      "d": 67.2,
      "h": 7.35
    },
    "options": {}
  },
  'road-f1-waterfront-boardwalk-run': {
    "id": "road-f1-waterfront-boardwalk-run",
    "name": "Basic: Highend: Waterfront Boardwalk Run",
    "category": "roads",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 16.8,
      "d": 57.75,
      "h": 3.68
    },
    "options": {}
  },
  'road-f2-waterfront-boardwalk-run': {
    "id": "road-f2-waterfront-boardwalk-run",
    "name": "Standard: Highend: Waterfront Boardwalk Run",
    "category": "roads",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 16.8,
      "d": 57.75,
      "h": 3.68
    },
    "options": {}
  },
  'road-f3-waterfront-boardwalk-run': {
    "id": "road-f3-waterfront-boardwalk-run",
    "name": "Premium: Highend: Waterfront Boardwalk Run",
    "category": "roads",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 16.8,
      "d": 57.75,
      "h": 3.68
    },
    "options": {}
  },
  'road-f4-waterfront-boardwalk-run': {
    "id": "road-f4-waterfront-boardwalk-run",
    "name": "Elite: Highend: Waterfront Boardwalk Run",
    "category": "roads",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 16.8,
      "d": 57.75,
      "h": 3.68
    },
    "options": {}
  },
  'veg-f1-ancient-oak': {
    "id": "veg-f1-ancient-oak",
    "name": "Basic: Highend: Ancient Oak",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 12.6,
      "d": 12.6,
      "h": 14.7
    },
    "options": {}
  },
  'veg-f2-ancient-oak': {
    "id": "veg-f2-ancient-oak",
    "name": "Standard: Highend: Ancient Oak",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 12.6,
      "d": 12.6,
      "h": 14.7
    },
    "options": {}
  },
  'veg-f3-ancient-oak': {
    "id": "veg-f3-ancient-oak",
    "name": "Premium: Highend: Ancient Oak",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 12.6,
      "d": 12.6,
      "h": 14.7
    },
    "options": {}
  },
  'veg-f4-ancient-oak': {
    "id": "veg-f4-ancient-oak",
    "name": "Elite: Highend: Ancient Oak",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 12.6,
      "d": 12.6,
      "h": 14.7
    },
    "options": {}
  },
  'veg-f1-bamboo-grove': {
    "id": "veg-f1-bamboo-grove",
    "name": "Basic: Highend: Bamboo Grove",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 7.35
    },
    "options": {}
  },
  'veg-f2-bamboo-grove': {
    "id": "veg-f2-bamboo-grove",
    "name": "Standard: Highend: Bamboo Grove",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 7.35
    },
    "options": {}
  },
  'veg-f3-bamboo-grove': {
    "id": "veg-f3-bamboo-grove",
    "name": "Premium: Highend: Bamboo Grove",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 7.35
    },
    "options": {}
  },
  'veg-f4-bamboo-grove': {
    "id": "veg-f4-bamboo-grove",
    "name": "Elite: Highend: Bamboo Grove",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 7.35
    },
    "options": {}
  },
  'veg-f1-blooming-sakura': {
    "id": "veg-f1-blooming-sakura",
    "name": "Basic: Highend: Blooming Sakura",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 7.88
    },
    "options": {}
  },
  'veg-f2-blooming-sakura': {
    "id": "veg-f2-blooming-sakura",
    "name": "Standard: Highend: Blooming Sakura",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 7.88
    },
    "options": {}
  },
  'veg-f3-blooming-sakura': {
    "id": "veg-f3-blooming-sakura",
    "name": "Premium: Highend: Blooming Sakura",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 7.88
    },
    "options": {}
  },
  'veg-f4-blooming-sakura': {
    "id": "veg-f4-blooming-sakura",
    "name": "Elite: Highend: Blooming Sakura",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 7.88
    },
    "options": {}
  },
  'veg-f1-blue-spruce': {
    "id": "veg-f1-blue-spruce",
    "name": "Basic: Highend: Blue Spruce",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 11.55
    },
    "options": {}
  },
  'veg-f2-blue-spruce': {
    "id": "veg-f2-blue-spruce",
    "name": "Standard: Highend: Blue Spruce",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 11.55
    },
    "options": {}
  },
  'veg-f3-blue-spruce': {
    "id": "veg-f3-blue-spruce",
    "name": "Premium: Highend: Blue Spruce",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 11.55
    },
    "options": {}
  },
  'veg-f4-blue-spruce': {
    "id": "veg-f4-blue-spruce",
    "name": "Elite: Highend: Blue Spruce",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 11.55
    },
    "options": {}
  },
  'veg-f1-bonsai-pine': {
    "id": "veg-f1-bonsai-pine",
    "name": "Basic: Highend: Bonsai Pine",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 3.68
    },
    "options": {}
  },
  'veg-f2-bonsai-pine': {
    "id": "veg-f2-bonsai-pine",
    "name": "Standard: Highend: Bonsai Pine",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 3.68
    },
    "options": {}
  },
  'veg-f3-bonsai-pine': {
    "id": "veg-f3-bonsai-pine",
    "name": "Premium: Highend: Bonsai Pine",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 3.68
    },
    "options": {}
  },
  'veg-f4-bonsai-pine': {
    "id": "veg-f4-bonsai-pine",
    "name": "Elite: Highend: Bonsai Pine",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 3.68
    },
    "options": {}
  },
  'veg-f1-boxwood-ball': {
    "id": "veg-f1-boxwood-ball",
    "name": "Basic: Highend: Boxwood Ball",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.62,
      "d": 2.62,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f2-boxwood-ball': {
    "id": "veg-f2-boxwood-ball",
    "name": "Standard: Highend: Boxwood Ball",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.62,
      "d": 2.62,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f3-boxwood-ball': {
    "id": "veg-f3-boxwood-ball",
    "name": "Premium: Highend: Boxwood Ball",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.62,
      "d": 2.62,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f4-boxwood-ball': {
    "id": "veg-f4-boxwood-ball",
    "name": "Elite: Highend: Boxwood Ball",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.62,
      "d": 2.62,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f1-coastal-redwood': {
    "id": "veg-f1-coastal-redwood",
    "name": "Basic: Highend: Coastal Redwood",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 25.2
    },
    "options": {}
  },
  'veg-f2-coastal-redwood': {
    "id": "veg-f2-coastal-redwood",
    "name": "Standard: Highend: Coastal Redwood",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 25.2
    },
    "options": {}
  },
  'veg-f3-coastal-redwood': {
    "id": "veg-f3-coastal-redwood",
    "name": "Premium: Highend: Coastal Redwood",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 25.2
    },
    "options": {}
  },
  'veg-f4-coastal-redwood': {
    "id": "veg-f4-coastal-redwood",
    "name": "Elite: Highend: Coastal Redwood",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 25.2
    },
    "options": {}
  },
  'veg-f1-cypress-spire': {
    "id": "veg-f1-cypress-spire",
    "name": "Basic: Highend: Cypress Spire",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f2-cypress-spire': {
    "id": "veg-f2-cypress-spire",
    "name": "Standard: Highend: Cypress Spire",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f3-cypress-spire': {
    "id": "veg-f3-cypress-spire",
    "name": "Premium: Highend: Cypress Spire",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f4-cypress-spire': {
    "id": "veg-f4-cypress-spire",
    "name": "Elite: Highend: Cypress Spire",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.15,
      "d": 3.15,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f1-date-palm': {
    "id": "veg-f1-date-palm",
    "name": "Basic: Highend: Date Palm",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 7.35,
      "d": 7.35,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f2-date-palm': {
    "id": "veg-f2-date-palm",
    "name": "Standard: Highend: Date Palm",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 7.35,
      "d": 7.35,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f3-date-palm': {
    "id": "veg-f3-date-palm",
    "name": "Premium: Highend: Date Palm",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 7.35,
      "d": 7.35,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f4-date-palm': {
    "id": "veg-f4-date-palm",
    "name": "Elite: Highend: Date Palm",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 7.35,
      "d": 7.35,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f1-desert-prickly-pear': {
    "id": "veg-f1-desert-prickly-pear",
    "name": "Basic: Highend: Desert Prickly Pear",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f2-desert-prickly-pear': {
    "id": "veg-f2-desert-prickly-pear",
    "name": "Standard: Highend: Desert Prickly Pear",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f3-desert-prickly-pear': {
    "id": "veg-f3-desert-prickly-pear",
    "name": "Premium: Highend: Desert Prickly Pear",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f4-desert-prickly-pear': {
    "id": "veg-f4-desert-prickly-pear",
    "name": "Elite: Highend: Desert Prickly Pear",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f1-european-beech': {
    "id": "veg-f1-european-beech",
    "name": "Basic: Highend: European Beech",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 11.55,
      "d": 11.55,
      "h": 13.65
    },
    "options": {}
  },
  'veg-f2-european-beech': {
    "id": "veg-f2-european-beech",
    "name": "Standard: Highend: European Beech",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 11.55,
      "d": 11.55,
      "h": 13.65
    },
    "options": {}
  },
  'veg-f3-european-beech': {
    "id": "veg-f3-european-beech",
    "name": "Premium: Highend: European Beech",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 11.55,
      "d": 11.55,
      "h": 13.65
    },
    "options": {}
  },
  'veg-f4-european-beech': {
    "id": "veg-f4-european-beech",
    "name": "Elite: Highend: European Beech",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 11.55,
      "d": 11.55,
      "h": 13.65
    },
    "options": {}
  },
  'veg-f1-fern-cluster': {
    "id": "veg-f1-fern-cluster",
    "name": "Basic: Highend: Fern Cluster",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.68,
      "d": 3.68,
      "h": 1.89
    },
    "options": {}
  },
  'veg-f2-fern-cluster': {
    "id": "veg-f2-fern-cluster",
    "name": "Standard: Highend: Fern Cluster",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.68,
      "d": 3.68,
      "h": 1.89
    },
    "options": {}
  },
  'veg-f3-fern-cluster': {
    "id": "veg-f3-fern-cluster",
    "name": "Premium: Highend: Fern Cluster",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.68,
      "d": 3.68,
      "h": 1.89
    },
    "options": {}
  },
  'veg-f4-fern-cluster': {
    "id": "veg-f4-fern-cluster",
    "name": "Elite: Highend: Fern Cluster",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.68,
      "d": 3.68,
      "h": 1.89
    },
    "options": {}
  },
  'veg-f1-formal-rose-garden': {
    "id": "veg-f1-formal-rose-garden",
    "name": "Basic: Highend: Formal Rose Garden",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 1.26
    },
    "options": {}
  },
  'veg-f2-formal-rose-garden': {
    "id": "veg-f2-formal-rose-garden",
    "name": "Standard: Highend: Formal Rose Garden",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 1.26
    },
    "options": {}
  },
  'veg-f3-formal-rose-garden': {
    "id": "veg-f3-formal-rose-garden",
    "name": "Premium: Highend: Formal Rose Garden",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 1.26
    },
    "options": {}
  },
  'veg-f4-formal-rose-garden': {
    "id": "veg-f4-formal-rose-garden",
    "name": "Elite: Highend: Formal Rose Garden",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 1.26
    },
    "options": {}
  },
  'veg-f1-giant-saguaro': {
    "id": "veg-f1-giant-saguaro",
    "name": "Basic: Highend: Giant Saguaro",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 8.4
    },
    "options": {}
  },
  'veg-f2-giant-saguaro': {
    "id": "veg-f2-giant-saguaro",
    "name": "Standard: Highend: Giant Saguaro",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 8.4
    },
    "options": {}
  },
  'veg-f3-giant-saguaro': {
    "id": "veg-f3-giant-saguaro",
    "name": "Premium: Highend: Giant Saguaro",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 8.4
    },
    "options": {}
  },
  'veg-f4-giant-saguaro': {
    "id": "veg-f4-giant-saguaro",
    "name": "Elite: Highend: Giant Saguaro",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 8.4
    },
    "options": {}
  },
  'veg-f1-ginkgo-biloba': {
    "id": "veg-f1-ginkgo-biloba",
    "name": "Basic: Highend: Ginkgo Biloba",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 7.35,
      "d": 7.35,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f2-ginkgo-biloba': {
    "id": "veg-f2-ginkgo-biloba",
    "name": "Standard: Highend: Ginkgo Biloba",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 7.35,
      "d": 7.35,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f3-ginkgo-biloba': {
    "id": "veg-f3-ginkgo-biloba",
    "name": "Premium: Highend: Ginkgo Biloba",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 7.35,
      "d": 7.35,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f4-ginkgo-biloba': {
    "id": "veg-f4-ginkgo-biloba",
    "name": "Elite: Highend: Ginkgo Biloba",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 7.35,
      "d": 7.35,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f1-horse-chestnut': {
    "id": "veg-f1-horse-chestnut",
    "name": "Basic: Highend: Horse Chestnut",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f2-horse-chestnut': {
    "id": "veg-f2-horse-chestnut",
    "name": "Standard: Highend: Horse Chestnut",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f3-horse-chestnut': {
    "id": "veg-f3-horse-chestnut",
    "name": "Premium: Highend: Horse Chestnut",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f4-horse-chestnut': {
    "id": "veg-f4-horse-chestnut",
    "name": "Elite: Highend: Horse Chestnut",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f1-hydrangea-shrub': {
    "id": "veg-f1-hydrangea-shrub",
    "name": "Basic: Highend: Hydrangea Shrub",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.73,
      "d": 4.73,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f2-hydrangea-shrub': {
    "id": "veg-f2-hydrangea-shrub",
    "name": "Standard: Highend: Hydrangea Shrub",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.73,
      "d": 4.73,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f3-hydrangea-shrub': {
    "id": "veg-f3-hydrangea-shrub",
    "name": "Premium: Highend: Hydrangea Shrub",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.73,
      "d": 4.73,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f4-hydrangea-shrub': {
    "id": "veg-f4-hydrangea-shrub",
    "name": "Elite: Highend: Hydrangea Shrub",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.73,
      "d": 4.73,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f1-jacaranda': {
    "id": "veg-f1-jacaranda",
    "name": "Basic: Highend: Jacaranda",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 9.97
    },
    "options": {}
  },
  'veg-f2-jacaranda': {
    "id": "veg-f2-jacaranda",
    "name": "Standard: Highend: Jacaranda",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 9.97
    },
    "options": {}
  },
  'veg-f3-jacaranda': {
    "id": "veg-f3-jacaranda",
    "name": "Premium: Highend: Jacaranda",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 9.97
    },
    "options": {}
  },
  'veg-f4-jacaranda': {
    "id": "veg-f4-jacaranda",
    "name": "Elite: Highend: Jacaranda",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 9.97
    },
    "options": {}
  },
  'veg-f1-lavender-field': {
    "id": "veg-f1-lavender-field",
    "name": "Basic: Highend: Lavender Field",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 6.3,
      "h": 1.05
    },
    "options": {}
  },
  'veg-f2-lavender-field': {
    "id": "veg-f2-lavender-field",
    "name": "Standard: Highend: Lavender Field",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 6.3,
      "h": 1.05
    },
    "options": {}
  },
  'veg-f3-lavender-field': {
    "id": "veg-f3-lavender-field",
    "name": "Premium: Highend: Lavender Field",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 6.3,
      "h": 1.05
    },
    "options": {}
  },
  'veg-f4-lavender-field': {
    "id": "veg-f4-lavender-field",
    "name": "Elite: Highend: Lavender Field",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 6.3,
      "h": 1.05
    },
    "options": {}
  },
  'veg-f1-manicured-lawn': {
    "id": "veg-f1-manicured-lawn",
    "name": "Basic: Highend: Manicured Lawn",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 0.32
    },
    "options": {}
  },
  'veg-f2-manicured-lawn': {
    "id": "veg-f2-manicured-lawn",
    "name": "Standard: Highend: Manicured Lawn",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 0.32
    },
    "options": {}
  },
  'veg-f3-manicured-lawn': {
    "id": "veg-f3-manicured-lawn",
    "name": "Premium: Highend: Manicured Lawn",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 0.32
    },
    "options": {}
  },
  'veg-f4-manicured-lawn': {
    "id": "veg-f4-manicured-lawn",
    "name": "Elite: Highend: Manicured Lawn",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 0.32
    },
    "options": {}
  },
  'veg-f1-maple-autumn': {
    "id": "veg-f1-maple-autumn",
    "name": "Basic: Highend: Maple Autumn",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 11.55
    },
    "options": {}
  },
  'veg-f2-maple-autumn': {
    "id": "veg-f2-maple-autumn",
    "name": "Standard: Highend: Maple Autumn",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 11.55
    },
    "options": {}
  },
  'veg-f3-maple-autumn': {
    "id": "veg-f3-maple-autumn",
    "name": "Premium: Highend: Maple Autumn",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 11.55
    },
    "options": {}
  },
  'veg-f4-maple-autumn': {
    "id": "veg-f4-maple-autumn",
    "name": "Elite: Highend: Maple Autumn",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 11.55
    },
    "options": {}
  },
  'veg-f1-mossy-forest-boulder': {
    "id": "veg-f1-mossy-forest-boulder",
    "name": "Basic: Highend: Mossy Forest Boulder",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.73,
      "d": 4.73,
      "h": 2.1
    },
    "options": {}
  },
  'veg-f2-mossy-forest-boulder': {
    "id": "veg-f2-mossy-forest-boulder",
    "name": "Standard: Highend: Mossy Forest Boulder",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.73,
      "d": 4.73,
      "h": 2.1
    },
    "options": {}
  },
  'veg-f3-mossy-forest-boulder': {
    "id": "veg-f3-mossy-forest-boulder",
    "name": "Premium: Highend: Mossy Forest Boulder",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.73,
      "d": 4.73,
      "h": 2.1
    },
    "options": {}
  },
  'veg-f4-mossy-forest-boulder': {
    "id": "veg-f4-mossy-forest-boulder",
    "name": "Elite: Highend: Mossy Forest Boulder",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.73,
      "d": 4.73,
      "h": 2.1
    },
    "options": {}
  },
  'veg-f1-olive-tree-grove': {
    "id": "veg-f1-olive-tree-grove",
    "name": "Basic: Highend: Olive Tree Grove",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 6.83
    },
    "options": {}
  },
  'veg-f2-olive-tree-grove': {
    "id": "veg-f2-olive-tree-grove",
    "name": "Standard: Highend: Olive Tree Grove",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 6.83
    },
    "options": {}
  },
  'veg-f3-olive-tree-grove': {
    "id": "veg-f3-olive-tree-grove",
    "name": "Premium: Highend: Olive Tree Grove",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 6.83
    },
    "options": {}
  },
  'veg-f4-olive-tree-grove': {
    "id": "veg-f4-olive-tree-grove",
    "name": "Elite: Highend: Olive Tree Grove",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 6.83
    },
    "options": {}
  },
  'veg-f1-rowan-mountain-ash': {
    "id": "veg-f1-rowan-mountain-ash",
    "name": "Basic: Highend: Rowan Mountain Ash",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 8.4
    },
    "options": {}
  },
  'veg-f2-rowan-mountain-ash': {
    "id": "veg-f2-rowan-mountain-ash",
    "name": "Standard: Highend: Rowan Mountain Ash",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 8.4
    },
    "options": {}
  },
  'veg-f3-rowan-mountain-ash': {
    "id": "veg-f3-rowan-mountain-ash",
    "name": "Premium: Highend: Rowan Mountain Ash",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 8.4
    },
    "options": {}
  },
  'veg-f4-rowan-mountain-ash': {
    "id": "veg-f4-rowan-mountain-ash",
    "name": "Elite: Highend: Rowan Mountain Ash",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 8.4
    },
    "options": {}
  },
  'veg-f1-royal-palm': {
    "id": "veg-f1-royal-palm",
    "name": "Basic: Highend: Royal Palm",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f2-royal-palm': {
    "id": "veg-f2-royal-palm",
    "name": "Standard: Highend: Royal Palm",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f3-royal-palm': {
    "id": "veg-f3-royal-palm",
    "name": "Premium: Highend: Royal Palm",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f4-royal-palm': {
    "id": "veg-f4-royal-palm",
    "name": "Elite: Highend: Royal Palm",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 12.6
    },
    "options": {}
  },
  'veg-f1-sequoia-giant': {
    "id": "veg-f1-sequoia-giant",
    "name": "Basic: Highend: Sequoia Giant",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 31.5
    },
    "options": {}
  },
  'veg-f2-sequoia-giant': {
    "id": "veg-f2-sequoia-giant",
    "name": "Standard: Highend: Sequoia Giant",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 31.5
    },
    "options": {}
  },
  'veg-f3-sequoia-giant': {
    "id": "veg-f3-sequoia-giant",
    "name": "Premium: Highend: Sequoia Giant",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 31.5
    },
    "options": {}
  },
  'veg-f4-sequoia-giant': {
    "id": "veg-f4-sequoia-giant",
    "name": "Elite: Highend: Sequoia Giant",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 31.5
    },
    "options": {}
  },
  'veg-f1-silver-birch': {
    "id": "veg-f1-silver-birch",
    "name": "Basic: Highend: Silver Birch",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f2-silver-birch': {
    "id": "veg-f2-silver-birch",
    "name": "Standard: Highend: Silver Birch",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f3-silver-birch': {
    "id": "veg-f3-silver-birch",
    "name": "Premium: Highend: Silver Birch",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f4-silver-birch': {
    "id": "veg-f4-silver-birch",
    "name": "Elite: Highend: Silver Birch",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f1-sunflower-patch': {
    "id": "veg-f1-sunflower-patch",
    "name": "Basic: Highend: Sunflower Patch",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f2-sunflower-patch': {
    "id": "veg-f2-sunflower-patch",
    "name": "Standard: Highend: Sunflower Patch",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f3-sunflower-patch': {
    "id": "veg-f3-sunflower-patch",
    "name": "Premium: Highend: Sunflower Patch",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f4-sunflower-patch': {
    "id": "veg-f4-sunflower-patch",
    "name": "Elite: Highend: Sunflower Patch",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 2.31
    },
    "options": {}
  },
  'veg-f1-topiary-peacock': {
    "id": "veg-f1-topiary-peacock",
    "name": "Basic: Highend: Topiary Peacock",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.73,
      "d": 4.2,
      "h": 4.2
    },
    "options": {}
  },
  'veg-f2-topiary-peacock': {
    "id": "veg-f2-topiary-peacock",
    "name": "Standard: Highend: Topiary Peacock",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.73,
      "d": 4.2,
      "h": 4.2
    },
    "options": {}
  },
  'veg-f3-topiary-peacock': {
    "id": "veg-f3-topiary-peacock",
    "name": "Premium: Highend: Topiary Peacock",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.73,
      "d": 4.2,
      "h": 4.2
    },
    "options": {}
  },
  'veg-f4-topiary-peacock': {
    "id": "veg-f4-topiary-peacock",
    "name": "Elite: Highend: Topiary Peacock",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.73,
      "d": 4.2,
      "h": 4.2
    },
    "options": {}
  },
  'veg-f1-topiary-spiral': {
    "id": "veg-f1-topiary-spiral",
    "name": "Basic: Highend: Topiary Spiral",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.68,
      "d": 3.68,
      "h": 6.3
    },
    "options": {}
  },
  'veg-f2-topiary-spiral': {
    "id": "veg-f2-topiary-spiral",
    "name": "Standard: Highend: Topiary Spiral",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.68,
      "d": 3.68,
      "h": 6.3
    },
    "options": {}
  },
  'veg-f3-topiary-spiral': {
    "id": "veg-f3-topiary-spiral",
    "name": "Premium: Highend: Topiary Spiral",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.68,
      "d": 3.68,
      "h": 6.3
    },
    "options": {}
  },
  'veg-f4-topiary-spiral': {
    "id": "veg-f4-topiary-spiral",
    "name": "Elite: Highend: Topiary Spiral",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.68,
      "d": 3.68,
      "h": 6.3
    },
    "options": {}
  },
  'veg-f1-umbrella-pine': {
    "id": "veg-f1-umbrella-pine",
    "name": "Basic: Highend: Umbrella Pine",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f2-umbrella-pine': {
    "id": "veg-f2-umbrella-pine",
    "name": "Standard: Highend: Umbrella Pine",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f3-umbrella-pine': {
    "id": "veg-f3-umbrella-pine",
    "name": "Premium: Highend: Umbrella Pine",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f4-umbrella-pine': {
    "id": "veg-f4-umbrella-pine",
    "name": "Elite: Highend: Umbrella Pine",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 9.45,
      "d": 9.45,
      "h": 10.5
    },
    "options": {}
  },
  'veg-f1-urban-planter-cluster': {
    "id": "veg-f1-urban-planter-cluster",
    "name": "Basic: Highend: Urban Planter Cluster",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f2-urban-planter-cluster': {
    "id": "veg-f2-urban-planter-cluster",
    "name": "Standard: Highend: Urban Planter Cluster",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f3-urban-planter-cluster': {
    "id": "veg-f3-urban-planter-cluster",
    "name": "Premium: Highend: Urban Planter Cluster",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f4-urban-planter-cluster': {
    "id": "veg-f4-urban-planter-cluster",
    "name": "Elite: Highend: Urban Planter Cluster",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 4.2,
      "d": 4.2,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f1-vineyard-grape-trellis': {
    "id": "veg-f1-vineyard-grape-trellis",
    "name": "Basic: Highend: Vineyard Grape Trellis",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 4.2,
      "h": 2.52
    },
    "options": {}
  },
  'veg-f2-vineyard-grape-trellis': {
    "id": "veg-f2-vineyard-grape-trellis",
    "name": "Standard: Highend: Vineyard Grape Trellis",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 4.2,
      "h": 2.52
    },
    "options": {}
  },
  'veg-f3-vineyard-grape-trellis': {
    "id": "veg-f3-vineyard-grape-trellis",
    "name": "Premium: Highend: Vineyard Grape Trellis",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 4.2,
      "h": 2.52
    },
    "options": {}
  },
  'veg-f4-vineyard-grape-trellis': {
    "id": "veg-f4-vineyard-grape-trellis",
    "name": "Elite: Highend: Vineyard Grape Trellis",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 4.2,
      "h": 2.52
    },
    "options": {}
  },
  'veg-f1-water-lily-pond-patch': {
    "id": "veg-f1-water-lily-pond-patch",
    "name": "Basic: Highend: Water Lily Pond Patch",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 0.63
    },
    "options": {}
  },
  'veg-f2-water-lily-pond-patch': {
    "id": "veg-f2-water-lily-pond-patch",
    "name": "Standard: Highend: Water Lily Pond Patch",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 0.63
    },
    "options": {}
  },
  'veg-f3-water-lily-pond-patch': {
    "id": "veg-f3-water-lily-pond-patch",
    "name": "Premium: Highend: Water Lily Pond Patch",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 0.63
    },
    "options": {}
  },
  'veg-f4-water-lily-pond-patch': {
    "id": "veg-f4-water-lily-pond-patch",
    "name": "Elite: Highend: Water Lily Pond Patch",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 0.63
    },
    "options": {}
  },
  'veg-f1-weeping-cherry': {
    "id": "veg-f1-weeping-cherry",
    "name": "Basic: Highend: Weeping Cherry",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 7.88,
      "d": 7.88,
      "h": 6.83
    },
    "options": {}
  },
  'veg-f2-weeping-cherry': {
    "id": "veg-f2-weeping-cherry",
    "name": "Standard: Highend: Weeping Cherry",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 7.88,
      "d": 7.88,
      "h": 6.83
    },
    "options": {}
  },
  'veg-f3-weeping-cherry': {
    "id": "veg-f3-weeping-cherry",
    "name": "Premium: Highend: Weeping Cherry",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 7.88,
      "d": 7.88,
      "h": 6.83
    },
    "options": {}
  },
  'veg-f4-weeping-cherry': {
    "id": "veg-f4-weeping-cherry",
    "name": "Elite: Highend: Weeping Cherry",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 7.88,
      "d": 7.88,
      "h": 6.83
    },
    "options": {}
  },
  'veg-f1-weeping-willow': {
    "id": "veg-f1-weeping-willow",
    "name": "Basic: Highend: Weeping Willow",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 9.45
    },
    "options": {}
  },
  'veg-f2-weeping-willow': {
    "id": "veg-f2-weeping-willow",
    "name": "Standard: Highend: Weeping Willow",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 9.45
    },
    "options": {}
  },
  'veg-f3-weeping-willow': {
    "id": "veg-f3-weeping-willow",
    "name": "Premium: Highend: Weeping Willow",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 9.45
    },
    "options": {}
  },
  'veg-f4-weeping-willow': {
    "id": "veg-f4-weeping-willow",
    "name": "Elite: Highend: Weeping Willow",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 10.5,
      "d": 10.5,
      "h": 9.45
    },
    "options": {}
  },
  'veg-f1-wild-meadow-patch': {
    "id": "veg-f1-wild-meadow-patch",
    "name": "Basic: Highend: Wild Meadow Patch",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 0.84
    },
    "options": {}
  },
  'veg-f2-wild-meadow-patch': {
    "id": "veg-f2-wild-meadow-patch",
    "name": "Standard: Highend: Wild Meadow Patch",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 0.84
    },
    "options": {}
  },
  'veg-f3-wild-meadow-patch': {
    "id": "veg-f3-wild-meadow-patch",
    "name": "Premium: Highend: Wild Meadow Patch",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 0.84
    },
    "options": {}
  },
  'veg-f4-wild-meadow-patch': {
    "id": "veg-f4-wild-meadow-patch",
    "name": "Elite: Highend: Wild Meadow Patch",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 0.84
    },
    "options": {}
  },
  'veg-f1-wild-reed-marsh': {
    "id": "veg-f1-wild-reed-marsh",
    "name": "Basic: Highend: Wild Reed Marsh",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f2-wild-reed-marsh': {
    "id": "veg-f2-wild-reed-marsh",
    "name": "Standard: Highend: Wild Reed Marsh",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f3-wild-reed-marsh': {
    "id": "veg-f3-wild-reed-marsh",
    "name": "Premium: Highend: Wild Reed Marsh",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f4-wild-reed-marsh': {
    "id": "veg-f4-wild-reed-marsh",
    "name": "Elite: Highend: Wild Reed Marsh",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 5.25,
      "h": 2.62
    },
    "options": {}
  },
  'veg-f1-wildflower-swathe': {
    "id": "veg-f1-wildflower-swathe",
    "name": "Basic: Highend: Wildflower Swathe",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 0.95
    },
    "options": {}
  },
  'veg-f2-wildflower-swathe': {
    "id": "veg-f2-wildflower-swathe",
    "name": "Standard: Highend: Wildflower Swathe",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 0.95
    },
    "options": {}
  },
  'veg-f3-wildflower-swathe': {
    "id": "veg-f3-wildflower-swathe",
    "name": "Premium: Highend: Wildflower Swathe",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 0.95
    },
    "options": {}
  },
  'veg-f4-wildflower-swathe': {
    "id": "veg-f4-wildflower-swathe",
    "name": "Elite: Highend: Wildflower Swathe",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 8.4,
      "d": 8.4,
      "h": 0.95
    },
    "options": {}
  },
  'veg-f1-zen-rock-moss-garden': {
    "id": "veg-f1-zen-rock-moss-garden",
    "name": "Basic: Highend: Zen Rock Moss Garden",
    "category": "vegetation",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 1.58
    },
    "options": {}
  },
  'veg-f2-zen-rock-moss-garden': {
    "id": "veg-f2-zen-rock-moss-garden",
    "name": "Standard: Highend: Zen Rock Moss Garden",
    "category": "vegetation",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 1.58
    },
    "options": {}
  },
  'veg-f3-zen-rock-moss-garden': {
    "id": "veg-f3-zen-rock-moss-garden",
    "name": "Premium: Highend: Zen Rock Moss Garden",
    "category": "vegetation",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 1.58
    },
    "options": {}
  },
  'veg-f4-zen-rock-moss-garden': {
    "id": "veg-f4-zen-rock-moss-garden",
    "name": "Elite: Highend: Zen Rock Moss Garden",
    "category": "vegetation",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.3,
      "d": 6.3,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f1-airport-shuttle-bus': {
    "id": "veh-f1-airport-shuttle-bus",
    "name": "Basic: Highend: Airport Shuttle Bus",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.73,
      "d": 8.93,
      "h": 3.15
    },
    "options": {}
  },
  'veh-f2-airport-shuttle-bus': {
    "id": "veh-f2-airport-shuttle-bus",
    "name": "Standard: Highend: Airport Shuttle Bus",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.73,
      "d": 8.93,
      "h": 3.15
    },
    "options": {}
  },
  'veh-f3-airport-shuttle-bus': {
    "id": "veh-f3-airport-shuttle-bus",
    "name": "Premium: Highend: Airport Shuttle Bus",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.73,
      "d": 8.93,
      "h": 3.15
    },
    "options": {}
  },
  'veh-f4-airport-shuttle-bus': {
    "id": "veh-f4-airport-shuttle-bus",
    "name": "Elite: Highend: Airport Shuttle Bus",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.73,
      "d": 8.93,
      "h": 3.15
    },
    "options": {}
  },
  'veh-f1-ambulance-emergency': {
    "id": "veh-f1-ambulance-emergency",
    "name": "Basic: Highend: Ambulance Emergency",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.62,
      "d": 6.83,
      "h": 3.04
    },
    "options": {}
  },
  'veh-f2-ambulance-emergency': {
    "id": "veh-f2-ambulance-emergency",
    "name": "Standard: Highend: Ambulance Emergency",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.62,
      "d": 6.83,
      "h": 3.04
    },
    "options": {}
  },
  'veh-f3-ambulance-emergency': {
    "id": "veh-f3-ambulance-emergency",
    "name": "Premium: Highend: Ambulance Emergency",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.62,
      "d": 6.83,
      "h": 3.04
    },
    "options": {}
  },
  'veh-f4-ambulance-emergency': {
    "id": "veh-f4-ambulance-emergency",
    "name": "Elite: Highend: Ambulance Emergency",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.62,
      "d": 6.83,
      "h": 3.04
    },
    "options": {}
  },
  'veh-f1-armored-security-van': {
    "id": "veh-f1-armored-security-van",
    "name": "Basic: Highend: Armored Security Van",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.73,
      "d": 7.14,
      "h": 2.94
    },
    "options": {}
  },
  'veh-f2-armored-security-van': {
    "id": "veh-f2-armored-security-van",
    "name": "Standard: Highend: Armored Security Van",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.73,
      "d": 7.14,
      "h": 2.94
    },
    "options": {}
  },
  'veh-f3-armored-security-van': {
    "id": "veh-f3-armored-security-van",
    "name": "Premium: Highend: Armored Security Van",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.73,
      "d": 7.14,
      "h": 2.94
    },
    "options": {}
  },
  'veh-f4-armored-security-van': {
    "id": "veh-f4-armored-security-van",
    "name": "Elite: Highend: Armored Security Van",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.73,
      "d": 7.14,
      "h": 2.94
    },
    "options": {}
  },
  'veh-f1-auto-rickshaw': {
    "id": "veh-f1-auto-rickshaw",
    "name": "Basic: Highend: Auto Rickshaw",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.58,
      "d": 2.94,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f2-auto-rickshaw': {
    "id": "veh-f2-auto-rickshaw",
    "name": "Standard: Highend: Auto Rickshaw",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.58,
      "d": 2.94,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f3-auto-rickshaw': {
    "id": "veh-f3-auto-rickshaw",
    "name": "Premium: Highend: Auto Rickshaw",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.58,
      "d": 2.94,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f4-auto-rickshaw': {
    "id": "veh-f4-auto-rickshaw",
    "name": "Elite: Highend: Auto Rickshaw",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.58,
      "d": 2.94,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f1-box-delivery-truck': {
    "id": "veh-f1-box-delivery-truck",
    "name": "Basic: Highend: Box Delivery Truck",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.62,
      "d": 7.88,
      "h": 3.46
    },
    "options": {}
  },
  'veh-f2-box-delivery-truck': {
    "id": "veh-f2-box-delivery-truck",
    "name": "Standard: Highend: Box Delivery Truck",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.62,
      "d": 7.88,
      "h": 3.46
    },
    "options": {}
  },
  'veh-f3-box-delivery-truck': {
    "id": "veh-f3-box-delivery-truck",
    "name": "Premium: Highend: Box Delivery Truck",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.62,
      "d": 7.88,
      "h": 3.46
    },
    "options": {}
  },
  'veh-f4-box-delivery-truck': {
    "id": "veh-f4-box-delivery-truck",
    "name": "Elite: Highend: Box Delivery Truck",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.62,
      "d": 7.88,
      "h": 3.46
    },
    "options": {}
  },
  'veh-f1-cargo-delivery-van': {
    "id": "veh-f1-cargo-delivery-van",
    "name": "Basic: Highend: Cargo Delivery Van",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.31,
      "d": 6.09,
      "h": 2.73
    },
    "options": {}
  },
  'veh-f2-cargo-delivery-van': {
    "id": "veh-f2-cargo-delivery-van",
    "name": "Standard: Highend: Cargo Delivery Van",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.31,
      "d": 6.09,
      "h": 2.73
    },
    "options": {}
  },
  'veh-f3-cargo-delivery-van': {
    "id": "veh-f3-cargo-delivery-van",
    "name": "Premium: Highend: Cargo Delivery Van",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.31,
      "d": 6.09,
      "h": 2.73
    },
    "options": {}
  },
  'veh-f4-cargo-delivery-van': {
    "id": "veh-f4-cargo-delivery-van",
    "name": "Elite: Highend: Cargo Delivery Van",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.31,
      "d": 6.09,
      "h": 2.73
    },
    "options": {}
  },
  'veh-f1-city-bicycle-commuter': {
    "id": "veh-f1-city-bicycle-commuter",
    "name": "Basic: Highend: City Bicycle Commuter",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.84,
      "d": 1.89,
      "h": 1.16
    },
    "options": {}
  },
  'veh-f2-city-bicycle-commuter': {
    "id": "veh-f2-city-bicycle-commuter",
    "name": "Standard: Highend: City Bicycle Commuter",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.84,
      "d": 1.89,
      "h": 1.16
    },
    "options": {}
  },
  'veh-f3-city-bicycle-commuter': {
    "id": "veh-f3-city-bicycle-commuter",
    "name": "Premium: Highend: City Bicycle Commuter",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.84,
      "d": 1.89,
      "h": 1.16
    },
    "options": {}
  },
  'veh-f4-city-bicycle-commuter': {
    "id": "veh-f4-city-bicycle-commuter",
    "name": "Elite: Highend: City Bicycle Commuter",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.84,
      "d": 1.89,
      "h": 1.16
    },
    "options": {}
  },
  'veh-f1-city-transit-bus': {
    "id": "veh-f1-city-transit-bus",
    "name": "Basic: Highend: City Transit Bus",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.84,
      "d": 12.08,
      "h": 3.36
    },
    "options": {}
  },
  'veh-f2-city-transit-bus': {
    "id": "veh-f2-city-transit-bus",
    "name": "Standard: Highend: City Transit Bus",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.84,
      "d": 12.08,
      "h": 3.36
    },
    "options": {}
  },
  'veh-f3-city-transit-bus': {
    "id": "veh-f3-city-transit-bus",
    "name": "Premium: Highend: City Transit Bus",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.84,
      "d": 12.08,
      "h": 3.36
    },
    "options": {}
  },
  'veh-f4-city-transit-bus': {
    "id": "veh-f4-city-transit-bus",
    "name": "Elite: Highend: City Transit Bus",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.84,
      "d": 12.08,
      "h": 3.36
    },
    "options": {}
  },
  'veh-f1-compact-crossover': {
    "id": "veh-f1-compact-crossover",
    "name": "Basic: Highend: Compact Crossover",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.21,
      "d": 4.73,
      "h": 1.68
    },
    "options": {}
  },
  'veh-f2-compact-crossover': {
    "id": "veh-f2-compact-crossover",
    "name": "Standard: Highend: Compact Crossover",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.21,
      "d": 4.73,
      "h": 1.68
    },
    "options": {}
  },
  'veh-f3-compact-crossover': {
    "id": "veh-f3-compact-crossover",
    "name": "Premium: Highend: Compact Crossover",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.21,
      "d": 4.73,
      "h": 1.68
    },
    "options": {}
  },
  'veh-f4-compact-crossover': {
    "id": "veh-f4-compact-crossover",
    "name": "Elite: Highend: Compact Crossover",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.21,
      "d": 4.73,
      "h": 1.68
    },
    "options": {}
  },
  'veh-f1-compact-hatchback': {
    "id": "veh-f1-compact-hatchback",
    "name": "Basic: Highend: Compact Hatchback",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.1,
      "d": 4.41,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f2-compact-hatchback': {
    "id": "veh-f2-compact-hatchback",
    "name": "Standard: Highend: Compact Hatchback",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.1,
      "d": 4.41,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f3-compact-hatchback': {
    "id": "veh-f3-compact-hatchback",
    "name": "Premium: Highend: Compact Hatchback",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.1,
      "d": 4.41,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f4-compact-hatchback': {
    "id": "veh-f4-compact-hatchback",
    "name": "Elite: Highend: Compact Hatchback",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.1,
      "d": 4.41,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f1-concrete-mixer-truck': {
    "id": "veh-f1-concrete-mixer-truck",
    "name": "Basic: Highend: Concrete Mixer Truck",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.94,
      "d": 9.97,
      "h": 3.99
    },
    "options": {}
  },
  'veh-f2-concrete-mixer-truck': {
    "id": "veh-f2-concrete-mixer-truck",
    "name": "Standard: Highend: Concrete Mixer Truck",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.94,
      "d": 9.97,
      "h": 3.99
    },
    "options": {}
  },
  'veh-f3-concrete-mixer-truck': {
    "id": "veh-f3-concrete-mixer-truck",
    "name": "Premium: Highend: Concrete Mixer Truck",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.94,
      "d": 9.97,
      "h": 3.99
    },
    "options": {}
  },
  'veh-f4-concrete-mixer-truck': {
    "id": "veh-f4-concrete-mixer-truck",
    "name": "Elite: Highend: Concrete Mixer Truck",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.94,
      "d": 9.97,
      "h": 3.99
    },
    "options": {}
  },
  'veh-f1-crawler-crane': {
    "id": "veh-f1-crawler-crane",
    "name": "Basic: Highend: Crawler Crane",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 5.25,
      "d": 12.6,
      "h": 16.8
    },
    "options": {}
  },
  'veh-f2-crawler-crane': {
    "id": "veh-f2-crawler-crane",
    "name": "Standard: Highend: Crawler Crane",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 5.25,
      "d": 12.6,
      "h": 16.8
    },
    "options": {}
  },
  'veh-f3-crawler-crane': {
    "id": "veh-f3-crawler-crane",
    "name": "Premium: Highend: Crawler Crane",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 5.25,
      "d": 12.6,
      "h": 16.8
    },
    "options": {}
  },
  'veh-f4-crawler-crane': {
    "id": "veh-f4-crawler-crane",
    "name": "Elite: Highend: Crawler Crane",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 5.25,
      "d": 12.6,
      "h": 16.8
    },
    "options": {}
  },
  'veh-f1-double-decker-tour-bus': {
    "id": "veh-f1-double-decker-tour-bus",
    "name": "Basic: Highend: Double Decker Tour Bus",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.94,
      "d": 12.6,
      "h": 4.62
    },
    "options": {}
  },
  'veh-f2-double-decker-tour-bus': {
    "id": "veh-f2-double-decker-tour-bus",
    "name": "Standard: Highend: Double Decker Tour Bus",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.94,
      "d": 12.6,
      "h": 4.62
    },
    "options": {}
  },
  'veh-f3-double-decker-tour-bus': {
    "id": "veh-f3-double-decker-tour-bus",
    "name": "Premium: Highend: Double Decker Tour Bus",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.94,
      "d": 12.6,
      "h": 4.62
    },
    "options": {}
  },
  'veh-f4-double-decker-tour-bus': {
    "id": "veh-f4-double-decker-tour-bus",
    "name": "Elite: Highend: Double Decker Tour Bus",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.94,
      "d": 12.6,
      "h": 4.62
    },
    "options": {}
  },
  'veh-f1-electric-articulated-bus': {
    "id": "veh-f1-electric-articulated-bus",
    "name": "Basic: Highend: Electric Articulated Bus",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.94,
      "d": 18.9,
      "h": 3.57
    },
    "options": {}
  },
  'veh-f2-electric-articulated-bus': {
    "id": "veh-f2-electric-articulated-bus",
    "name": "Standard: Highend: Electric Articulated Bus",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.94,
      "d": 18.9,
      "h": 3.57
    },
    "options": {}
  },
  'veh-f3-electric-articulated-bus': {
    "id": "veh-f3-electric-articulated-bus",
    "name": "Premium: Highend: Electric Articulated Bus",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.94,
      "d": 18.9,
      "h": 3.57
    },
    "options": {}
  },
  'veh-f4-electric-articulated-bus': {
    "id": "veh-f4-electric-articulated-bus",
    "name": "Elite: Highend: Electric Articulated Bus",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.94,
      "d": 18.9,
      "h": 3.57
    },
    "options": {}
  },
  'veh-f1-electric-scooter-cluster': {
    "id": "veh-f1-electric-scooter-cluster",
    "name": "Basic: Highend: Electric Scooter Cluster",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.89,
      "d": 2.1,
      "h": 1.26
    },
    "options": {}
  },
  'veh-f2-electric-scooter-cluster': {
    "id": "veh-f2-electric-scooter-cluster",
    "name": "Standard: Highend: Electric Scooter Cluster",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.89,
      "d": 2.1,
      "h": 1.26
    },
    "options": {}
  },
  'veh-f3-electric-scooter-cluster': {
    "id": "veh-f3-electric-scooter-cluster",
    "name": "Premium: Highend: Electric Scooter Cluster",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.89,
      "d": 2.1,
      "h": 1.26
    },
    "options": {}
  },
  'veh-f4-electric-scooter-cluster': {
    "id": "veh-f4-electric-scooter-cluster",
    "name": "Elite: Highend: Electric Scooter Cluster",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.89,
      "d": 2.1,
      "h": 1.26
    },
    "options": {}
  },
  'veh-f1-executive-suv-4x4': {
    "id": "veh-f1-executive-suv-4x4",
    "name": "Basic: Highend: Executive Suv 4X4",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.52,
      "d": 5.46,
      "h": 1.99
    },
    "options": {}
  },
  'veh-f2-executive-suv-4x4': {
    "id": "veh-f2-executive-suv-4x4",
    "name": "Standard: Highend: Executive Suv 4X4",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.52,
      "d": 5.46,
      "h": 1.99
    },
    "options": {}
  },
  'veh-f3-executive-suv-4x4': {
    "id": "veh-f3-executive-suv-4x4",
    "name": "Premium: Highend: Executive Suv 4X4",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.52,
      "d": 5.46,
      "h": 1.99
    },
    "options": {}
  },
  'veh-f4-executive-suv-4x4': {
    "id": "veh-f4-executive-suv-4x4",
    "name": "Elite: Highend: Executive Suv 4X4",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.52,
      "d": 5.46,
      "h": 1.99
    },
    "options": {}
  },
  'veh-f1-family-suv': {
    "id": "veh-f1-family-suv",
    "name": "Basic: Highend: Family Suv",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.31,
      "d": 5.15,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f2-family-suv': {
    "id": "veh-f2-family-suv",
    "name": "Standard: Highend: Family Suv",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.31,
      "d": 5.15,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f3-family-suv': {
    "id": "veh-f3-family-suv",
    "name": "Premium: Highend: Family Suv",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.31,
      "d": 5.15,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f4-family-suv': {
    "id": "veh-f4-family-suv",
    "name": "Elite: Highend: Family Suv",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.31,
      "d": 5.15,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f1-fire-ladder-truck': {
    "id": "veh-f1-fire-ladder-truck",
    "name": "Basic: Highend: Fire Ladder Truck",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.15,
      "d": 12.6,
      "h": 3.99
    },
    "options": {}
  },
  'veh-f2-fire-ladder-truck': {
    "id": "veh-f2-fire-ladder-truck",
    "name": "Standard: Highend: Fire Ladder Truck",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.15,
      "d": 12.6,
      "h": 3.99
    },
    "options": {}
  },
  'veh-f3-fire-ladder-truck': {
    "id": "veh-f3-fire-ladder-truck",
    "name": "Premium: Highend: Fire Ladder Truck",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.15,
      "d": 12.6,
      "h": 3.99
    },
    "options": {}
  },
  'veh-f4-fire-ladder-truck': {
    "id": "veh-f4-fire-ladder-truck",
    "name": "Elite: Highend: Fire Ladder Truck",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.15,
      "d": 12.6,
      "h": 3.99
    },
    "options": {}
  },
  'veh-f1-flatbed-cargo-hauler': {
    "id": "veh-f1-flatbed-cargo-hauler",
    "name": "Basic: Highend: Flatbed Cargo Hauler",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.94,
      "d": 14.7,
      "h": 3.36
    },
    "options": {}
  },
  'veh-f2-flatbed-cargo-hauler': {
    "id": "veh-f2-flatbed-cargo-hauler",
    "name": "Standard: Highend: Flatbed Cargo Hauler",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.94,
      "d": 14.7,
      "h": 3.36
    },
    "options": {}
  },
  'veh-f3-flatbed-cargo-hauler': {
    "id": "veh-f3-flatbed-cargo-hauler",
    "name": "Premium: Highend: Flatbed Cargo Hauler",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.94,
      "d": 14.7,
      "h": 3.36
    },
    "options": {}
  },
  'veh-f4-flatbed-cargo-hauler': {
    "id": "veh-f4-flatbed-cargo-hauler",
    "name": "Elite: Highend: Flatbed Cargo Hauler",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.94,
      "d": 14.7,
      "h": 3.36
    },
    "options": {}
  },
  'veh-f1-forklift-warehouse': {
    "id": "veh-f1-forklift-warehouse",
    "name": "Basic: Highend: Forklift Warehouse",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.68,
      "d": 3.36,
      "h": 2.52
    },
    "options": {}
  },
  'veh-f2-forklift-warehouse': {
    "id": "veh-f2-forklift-warehouse",
    "name": "Standard: Highend: Forklift Warehouse",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.68,
      "d": 3.36,
      "h": 2.52
    },
    "options": {}
  },
  'veh-f3-forklift-warehouse': {
    "id": "veh-f3-forklift-warehouse",
    "name": "Premium: Highend: Forklift Warehouse",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.68,
      "d": 3.36,
      "h": 2.52
    },
    "options": {}
  },
  'veh-f4-forklift-warehouse': {
    "id": "veh-f4-forklift-warehouse",
    "name": "Elite: Highend: Forklift Warehouse",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.68,
      "d": 3.36,
      "h": 2.52
    },
    "options": {}
  },
  'veh-f1-garbage-compactor-truck': {
    "id": "veh-f1-garbage-compactor-truck",
    "name": "Basic: Highend: Garbage Compactor Truck",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.84,
      "d": 9.24,
      "h": 3.68
    },
    "options": {}
  },
  'veh-f2-garbage-compactor-truck': {
    "id": "veh-f2-garbage-compactor-truck",
    "name": "Standard: Highend: Garbage Compactor Truck",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.84,
      "d": 9.24,
      "h": 3.68
    },
    "options": {}
  },
  'veh-f3-garbage-compactor-truck': {
    "id": "veh-f3-garbage-compactor-truck",
    "name": "Premium: Highend: Garbage Compactor Truck",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.84,
      "d": 9.24,
      "h": 3.68
    },
    "options": {}
  },
  'veh-f4-garbage-compactor-truck': {
    "id": "veh-f4-garbage-compactor-truck",
    "name": "Elite: Highend: Garbage Compactor Truck",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.84,
      "d": 9.24,
      "h": 3.68
    },
    "options": {}
  },
  'veh-f1-golf-cart-utility': {
    "id": "veh-f1-golf-cart-utility",
    "name": "Basic: Highend: Golf Cart Utility",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.47,
      "d": 2.73,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f2-golf-cart-utility': {
    "id": "veh-f2-golf-cart-utility",
    "name": "Standard: Highend: Golf Cart Utility",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.47,
      "d": 2.73,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f3-golf-cart-utility': {
    "id": "veh-f3-golf-cart-utility",
    "name": "Premium: Highend: Golf Cart Utility",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.47,
      "d": 2.73,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f4-golf-cart-utility': {
    "id": "veh-f4-golf-cart-utility",
    "name": "Elite: Highend: Golf Cart Utility",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.47,
      "d": 2.73,
      "h": 1.89
    },
    "options": {}
  },
  'veh-f1-grand-tourer-coupe': {
    "id": "veh-f1-grand-tourer-coupe",
    "name": "Basic: Highend: Grand Tourer Coupe",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.42,
      "d": 5.25,
      "h": 1.47
    },
    "options": {}
  },
  'veh-f2-grand-tourer-coupe': {
    "id": "veh-f2-grand-tourer-coupe",
    "name": "Standard: Highend: Grand Tourer Coupe",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.42,
      "d": 5.25,
      "h": 1.47
    },
    "options": {}
  },
  'veh-f3-grand-tourer-coupe': {
    "id": "veh-f3-grand-tourer-coupe",
    "name": "Premium: Highend: Grand Tourer Coupe",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.42,
      "d": 5.25,
      "h": 1.47
    },
    "options": {}
  },
  'veh-f4-grand-tourer-coupe': {
    "id": "veh-f4-grand-tourer-coupe",
    "name": "Elite: Highend: Grand Tourer Coupe",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.42,
      "d": 5.25,
      "h": 1.47
    },
    "options": {}
  },
  'veh-f1-heavy-freight-locomotive': {
    "id": "veh-f1-heavy-freight-locomotive",
    "name": "Basic: Highend: Heavy Freight Locomotive",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.57,
      "d": 25.2,
      "h": 5.04
    },
    "options": {}
  },
  'veh-f2-heavy-freight-locomotive': {
    "id": "veh-f2-heavy-freight-locomotive",
    "name": "Standard: Highend: Heavy Freight Locomotive",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.57,
      "d": 25.2,
      "h": 5.04
    },
    "options": {}
  },
  'veh-f3-heavy-freight-locomotive': {
    "id": "veh-f3-heavy-freight-locomotive",
    "name": "Premium: Highend: Heavy Freight Locomotive",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.57,
      "d": 25.2,
      "h": 5.04
    },
    "options": {}
  },
  'veh-f4-heavy-freight-locomotive': {
    "id": "veh-f4-heavy-freight-locomotive",
    "name": "Elite: Highend: Heavy Freight Locomotive",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.57,
      "d": 25.2,
      "h": 5.04
    },
    "options": {}
  },
  'veh-f1-heavy-mining-dump-truck': {
    "id": "veh-f1-heavy-mining-dump-truck",
    "name": "Basic: Highend: Heavy Mining Dump Truck",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 6.83,
      "d": 12.6,
      "h": 6.3
    },
    "options": {}
  },
  'veh-f2-heavy-mining-dump-truck': {
    "id": "veh-f2-heavy-mining-dump-truck",
    "name": "Standard: Highend: Heavy Mining Dump Truck",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 6.83,
      "d": 12.6,
      "h": 6.3
    },
    "options": {}
  },
  'veh-f3-heavy-mining-dump-truck': {
    "id": "veh-f3-heavy-mining-dump-truck",
    "name": "Premium: Highend: Heavy Mining Dump Truck",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 6.83,
      "d": 12.6,
      "h": 6.3
    },
    "options": {}
  },
  'veh-f4-heavy-mining-dump-truck': {
    "id": "veh-f4-heavy-mining-dump-truck",
    "name": "Elite: Highend: Heavy Mining Dump Truck",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 6.83,
      "d": 12.6,
      "h": 6.3
    },
    "options": {}
  },
  'veh-f1-heavy-rotary-snowplow': {
    "id": "veh-f1-heavy-rotary-snowplow",
    "name": "Basic: Highend: Heavy Rotary Snowplow",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.57,
      "d": 10.5,
      "h": 3.78
    },
    "options": {}
  },
  'veh-f2-heavy-rotary-snowplow': {
    "id": "veh-f2-heavy-rotary-snowplow",
    "name": "Standard: Highend: Heavy Rotary Snowplow",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.57,
      "d": 10.5,
      "h": 3.78
    },
    "options": {}
  },
  'veh-f3-heavy-rotary-snowplow': {
    "id": "veh-f3-heavy-rotary-snowplow",
    "name": "Premium: Highend: Heavy Rotary Snowplow",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.57,
      "d": 10.5,
      "h": 3.78
    },
    "options": {}
  },
  'veh-f4-heavy-rotary-snowplow': {
    "id": "veh-f4-heavy-rotary-snowplow",
    "name": "Elite: Highend: Heavy Rotary Snowplow",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.57,
      "d": 10.5,
      "h": 3.78
    },
    "options": {}
  },
  'veh-f1-high-speed-bullet-train': {
    "id": "veh-f1-high-speed-bullet-train",
    "name": "Basic: Highend: High Speed Bullet Train",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.36,
      "d": 35.7,
      "h": 4.2
    },
    "options": {}
  },
  'veh-f2-high-speed-bullet-train': {
    "id": "veh-f2-high-speed-bullet-train",
    "name": "Standard: Highend: High Speed Bullet Train",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.36,
      "d": 35.7,
      "h": 4.2
    },
    "options": {}
  },
  'veh-f3-high-speed-bullet-train': {
    "id": "veh-f3-high-speed-bullet-train",
    "name": "Premium: Highend: High Speed Bullet Train",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.36,
      "d": 35.7,
      "h": 4.2
    },
    "options": {}
  },
  'veh-f4-high-speed-bullet-train': {
    "id": "veh-f4-high-speed-bullet-train",
    "name": "Elite: Highend: High Speed Bullet Train",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.36,
      "d": 35.7,
      "h": 4.2
    },
    "options": {}
  },
  'veh-f1-hypercar-concept': {
    "id": "veh-f1-hypercar-concept",
    "name": "Basic: Highend: Hypercar Concept",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.52,
      "d": 5.46,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f2-hypercar-concept': {
    "id": "veh-f2-hypercar-concept",
    "name": "Standard: Highend: Hypercar Concept",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.52,
      "d": 5.46,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f3-hypercar-concept': {
    "id": "veh-f3-hypercar-concept",
    "name": "Premium: Highend: Hypercar Concept",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.52,
      "d": 5.46,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f4-hypercar-concept': {
    "id": "veh-f4-hypercar-concept",
    "name": "Elite: Highend: Hypercar Concept",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.52,
      "d": 5.46,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f1-luxury-flagship-sedan': {
    "id": "veh-f1-luxury-flagship-sedan",
    "name": "Basic: Highend: Luxury Flagship Sedan",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.42,
      "d": 5.67,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f2-luxury-flagship-sedan': {
    "id": "veh-f2-luxury-flagship-sedan",
    "name": "Standard: Highend: Luxury Flagship Sedan",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.42,
      "d": 5.67,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f3-luxury-flagship-sedan': {
    "id": "veh-f3-luxury-flagship-sedan",
    "name": "Premium: Highend: Luxury Flagship Sedan",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.42,
      "d": 5.67,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f4-luxury-flagship-sedan': {
    "id": "veh-f4-luxury-flagship-sedan",
    "name": "Elite: Highend: Luxury Flagship Sedan",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.42,
      "d": 5.67,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f1-luxury-motorhome-rv': {
    "id": "veh-f1-luxury-motorhome-rv",
    "name": "Basic: Highend: Luxury Motorhome Rv",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.73,
      "d": 10.5,
      "h": 3.68
    },
    "options": {}
  },
  'veh-f2-luxury-motorhome-rv': {
    "id": "veh-f2-luxury-motorhome-rv",
    "name": "Standard: Highend: Luxury Motorhome Rv",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.73,
      "d": 10.5,
      "h": 3.68
    },
    "options": {}
  },
  'veh-f3-luxury-motorhome-rv': {
    "id": "veh-f3-luxury-motorhome-rv",
    "name": "Premium: Highend: Luxury Motorhome Rv",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.73,
      "d": 10.5,
      "h": 3.68
    },
    "options": {}
  },
  'veh-f4-luxury-motorhome-rv': {
    "id": "veh-f4-luxury-motorhome-rv",
    "name": "Elite: Highend: Luxury Motorhome Rv",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.73,
      "d": 10.5,
      "h": 3.68
    },
    "options": {}
  },
  'veh-f1-midsize-sedan': {
    "id": "veh-f1-midsize-sedan",
    "name": "Basic: Highend: Midsize Sedan",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.21,
      "d": 5.04,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f2-midsize-sedan': {
    "id": "veh-f2-midsize-sedan",
    "name": "Standard: Highend: Midsize Sedan",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.21,
      "d": 5.04,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f3-midsize-sedan': {
    "id": "veh-f3-midsize-sedan",
    "name": "Premium: Highend: Midsize Sedan",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.21,
      "d": 5.04,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f4-midsize-sedan': {
    "id": "veh-f4-midsize-sedan",
    "name": "Elite: Highend: Midsize Sedan",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.21,
      "d": 5.04,
      "h": 1.58
    },
    "options": {}
  },
  'veh-f1-mobile-crane-transporter': {
    "id": "veh-f1-mobile-crane-transporter",
    "name": "Basic: Highend: Mobile Crane Transporter",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 3.36,
      "d": 14.7,
      "h": 4.41
    },
    "options": {}
  },
  'veh-f2-mobile-crane-transporter': {
    "id": "veh-f2-mobile-crane-transporter",
    "name": "Standard: Highend: Mobile Crane Transporter",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 3.36,
      "d": 14.7,
      "h": 4.41
    },
    "options": {}
  },
  'veh-f3-mobile-crane-transporter': {
    "id": "veh-f3-mobile-crane-transporter",
    "name": "Premium: Highend: Mobile Crane Transporter",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 3.36,
      "d": 14.7,
      "h": 4.41
    },
    "options": {}
  },
  'veh-f4-mobile-crane-transporter': {
    "id": "veh-f4-mobile-crane-transporter",
    "name": "Elite: Highend: Mobile Crane Transporter",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 3.36,
      "d": 14.7,
      "h": 4.41
    },
    "options": {}
  },
  'veh-f1-modern-city-tram': {
    "id": "veh-f1-modern-city-tram",
    "name": "Basic: Highend: Modern City Tram",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.84,
      "d": 29.4,
      "h": 3.78
    },
    "options": {}
  },
  'veh-f2-modern-city-tram': {
    "id": "veh-f2-modern-city-tram",
    "name": "Standard: Highend: Modern City Tram",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.84,
      "d": 29.4,
      "h": 3.78
    },
    "options": {}
  },
  'veh-f3-modern-city-tram': {
    "id": "veh-f3-modern-city-tram",
    "name": "Premium: Highend: Modern City Tram",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.84,
      "d": 29.4,
      "h": 3.78
    },
    "options": {}
  },
  'veh-f4-modern-city-tram': {
    "id": "veh-f4-modern-city-tram",
    "name": "Elite: Highend: Modern City Tram",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.84,
      "d": 29.4,
      "h": 3.78
    },
    "options": {}
  },
  'veh-f1-mopeds-scooter': {
    "id": "veh-f1-mopeds-scooter",
    "name": "Basic: Highend: Mopeds Scooter",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 0.95,
      "d": 1.99,
      "h": 1.26
    },
    "options": {}
  },
  'veh-f2-mopeds-scooter': {
    "id": "veh-f2-mopeds-scooter",
    "name": "Standard: Highend: Mopeds Scooter",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 0.95,
      "d": 1.99,
      "h": 1.26
    },
    "options": {}
  },
  'veh-f3-mopeds-scooter': {
    "id": "veh-f3-mopeds-scooter",
    "name": "Premium: Highend: Mopeds Scooter",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 0.95,
      "d": 1.99,
      "h": 1.26
    },
    "options": {}
  },
  'veh-f4-mopeds-scooter': {
    "id": "veh-f4-mopeds-scooter",
    "name": "Elite: Highend: Mopeds Scooter",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 0.95,
      "d": 1.99,
      "h": 1.26
    },
    "options": {}
  },
  'veh-f1-police-interceptor': {
    "id": "veh-f1-police-interceptor",
    "name": "Basic: Highend: Police Interceptor",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.31,
      "d": 5.25,
      "h": 1.68
    },
    "options": {}
  },
  'veh-f2-police-interceptor': {
    "id": "veh-f2-police-interceptor",
    "name": "Standard: Highend: Police Interceptor",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.31,
      "d": 5.25,
      "h": 1.68
    },
    "options": {}
  },
  'veh-f3-police-interceptor': {
    "id": "veh-f3-police-interceptor",
    "name": "Premium: Highend: Police Interceptor",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.31,
      "d": 5.25,
      "h": 1.68
    },
    "options": {}
  },
  'veh-f4-police-interceptor': {
    "id": "veh-f4-police-interceptor",
    "name": "Elite: Highend: Police Interceptor",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.31,
      "d": 5.25,
      "h": 1.68
    },
    "options": {}
  },
  'veh-f1-riding-mower-tractor': {
    "id": "veh-f1-riding-mower-tractor",
    "name": "Basic: Highend: Riding Mower Tractor",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 1.37,
      "d": 2.31,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f2-riding-mower-tractor': {
    "id": "veh-f2-riding-mower-tractor",
    "name": "Standard: Highend: Riding Mower Tractor",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 1.37,
      "d": 2.31,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f3-riding-mower-tractor': {
    "id": "veh-f3-riding-mower-tractor",
    "name": "Premium: Highend: Riding Mower Tractor",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 1.37,
      "d": 2.31,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f4-riding-mower-tractor': {
    "id": "veh-f4-riding-mower-tractor",
    "name": "Elite: Highend: Riding Mower Tractor",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 1.37,
      "d": 2.31,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f1-semi-truck-sleeper-cab': {
    "id": "veh-f1-semi-truck-sleeper-cab",
    "name": "Basic: Highend: Semi Truck Sleeper Cab",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.94,
      "d": 8.4,
      "h": 4.2
    },
    "options": {}
  },
  'veh-f2-semi-truck-sleeper-cab': {
    "id": "veh-f2-semi-truck-sleeper-cab",
    "name": "Standard: Highend: Semi Truck Sleeper Cab",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.94,
      "d": 8.4,
      "h": 4.2
    },
    "options": {}
  },
  'veh-f3-semi-truck-sleeper-cab': {
    "id": "veh-f3-semi-truck-sleeper-cab",
    "name": "Premium: Highend: Semi Truck Sleeper Cab",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.94,
      "d": 8.4,
      "h": 4.2
    },
    "options": {}
  },
  'veh-f4-semi-truck-sleeper-cab': {
    "id": "veh-f4-semi-truck-sleeper-cab",
    "name": "Elite: Highend: Semi Truck Sleeper Cab",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.94,
      "d": 8.4,
      "h": 4.2
    },
    "options": {}
  },
  'veh-f1-street-sweeper': {
    "id": "veh-f1-street-sweeper",
    "name": "Basic: Highend: Street Sweeper",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.42,
      "d": 5.78,
      "h": 2.73
    },
    "options": {}
  },
  'veh-f2-street-sweeper': {
    "id": "veh-f2-street-sweeper",
    "name": "Standard: Highend: Street Sweeper",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.42,
      "d": 5.78,
      "h": 2.73
    },
    "options": {}
  },
  'veh-f3-street-sweeper': {
    "id": "veh-f3-street-sweeper",
    "name": "Premium: Highend: Street Sweeper",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.42,
      "d": 5.78,
      "h": 2.73
    },
    "options": {}
  },
  'veh-f4-street-sweeper': {
    "id": "veh-f4-street-sweeper",
    "name": "Elite: Highend: Street Sweeper",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.42,
      "d": 5.78,
      "h": 2.73
    },
    "options": {}
  },
  'veh-f1-utility-pickup-truck': {
    "id": "veh-f1-utility-pickup-truck",
    "name": "Basic: Highend: Utility Pickup Truck",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.42,
      "d": 5.88,
      "h": 1.99
    },
    "options": {}
  },
  'veh-f2-utility-pickup-truck': {
    "id": "veh-f2-utility-pickup-truck",
    "name": "Standard: Highend: Utility Pickup Truck",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.42,
      "d": 5.88,
      "h": 1.99
    },
    "options": {}
  },
  'veh-f3-utility-pickup-truck': {
    "id": "veh-f3-utility-pickup-truck",
    "name": "Premium: Highend: Utility Pickup Truck",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.42,
      "d": 5.88,
      "h": 1.99
    },
    "options": {}
  },
  'veh-f4-utility-pickup-truck': {
    "id": "veh-f4-utility-pickup-truck",
    "name": "Elite: Highend: Utility Pickup Truck",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.42,
      "d": 5.88,
      "h": 1.99
    },
    "options": {}
  },
  'veh-f1-vintage-roadster': {
    "id": "veh-f1-vintage-roadster",
    "name": "Basic: Highend: Vintage Roadster",
    "category": "vehicles",
    "tier": "f1",
    "finish": "f1",
    "footprint": {
      "w": 2.1,
      "d": 4.83,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f2-vintage-roadster': {
    "id": "veh-f2-vintage-roadster",
    "name": "Standard: Highend: Vintage Roadster",
    "category": "vehicles",
    "tier": "f2",
    "finish": "f2",
    "footprint": {
      "w": 2.1,
      "d": 4.83,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f3-vintage-roadster': {
    "id": "veh-f3-vintage-roadster",
    "name": "Premium: Highend: Vintage Roadster",
    "category": "vehicles",
    "tier": "f3",
    "finish": "f3",
    "footprint": {
      "w": 2.1,
      "d": 4.83,
      "h": 1.37
    },
    "options": {}
  },
  'veh-f4-vintage-roadster': {
    "id": "veh-f4-vintage-roadster",
    "name": "Elite: Highend: Vintage Roadster",
    "category": "vehicles",
    "tier": "f4",
    "finish": "f4",
    "footprint": {
      "w": 2.1,
      "d": 4.83,
      "h": 1.37
    },
    "options": {}
  },
  'bld-f1-alpine-chalet': {
    "id": "bld-f1-alpine-chalet",
    "name": "Basic: Alpine Chalet",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "alpine-chalet",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 14.7
    },
    "rank": "A1"
  },
  'bld-f2-alpine-chalet': {
    "id": "bld-f2-alpine-chalet",
    "name": "Standard: Alpine Chalet",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "alpine-chalet",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 14.7
    },
    "rank": "A2"
  },
  'bld-f3-alpine-chalet': {
    "id": "bld-f3-alpine-chalet",
    "name": "Premium: Alpine Chalet",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "alpine-chalet",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 14.7
    },
    "rank": "A3"
  },
  'bld-f4-alpine-chalet': {
    "id": "bld-f4-alpine-chalet",
    "name": "Elite: Alpine Chalet",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "alpine-chalet",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 14.7
    },
    "rank": "A4"
  },
  'bld-f1-art-deco-skyscraper': {
    "id": "bld-f1-art-deco-skyscraper",
    "name": "Basic: Art Deco Skyscraper",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "art-deco-skyscraper",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 34,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 36.75,
      "d": 36.75,
      "h": 136.5
    },
    "rank": "E1"
  },
  'bld-f2-art-deco-skyscraper': {
    "id": "bld-f2-art-deco-skyscraper",
    "name": "Standard: Art Deco Skyscraper",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "art-deco-skyscraper",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 34,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 36.75,
      "d": 36.75,
      "h": 136.5
    },
    "rank": "E2"
  },
  'bld-f3-art-deco-skyscraper': {
    "id": "bld-f3-art-deco-skyscraper",
    "name": "Premium: Art Deco Skyscraper",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "art-deco-skyscraper",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 34,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 36.75,
      "d": 36.75,
      "h": 136.5
    },
    "rank": "E3"
  },
  'bld-f4-art-deco-skyscraper': {
    "id": "bld-f4-art-deco-skyscraper",
    "name": "Elite: Art Deco Skyscraper",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "art-deco-skyscraper",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 34,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 36.75,
      "d": 36.75,
      "h": 136.5
    },
    "rank": "E4"
  },
  'bld-f1-artisan-workshop': {
    "id": "bld-f1-artisan-workshop",
    "name": "Basic: Artisan Workshop",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "artisan-workshop",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 12.6
    },
    "rank": "A1"
  },
  'bld-f2-artisan-workshop': {
    "id": "bld-f2-artisan-workshop",
    "name": "Standard: Artisan Workshop",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "artisan-workshop",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 12.6
    },
    "rank": "A2"
  },
  'bld-f3-artisan-workshop': {
    "id": "bld-f3-artisan-workshop",
    "name": "Premium: Artisan Workshop",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "artisan-workshop",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 12.6
    },
    "rank": "A3"
  },
  'bld-f4-artisan-workshop': {
    "id": "bld-f4-artisan-workshop",
    "name": "Elite: Artisan Workshop",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "artisan-workshop",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 16.8,
      "h": 12.6
    },
    "rank": "A4"
  },
  'bld-f1-biophilic-townhouse': {
    "id": "bld-f1-biophilic-townhouse",
    "name": "Basic: Biophilic Townhouse",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "biophilic-townhouse",
    "foot": {
      "w": 2,
      "d": 3
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 18.9,
      "d": 21,
      "h": 18.9
    },
    "rank": "B1"
  },
  'bld-f2-biophilic-townhouse': {
    "id": "bld-f2-biophilic-townhouse",
    "name": "Standard: Biophilic Townhouse",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "biophilic-townhouse",
    "foot": {
      "w": 2,
      "d": 3
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 18.9,
      "d": 21,
      "h": 18.9
    },
    "rank": "B2"
  },
  'bld-f3-biophilic-townhouse': {
    "id": "bld-f3-biophilic-townhouse",
    "name": "Premium: Biophilic Townhouse",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "biophilic-townhouse",
    "foot": {
      "w": 2,
      "d": 3
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 18.9,
      "d": 21,
      "h": 18.9
    },
    "rank": "B3"
  },
  'bld-f4-biophilic-townhouse': {
    "id": "bld-f4-biophilic-townhouse",
    "name": "Elite: Biophilic Townhouse",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "biophilic-townhouse",
    "foot": {
      "w": 2,
      "d": 3
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 18.9,
      "d": 21,
      "h": 18.9
    },
    "rank": "B4"
  },
  'bld-f1-biotech-laboratory': {
    "id": "bld-f1-biotech-laboratory",
    "name": "Basic: Biotech Laboratory",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "biotech-laboratory",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 9,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 36.75
    },
    "rank": "D1"
  },
  'bld-f2-biotech-laboratory': {
    "id": "bld-f2-biotech-laboratory",
    "name": "Standard: Biotech Laboratory",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "biotech-laboratory",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 9,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 36.75
    },
    "rank": "D2"
  },
  'bld-f3-biotech-laboratory': {
    "id": "bld-f3-biotech-laboratory",
    "name": "Premium: Biotech Laboratory",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "biotech-laboratory",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 9,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 36.75
    },
    "rank": "D3"
  },
  'bld-f4-biotech-laboratory': {
    "id": "bld-f4-biotech-laboratory",
    "name": "Elite: Biotech Laboratory",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "biotech-laboratory",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 9,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 36.75
    },
    "rank": "D4"
  },
  'bld-f1-brutalist-complex': {
    "id": "bld-f1-brutalist-complex",
    "name": "Basic: Brutalist Complex",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "brutalist-complex",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 12,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 47.25
    },
    "rank": "D1"
  },
  'bld-f2-brutalist-complex': {
    "id": "bld-f2-brutalist-complex",
    "name": "Standard: Brutalist Complex",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "brutalist-complex",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 12,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 47.25
    },
    "rank": "D2"
  },
  'bld-f3-brutalist-complex': {
    "id": "bld-f3-brutalist-complex",
    "name": "Premium: Brutalist Complex",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "brutalist-complex",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 12,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 47.25
    },
    "rank": "D3"
  },
  'bld-f4-brutalist-complex': {
    "id": "bld-f4-brutalist-complex",
    "name": "Elite: Brutalist Complex",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "brutalist-complex",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 12,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 47.25
    },
    "rank": "D4"
  },
  'bld-f1-canopy-hub': {
    "id": "bld-f1-canopy-hub",
    "name": "Basic: Canopy Hub",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "canopy-hub",
    "foot": {
      "w": 6,
      "d": 6
    },
    "plan": "court",
    "levels": 12,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 44.1,
      "d": 44.1,
      "h": 47.25
    },
    "rank": "D1"
  },
  'bld-f2-canopy-hub': {
    "id": "bld-f2-canopy-hub",
    "name": "Standard: Canopy Hub",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "canopy-hub",
    "foot": {
      "w": 6,
      "d": 6
    },
    "plan": "court",
    "levels": 12,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 44.1,
      "d": 44.1,
      "h": 47.25
    },
    "rank": "D2"
  },
  'bld-f3-canopy-hub': {
    "id": "bld-f3-canopy-hub",
    "name": "Premium: Canopy Hub",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "canopy-hub",
    "foot": {
      "w": 6,
      "d": 6
    },
    "plan": "court",
    "levels": 12,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 44.1,
      "d": 44.1,
      "h": 47.25
    },
    "rank": "D3"
  },
  'bld-f4-canopy-hub': {
    "id": "bld-f4-canopy-hub",
    "name": "Elite: Canopy Hub",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "canopy-hub",
    "foot": {
      "w": 6,
      "d": 6
    },
    "plan": "court",
    "levels": 12,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 44.1,
      "d": 44.1,
      "h": 47.25
    },
    "rank": "D4"
  },
  'bld-f1-cantilever-penthouse': {
    "id": "bld-f1-cantilever-penthouse",
    "name": "Basic: Cantilever Penthouse",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "cantilever-penthouse",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "point",
    "levels": 17,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 68.25
    },
    "rank": "D1"
  },
  'bld-f2-cantilever-penthouse': {
    "id": "bld-f2-cantilever-penthouse",
    "name": "Standard: Cantilever Penthouse",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "cantilever-penthouse",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "point",
    "levels": 17,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 68.25
    },
    "rank": "D2"
  },
  'bld-f3-cantilever-penthouse': {
    "id": "bld-f3-cantilever-penthouse",
    "name": "Premium: Cantilever Penthouse",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "cantilever-penthouse",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "point",
    "levels": 17,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 68.25
    },
    "rank": "D3"
  },
  'bld-f4-cantilever-penthouse': {
    "id": "bld-f4-cantilever-penthouse",
    "name": "Elite: Cantilever Penthouse",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "cantilever-penthouse",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "point",
    "levels": 17,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 68.25
    },
    "rank": "D4"
  },
  'bld-f1-corner-bodega-flat': {
    "id": "bld-f1-corner-bodega-flat",
    "name": "Basic: Corner Bodega Flat",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "corner-bodega-flat",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "L",
    "levels": 4,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 16.8
    },
    "rank": "A1"
  },
  'bld-f2-corner-bodega-flat': {
    "id": "bld-f2-corner-bodega-flat",
    "name": "Standard: Corner Bodega Flat",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "corner-bodega-flat",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "L",
    "levels": 4,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 16.8
    },
    "rank": "A2"
  },
  'bld-f3-corner-bodega-flat': {
    "id": "bld-f3-corner-bodega-flat",
    "name": "Premium: Corner Bodega Flat",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "corner-bodega-flat",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "L",
    "levels": 4,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 16.8
    },
    "rank": "A3"
  },
  'bld-f4-corner-bodega-flat': {
    "id": "bld-f4-corner-bodega-flat",
    "name": "Elite: Corner Bodega Flat",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "corner-bodega-flat",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "L",
    "levels": 4,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 16.8
    },
    "rank": "A4"
  },
  'bld-f1-craftsman-bungalow': {
    "id": "bld-f1-craftsman-bungalow",
    "name": "Basic: Craftsman Bungalow",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "craftsman-bungalow",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 2,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 9.45
    },
    "rank": "A1"
  },
  'bld-f2-craftsman-bungalow': {
    "id": "bld-f2-craftsman-bungalow",
    "name": "Standard: Craftsman Bungalow",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "craftsman-bungalow",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 2,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 9.45
    },
    "rank": "A2"
  },
  'bld-f3-craftsman-bungalow': {
    "id": "bld-f3-craftsman-bungalow",
    "name": "Premium: Craftsman Bungalow",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "craftsman-bungalow",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 2,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 9.45
    },
    "rank": "A3"
  },
  'bld-f4-craftsman-bungalow': {
    "id": "bld-f4-craftsman-bungalow",
    "name": "Elite: Craftsman Bungalow",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "craftsman-bungalow",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 2,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 16.8,
      "d": 16.8,
      "h": 9.45
    },
    "rank": "A4"
  },
  'bld-f1-crystalline-pavilion': {
    "id": "bld-f1-crystalline-pavilion",
    "name": "Basic: Crystalline Pavilion",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "crystalline-pavilion",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "point",
    "levels": 5,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 27.3,
      "d": 27.3,
      "h": 18.9
    },
    "rank": "B1"
  },
  'bld-f2-crystalline-pavilion': {
    "id": "bld-f2-crystalline-pavilion",
    "name": "Standard: Crystalline Pavilion",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "crystalline-pavilion",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "point",
    "levels": 5,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 27.3,
      "d": 27.3,
      "h": 18.9
    },
    "rank": "B2"
  },
  'bld-f3-crystalline-pavilion': {
    "id": "bld-f3-crystalline-pavilion",
    "name": "Premium: Crystalline Pavilion",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "crystalline-pavilion",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "point",
    "levels": 5,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 27.3,
      "d": 27.3,
      "h": 18.9
    },
    "rank": "B3"
  },
  'bld-f4-crystalline-pavilion': {
    "id": "bld-f4-crystalline-pavilion",
    "name": "Elite: Crystalline Pavilion",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "crystalline-pavilion",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "point",
    "levels": 5,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 27.3,
      "d": 27.3,
      "h": 18.9
    },
    "rank": "B4"
  },
  'bld-f1-data-center-cube': {
    "id": "bld-f1-data-center-cube",
    "name": "Basic: Data Center Cube",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "data-center-cube",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "bar",
    "levels": 6,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 25.2
    },
    "rank": "C1"
  },
  'bld-f2-data-center-cube': {
    "id": "bld-f2-data-center-cube",
    "name": "Standard: Data Center Cube",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "data-center-cube",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "bar",
    "levels": 6,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 25.2
    },
    "rank": "C2"
  },
  'bld-f3-data-center-cube': {
    "id": "bld-f3-data-center-cube",
    "name": "Premium: Data Center Cube",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "data-center-cube",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "bar",
    "levels": 6,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 25.2
    },
    "rank": "C3"
  },
  'bld-f4-data-center-cube': {
    "id": "bld-f4-data-center-cube",
    "name": "Elite: Data Center Cube",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "data-center-cube",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "bar",
    "levels": 6,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 25.2
    },
    "rank": "C4"
  },
  'bld-f1-diagrid-tower': {
    "id": "bld-f1-diagrid-tower",
    "name": "Basic: Diagrid Tower",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "diagrid-tower",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "point",
    "levels": 32,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 126
    },
    "rank": "E1"
  },
  'bld-f2-diagrid-tower': {
    "id": "bld-f2-diagrid-tower",
    "name": "Standard: Diagrid Tower",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "diagrid-tower",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "point",
    "levels": 32,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 126
    },
    "rank": "E2"
  },
  'bld-f3-diagrid-tower': {
    "id": "bld-f3-diagrid-tower",
    "name": "Premium: Diagrid Tower",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "diagrid-tower",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "point",
    "levels": 32,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 126
    },
    "rank": "E3"
  },
  'bld-f4-diagrid-tower': {
    "id": "bld-f4-diagrid-tower",
    "name": "Elite: Diagrid Tower",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "diagrid-tower",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "point",
    "levels": 32,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 37.8,
      "d": 37.8,
      "h": 126
    },
    "rank": "E4"
  },
  'bld-f1-floating-cube-residence': {
    "id": "bld-f1-floating-cube-residence",
    "name": "Basic: Floating Cube Residence",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "floating-cube-residence",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 16.8
    },
    "rank": "A1"
  },
  'bld-f2-floating-cube-residence': {
    "id": "bld-f2-floating-cube-residence",
    "name": "Standard: Floating Cube Residence",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "floating-cube-residence",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 16.8
    },
    "rank": "A2"
  },
  'bld-f3-floating-cube-residence': {
    "id": "bld-f3-floating-cube-residence",
    "name": "Premium: Floating Cube Residence",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "floating-cube-residence",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 16.8
    },
    "rank": "A3"
  },
  'bld-f4-floating-cube-residence': {
    "id": "bld-f4-floating-cube-residence",
    "name": "Elite: Floating Cube Residence",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "floating-cube-residence",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "point",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 16.8
    },
    "rank": "A4"
  },
  'bld-f1-geodetic-eco-home': {
    "id": "bld-f1-geodetic-eco-home",
    "name": "Basic: Geodetic Eco Home",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "geodetic-eco-home",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "ring",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 10.5
    },
    "rank": "A1"
  },
  'bld-f2-geodetic-eco-home': {
    "id": "bld-f2-geodetic-eco-home",
    "name": "Standard: Geodetic Eco Home",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "geodetic-eco-home",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "ring",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 10.5
    },
    "rank": "A2"
  },
  'bld-f3-geodetic-eco-home': {
    "id": "bld-f3-geodetic-eco-home",
    "name": "Premium: Geodetic Eco Home",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "geodetic-eco-home",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "ring",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 10.5
    },
    "rank": "A3"
  },
  'bld-f4-geodetic-eco-home': {
    "id": "bld-f4-geodetic-eco-home",
    "name": "Elite: Geodetic Eco Home",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "geodetic-eco-home",
    "foot": {
      "w": 2,
      "d": 2
    },
    "plan": "ring",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 18.9,
      "d": 18.9,
      "h": 10.5
    },
    "rank": "A4"
  },
  'bld-f1-gothic-revival-manor': {
    "id": "bld-f1-gothic-revival-manor",
    "name": "Basic: Gothic Revival Manor",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "gothic-revival-manor",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 6,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 27.3,
      "d": 23.1,
      "h": 25.2
    },
    "rank": "B1"
  },
  'bld-f2-gothic-revival-manor': {
    "id": "bld-f2-gothic-revival-manor",
    "name": "Standard: Gothic Revival Manor",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "gothic-revival-manor",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 6,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 27.3,
      "d": 23.1,
      "h": 25.2
    },
    "rank": "B2"
  },
  'bld-f3-gothic-revival-manor': {
    "id": "bld-f3-gothic-revival-manor",
    "name": "Premium: Gothic Revival Manor",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "gothic-revival-manor",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 6,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 27.3,
      "d": 23.1,
      "h": 25.2
    },
    "rank": "B3"
  },
  'bld-f4-gothic-revival-manor': {
    "id": "bld-f4-gothic-revival-manor",
    "name": "Elite: Gothic Revival Manor",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "gothic-revival-manor",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 6,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 27.3,
      "d": 23.1,
      "h": 25.2
    },
    "rank": "B4"
  },
  'bld-f1-greenpod-office': {
    "id": "bld-f1-greenpod-office",
    "name": "Basic: Greenpod Office",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "greenpod-office",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "bar",
    "levels": 16,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 35.7,
      "d": 35.7,
      "h": 63
    },
    "rank": "D1"
  },
  'bld-f2-greenpod-office': {
    "id": "bld-f2-greenpod-office",
    "name": "Standard: Greenpod Office",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "greenpod-office",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "bar",
    "levels": 16,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 35.7,
      "d": 35.7,
      "h": 63
    },
    "rank": "D2"
  },
  'bld-f3-greenpod-office': {
    "id": "bld-f3-greenpod-office",
    "name": "Premium: Greenpod Office",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "greenpod-office",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "bar",
    "levels": 16,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 35.7,
      "d": 35.7,
      "h": 63
    },
    "rank": "D3"
  },
  'bld-f4-greenpod-office': {
    "id": "bld-f4-greenpod-office",
    "name": "Elite: Greenpod Office",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "greenpod-office",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "bar",
    "levels": 16,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 35.7,
      "d": 35.7,
      "h": 63
    },
    "rank": "D4"
  },
  'bld-f1-helix-terrace': {
    "id": "bld-f1-helix-terrace",
    "name": "Basic: Helix Terrace",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "helix-terrace",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 25,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 99.75
    },
    "rank": "D1"
  },
  'bld-f2-helix-terrace': {
    "id": "bld-f2-helix-terrace",
    "name": "Standard: Helix Terrace",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "helix-terrace",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 25,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 99.75
    },
    "rank": "D2"
  },
  'bld-f3-helix-terrace': {
    "id": "bld-f3-helix-terrace",
    "name": "Premium: Helix Terrace",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "helix-terrace",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 25,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 99.75
    },
    "rank": "D3"
  },
  'bld-f4-helix-terrace': {
    "id": "bld-f4-helix-terrace",
    "name": "Elite: Helix Terrace",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "helix-terrace",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 25,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 99.75
    },
    "rank": "D4"
  },
  'bld-f1-hyperboloid-hq': {
    "id": "bld-f1-hyperboloid-hq",
    "name": "Basic: Hyperboloid HQ",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "hyperboloid-hq",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 22,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 89.25
    },
    "rank": "D1"
  },
  'bld-f2-hyperboloid-hq': {
    "id": "bld-f2-hyperboloid-hq",
    "name": "Standard: Hyperboloid HQ",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "hyperboloid-hq",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 22,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 89.25
    },
    "rank": "D2"
  },
  'bld-f3-hyperboloid-hq': {
    "id": "bld-f3-hyperboloid-hq",
    "name": "Premium: Hyperboloid HQ",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "hyperboloid-hq",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 22,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 89.25
    },
    "rank": "D3"
  },
  'bld-f4-hyperboloid-hq': {
    "id": "bld-f4-hyperboloid-hq",
    "name": "Elite: Hyperboloid HQ",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "hyperboloid-hq",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 22,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 42,
      "d": 42,
      "h": 89.25
    },
    "rank": "D4"
  },
  'bld-f1-industrial-warehouse-hub': {
    "id": "bld-f1-industrial-warehouse-hub",
    "name": "Basic: Industrial Warehouse Hub",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "industrial-warehouse-hub",
    "foot": {
      "w": 7,
      "d": 6
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 52.5,
      "d": 47.25,
      "h": 18.9
    },
    "rank": "D1"
  },
  'bld-f2-industrial-warehouse-hub': {
    "id": "bld-f2-industrial-warehouse-hub",
    "name": "Standard: Industrial Warehouse Hub",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "industrial-warehouse-hub",
    "foot": {
      "w": 7,
      "d": 6
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 52.5,
      "d": 47.25,
      "h": 18.9
    },
    "rank": "D2"
  },
  'bld-f3-industrial-warehouse-hub': {
    "id": "bld-f3-industrial-warehouse-hub",
    "name": "Premium: Industrial Warehouse Hub",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "industrial-warehouse-hub",
    "foot": {
      "w": 7,
      "d": 6
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 52.5,
      "d": 47.25,
      "h": 18.9
    },
    "rank": "D3"
  },
  'bld-f4-industrial-warehouse-hub': {
    "id": "bld-f4-industrial-warehouse-hub",
    "name": "Elite: Industrial Warehouse Hub",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "industrial-warehouse-hub",
    "foot": {
      "w": 7,
      "d": 6
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 52.5,
      "d": 47.25,
      "h": 18.9
    },
    "rank": "D4"
  },
  'bld-f1-kinetic-facade-tower': {
    "id": "bld-f1-kinetic-facade-tower",
    "name": "Basic: Kinetic Facade Tower",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "kinetic-facade-tower",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 28,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 110.25
    },
    "rank": "D1"
  },
  'bld-f2-kinetic-facade-tower': {
    "id": "bld-f2-kinetic-facade-tower",
    "name": "Standard: Kinetic Facade Tower",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "kinetic-facade-tower",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 28,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 110.25
    },
    "rank": "D2"
  },
  'bld-f3-kinetic-facade-tower': {
    "id": "bld-f3-kinetic-facade-tower",
    "name": "Premium: Kinetic Facade Tower",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "kinetic-facade-tower",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 28,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 110.25
    },
    "rank": "D3"
  },
  'bld-f4-kinetic-facade-tower': {
    "id": "bld-f4-kinetic-facade-tower",
    "name": "Elite: Kinetic Facade Tower",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "kinetic-facade-tower",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 28,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 110.25
    },
    "rank": "D4"
  },
  'bld-f1-micro-apartment-tower': {
    "id": "bld-f1-micro-apartment-tower",
    "name": "Basic: Micro Apartment Tower",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "micro-apartment-tower",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "point",
    "levels": 21,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 23.1,
      "d": 23.1,
      "h": 84
    },
    "rank": "C1"
  },
  'bld-f2-micro-apartment-tower': {
    "id": "bld-f2-micro-apartment-tower",
    "name": "Standard: Micro Apartment Tower",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "micro-apartment-tower",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "point",
    "levels": 21,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 23.1,
      "d": 23.1,
      "h": 84
    },
    "rank": "C2"
  },
  'bld-f3-micro-apartment-tower': {
    "id": "bld-f3-micro-apartment-tower",
    "name": "Premium: Micro Apartment Tower",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "micro-apartment-tower",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "point",
    "levels": 21,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 23.1,
      "d": 23.1,
      "h": 84
    },
    "rank": "C3"
  },
  'bld-f4-micro-apartment-tower': {
    "id": "bld-f4-micro-apartment-tower",
    "name": "Elite: Micro Apartment Tower",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "micro-apartment-tower",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "point",
    "levels": 21,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 23.1,
      "d": 23.1,
      "h": 84
    },
    "rank": "C4"
  },
  'bld-f1-midcentury-ranch': {
    "id": "bld-f1-midcentury-ranch",
    "name": "Basic: Midcentury Ranch",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "midcentury-ranch",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "L",
    "levels": 2,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 23.1,
      "d": 16.8,
      "h": 7.88
    },
    "rank": "A1"
  },
  'bld-f2-midcentury-ranch': {
    "id": "bld-f2-midcentury-ranch",
    "name": "Standard: Midcentury Ranch",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "midcentury-ranch",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "L",
    "levels": 2,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 23.1,
      "d": 16.8,
      "h": 7.88
    },
    "rank": "A2"
  },
  'bld-f3-midcentury-ranch': {
    "id": "bld-f3-midcentury-ranch",
    "name": "Premium: Midcentury Ranch",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "midcentury-ranch",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "L",
    "levels": 2,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 23.1,
      "d": 16.8,
      "h": 7.88
    },
    "rank": "A3"
  },
  'bld-f4-midcentury-ranch': {
    "id": "bld-f4-midcentury-ranch",
    "name": "Elite: Midcentury Ranch",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "midcentury-ranch",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "L",
    "levels": 2,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 23.1,
      "d": 16.8,
      "h": 7.88
    },
    "rank": "A4"
  },
  'bld-f1-modern-loft-row': {
    "id": "bld-f1-modern-loft-row",
    "name": "Basic: Modern Loft Row",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "modern-loft-row",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 25.2,
      "d": 18.9,
      "h": 21
    },
    "rank": "B1"
  },
  'bld-f2-modern-loft-row': {
    "id": "bld-f2-modern-loft-row",
    "name": "Standard: Modern Loft Row",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "modern-loft-row",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 25.2,
      "d": 18.9,
      "h": 21
    },
    "rank": "B2"
  },
  'bld-f3-modern-loft-row': {
    "id": "bld-f3-modern-loft-row",
    "name": "Premium: Modern Loft Row",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "modern-loft-row",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 25.2,
      "d": 18.9,
      "h": 21
    },
    "rank": "B3"
  },
  'bld-f4-modern-loft-row': {
    "id": "bld-f4-modern-loft-row",
    "name": "Elite: Modern Loft Row",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "modern-loft-row",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 25.2,
      "d": 18.9,
      "h": 21
    },
    "rank": "B4"
  },
  'bld-f1-modular-timber-flat': {
    "id": "bld-f1-modular-timber-flat",
    "name": "Basic: Modular Timber Flat",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "modular-timber-flat",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "bar",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 25.2,
      "d": 21,
      "h": 25.2
    },
    "rank": "B1"
  },
  'bld-f2-modular-timber-flat': {
    "id": "bld-f2-modular-timber-flat",
    "name": "Standard: Modular Timber Flat",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "modular-timber-flat",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "bar",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 25.2,
      "d": 21,
      "h": 25.2
    },
    "rank": "B2"
  },
  'bld-f3-modular-timber-flat': {
    "id": "bld-f3-modular-timber-flat",
    "name": "Premium: Modular Timber Flat",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "modular-timber-flat",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "bar",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 25.2,
      "d": 21,
      "h": 25.2
    },
    "rank": "B3"
  },
  'bld-f4-modular-timber-flat': {
    "id": "bld-f4-modular-timber-flat",
    "name": "Elite: Modular Timber Flat",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "modular-timber-flat",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "bar",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 25.2,
      "d": 21,
      "h": 25.2
    },
    "rank": "B4"
  },
  'bld-f1-neoclassic-mansion': {
    "id": "bld-f1-neoclassic-mansion",
    "name": "Basic: Neoclassic Mansion",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "neoclassic-mansion",
    "foot": {
      "w": 4,
      "d": 3
    },
    "plan": "U",
    "levels": 5,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 29.4,
      "d": 25.2,
      "h": 18.9
    },
    "rank": "B1"
  },
  'bld-f2-neoclassic-mansion': {
    "id": "bld-f2-neoclassic-mansion",
    "name": "Standard: Neoclassic Mansion",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "neoclassic-mansion",
    "foot": {
      "w": 4,
      "d": 3
    },
    "plan": "U",
    "levels": 5,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 29.4,
      "d": 25.2,
      "h": 18.9
    },
    "rank": "B2"
  },
  'bld-f3-neoclassic-mansion': {
    "id": "bld-f3-neoclassic-mansion",
    "name": "Premium: Neoclassic Mansion",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "neoclassic-mansion",
    "foot": {
      "w": 4,
      "d": 3
    },
    "plan": "U",
    "levels": 5,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 29.4,
      "d": 25.2,
      "h": 18.9
    },
    "rank": "B3"
  },
  'bld-f4-neoclassic-mansion': {
    "id": "bld-f4-neoclassic-mansion",
    "name": "Elite: Neoclassic Mansion",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "neoclassic-mansion",
    "foot": {
      "w": 4,
      "d": 3
    },
    "plan": "U",
    "levels": 5,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 29.4,
      "d": 25.2,
      "h": 18.9
    },
    "rank": "B4"
  },
  'bld-f1-origami-cultural-center': {
    "id": "bld-f1-origami-cultural-center",
    "name": "Basic: Origami Cultural Center",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "origami-cultural-center",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 7,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 39.9,
      "d": 39.9,
      "h": 29.4
    },
    "rank": "C1"
  },
  'bld-f2-origami-cultural-center': {
    "id": "bld-f2-origami-cultural-center",
    "name": "Standard: Origami Cultural Center",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "origami-cultural-center",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 7,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 39.9,
      "d": 39.9,
      "h": 29.4
    },
    "rank": "C2"
  },
  'bld-f3-origami-cultural-center': {
    "id": "bld-f3-origami-cultural-center",
    "name": "Premium: Origami Cultural Center",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "origami-cultural-center",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 7,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 39.9,
      "d": 39.9,
      "h": 29.4
    },
    "rank": "C3"
  },
  'bld-f4-origami-cultural-center': {
    "id": "bld-f4-origami-cultural-center",
    "name": "Elite: Origami Cultural Center",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "origami-cultural-center",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 7,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 39.9,
      "d": 39.9,
      "h": 29.4
    },
    "rank": "C4"
  },
  'bld-f1-parametric-residence': {
    "id": "bld-f1-parametric-residence",
    "name": "Basic: Parametric Residence",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "parametric-residence",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 23.1,
      "h": 14.7
    },
    "rank": "B1"
  },
  'bld-f2-parametric-residence': {
    "id": "bld-f2-parametric-residence",
    "name": "Standard: Parametric Residence",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "parametric-residence",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 23.1,
      "h": 14.7
    },
    "rank": "B2"
  },
  'bld-f3-parametric-residence': {
    "id": "bld-f3-parametric-residence",
    "name": "Premium: Parametric Residence",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "parametric-residence",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 23.1,
      "h": 14.7
    },
    "rank": "B3"
  },
  'bld-f4-parametric-residence': {
    "id": "bld-f4-parametric-residence",
    "name": "Elite: Parametric Residence",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "parametric-residence",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 23.1,
      "h": 14.7
    },
    "rank": "B4"
  },
  'bld-f1-ribbon-villa': {
    "id": "bld-f1-ribbon-villa",
    "name": "Basic: Ribbon Villa",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "ribbon-villa",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "bar",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 16.8
    },
    "rank": "B1"
  },
  'bld-f2-ribbon-villa': {
    "id": "bld-f2-ribbon-villa",
    "name": "Standard: Ribbon Villa",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "ribbon-villa",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "bar",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 16.8
    },
    "rank": "B2"
  },
  'bld-f3-ribbon-villa': {
    "id": "bld-f3-ribbon-villa",
    "name": "Premium: Ribbon Villa",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "ribbon-villa",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "bar",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 16.8
    },
    "rank": "B3"
  },
  'bld-f4-ribbon-villa': {
    "id": "bld-f4-ribbon-villa",
    "name": "Elite: Ribbon Villa",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "ribbon-villa",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "bar",
    "levels": 4,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 25.2,
      "d": 25.2,
      "h": 16.8
    },
    "rank": "B4"
  },
  'bld-f1-row-brownstone': {
    "id": "bld-f1-row-brownstone",
    "name": "Basic: Row Brownstone",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "row-brownstone",
    "foot": {
      "w": 2,
      "d": 3
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 14.7,
      "d": 21,
      "h": 18.9
    },
    "rank": "B1"
  },
  'bld-f2-row-brownstone': {
    "id": "bld-f2-row-brownstone",
    "name": "Standard: Row Brownstone",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "row-brownstone",
    "foot": {
      "w": 2,
      "d": 3
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 14.7,
      "d": 21,
      "h": 18.9
    },
    "rank": "B2"
  },
  'bld-f3-row-brownstone': {
    "id": "bld-f3-row-brownstone",
    "name": "Premium: Row Brownstone",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "row-brownstone",
    "foot": {
      "w": 2,
      "d": 3
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 14.7,
      "d": 21,
      "h": 18.9
    },
    "rank": "B3"
  },
  'bld-f4-row-brownstone': {
    "id": "bld-f4-row-brownstone",
    "name": "Elite: Row Brownstone",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "row-brownstone",
    "foot": {
      "w": 2,
      "d": 3
    },
    "plan": "bar",
    "levels": 5,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 14.7,
      "d": 21,
      "h": 18.9
    },
    "rank": "B4"
  },
  'bld-f1-shard-biotower': {
    "id": "bld-f1-shard-biotower",
    "name": "Basic: Shard Biotower",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "shard-biotower",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 37,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 39.9,
      "d": 39.9,
      "h": 147
    },
    "rank": "E1"
  },
  'bld-f2-shard-biotower': {
    "id": "bld-f2-shard-biotower",
    "name": "Standard: Shard Biotower",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "shard-biotower",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 37,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 39.9,
      "d": 39.9,
      "h": 147
    },
    "rank": "E2"
  },
  'bld-f3-shard-biotower': {
    "id": "bld-f3-shard-biotower",
    "name": "Premium: Shard Biotower",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "shard-biotower",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 37,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 39.9,
      "d": 39.9,
      "h": 147
    },
    "rank": "E3"
  },
  'bld-f4-shard-biotower': {
    "id": "bld-f4-shard-biotower",
    "name": "Elite: Shard Biotower",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "shard-biotower",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "tower-on-podium",
    "levels": 37,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 39.9,
      "d": 39.9,
      "h": 147
    },
    "rank": "E4"
  },
  'bld-f1-shipping-container-living': {
    "id": "bld-f1-shipping-container-living",
    "name": "Basic: Shipping Container Living",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "shipping-container-living",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 14.7,
      "h": 12.6
    },
    "rank": "B1"
  },
  'bld-f2-shipping-container-living': {
    "id": "bld-f2-shipping-container-living",
    "name": "Standard: Shipping Container Living",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "shipping-container-living",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 14.7,
      "h": 12.6
    },
    "rank": "B2"
  },
  'bld-f3-shipping-container-living': {
    "id": "bld-f3-shipping-container-living",
    "name": "Premium: Shipping Container Living",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "shipping-container-living",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 14.7,
      "h": 12.6
    },
    "rank": "B3"
  },
  'bld-f4-shipping-container-living': {
    "id": "bld-f4-shipping-container-living",
    "name": "Elite: Shipping Container Living",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "shipping-container-living",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 14.7,
      "h": 12.6
    },
    "rank": "B4"
  },
  'bld-f1-skybridge-complex': {
    "id": "bld-f1-skybridge-complex",
    "name": "Basic: Skybridge Complex",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "skybridge-complex",
    "foot": {
      "w": 6,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 20,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 50.4,
      "d": 31.5,
      "h": 78.75
    },
    "rank": "D1"
  },
  'bld-f2-skybridge-complex': {
    "id": "bld-f2-skybridge-complex",
    "name": "Standard: Skybridge Complex",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "skybridge-complex",
    "foot": {
      "w": 6,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 20,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 50.4,
      "d": 31.5,
      "h": 78.75
    },
    "rank": "D2"
  },
  'bld-f3-skybridge-complex': {
    "id": "bld-f3-skybridge-complex",
    "name": "Premium: Skybridge Complex",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "skybridge-complex",
    "foot": {
      "w": 6,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 20,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 50.4,
      "d": 31.5,
      "h": 78.75
    },
    "rank": "D3"
  },
  'bld-f4-skybridge-complex': {
    "id": "bld-f4-skybridge-complex",
    "name": "Elite: Skybridge Complex",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "skybridge-complex",
    "foot": {
      "w": 6,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 20,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 50.4,
      "d": 31.5,
      "h": 78.75
    },
    "rank": "D4"
  },
  'bld-f1-solar-spire': {
    "id": "bld-f1-solar-spire",
    "name": "Basic: Solar Spire",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "solar-spire",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 39,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 157.5
    },
    "rank": "E1"
  },
  'bld-f2-solar-spire': {
    "id": "bld-f2-solar-spire",
    "name": "Standard: Solar Spire",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "solar-spire",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 39,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 157.5
    },
    "rank": "E2"
  },
  'bld-f3-solar-spire': {
    "id": "bld-f3-solar-spire",
    "name": "Premium: Solar Spire",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "solar-spire",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 39,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 157.5
    },
    "rank": "E3"
  },
  'bld-f4-solar-spire': {
    "id": "bld-f4-solar-spire",
    "name": "Elite: Solar Spire",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "solar-spire",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 39,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 29.4,
      "d": 29.4,
      "h": 157.5
    },
    "rank": "E4"
  },
  'bld-f1-stepgarden-walkup': {
    "id": "bld-f1-stepgarden-walkup",
    "name": "Basic: Stepgarden Walkup",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "stepgarden-walkup",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 23.1,
      "d": 27.3,
      "h": 23.1
    },
    "rank": "B1"
  },
  'bld-f2-stepgarden-walkup': {
    "id": "bld-f2-stepgarden-walkup",
    "name": "Standard: Stepgarden Walkup",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "stepgarden-walkup",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 23.1,
      "d": 27.3,
      "h": 23.1
    },
    "rank": "B2"
  },
  'bld-f3-stepgarden-walkup': {
    "id": "bld-f3-stepgarden-walkup",
    "name": "Premium: Stepgarden Walkup",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "stepgarden-walkup",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 23.1,
      "d": 27.3,
      "h": 23.1
    },
    "rank": "B3"
  },
  'bld-f4-stepgarden-walkup': {
    "id": "bld-f4-stepgarden-walkup",
    "name": "Elite: Stepgarden Walkup",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "stepgarden-walkup",
    "foot": {
      "w": 3,
      "d": 3
    },
    "plan": "L",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 23.1,
      "d": 27.3,
      "h": 23.1
    },
    "rank": "B4"
  },
  'bld-f1-suburban-split-level': {
    "id": "bld-f1-suburban-split-level",
    "name": "Basic: Suburban Split Level",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "suburban-split-level",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 10.5
    },
    "rank": "B1"
  },
  'bld-f2-suburban-split-level': {
    "id": "bld-f2-suburban-split-level",
    "name": "Standard: Suburban Split Level",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "suburban-split-level",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 10.5
    },
    "rank": "B2"
  },
  'bld-f3-suburban-split-level': {
    "id": "bld-f3-suburban-split-level",
    "name": "Premium: Suburban Split Level",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "suburban-split-level",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 10.5
    },
    "rank": "B3"
  },
  'bld-f4-suburban-split-level': {
    "id": "bld-f4-suburban-split-level",
    "name": "Elite: Suburban Split Level",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "suburban-split-level",
    "foot": {
      "w": 3,
      "d": 2
    },
    "plan": "bar",
    "levels": 3,
    "clear": {
      "w": 1,
      "d": 1
    },
    "footprint": {
      "w": 21,
      "d": 18.9,
      "h": 10.5
    },
    "rank": "B4"
  },
  'bld-f1-terraced-courtyard-block': {
    "id": "bld-f1-terraced-courtyard-block",
    "name": "Basic: Terraced Courtyard Block",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "terraced-courtyard-block",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "court",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 23.1
    },
    "rank": "C1"
  },
  'bld-f2-terraced-courtyard-block': {
    "id": "bld-f2-terraced-courtyard-block",
    "name": "Standard: Terraced Courtyard Block",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "terraced-courtyard-block",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "court",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 23.1
    },
    "rank": "C2"
  },
  'bld-f3-terraced-courtyard-block': {
    "id": "bld-f3-terraced-courtyard-block",
    "name": "Premium: Terraced Courtyard Block",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "terraced-courtyard-block",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "court",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 23.1
    },
    "rank": "C3"
  },
  'bld-f4-terraced-courtyard-block': {
    "id": "bld-f4-terraced-courtyard-block",
    "name": "Elite: Terraced Courtyard Block",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "terraced-courtyard-block",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "court",
    "levels": 6,
    "clear": {
      "w": 0,
      "d": 0
    },
    "footprint": {
      "w": 33.6,
      "d": 33.6,
      "h": 23.1
    },
    "rank": "C4"
  },
  'bld-f1-vertical-forest': {
    "id": "bld-f1-vertical-forest",
    "name": "Basic: Vertical Forest",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "vertical-forest",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "point",
    "levels": 24,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 31.5,
      "d": 31.5,
      "h": 94.5
    },
    "rank": "D1"
  },
  'bld-f2-vertical-forest': {
    "id": "bld-f2-vertical-forest",
    "name": "Standard: Vertical Forest",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "vertical-forest",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "point",
    "levels": 24,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 31.5,
      "d": 31.5,
      "h": 94.5
    },
    "rank": "D2"
  },
  'bld-f3-vertical-forest': {
    "id": "bld-f3-vertical-forest",
    "name": "Premium: Vertical Forest",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "vertical-forest",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "point",
    "levels": 24,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 31.5,
      "d": 31.5,
      "h": 94.5
    },
    "rank": "D3"
  },
  'bld-f4-vertical-forest': {
    "id": "bld-f4-vertical-forest",
    "name": "Elite: Vertical Forest",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "vertical-forest",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "point",
    "levels": 24,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 31.5,
      "d": 31.5,
      "h": 94.5
    },
    "rank": "D4"
  },
  'bld-f1-waterfall-atrium': {
    "id": "bld-f1-waterfall-atrium",
    "name": "Basic: Waterfall Atrium",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "waterfall-atrium",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 13,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 36.75,
      "d": 36.75,
      "h": 52.5
    },
    "rank": "D1"
  },
  'bld-f2-waterfall-atrium': {
    "id": "bld-f2-waterfall-atrium",
    "name": "Standard: Waterfall Atrium",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "waterfall-atrium",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 13,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 36.75,
      "d": 36.75,
      "h": 52.5
    },
    "rank": "D2"
  },
  'bld-f3-waterfall-atrium': {
    "id": "bld-f3-waterfall-atrium",
    "name": "Premium: Waterfall Atrium",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "waterfall-atrium",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 13,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 36.75,
      "d": 36.75,
      "h": 52.5
    },
    "rank": "D3"
  },
  'bld-f4-waterfall-atrium': {
    "id": "bld-f4-waterfall-atrium",
    "name": "Elite: Waterfall Atrium",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "waterfall-atrium",
    "foot": {
      "w": 5,
      "d": 5
    },
    "plan": "court",
    "levels": 13,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 36.75,
      "d": 36.75,
      "h": 52.5
    },
    "rank": "D4"
  },
  'bld-f1-wave-tower': {
    "id": "bld-f1-wave-tower",
    "name": "Basic: Wave Tower",
    "category": "buildings",
    "tier": "f1",
    "finish": "f1",
    "design": "wave-tower",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 29,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 31.5,
      "d": 31.5,
      "h": 115.5
    },
    "rank": "D1"
  },
  'bld-f2-wave-tower': {
    "id": "bld-f2-wave-tower",
    "name": "Standard: Wave Tower",
    "category": "buildings",
    "tier": "f2",
    "finish": "f2",
    "design": "wave-tower",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 29,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 31.5,
      "d": 31.5,
      "h": 115.5
    },
    "rank": "D2"
  },
  'bld-f3-wave-tower': {
    "id": "bld-f3-wave-tower",
    "name": "Premium: Wave Tower",
    "category": "buildings",
    "tier": "f3",
    "finish": "f3",
    "design": "wave-tower",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 29,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 31.5,
      "d": 31.5,
      "h": 115.5
    },
    "rank": "D3"
  },
  'bld-f4-wave-tower': {
    "id": "bld-f4-wave-tower",
    "name": "Elite: Wave Tower",
    "category": "buildings",
    "tier": "f4",
    "finish": "f4",
    "design": "wave-tower",
    "foot": {
      "w": 4,
      "d": 4
    },
    "plan": "tower-on-podium",
    "levels": 29,
    "clear": {
      "w": 2,
      "d": 2
    },
    "footprint": {
      "w": 31.5,
      "d": 31.5,
      "h": 115.5
    },
    "rank": "D4"
  },
};
