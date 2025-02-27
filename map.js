import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
console.log("Mapbox GL JS Loaded:", mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1Ijoib21hcmFsaXVjc2QiLCJhIjoiY203bXgxeTY2MG52czJucHZwcDVqdjdleiJ9.ZuPUOfv_SejSyAiiAcrMfA';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the div where the map will render
    style: 'mapbox://styles/mapbox/streets-v12', // Basemap style
    center: [-71.0589, 42.3601], // Center on Boston (Longitude, Latitude)
    zoom: 12, // Initial zoom level
    minZoom: 5, // Minimum zoom level
    maxZoom: 18 // Maximum zoom level
  });

  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
  });

  // Add a layer to visualize the bike lanes
  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': 'green', // Green bike lanes
      'line-width': 3, // Line thickness
      'line-opacity': 0.6 // Slight transparency
    }
});