const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let userLat
let userLng
let map



// LOGIN

async function login(){

const email = document.getElementById("email").value
const password = document.getElementById("password").value

const { error } = await supabaseClient.auth.signInWithPassword({
email: email,
password: password
})

if(error){
alert("Login fehlgeschlagen")
console.log(error)
}else{
document.getElementById("login").style.display = "none"
}

}



// MARKER

function addLeadMarker(lat,lng,street,number,status){

let color = "blue"

if(status === "PV Interesse") color = "green"
if(status === "WP Interesse") color = "blue"
if(status === "Kein Interesse") color = "red"
if(status === "Niemand zuhause") color = "gray"

L.circleMarker([lat,lng],{
radius:10,
color:color,
fillColor:color,
fillOpacity:0.8
})
.addTo(map)
.bindPopup(street + " " + number + "<br>" + status)

}



// LEADS LADEN

async function loadLeads(){

const { data, error } = await supabaseClient
.from("Leads")
.select("*")

if(error){
console.log(error)
return
}

data.forEach(lead => {

addLeadMarker(
lead.lat,
lead.lng,
lead.street,
lead.number,
lead.status
)

})

}



// ROUTE MARKER

function showNextHouse(){

if(!userLat || !userLng) return

const step = 0.0001

const nextLat = userLat + step
const nextLng = userLng

L.marker([nextLat,nextLng])
.addTo(map)
.bindPopup("Nächstes Haus")
.openPopup()

}



// MAP START

function startRoute(){

map = L.map('map').setView([48.62,9.05],16)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map)



// HAUS ANKLICKEN

map.on("click", async function(e){

const lat = e.latlng.lat
const lng = e.latlng.lng

userLat = lat
userLng = lng

const url = "https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lng

const response = await fetch(url)
const data = await response.json()

if(data.address){

document.getElementById("street").value = data.address.road || ""
document.getElementById("number").value = data.address.house_number || ""

}

})




// GPS

navigator.geolocation.getCurrentPosition(position => {

userLat = position.coords.latitude
userLng = position.coords.longitude

map.setView([userLat,userLng],18)

L.marker([userLat,userLng])
.addTo(map)
.bindPopup("Du bist hier")
.openPopup()

loadLeads()

showNextHouse()

})

}



// LEAD SPEICHERN

async function saveLead(status){

const street = document.getElementById("street").value
const number = document.getElementById("number").value



// PRÜFEN OB HAUS EXISTIERT

const { data: existingLead } = await supabaseClient
.from("Leads")
.select("*")
.eq("street", street)
.eq("number", number)

if(existingLead && existingLead.length > 0){

alert("Haus bereits erfasst")

return

}



// SPEICHERN

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

console.log(error)
alert("Fehler beim Speichern")

}else{

addLeadMarker(userLat,userLng,street,number,status)

alert("Lead gespeichert")

}

}
