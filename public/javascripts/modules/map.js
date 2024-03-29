import axios from 'axios';
import {$} from './bling';

const mapOptions = {
    center: { lat: 43.2, lng: -79.8},
    zoom: 2
}

function loadPlaces(map, lat = 43.2, lng = -79.8) {
    axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
        .then(res => {
            const places = res.data;
            if (!places.length) {
                alert('No places found');
                return;
            }

            //create bounds
            const bounds = new google.maps.LatLngBounds();
            const infoWindow = new google.maps.InfoWindow();

            const markers = places.map(place => {
                const [placeLng, placeLat] = place.location.coordinates;
                const position = { lat: placeLat, lng: placeLng };
                bounds.extend(position);
                const marker = new google.maps.Marker({ map, position });
                marker.place = place;
                return marker;
            });

            //when someone clicks on a marker, show details of that place
            markers.forEach(marker => marker.addListener('click', function() {
                infoWindow.setContent(this.place.name);
                const html = `
                    <div class="popup">
                        <a href="/store/${this.place.slug}">
                            <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
                            <p>${this.place.name} - ${this.place.location.address}</p>
                    </div>
                `
                infoWindow.open(map, this);
            }))

            //zoom to fit markers
            map.setCenter(bounds.getCenter());
            //zoom in to fit markers properly
            map.fitBounds(bounds);
        });
    

}

function makeMap(mapDiv) {
    if (!mapDiv) return;
    //make map
    const map = new google.maps.Map(mapDiv, mapOptions);
    loadPlaces(map);
    const input = $('[name="geolocate"]');
    const autocomplete = new google.maps.places.Autocomplete(input);
    //go to place that was autocompleted
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
    });
}

export default makeMap;