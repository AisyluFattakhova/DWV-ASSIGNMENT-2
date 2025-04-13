// 🌐 Globe Initialization
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

// 🔁 Track points with unique IDs to prevent duplicates
let currentPoints = []; // Changed from const to let
const seenIPs = new Set();

// 🔄 Fetch & update packages
async function fetchPackages() {
  try {
    const res = await fetch('http://localhost:5000/api/packages');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const data = await res.json();
    console.log('API Response:', data);

    // Update dashboard
    if (document.getElementById('total')) {
      document.getElementById('total').textContent = data.total_received;
    }
    if (document.getElementById('last')) {
      document.getElementById('last').textContent = JSON.stringify(data.last_received, null, 2);
    }

    // Process new points
    const newPoints = data.all_packages
      .filter(pkg => {
        const hasCoords = !isNaN(pkg.latitude) && !isNaN(pkg.longitude);
        const validCoords = Math.abs(pkg.latitude) <= 90 && Math.abs(pkg.longitude) <= 180;
        const isNewIP = pkg.ip && !seenIPs.has(pkg.ip);
        return hasCoords && validCoords && isNewIP;
      })
      .map(pkg => {
        seenIPs.add(pkg.ip);
        return {
          lat: parseFloat(pkg.latitude),
          lng: parseFloat(pkg.longitude),
          ip: pkg.ip,
          suspicious: pkg.suspicious || 0,
          timestamp: Date.now()
        };
      });

    // Add new points
    if (newPoints.length > 0) {
      currentPoints.push(...newPoints);
      console.log(`Added ${newPoints.length} new markers, total: ${currentPoints.length}`);
    }

    // Remove points older than 10 seconds
    const now = Date.now();
    const updatedPoints = currentPoints.filter(p => now - p.timestamp < 120000);
    
    if (updatedPoints.length < currentPoints.length) {
      currentPoints = updatedPoints; // Now works because currentPoints is let
      console.log(`Removed ${currentPoints.length - updatedPoints.length} old markers`);
      globe.pointsData(currentPoints);
    } else if (newPoints.length > 0) {
      // Only update if we added new points but didn't remove any
      globe.pointsData(currentPoints);
    }

  } catch (err) {
    console.error('Fetch error:', err);
  }
}

// Initial load
fetchPackages();
// Refresh every 5 seconds
setInterval(fetchPackages, 5000);