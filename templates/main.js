// 🌐 Initialize the globe with better defaults
const globe = Globe()
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
  .backgroundImageUrl(null)
  .pointAltitude(0.02)
  .pointRadius(0.4)
  .pointColor(d => d.suspicious === 1 ? 'red' : 'rgba(0, 191, 255, 0.7)')
  .pointLabel(d => `
    <div style="background: rgba(0,0,0,0.7); padding: 5px; border-radius: 3px;">
      <b>IP:</b> ${d.ip}<br>
      <b>City:</b> ${d.city || 'Unknown'}<br>
      <b>Time:</b> ${new Date(d.timestamp).toLocaleTimeString()}
    </div>
  `)(document.getElementById('globeViz'));

// 📊 Track statistics and data
const dataState = {
  points: [],
  seenIPs: new Set(),
  cityCounts: {},
  activityHistory: []
};

// 🔄 Main update function
async function updateVisualization() {
  const now = Date.now();
  
  try {
    // 1. Remove points older than 10 seconds
    dataState.points = dataState.points.filter(p => now - p.timestamp < 10000);
    
    // 2. Fetch new data
    const res = await fetch('http://10.91.55.123:5000/api/packages');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    // 3. Process new points
    const newPoints = data.all_packages
      .filter(pkg => pkg.latitude && pkg.longitude)
      .map(pkg => {
        const point = {
          lat: pkg.latitude,
          lng: pkg.longitude,
          suspicious: pkg.suspicious,
          ip: pkg.ip,
          city: pkg.city,
          timestamp: now
        };
        
        // Update city counts for top locations list
        if (pkg.city) {
          dataState.cityCounts[pkg.city] = (dataState.cityCounts[pkg.city] || 0) + 1;
        }
        
        return point;
      });
    
    // 4. Add new points (limit to 1000 points max for performance)
    dataState.points = [...dataState.points, ...newPoints].slice(-1000);
    
    // 5. Update activity history (for time series chart)
    dataState.activityHistory.push({
      time: now,
      count: newPoints.length
    });
    dataState.activityHistory = dataState.activityHistory.filter(h => now - h.time < 60000); // Keep 1 minute
    
  } catch (err) {
    console.error('Fetch error:', err);
  } finally {
    // 6. Update all visualizations
    updateGlobe();
    updateTopCities();
    updateActivityChart();
    updateStats(data);
  }
}

// 🌍 Update globe points
function updateGlobe() {
  globe.pointsData(dataState.points);
}

// 🏙️ Update top cities list (Interaction Feature 1)
function updateTopCities() {
  const topCities = Object.entries(dataState.cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const citiesList = document.getElementById('top-cities');
  if (citiesList) {
    citiesList.innerHTML = topCities.map(([city, count]) => `
      <li class="city-item" data-city="${city}">
        ${city}: ${count} packets
      </li>
    `).join('');
    
    // Add click handler to focus on city
    document.querySelectorAll('.city-item').forEach(item => {
      item.addEventListener('click', () => {
        const city = item.dataset.city;
        const cityPoints = dataState.points.filter(p => p.city === city);
        if (cityPoints.length > 0) {
          const avgLat = cityPoints.reduce((sum, p) => sum + p.lat, 0) / cityPoints.length;
          const avgLng = cityPoints.reduce((sum, p) => sum + p.lng, 0) / cityPoints.length;
          globe.pointOfView({ lat: avgLat, lng: avgLng, altitude: 1.5 }, 1000);
        }
      });
    });
  }
}

// 📈 Update activity chart (Interaction Feature 2)
function updateActivityChart() {
  const ctx = document.getElementById('activityChart')?.getContext('2d');
  if (!ctx) return;
  
  // Initialize or update Chart.js
  if (!window.activityChart) {
    window.activityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dataState.activityHistory.map(h => new Date(h.time).toLocaleTimeString()),
        datasets: [{
          label: 'Packets per update',
          data: dataState.activityHistory.map(h => h.count),
          borderColor: 'rgba(0, 191, 255, 1)',
          backgroundColor: 'rgba(0, 191, 255, 0.1)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        },
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const time = dataState.activityHistory[index].time;
            const relevantPoints = dataState.points.filter(p => 
              Math.abs(p.timestamp - time) < 5000
            );
            if (relevantPoints.length > 0) {
              globe.pointsData(relevantPoints);
            }
          }
        }
      }
    });
  } else {
    window.activityChart.data.labels = dataState.activityHistory.map(h => new Date(h.time).toLocaleTimeString());
    window.activityChart.data.datasets[0].data = dataState.activityHistory.map(h => h.count);
    window.activityChart.update();
  }
}

// 📊 Update statistics
function updateStats(data) {
  document.getElementById('total-received')?.textContent = data.total_received || '0';
  document.getElementById('suspicious-count')?.textContent = 
    dataState.points.filter(p => p.suspicious === 1).length;
}

// 🚀 Initialize and start updates
document.addEventListener('DOMContentLoaded', () => {
  updateVisualization();
  setInterval(updateVisualization, 5000);
});