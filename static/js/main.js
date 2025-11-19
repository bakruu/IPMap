document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Initialize Map with Canvas renderer for better performance and hit detection
    const map = L.map('map', {
        renderer: L.canvas({ tolerance: 20 }) // Increase hit box for lines
    }).setView([20, 0], 2); // World view

    // Dark Map Tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    const markers = {};
    const lines = {};
    // Default to Istanbul immediately, update if geolocation succeeds
    let userLocation = [41.0082, 28.9784];

    // Get User Location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = [position.coords.latitude, position.coords.longitude];
                console.log("User location found:", userLocation);

                // Update existing lines if any (optional, but good for accuracy)
                // For now just add the marker
                L.marker(userLocation, {
                    icon: L.divIcon({
                        className: 'user-marker',
                        html: '<div style="background-color: #00ff9d; width: 15px; height: 15px; border-radius: 50%; box-shadow: 0 0 10px #00ff9d;"></div>',
                        iconSize: [15, 15]
                    })
                }).addTo(map).bindPopup("You are here");
                map.setView(userLocation, 3);
            },
            (err) => {
                console.log("Geolocation failed:", err);
                // Fallback marker at default location
                L.marker(userLocation, {
                    icon: L.divIcon({
                        className: 'user-marker',
                        html: '<div style="background-color: #ff0000; width: 15px; height: 15px; border-radius: 50%; box-shadow: 0 0 10px #ff0000;"></div>',
                        iconSize: [15, 15]
                    })
                }).addTo(map).bindPopup("Default Location (Geo failed)");
            }
        );
    }

    // Custom Icon
    const createIcon = (countryCode) => {
        return L.divIcon({
            className: 'custom-marker',
            html: `<span class="flag-icon flag-icon-${countryCode.toLowerCase()}"></span>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    };

    socket.on('traffic_update', (data) => {
        const { src, dst, direction, location } = data;

        if (!location) return;

        const lat = location.lat;
        const lon = location.lon;
        const countryCode = location.countryCode;
        const ip = location.ip;

        // Add Marker if not exists
        if (!markers[ip]) {
            const marker = L.marker([lat, lon], {
                icon: createIcon(countryCode),
                title: `${location.city}, ${location.country}`
            }).addTo(map);

            marker.bindPopup(`
                <b>IP:</b> ${ip}<br>
                <b>Location:</b> ${location.city}, ${location.country}<br>
                <b>ISP:</b> ${location.isp}
            `);

            markers[ip] = marker;

            // Draw Line
            if (userLocation) {
                console.log("Drawing line to", ip);
                const line = L.polyline([userLocation, [lat, lon]], {
                    color: '#00ff9d',
                    weight: 2,
                    opacity: 0.6,
                    dashArray: '5, 10',
                    className: 'animated-line'
                }).addTo(map);

                // Add Popup to Line
                line.bindPopup(`
                    <div style="text-align: center;">
                        <span class="flag-icon flag-icon-${countryCode.toLowerCase()}" style="font-size: 24px;"></span><br>
                        <b>${location.country}</b><br>
                        <span style="font-family: monospace; color: #00ff9d;">${ip}</span><br>
                        <small>${location.city}</small>
                    </div>
                `);

                // Hover Effects
                line.on('mouseover', function (e) {
                    this.setStyle({
                        weight: 4,
                        opacity: 1,
                        color: '#fff'
                    });
                });
                line.on('mouseout', function (e) {
                    this.setStyle({
                        weight: 2,
                        opacity: 0.6,
                        color: '#00ff9d'
                    });
                });

                lines[ip] = line;
            } else {
                console.log("User location not set, skipping line for", ip);
            }
        }

        // Add to list
        const list = document.getElementById('traffic-list');
        // Check if item already exists to avoid spamming the list visually with same IP
        // But user might want to see activity. Let's just add top.

        const item = document.createElement('li');
        item.innerHTML = `
            <div>
                <span class="flag-icon flag-icon-${countryCode.toLowerCase()}"></span>
                <span class="ip-address">${ip}</span>
            </div>
            <span class="country-name">${location.country}</span>
        `;

        // Keep list size manageable
        if (list.children.length > 20) {
            list.removeChild(list.lastChild);
        }
        list.insertBefore(item, list.firstChild);

        // Visual effect: Pulse the marker
        const markerIcon = markers[ip].getElement();
        if (markerIcon) {
            markerIcon.style.transform += ' scale(1.2)';
            setTimeout(() => {
                markerIcon.style.transform = markerIcon.style.transform.replace(' scale(1.2)', '');
            }, 200);
        }
    });

    console.log("Ready to receive traffic...");
});
