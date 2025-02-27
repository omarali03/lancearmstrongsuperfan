// Import Mapbox and D3 as ES modules
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Set your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoib21hcmFsaXVjc2QiLCJhIjoiY203bXgxeTY2MG52czJucHZwcDVqdjdleiJ9.ZuPUOfv_SejSyAiiAcrMfA';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // Coordinates for Boston & Cambridge
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
});

// Select the SVG element inside the map container
const svg = d3.select('#map').select('svg');

// Helper function to convert coordinates using map.project()
function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point);  // Project to pixel coordinates
  return { cx: x, cy: y };  // Return pixel coordinates for use in SVG attributes
}

// Wait for the map to load before adding data
map.on('load', async () => {
  // Fetch the Bluebikes station data
  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    let stations = jsonData.data.stations;  // Access the stations array (use let here)

    // Fetch the traffic data using let instead of const
    let trips;
    try {
      trips = await d3.csv('https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv');
      console.log('Loaded Trips Data:', trips); // Check the structure of the trips data
    } catch (error) {
      console.error('Error loading trips data:', error); // Handle errors if the data fails to load
    }

    // Calculate departures
    const departures = d3.rollup(
      trips,
      (v) => v.length,
      (d) => d.start_station_id
    );

    // Calculate arrivals
    const arrivals = d3.rollup(
      trips,
      (v) => v.length,
      (d) => d.end_station_id
    );

    console.log('Departures:', departures);
    console.log('Arrivals:', arrivals);

    stations = stations.map((station) => {
      let id = station.short_name;
      station.arrivals = arrivals.get(id) ?? 0;
      station.departures = departures.get(id) ?? 0;
      station.totalTraffic = station.arrivals + station.departures;
      return station;
    });

    console.log('Stations with Traffic:', stations); // Check the data for each station

    // Create a square root scale for circle radius based on traffic data
    const radiusScale = d3
      .scaleSqrt()  // Square root scale to prevent misrepresentation of data
      .domain([0, d3.max(stations, (d) => d.totalTraffic)]) // Domain based on traffic values
      .range([0, 25]); // Circle radius range (adjust the maximum radius as needed)

    // Append circles to the SVG for each station
    const circles = svg.selectAll('circle')
      .data(stations)
      .enter()
      .append('circle')
      .attr('r', (d) => radiusScale(d.totalTraffic)) // Set radius using the traffic data
      .attr('fill', 'steelblue')  // Circle fill color
      .attr('stroke', 'white')    // Circle border color
      .attr('stroke-width', 1)    // Circle border thickness
      .attr('opacity', 0.8);      // Circle opacity

    function updatePositions() {
      circles
        .attr('cx', (d) => getCoords(d).cx)  // Set the x-position using projected coordinates
        .attr('cy', (d) => getCoords(d).cy); // Set the y-position using projected coordinates
    }

    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

    // Initial position update when map loads
    updatePositions();

  } catch (error) {
    console.error('Error loading station data:', error); // Handle errors if the data fails to load
  }
});

const slider = document.getElementById('time-slider');
const selectedTime = document.getElementById('selected-time');

// Update the displayed time when the slider is moved
slider.addEventListener('input', () => {
  const timeValue = slider.value;
  const hours = Math.floor(timeValue / 60);
  const minutes = timeValue % 60;

  // Display time or "any time" when the slider is at -1
  if (timeValue == -1) {
    selectedTime.innerHTML = '(any time)';
  } else {
    selectedTime.innerHTML = `${hours}:${minutes.toString().padStart(2, '0')} PM`;
  }

  filterDataByTime(timeValue);
});

function filterDataByTime(timeValue) {
  if (timeValue != -1) {
    const filteredTrips = trips.filter((trip) => {
      const tripStartTime = new Date(trip.started_at);
      const tripStartMinutes = tripStartTime.getHours() * 60 + tripStartTime.getMinutes();
      return tripStartMinutes <= timeValue;
    });

  }
}