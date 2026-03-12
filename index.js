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

const { data, error } = await supabaseClient.auth.signInWithPassword({
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



// MAP START

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

})

}



// LEAD SPEICHERN

async function saveLead(status){

const street = document.getElementById("street").value
const number = document.getElementById("number").value

L.marker([userLat,userLng]).addTo(map)

const { data, error } = await supabaseClient
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
alert("Lead gespeichert")
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
