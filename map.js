// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


mapboxgl.accessToken = 'pk.eyJ1Ijoib21hcmFsaXVjc2QiLCJhIjoiY203bXgxeTY2MG52czJucHZwcDVqdjdleiJ9.ZuPUOfv_SejSyAiiAcrMfA';

const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // Coordinates for Boston & Cambridge
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
});

map.on('load', async () => {
  // Add the Boston bike lane data source
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
  });

  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': '#32D400',  // Bright green
      'line-width': 5,
      'line-opacity': 0.6
    }
  });

  // Add the Cambridge bike lane data source
// map.addSource('cambridge_route', {
//   type: 'geojson',
//   data: 'https://data.cambridgema.gov/resource/h7ei-5m9b.geojson'
// });

// map.addLayer({
//   id: 'bike-lanes-cambridge',
//   type: 'line',
//   source: 'cambridge_route',
//   paint: {
//     'line-color': '#FF6F00',
//     'line-width': 5,
//     'line-opacity': 0.6
//   }
// });

  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    
    // Await JSON fetch
    const jsonData = await d3.json(jsonurl);
    let stations = jsonData.data.stations;
    console.log('Stations Array:', stations); // Log stations array

  } catch (error) {
    console.error('Error loading JSON:', error); // Handle errors
  }

});
