document.getElementById("wurzel").innerHTML = `
<h1>PrimaLeads Route</h1>

<button onclick="startRoute()">Route starten</button>

<div id="map" style="height:500px;margin-top:20px;"></div>

<h2>Haus erfassen</h2>

<input id="street" placeholder="Straße"><br><br>
<input id="number" placeholder="Hausnummer"><br><br>

<p>Status:</p>

<button onclick="saveLead('pv')">PV Interesse</button>
<button onclick="saveLead('wp')">WP Interesse</button>
<button onclick="saveLead('kein')">Kein Interesse</button>
<button onclick="saveLead('niemand')">Niemand zuhause</button>
`;

let map;
let userLat;
let userLng;

function startRoute(){

navigator.geolocation.getCurrentPosition(function(pos){

userLat = pos.coords.latitude;
userLng = pos.coords.longitude;

map = L.map('map').setView([userLat, userLng], 17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map);

L.marker([userLat,userLng])
.addTo(map)
.bindPopup("Du bist hier")
.openPopup();

});

}

function saveLead(status){

const street = document.getElementById("street").value;
const number = document.getElementById("number").value;

let color;

if(status==="pv") color="green";
if(status==="wp") color="blue";
if(status==="kein") color="red";
if(status==="niemand") color="orange";

const icon = L.circleMarker([userLat,userLng],{
radius:10,
color:color,
fillColor:color,
fillOpacity:0.8
}).addTo(map);

icon.bindPopup(
street+" "+number+"<br>Status: "+status
);

}
