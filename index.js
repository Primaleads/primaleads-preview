const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let map
let userLat
let userLng

let visitedHouses = {}

function startRoute(){

map = L.map('map').setView([48.62,9.05],16)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map)

navigator.geolocation.getCurrentPosition(position => {

userLat = position.coords.latitude
userLng = position.coords.longitude

map.setView([userLat,userLng],18)

L.marker([userLat,userLng])
.addTo(map)
.bindPopup("Du bist hier")
.openPopup()

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

const street = data.address.road || ""
const number = data.address.house_number || ""

document.getElementById("street").value = street
document.getElementById("number").value = number

const key = street + number

if(visitedHouses[key]){

L.circleMarker([userLat,userLng],{
radius:10,
color:"black",
fillOpacity:0.2
}).addTo(map)

}

}

})

}



async function saveLead(status){

const street = document.getElementById("street").value
const number = document.getElementById("number").value

const key = street + number

visitedHouses[key] = true

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

data.forEach(lead => {

visitedHouses[lead.street + lead.number] = true

let color = "blue"

if(lead.status === "PV Interesse") color = "green"
if(lead.status === "WP Interesse") color = "blue"
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

}
