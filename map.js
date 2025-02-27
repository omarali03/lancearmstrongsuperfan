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

// Initialize timeFilter with the default value (-1 for 'any time')
// Wait until the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    // Initialize timeFilter with the default value (-1 for 'any time')
    let timeFilter = -1;
  
    // Select the slider and the time display element
    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');
  
    // Helper function to format time as HH:MM AM/PM
    function formatTime(minutes) {
      const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
      return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
    }
  
    // Update the time display based on slider value
    function updateTimeDisplay() {
      timeFilter = Number(timeSlider.value);  // Get slider value
  
      if (timeFilter === -1) {
        selectedTime.textContent = '';  // Clear time display
        anyTimeLabel.style.display = 'block';  // Show "(any time)"
      } else {
        selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
        anyTimeLabel.style.display = 'none';  // Hide "(any time)"
      }
  
      // Call updateScatterPlot to reflect the changes on the map
      updateScatterPlot(timeFilter);
    }
  
    // Listen to slider input changes
    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();  // Initialize the display when the page loads
  
    // Helper function to compute station traffic (arrivals, departures, and total traffic)
    function computeStationTraffic(stations, trips) {
      const departures = d3.rollup(
        trips, 
        (v) => v.length, 
        (d) => d.start_station_id
      );
  
      const arrivals = d3.rollup(
        trips, 
        (v) => v.length, 
        (d) => d.end_station_id
      );
  
      return stations.map((station) => {
        let id = station.short_name;
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
      const filteredTrips = filterTripsbyTime(trips, timeFilter);
      const filteredStations = computeStationTraffic(stations, filteredTrips);
      
      radiusScale.range(timeFilter === -1 ? [0, 25] : [3, 50]);
  
      circles
        .data(filteredStations, (d) => d.short_name)
        .join('circle')
        .attr('r', (d) => radiusScale(d.totalTraffic));
    }
  
    let stations = [];
    let trips = [];
  
    map.on('load', async () => {
      try {
        const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
        const jsonData = await d3.json(jsonurl);
        stations = jsonData.data.stations;
  
        trips = await d3.csv(
          'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
          (trip) => {
            trip.started_at = new Date(trip.started_at);
            trip.ended_at = new Date(trip.ended_at);
            return trip;
          }
        );
  
        const circles = svg
          .selectAll('circle')
          .data(stations, (d) => d.short_name)
          .enter()
          .append('circle')
          .each(function(d) {
            d3.select(this)
              .append('title')
              .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
          });
  
        updateScatterPlot(timeFilter);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    });
  });
  