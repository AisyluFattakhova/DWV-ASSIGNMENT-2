// 🌐 Improved Globe Initialization
const globe = Globe()(document.getElementById('globeViz'))
  .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
  .backgroundImageUrl(null)
  .pointAltitude(0.02)
  .pointRadius(0.4)
  .pointColor(d => d.suspicious === 1 ? 'red' : 'deepskyblue')
  .pointLabel(d => `
    <b>IP:</b> ${d.ip}<br>
    <b>Location:</b> ${d.lat.toFixed(2)}°, ${d.lng.toFixed(2)}°
  `);

// 🔁 Track points
let currentPoints = [];

// 🔄 Fetch & update packages
async function fetchPackages() {
  try {
    const res = await fetch('http://localhost:5000/api/packages');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    console.log('API Response:', data); // Debug log

    // Update dashboard
    document.getElementById('total').textContent = data.total_received;
    document.getElementById('last').textContent = JSON.stringify(data.last_received, null, 2);

    // Process new points
    const newPoints = data.all_packages
      .filter(pkg => {
        const hasCoords = !isNaN(pkg.latitude) && !isNaN(pkg.longitude);
        const validCoords = Math.abs(pkg.latitude) <= 90 && Math.abs(pkg.longitude) <= 180;
        return hasCoords && validCoords;
      })
      .map(pkg => ({
        lat: parseFloat(pkg.latitude),
        lng: parseFloat(pkg.longitude),
        ip: pkg.ip,
        suspicious: pkg.suspicious || 0
      }));

    // Update globe
    if (newPoints.length > 0) {
      currentPoints = [...currentPoints, ...newPoints];
      
      // Only keep last 100 points for performance
      if (currentPoints.length > 100) {
        currentPoints = currentPoints.slice(-100);
      }
      
      globe.pointsData(currentPoints);
      console.log(`Added ${newPoints.length} markers, total: ${currentPoints.length}`);
    }

  } catch (err) {
    console.error('Fetch error:', err);
  }
}

// Initial load
fetchPackages();
// Refresh every 5 seconds
setInterval(fetchPackages, 5000);