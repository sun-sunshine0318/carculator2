document.addEventListener('DOMContentLoaded', () => {
    const departureLocationInput = document.getElementById('departureLocation');
    const destinationLocationInput = document.getElementById('destinationLocation');
    const distanceInput = document.getElementById('distance');
    const distanceMessage = document.getElementById('distanceMessage');
    const fuelEfficiencyInput = document.getElementById('fuelEfficiency');
    const fuelPriceInput = document.getElementById('fuelPrice');
    const etcFeeInput = document.getElementById('etcFee');
    const calculateButton = document.getElementById('calculateButton');
    const gasCostSpan = document.getElementById('gasCost');
    const etcCostSpan = document.getElementById('etcCost');
    const totalCostSpan = document.getElementById('totalCost');
    const routeOptionsDiv = document.getElementById('routeOptions');

    let directionsService;
    let directionsRenderer;
    let map;
    let currentDirectionsResult = null; // Store the last directions result

    // Initialize Google Maps services once the API is loaded
    window.initMap = () => {
        console.log('initMap called.');
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            draggable: true, // Allow dragging to adjust route
        });
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 7,
            center: { lat: 35.6895, lng: 139.6917 } // Centered on Tokyo, Japan
        });
        directionsRenderer.setMap(map);
        console.log('Map and DirectionsRenderer initialized.', { map, directionsRenderer });

        // Listen for route changes (e.g., user dragging route)
        directionsRenderer.addListener('directions_changed', () => {
            console.log('directions_changed event fired.');
            const directions = directionsRenderer.getDirections();
            if (directions && directions.routes.length > 0) {
                const selectedRoute = directions.routes[directions.routeIndex];
                if (selectedRoute && selectedRoute.legs && selectedRoute.legs.length > 0 && selectedRoute.legs[0] && selectedRoute.legs[0].distance) {
                    const distanceInMeters = selectedRoute.legs[0].distance.value;
                    const distanceInKm = (distanceInMeters / 1000).toFixed(1);
                    distanceInput.value = distanceInKm;
                    console.log('Distance updated from directions_changed:', distanceInKm);
                } else {
                    distanceInput.value = ''; // Clear distance if route is invalid
                    console.log('Invalid route in directions_changed.');
                }
            }
        });
    };

    function displaySelectedRoute(routeIndex) {
        console.log('displaySelectedRoute called with index:', routeIndex);
        if (currentDirectionsResult && currentDirectionsResult.routes[routeIndex]) {
            const selectedRoute = currentDirectionsResult.routes[routeIndex];
            if (selectedRoute && selectedRoute.legs && selectedRoute.legs.length > 0 && selectedRoute.legs[0] && selectedRoute.legs[0].distance) {
                directionsRenderer.setMap(map); // Ensure map is set
                directionsRenderer.setDirections(currentDirectionsResult);
                directionsRenderer.setRouteIndex(routeIndex);

                const distanceInMeters = selectedRoute.legs[0].distance.value;
                const distanceInKm = (distanceInMeters / 1000).toFixed(1);
                distanceInput.value = distanceInKm;
                distanceMessage.textContent = ''; // Clear message on successful route display
                console.log('Route displayed and message cleared. Distance:', distanceInKm);
            } else {
                directionsRenderer.setMap(null); // Clear map if selected route is invalid
                distanceInput.value = ''; // Clear distance if route is invalid
                distanceMessage.textContent = '選択されたルートの距離を取得できませんでした。'; // Inform user
                console.log('Selected route invalid.');
            }
        } else {
            directionsRenderer.setMap(null); // Clear map if no valid route to display
            distanceInput.value = '';
            distanceMessage.textContent = ''; // Clear message
            console.log('No valid route to display.');
        }
    }

    async function displayRouteAlternatives(origin, destination) {
        console.log('displayRouteAlternatives called with:', { origin, destination });
        if (!origin || !destination) {
            directionsRenderer.setMap(null);
            routeOptionsDiv.innerHTML = '';
            console.log('Origin or destination empty. Clearing map and options.');
            return;
        }

        try {
            const request = {
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: true, // Request alternative routes
            };

            const response = await new Promise((resolve, reject) => {
                directionsService.route(request, (res, status) => {
                    console.log('DirectionsService.route response status:', status);
                    if (status === 'OK') {
                        resolve(res);
                    } else {
                        reject(new Error('Directions Service API error: ' + status));
                    }
                });
            });

            currentDirectionsResult = response; // Store the result
            directionsRenderer.setMap(map); // Ensure renderer is associated with the map
            routeOptionsDiv.innerHTML = ''; // Clear previous options

            console.log('Directions API Response:', response); // Debugging: Log the API response

            if (response.routes.length > 0) {
                console.log('Routes found:', response.routes.length);
                response.routes.forEach((route, index) => {
                    if (route.legs && route.legs.length > 0 && route.legs[0] && route.legs[0].distance) { // Add check for legs[0] and its properties
                        const routeDistance = (route.legs[0].distance.value / 1000).toFixed(1);
                        const routeDuration = route.legs[0].duration.text;
                        console.log(`Route ${index + 1}: ${routeDistance} km (${routeDuration})`);

                        const radioBtn = document.createElement('input');
                        radioBtn.type = 'radio';
                        radioBtn.name = 'routeOption';
                        radioBtn.id = `route${index}`;
                        radioBtn.value = index;
                        radioBtn.checked = (index === 0); // Select the first route by default

                        const label = document.createElement('label');
                        label.htmlFor = `route${index}`;
                        label.textContent = `ルート ${index + 1}: ${routeDistance} km (${routeDuration})`;

                        const div = document.createElement('div');
                        div.appendChild(radioBtn);
                        div.appendChild(label);
                        routeOptionsDiv.appendChild(div);

                        radioBtn.addEventListener('change', () => {
                            displaySelectedRoute(index);
                        });
                    }
                });
                if (response.routes.length > 0 && response.routes[0].legs && response.routes[0].legs.length > 0 && response.routes[0].legs[0] && response.routes[0].legs[0].distance) {
                    displaySelectedRoute(0); // Display the first route initially if available
                    distanceMessage.textContent = ''; // Clear message on successful route display
                    console.log('First route displayed and message cleared.');
                } else {
                    routeOptionsDiv.innerHTML = '<p>有効なルートが見つかりませんでした。</p>';
                    directionsRenderer.setMap(null);
                    distanceMessage.textContent = ''; // Clear message on no valid routes
                    console.log('No valid routes found after API response.');
                }
            } else {
                routeOptionsDiv.innerHTML = '<p>代替ルートが見つかりませんでした。</p>';
                directionsRenderer.setMap(null);
                distanceMessage.textContent = ''; // Clear message on no alternatives
                console.log('No alternative routes found.');
            }
        } catch (error) {
            console.error('Error displaying route alternatives:', error);
            routeOptionsDiv.innerHTML = '<p>ルートの取得中にエラーが発生しました。</p>';
            directionsRenderer.setMap(null);
            distanceMessage.textContent = ''; // Clear message on error
        }
    }

    async function calculateDistance() {
        console.log('calculateDistance called.');
        const origin = departureLocationInput.value;
        const destination = destinationLocationInput.value;

        if (!origin || !destination) {
            distanceMessage.textContent = '';
            distanceInput.value = '';
            displayRouteAlternatives(null, null); // Clear route and alternatives if inputs are empty
            console.log('Origin or destination empty in calculateDistance.');
            return;
        }

        distanceMessage.textContent = '距離を計算中...';
        distanceInput.value = ''; // Clear previous distance
        console.log('Calculating distance message set.');

        // We will now rely on displayRouteAlternatives to set the distance
        // as it will handle the primary route's distance.
        displayRouteAlternatives(origin, destination);
    }

    departureLocationInput.addEventListener('change', calculateDistance);
    destinationLocationInput.addEventListener('change', calculateDistance);

    calculateButton.addEventListener('click', () => {
        console.log('Calculate button clicked.');
        const distance = parseFloat(distanceInput.value) || 0;
        const fuelEfficiency = parseFloat(fuelEfficiencyInput.value) || 0;
        const fuelPrice = parseFloat(fuelPriceInput.value) || 0;
        const etcFee = parseFloat(etcFeeInput.value) || 0;

        let gasCost = 0;
        if (distance > 0 && fuelEfficiency > 0 && fuelPrice > 0) {
            const fuelNeeded = distance / fuelEfficiency;
            gasCost = fuelNeeded * fuelPrice;
        }

        const totalCost = gasCost + etcFee;

        gasCostSpan.textContent = Math.round(gasCost);
        etcCostSpan.textContent = Math.round(etcFee);
        totalCostSpan.textContent = Math.round(totalCost);
        console.log('Calculation results updated.', { gasCost, etcFee, totalCost });
    });
});