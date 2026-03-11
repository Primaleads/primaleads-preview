document.getElementById("wurzel").innerHTML = `
<h1>PrimaLeads Route</h1>

<button onclick="startRoute()">Route starten</button>

<div id="map" style="height:500px;margin-top:20px;"></div>

<h2>Haus erfassen</h2>

<input id="street" placeholder="Straße"><br><br>
<input id="number" placeholder="Hausnummer"><br><br>

<p>Status:</p>

<button onclick="saveLead('PV Interesse')">PV Interesse</button>
<button onclick="saveLead('WP Interesse')">WP Interesse</button>
<button onclick="saveLead('Kein Interesse')">Kein Interesse</button>
<button onclick="saveLead('Niemand zuhause')">Niemand zuhause</button>
`;

let map;
let marker;

function startRoute(){

navigator.geolocation.getCurrentPosition(function(pos){

const lat = pos.coords.latitude;
const lng = pos.coords.longitude;

map = L.map('map').setView([lat, lng], 17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map);

marker = L.marker([lat,lng]).addTo(map)
.bindPopup("Du bist hier")
.openPopup();

});

}

function saveLead(status){

const street = document.getElementById("street").value;
const number = document.getElementById("number").value;

alert(
"Lead gespeichert:\n"+
street+" "+number+"\n"+
status
);

}
