const supabaseUrl="https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey="sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient=supabase.createClient(supabaseUrl,supabaseKey)

let map
let leads=[]
let routeLine
let userLat
let userLng

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
drawMap()

}

function showTab(tab){

document.getElementById("dashboard").style.display="none"
document.getElementById("leads").style.display="none"
document.getElementById("mapView").style.display="none"

document.getElementById(tab).style.display="block"

}

function renderDashboard(){

let rankingMap={}

leads.forEach(l=>{

if(!rankingMap[l.setter_email]) rankingMap[l.setter_email]=0

rankingMap[l.setter_email]++

})

let rankingArray=Object.entries(rankingMap)
.sort((a,b)=>b[1]-a[1])
.slice(0,5)

const ranking=document.getElementById("ranking")

ranking.innerHTML=""

rankingArray.forEach(r=>{

ranking.innerHTML+=`${r[0]} : ${r[1]} Leads<br>`

})

}

function renderLeads(){

const list=document.getElementById("leadList")

list.innerHTML=""

leads.forEach(l=>{

list.innerHTML+=`

<div class="card">

<b>${l.street} ${l.number}</b><br>

Status: ${l.status}<br>

Qualifikation: ${l.qualification || "offen"}

</div>

`

})

}

function startRoute(){

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

drawMap()

}

function drawMap(){

if(!map) return

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
lng:userLng
}])

loadLeads()

alert("Lead gespeichert")

}

loadLeads()
