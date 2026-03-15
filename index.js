const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let map
let leads = []
let userLat
let userLng

// LOGIN

async function login(){

const email = document.getElementById("email").value
const password = document.getElementById("password").value

const { data, error } = await supabaseClient.auth.signInWithPassword({
email,
password
})

if(error){
alert("Login fehlgeschlagen")
return
}

document.getElementById("loginView").style.display="none"
document.getElementById("appView").style.display="block"

loadLeads()
}

// MAP START

function startRoute(){

map = L.map('map').setView([48.62,9.05],16)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map)

map.on("click", async function(e){

userLat = e.latlng.lat
userLng = e.latlng.lng

const url = "https://nominatim.openstreetmap.org/reverse?format=json&lat="+userLat+"&lon="+userLng

const response = await fetch(url)
const data = await response.json()

if(data.address){

document.getElementById("street").value = data.address.road || ""
document.getElementById("number").value = data.address.house_number || ""

}

})

navigator.geolocation.getCurrentPosition(position => {

userLat = position.coords.latitude
userLng = position.coords.longitude

map.setView([userLat,userLng],18)

L.marker([userLat,userLng]).addTo(map).bindPopup("Du bist hier")

})

loadLeads()

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

leads = data

drawLeads()
streetStats()

}

// MARKER ZEICHNEN

function drawLeads(){

leads.forEach(lead => {

let color = "gray"

if(lead.status==="PV Interesse") color="green"
if(lead.status==="WP Interesse") color="blue"
if(lead.status==="Kein Interesse") color="red"

const marker = L.circleMarker([lead.lat,lead.lng],{
radius:8,
color:color
}).addTo(map)

marker.bindPopup(`
<b>${lead.street} ${lead.number}</b><br>
Status: ${lead.status}<br>
Kunde: ${lead.customer_name || "-"}<br>
Telefon: ${lead.customer_phone || "-"}<br>
Qualifikation: ${lead.qualification || "offen"}<br>
`)

})

}

// LEAD SPEICHERN

async function saveLead(status){

const street = document.getElementById("street").value
const number = document.getElementById("number").value
const name = document.getElementById("customer_name").value
const phone = document.getElementById("customer_phone").value
const notes = document.getElementById("notes").value

// DUPLIKAT CHECK

const existing = leads.find(l => l.street===street && l.number===number)

if(existing){

alert("Haus bereits erfasst\nStatus: "+existing.status)
return

}

const { error } = await supabaseClient
.from("Leads")
.insert([
{
street,
number,
status,
lat:userLat,
lng:userLng,
customer_name:name,
customer_phone:phone,
notes:notes,
qualification:"offen"
}
])

if(error){
console.log(error)
alert("Fehler beim speichern")
return
}

alert("Lead gespeichert")

loadLeads()

}

// STRASSEN ANALYSE

function streetStats(){

let stats={}

leads.forEach(l=>{

if(!stats[l.street]){
stats[l.street]={
visited:0,
pv:0,
wp:0,
no:0,
none:0
}
}

stats[l.street].visited++

if(l.status==="PV Interesse") stats[l.street].pv++
if(l.status==="WP Interesse") stats[l.street].wp++
if(l.status==="Kein Interesse") stats[l.street].no++
if(l.status==="Niemand zuhause") stats[l.street].none++

})

console.log("Straßenanalyse:",stats)

}
