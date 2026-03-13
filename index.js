const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let map
let userLat
let userLng

let routePath = []
let routeLine

let heatLayerWP
let heatLayerPV

function startRoute(){

map = L.map('map').setView([48.62,9.05],16)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map)

navigator.geolocation.watchPosition(position => {

userLat = position.coords.latitude
userLng = position.coords.longitude

map.setView([userLat,userLng],18)

routePath.push([userLat,userLng])

if(routeLine){
map.removeLayer(routeLine)
}

routeLine = L.polyline(routePath,{
color:"black",
weight:4
}).addTo(map)

loadLeads()

})

map.on("click", async function(e){

userLat = e.latlng.lat
userLng = e.latlng.lng

const url =
"https://nominatim.openstreetmap.org/reverse?format=json&lat="
+userLat+
"&lon="
+userLng

const response = await fetch(url)
const data = await response.json()

if(data.address){

document.getElementById("street").value =
data.address.road || ""

document.getElementById("number").value =
data.address.house_number || ""

}

})

}

async function saveLead(status){

const street = document.getElementById("street").value
const number = document.getElementById("number").value

const { error } = await supabaseClient
.from("Leads")
.insert([
{
street: street,
number: number,
status: status,
lat: userLat,
lng: userLng
}
])

if(error){

alert("Fehler beim Speichern")
console.log(error)

}else{

loadLeads()

}

}

async function loadLeads(){

const { data, error } = await supabaseClient
.from("Leads")
.select("*")

if(error){
console.log(error)
return
}

let heatPointsWP = []
let heatPointsPV = []

data.forEach(lead => {

let color = "blue"

if(lead.status === "PV Interesse"){
color = "green"
heatPointsPV.push([lead.lat, lead.lng, 1])
}

if(lead.status === "WP Interesse"){
color = "blue"
heatPointsWP.push([lead.lat, lead.lng, 1])
}

if(lead.status === "Kein Interesse") color = "red"
if(lead.status === "Niemand zuhause") color = "gray"

L.circleMarker([lead.lat, lead.lng],{
radius:8,
color:color
})
.addTo(map)
.bindPopup(
lead.street + " " + lead.number + "<br>" + lead.status
)

})

if(heatLayerWP){
map.removeLayer(heatLayerWP)
}

if(heatLayerPV){
map.removeLayer(heatLayerPV)
}

heatLayerWP = L.heatLayer(heatPointsWP,{
radius:25,
blur:20
}).addTo(map)

heatLayerPV = L.heatLayer(heatPointsPV,{
radius:25,
blur:20
}).addTo(map)

}
