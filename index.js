const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let map
let leads=[]
let heatLayer
let userLat
let userLng
let currentUser

// LOGIN

async function login(){

const email=document.getElementById("email").value
const password=document.getElementById("password").value

const {data,error}=await supabaseClient.auth.signInWithPassword({
email,
password
})

if(error){
alert("Login fehlgeschlagen")
return
}

currentUser=data.user

document.getElementById("loginView").style.display="none"
document.getElementById("appView").style.display="block"

refreshAll()

}

// LOGOUT

async function logout(){

await supabaseClient.auth.signOut()

location.reload()

}

// DATEN LADEN

async function refreshAll(){

await loadLeads()

dashboardStats()

renderLeads()

drawMap()

}

// LEADS LADEN

async function loadLeads(){

const {data,error}=await supabaseClient
.from("Leads")
.select("*")

if(error){
console.log(error)
return
}

leads=data

}

// DASHBOARD

function dashboardStats(){

const myEmail=currentUser.email

const myLeads=leads.filter(l=>l.setter_email===myEmail)

document.getElementById("myLeadCount").innerText=myLeads.length

document.getElementById("teamLeadCount").innerText=leads.length

const confirmed=myLeads.filter(l=>l.qualification==="bestätigt").length
const open=myLeads.filter(l=>!l.qualification || l.qualification==="offen").length
const rejected=myLeads.filter(l=>l.qualification==="abgelehnt").length

document.getElementById("confirmedCount").innerText=confirmed
document.getElementById("openCount").innerText=open
document.getElementById("rejectedCount").innerText=rejected

ranking()

}

// RANGLISTE

function ranking(){

let rankingMap={}

leads.forEach(l=>{

if(!rankingMap[l.setter_email]){
rankingMap[l.setter_email]=0
}

rankingMap[l.setter_email]++

})

let rankingArray=Object.entries(rankingMap)
.sort((a,b)=>b[1]-a[1])
.slice(0,5)

const list=document.getElementById("rankingList")

list.innerHTML=""

rankingArray.forEach((r,i)=>{

let medal=""

if(i===0) medal="🥇"
if(i===1) medal="🥈"
if(i===2) medal="🥉"

list.innerHTML+=`
<div class="rank-item">
${medal} ${r[0]}
<span>${r[1]} Leads</span>
</div>
`

})

}

// LEADS LISTE

function renderLeads(){

const myEmail=currentUser.email

const myLeads=leads.filter(l=>l.setter_email===myEmail)

const container=document.getElementById("leadList")

container.innerHTML=""

myLeads.forEach(l=>{

container.innerHTML+=`

<div class="lead-card">

<div class="lead-title">
${l.street} ${l.number}
</div>

<div>Status: ${l.status}</div>

<div>Kunde: ${l.customer_name || "-"}</div>

<div>Telefon: ${l.customer_phone || "-"}</div>

<div>Notiz: ${l.notes || "-"}</div>

<div>Qualifikation: ${l.qualification || "offen"}</div>

<div class="chip-row">

<button class="chip green"
onclick="updateQualification(${l.id},'bestätigt')">
Bestätigt
</button>

<button class="chip gray"
onclick="updateQualification(${l.id},'offen')">
Offen
</button>

<button class="chip red"
onclick="updateQualification(${l.id},'abgelehnt')">
Abgelehnt
</button>

</div>

</div>

`

})

}

// QUALIFIKATION UPDATE

async function updateQualification(id,value){

await supabaseClient
.from("Leads")
.update({qualification:value})
.eq("id",id)

refreshAll()

}

// MAP START

function startRoute(){

if(!map){

map=L.map('map').setView([48.62,9.05],16)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
maxZoom:19
}).addTo(map)

map.on("click",async function(e){

userLat=e.latlng.lat
userLng=e.latlng.lng

const url=`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`

const response=await fetch(url)

const data=await response.json()

if(data.address){

document.getElementById("street").value=data.address.road || ""
document.getElementById("number").value=data.address.house_number || ""

}

})

}

navigator.geolocation.getCurrentPosition(pos=>{

userLat=pos.coords.latitude
userLng=pos.coords.longitude

map.setView([userLat,userLng],18)

L.marker([userLat,userLng]).addTo(map)

})

drawMap()

}

// MAP ZEICHNEN

function drawMap(){

if(!map) return

map.eachLayer(layer=>{
if(layer instanceof L.CircleMarker) map.removeLayer(layer)
})

let heatPoints=[]

leads.forEach(l=>{

if(!l.lat) return

let color="gray"

if(l.status==="PV Interesse") color="green"
if(l.status==="WP Interesse") color="blue"
if(l.status==="Kein Interesse") color="red"

L.circleMarker([l.lat,l.lng],{
radius:8,
color:color
})
.addTo(map)
.bindPopup(`
<b>${l.street} ${l.number}</b><br>
${l.status}
`)

if(l.status==="WP Interesse") heatPoints.push([l.lat,l.lng,1])

})

if(heatLayer) map.removeLayer(heatLayer)

heatLayer=L.heatLayer(heatPoints,{
radius:25
}).addTo(map)

}

// LEAD SPEICHERN

async function saveLead(status){

const street=document.getElementById("street").value
const number=document.getElementById("number").value
const name=document.getElementById("customer_name").value
const phone=document.getElementById("customer_phone").value
const notes=document.getElementById("notes").value

// DUPLIKAT CHECK

const exists=leads.find(l=>l.street===street && l.number===number)

if(exists){

alert("Haus bereits erfasst")

return

}

await supabaseClient
.from("Leads")
.insert([{
street,
number,
status,
lat:userLat,
lng:userLng,
setter_email:currentUser.email,
customer_name:name,
customer_phone:phone,
notes,
qualification:"offen"
}])

refreshAll()

alert("Lead gespeichert")

}
