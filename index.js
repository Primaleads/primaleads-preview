const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let map
let userLat
let userLng
let currentUser

let leadLayer
let streetLayer



// LOGIN

async function login(){

const email = document.getElementById("email").value
const password = document.getElementById("password").value

const { data, error } = await supabaseClient.auth.signInWithPassword({
email: email,
password: password
})

if(error){

alert("Login fehlgeschlagen")
console.log(error)

}else{

currentUser = data.user

document.getElementById("login").style.display = "none"

loadDashboard()

}

}




// DASHBOARD

async function loadDashboard(){

const { data, error } = await supabaseClient
.from("Leads")
.select("*")

if(error){
console.log(error)
return
}

let total = data.length
let pv = 0
let wp = 0
let kein = 0
let zuhause = 0

data.forEach(lead => {

if(lead.status === "PV Interesse") pv++
if(lead.status === "WP Interesse") wp++
if(lead.status === "Kein Interesse") kein++
if(lead.status === "Niemand zuhause") zuhause++

})

document.getElementById("totalLeads").innerText = total
document.getElementById("pvLeads").innerText = pv
document.getElementById("wpLeads").innerText = wp
document.getElementById("keinLeads").innerText = kein
document.getElementById("zuhauseLeads").innerText = zuhause

}




// MARKER FARBE

function getMarkerColor(status){

if(status === "PV Interesse") return "green"
if(status === "WP Interesse") return "blue"
if(status === "Kein Interesse") return "red"
if(status === "Niemand zuhause") return "gray"

return "black"

}




// LEAD MARKER

function addLeadMarker(lat,lng,street,number,status){

const color = getMarkerColor(status)

L.circleMarker([lat,lng],{

radius:10,
color:color,
fillColor:color,
fillOpacity:0.8

})
.addTo(leadLayer)
.bindPopup(street + " " + number + "<br>" + status)

}




// STRASSEN STATUS

async function updateStreetStatus(street){

const { data } = await supabaseClient
.from("Leads")
.select("*")
.eq("street",street)

if(!data) return

let houses = data.length

let color = "yellow"

if(houses > 10) color = "green"

L.circle([userLat,userLng],{

radius:80,
color:color,
fillColor:color,
fillOpacity:0.2

})
.addTo(streetLayer)

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




// MAP START

function startRoute(){

map = L.map("map").setView([48.62,9.05],16)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
maxZoom:19
}).addTo(map)

leadLayer = L.layerGroup().addTo(map)
streetLayer = L.layerGroup().addTo(map)


// HAUS KLICK

map.on("click", async function(e){

const lat = e.latlng.lat
const lng = e.latlng.lng

userLat = lat
userLng = lng

const url = "https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lng

const response = await fetch(url)
const data = await response.json()

if(data.address){

const street = data.address.road || ""
const number = data.address.house_number || ""

document.getElementById("street").value = street
document.getElementById("number").value = number

updateStreetStatus(street)

}

})




// GPS POSITION

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

}




// LEAD SPEICHERN

async function saveLead(status){

const street = document.getElementById("street").value
const number = document.getElementById("number").value


const { data: existingLead } = await supabaseClient
.from("Leads")
.select("*")
.eq("street", street)
.eq("number", number)

if(existingLead && existingLead.length > 0){

alert("Haus bereits erfasst")
return

}



const { error } = await supabaseClient
.from("Leads")
.insert([
{
street: street,
number: number,
status: status,
lat: userLat,
lng: userLng,
setter: currentUser.id
}
])

if(error){

console.log(error)
alert("Fehler beim Speichern")

}else{

addLeadMarker(userLat,userLng,street,number,status)

loadDashboard()

updateStreetStatus(street)

alert("Lead gespeichert")

}

}
