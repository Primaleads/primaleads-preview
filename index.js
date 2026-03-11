document.getElementById("root").innerHTML = `

<div style="font-family:Arial;padding:20px">

<h1>PrimaLeads Route</h1>

<button onclick="startRoute()" style="padding:10px;margin-top:20px">
Route starten
</button>

<div id="location" style="margin-top:20px"></div>

<div id="content" style="margin-top:40px"></div>

</div>
`;

function startRoute(){

navigator.geolocation.getCurrentPosition(function(position){

let lat = position.coords.latitude;
let lon = position.coords.longitude;

document.getElementById("location").innerHTML = `
<p><b>Standort erkannt</b></p>
<p>Breitengrad: ${lat}</p>
<p>Längengrad: ${lon}</p>
`;

showHouseForm();

});

}

function showHouseForm(){

document.getElementById("content").innerHTML = `

<h2>Haus erfassen</h2>

<input placeholder="Straße" style="display:block;margin:10px 0;padding:8px"/>
<input placeholder="Hausnummer" style="display:block;margin:10px 0;padding:8px"/>

<p>Status:</p>

<button onclick="showLead()">PV Interesse</button>
<button onclick="showLead()">WP Interesse</button>
<button>Kein Interesse</button>
<button>Niemand zuhause</button>

`;

}

function showLead(){

document.getElementById("content").innerHTML = `

<h2>Lead erfassen</h2>

<input placeholder="Name" style="display:block;margin:10px 0;padding:8px"/>
<input placeholder="Telefon" style="display:block;margin:10px 0;padding:8px"/>

<button style="margin-top:10px">Lead speichern</button>

`;

}
