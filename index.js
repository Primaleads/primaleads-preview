const supabaseUrl="https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey="sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient=supabase.createClient(supabaseUrl,supabaseKey)

let map
let leads=[]
let userLat
let userLng
let currentUser

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

currentUser=data.user.email

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
return

}

leads=data

renderDashboard()
renderLeads()
drawLeads()

}

function renderDashboard(){

let ranking={}

let myLeads=0

leads.forEach(l=>{

if(!ranking[l.setter]) ranking[l.setter]=0

ranking[l.setter]++

if(l.setter===currentUser) myLeads++

})

let html=""

Object.entries(ranking)
.sort((a,b)=>b[1]-a[1])
.slice(0,5)
.forEach(r=>{

html+=`${r[0]} : ${r[1]} Leads<br>`

})

document.getElementById("ranking").innerHTML=html

document.getElementById("myLeads").innerText=myLeads

}

function renderLeads(){

let html=""

leads.forEach(l=>{

let color="gray"

if(l.status==="PV Interesse") color="green"
if(l.status==="WP Interesse") color="blue"
if(l.status==="Kein Interesse") color="red"

html+=`

<div class="lead-item">

<b>${l.street} ${l.number}</b><br>

<span class="badge ${color}">${l.status}</span>

<br>

<select onchange="updateQualification('${l.id}',this.value)">

<option ${l.qualification==="offen"?"selected":""}>offen</option>
<option ${l.qualification==="bestätigt"?"selected":""}>bestätigt</option>
<option ${l.qualification==="abgelehnt"?"selected":""}>abgelehnt</option>

</select>

</div>

`

})

document.getElementById("leadList").innerHTML=html

}

async function updateQualification(id,value){

await supabaseClient
.from("Leads")
.update({qualification:value})
.eq("id",id)

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

<b>${l.street} ${l.number}</b><br>

${l.status}

</div>

`

})

document.getElementById("leadList").innerHTML=html

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

navigator.geolocation.getCurrentPosition(pos=>{

userLat=pos.coords.latitude
userLng=pos.coords.longitude

map.setView([userLat,userLng],18)

})

drawLeads()

}

function drawLeads(){

if(!map) return

leads.forEach(l=>{

if(!l.lat) return

let color="gray"

if(l.status==="PV Interesse") color="green"
if(l.status==="WP Interesse") color="blue"
if(l.status==="Kein Interesse") color="red"

L.circleMarker([l.lat,l.lng],{

radius:7,
color:color

}).addTo(map)

})

}

async function saveLead(status){

const street=document.getElementById("street").value
const number=document.getElementById("number").value

await supabaseClient
.from("Leads")
.insert([{

street,
number,
status,
lat:userLat,
lng:userLng,
setter:currentUser,
qualification:"offen"

}])

alert("Lead gespeichert")

loadLeads()

}
