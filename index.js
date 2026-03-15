async function drawRoute(){

const {data,error}=await supabaseClient
.from("house_ai")
.select("*")
.limit(20)

if(error){
console.log(error)
return
}

if(routeLine){
map.removeLayer(routeLine)
}

let points=[]

data.forEach(h=>{

if(!h.lat || !h.lng) return

points.push([h.lat,h.lng])

let color="red"

if(h.house_score>=8) color="green"
if(h.house_score>=5 && h.house_score<8) color="orange"

L.circleMarker([h.lat,h.lng],{
radius:8,
color:"#000",
fillColor:color,
fillOpacity:0.9
})
.addTo(map)
.bindPopup(`
<b>${h.street} ${h.number}</b><br>
Score: ${h.house_score}
`)

})

routeLine=L.polyline(points,{
color:"#000",
weight:4
}).addTo(map)

}
