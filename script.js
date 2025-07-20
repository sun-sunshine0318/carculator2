document.addEventListener('DOMContentLoaded', () => {
    // Element references
    const departureLocationInput = document.getElementById('departureLocation');
    const destinationLocationInput = document.getElementById('destinationLocation');
    const departureDateTimeInput = document.getElementById('departureDateTime');
    const estimatedArrivalTimeInput = document.getElementById('estimatedArrivalTime');
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

    // Google Maps related variables
    let directionsService;
    let directionsRenderer;
    let map;
    let currentDirectionsResult = null; // Store the last directions result

    const GOOGLE_ROUTES_API_KEY = 'AIzaSyBfpVKU4VF6QzGAAtU3dhg_Jn-UoAx_k8w';

    // Function to get toll information from Google Routes API
    async function getTollsFromRoutesAPI(origin, destination) {
        const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_ROUTES_API_KEY,
            'X-Goog-FieldMask': 'routes.legs.travelAdvisory.tollInfo'
        };
        const body = {
            origin: { address: origin },
            destination: { address: destination },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
            computeAlternativeRoutes: false, // We only need toll for the primary route here
            languageCode: 'ja-JP',
            units: 'METRIC',
            extraComputations: ['TOLLS'] // Request toll information
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Routes API request failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Routes API Toll Response:', data);

            if (data.routes && data.routes.length > 0 && data.routes[0].legs && data.routes[0].legs.length > 0 && data.routes[0].legs[0].travelAdvisory && data.routes[0].legs[0].travelAdvisory.tollInfo && data.routes[0].legs[0].travelAdvisory.tollInfo.estimatedPrice) {
                // Assuming the first leg's estimated price is sufficient for simplicity
                const estimatedToll = data.routes[0].legs[0].travelAdvisory.tollInfo.estimatedPrice[0].currencyCode === 'JPY' ?
                                      data.routes[0].legs[0].travelAdvisory.tollInfo.estimatedPrice[0].units : 0;
                return parseFloat(estimatedToll);
            } else {
                return 0; // No toll info found
            }
        } catch (error) {
            console.error('Error fetching toll info from Routes API:', error);
            return 0; // Return 0 on error
        }
    }

    // Helper function to format date for datetime-local input
    function formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Function to update estimated arrival time
    function updateEstimatedArrivalTime(durationInSeconds) {
        const departureDateTime = departureDateTimeInput.value;
        if (departureDateTime) {
            const departureDate = new Date(departureDateTime);
            const arrivalDate = new Date(departureDate.getTime() + durationInSeconds * 1000);
            estimatedArrivalTimeInput.value = formatDateTimeLocal(arrivalDate);
        } else {
            estimatedArrivalTimeInput.value = '';
        }
    }

    // Initialize Google Maps services once the API is loaded
    window.initMap = () => {
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            draggable: true, // Allow dragging to adjust route
        });
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 7,
            center: { lat: 35.6895, lng: 139.6917 } // Centered on Tokyo, Japan
        });
        directionsRenderer.setMap(map);

        // Listen for route changes (e.g., user dragging route)
        directionsRenderer.addListener('directions_changed', () => {
            const directions = directionsRenderer.getDirections();
            if (directions && directions.routes.length > 0) {
                const selectedRoute = directions.routes[directions.routeIndex];
                if (selectedRoute && selectedRoute.legs && selectedRoute.legs.length > 0 && selectedRoute.legs[0] && selectedRoute.legs[0].distance) {
                    const distanceInMeters = selectedRoute.legs[0].distance.value;
                    const distanceInKm = (distanceInMeters / 1000).toFixed(1);
                    distanceInput.value = distanceInKm;
                    updateEstimatedArrivalTime(selectedRoute.legs[0].duration.value); // Update arrival time on route change
                } else {
                    distanceInput.value = ''; // Clear distance if route is invalid
                    estimatedArrivalTimeInput.value = ''; // Clear arrival time
                }
            }
        });
    };

    function displaySelectedRoute(routeIndex) {
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
                updateEstimatedArrivalTime(selectedRoute.legs[0].duration.value); // Update arrival time
            } else {
                directionsRenderer.setMap(null); // Clear map if selected route is invalid
                distanceInput.value = ''; // Clear distance if route is invalid
                estimatedArrivalTimeInput.value = ''; // Clear arrival time
                distanceMessage.textContent = '選択されたルートの距離を取得できませんでした。'; // Inform user
            }
        } else {
            directionsRenderer.setMap(null); // Clear map if no valid route to display
            distanceInput.value = '';
            estimatedArrivalTimeInput.value = ''; // Clear arrival time
            distanceMessage.textContent = ''; // Clear message
        }
    }

    async function displayRouteAlternatives(origin, destination) {
        if (!origin || !destination) {
            directionsRenderer.setMap(null);
            routeOptionsDiv.innerHTML = '';
            return;
        }

        distanceMessage.textContent = '距離を計算中...'; // This is set here
        distanceInput.value = ''; // Clear previous distance
        estimatedArrivalTimeInput.value = ''; // Clear previous arrival time

        try {
            const request = {
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: true, // Request alternative routes
            };

            const response = await new Promise((resolve, reject) => {
                directionsService.route(request, (res, status) => {
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

            if (response.routes.length > 0) {
                response.routes.forEach((route, index) => {
                    if (route.legs && route.legs.length > 0 && route.legs[0] && route.legs[0].distance && route.legs[0].duration) { // Add check for legs[0] and its properties
                        const routeDistance = (route.legs[0].distance.value / 1000).toFixed(1);
                        const routeDuration = route.legs[0].duration.text;

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
                if (response.routes.length > 0 && response.routes[0].legs && response.routes[0].legs.length > 0 && response.routes[0].legs[0] && response.routes[0].legs[0].distance && response.routes[0].legs[0].duration) {
                    displaySelectedRoute(0); // Display the first route initially if available
                    distanceMessage.textContent = ''; // Clear message on successful route display
                } else {
                    routeOptionsDiv.innerHTML = '<p>有効なルートが見つかりませんでした。</p>';
                    directionsRenderer.setMap(null);
                    distanceMessage.textContent = ''; // Clear message on no valid routes
                    estimatedArrivalTimeInput.value = ''; // Clear arrival time
                }
            } else {
                routeOptionsDiv.innerHTML = '<p>代替ルートが見つかりませんでした。</p>';
                directionsRenderer.setMap(null);
                distanceMessage.textContent = ''; // Clear message on no alternatives
                estimatedArrivalTimeInput.value = ''; // Clear arrival time
            }
        } catch (error) {
            console.error('Error displaying route alternatives:', error);
            routeOptionsDiv.innerHTML = '<p>ルートの取得中にエラーが発生しました。</p>';
            directionsRenderer.setMap(null);
            distanceMessage.textContent = ''; // Clear message on error
            estimatedArrivalTimeInput.value = ''; // Clear arrival time
        }
    }

    async function calculateDistance() {
        const origin = departureLocationInput.value;
        const destination = destinationLocationInput.value;

        if (!origin || !destination) {
            distanceMessage.textContent = '';
            distanceInput.value = '';
            estimatedArrivalTimeInput.value = ''; // Clear arrival time
            etcCostSpan.textContent = '0'; // Clear ETC cost
            displayRouteAlternatives(null, null); // Clear route and alternatives if inputs are empty
            return;
        }

        distanceMessage.textContent = '距離を計算中...';
        distanceInput.value = ''; // Clear previous distance
        estimatedArrivalTimeInput.value = ''; // Clear previous arrival time
        etcCostSpan.textContent = '計算中...'; // Indicate ETC calculation is in progress

        // Call Routes API for toll information
        const estimatedToll = await getTollsFromRoutesAPI(origin, destination);
        etcCostSpan.textContent = Math.round(estimatedToll);
        etcFeeInput.value = Math.round(estimatedToll); // Update the input field as well

        // We will now rely on displayRouteAlternatives to set the distance
        // as it will handle the primary route's distance.
        displayRouteAlternatives(origin, destination);
    }

    // Event Listeners
    departureLocationInput.addEventListener('change', calculateDistance);
    destinationLocationInput.addEventListener('change', calculateDistance);
    departureDateTimeInput.addEventListener('change', () => {
        // Recalculate arrival time if a route is already selected
        if (currentDirectionsResult && currentDirectionsResult.routes.length > 0) {
            const selectedRoute = currentDirectionsResult.routes[directionsRenderer.routeIndex];
            if (selectedRoute && selectedRoute.legs && selectedRoute.legs.length > 0 && selectedRoute.legs[0] && selectedRoute.legs[0].duration) {
                updateEstimatedArrivalTime(selectedRoute.legs[0].duration.value);
            }
        }
    });

    calculateButton.addEventListener('click', () => {
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
    });
});