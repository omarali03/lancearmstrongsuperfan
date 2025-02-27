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

// Initialize global variables
let stations = [];
let trips = [];
let circles;
let radiusScale;
let timeFilter = -1; // Default to 'any time'

// Helper function to convert coordinates using map.project()
function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

// Helper function to format time as HH:MM AM/PM
function formatTime(minutes) {
  const date = new Date(0, 0, 0, Math.floor(minutes / 60), minutes % 60);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

// Helper function to compute station traffic (arrivals, departures, and total traffic)
function computeStationTraffic(stations, trips) {
  // Compute departures
  const departures = d3.rollup(
    trips, 
    (v) => v.length, 
    (d) => d.start_station_id
  );

  // Compute arrivals
  const arrivals = d3.rollup(
    trips, 
    (v) => v.length, 
    (d) => d.end_station_id
  );

  return stations.map((station) => {
    const id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

// Helper function to convert date to minutes since midnight
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

// Filter trips by the selected time range
function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1 
    ? trips
    : trips.filter((trip) => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
    });
}

// Function to update the scatter plot
function updateScatterPlot(timeFilter) {
  // Only update the scatter plot if trips and stations are loaded
  if (!trips.length || !stations.length || !circles) return;

  // Filter trips based on the selected time
  const filteredTrips = filterTripsbyTime(trips, timeFilter);
  
  // Recompute station traffic based on filtered trips
  const stationsWithTraffic = computeStationTraffic(JSON.parse(JSON.stringify(stations)), filteredTrips);
  
  // Update the domain of the radius scale
  const maxTraffic = d3.max(stationsWithTraffic, d => d.totalTraffic) || 1;
  radiusScale.domain([0, maxTraffic]);
  
  // Dynamically adjust the range of the radius scale based on whether filtering is applied
  radiusScale.range(timeFilter === -1 ? [0, 25] : [3, 50]);

  // Update the scatterplot by adjusting the radius of circles
  circles
    .data(stationsWithTraffic, d => d.short_name)
    .attr('r', d => radiusScale(d.totalTraffic)) // Update circle sizes
    .attr('cx', d => getCoords(d).cx) // Make sure positions are correct
    .attr('cy', d => getCoords(d).cy);
    
  // Update tooltips
  circles.select('title')
    .text(d => `${d.name}: ${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
}

// Update positions of circles when map is moved or zoomed
function updatePositions() {
  if (circles) {
    circles
      .attr('cx', d => getCoords(d).cx)
      .attr('cy', d => getCoords(d).cy);
  }
}

// Wait for the map to load before adding data
map.on('load', async () => {
  // Select the SVG element inside the map container
  const svg = d3.select('#map').select('svg');
  
  try {
    // Fetch the Bluebikes station data
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    stations = jsonData.data.stations;  // Access the stations array

    // Fetch the traffic data
    trips = await d3.csv(
      'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
      (trip) => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
        return trip;
      }
    );

    console.log('Loaded data:', { stationsCount: stations.length, tripsCount: trips.length });
    
    // Create a radius scale for circles
    radiusScale = d3
      .scaleSqrt()
      .domain([0, 1]) // Will be updated in updateScatterPlot
      .range([0, 25]);
    
    // Compute initial traffic data
    stations = computeStationTraffic(stations, trips);

    // Create circles for each station
    circles = svg
      .selectAll('circle')
      .data(stations, d => d.short_name)
      .enter()
      .append('circle')
      .attr('r', d => radiusScale(d.totalTraffic))
      .attr('fill', 'steelblue')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.8);
      
    // Add tooltips
    circles.append('title')
      .text(d => `${d.name}: ${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    
    // Set initial positions
    updatePositions();
    
    // Bind map events to update circle positions
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    
    // Now that data is loaded, we can set up the time slider
    const timeSliderContainer = document.createElement('div');
    timeSliderContainer.className = 'time-control';
    timeSliderContainer.innerHTML = `
      <div class="time-display">
        <span id="selected-time"></span>
        <span id="any-time">(any time)</span>
      </div>
      <input type="range" id="time-slider" min="-1" max="1439" value="-1" step="30">
      <div class="time-labels">
        <span>Any Time</span>
        <span>Morning</span>
        <span>Afternoon</span>
        <span>Evening</span>
      </div>
    `;
    
    // Add the slider to the map
    map.getContainer().appendChild(timeSliderContainer);
    
    // Now we can safely access the DOM elements
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');
    
    // Update time display function
    function updateTimeDisplay() {
      timeFilter = Number(timeSlider.value);
      
      if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
      } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
      }
      
      // Update the visualization with the new time filter
      updateScatterPlot(timeFilter);
    }
    
    // Add event listener to the slider
    timeSlider.addEventListener('input', updateTimeDisplay);
    
    // Initial update
    updateTimeDisplay();
    
  } catch (error) {
    console.error('Error loading data:', error);
  }
});

// Add the quantize scale for traffic flow
const stationFlow = d3.scaleQuantize()
  .domain([0, 1])  // Ratio of departures to total traffic
  .range([0, 0.5, 1]);  // Three discrete values: 0 (more arrivals), 1 (more departures), 0.5 (equal)

function updateScatterPlot(timeFilter) {
  if (!trips || !stations) return;

  const filteredTrips = filterTripsbyTime(trips, timeFilter);
  const filteredStations = computeStationTraffic(stations, filteredTrips);

  // Dynamically adjust the range of the radius scale based on whether filtering is applied
  radiusScale.range(timeFilter === -1 ? [0, 25] : [3, 50]);

  // Update the scatterplot by adjusting the radius of circles and the traffic flow color
  circles
    .data(filteredStations, (d) => d.short_name)
    .join('circle')
    .attr('r', (d) => radiusScale(d.totalTraffic))
    .style('--departure-ratio', (d) => stationFlow(d.departures / d.totalTraffic));  // Apply the traffic flow ratio for color
}
