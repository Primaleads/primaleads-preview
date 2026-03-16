const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let map
let userMarker
let userLat
let userLng
let leads = []

function showPage(page){

document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"))

document.getElementById(page).classList.add("active")

}

async function login(){

const email=document.getElementById("email").value
const password=document.getElementById("password").value

const {data,error}=await supabaseClient.auth.signInWithPassword({

email,
password

})

if(error){

alert("Login fehlgeschlagen")

}else{

showPage("dashboardPage")

loadLeads()

}

}

async function loadLeads(){

const {data,error}=await supabaseClient
.from("Leads")
.select("*")

if(error){

console.log(error)

}else{

leads=data

}

}

function startMap(){

if(!map){

map=L.map("map").setView([48.62,9.05],16)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map)

map.on("click",async function(e){

userLat=e.latlng.lat
userLng=e.latlng.lng

const url=`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`

const res=await fetch(url)

const data=await res.json()

document.getElementById("street").value=data.address.road || ""

document.getElementById("number").value=data.address.house_number || ""

})

}

navigator.geolocation.getCurrentPosition(function(position){

userLat=position.coords.latitude
userLng=position.coords.longitude

map.setView([userLat,userLng],18)

if(!userMarker){

userMarker=L.marker([userLat,userLng]).addTo(map)

}else{

userMarker.setLatLng([userLat,userLng])

}

})

}

async function saveLead(status){

const street=document.getElementById("street").value
const number=document.getElementById("number").value

const name=document.getElementById("customer_name").value
const phone=document.getElementById("customer_phone").value
const notes=document.getElementById("notes").value

await supabaseClient
.from("Leads")
.insert([{

street,
number,
status,
lat:userLat,
lng:userLng,
customer_name:name,
customer_phone:phone,
notes:notes

}])

alert("Lead gespeichert")

loadLeads()

}

function searchLeads(){

const q=document.getElementById("search").value.toLowerCase()

const filtered=leads.filter(l=>{

return l.street?.toLowerCase().includes(q)

})

let html=""

filtered.forEach(l=>{

html+=`

<div class="lead-item">

<b>${l.street} ${l.number}</b>

<br>

${l.status}

</div>

`

})

document.getElementById("leadList").innerHTML=html

}
