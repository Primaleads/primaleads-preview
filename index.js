const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)
let userLat
let userLng

const map = L.map('wurzel').setView([48.62, 9.05], 16)

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
maxZoom: 19
}).addTo(map)

navigator.geolocation.getCurrentPosition(position => {

userLat = position.coords.latitude
userLng = position.coords.longitude

map.setView([userLat, userLng], 18)

L.marker([userLat, userLng])
.addTo(map)
.bindPopup("Du bist hier")
.openPopup()

})

async function saveLead(status){

const street = document.querySelector("input[placeholder='Straße']").value
const number = document.querySelector("input[placeholder='Hausnummer']").value

const marker = L.marker([userLat, userLng]).addTo(map)

await supabaseClient
.from("Leads")
.insert([
{
Straße: street,
Nummer: number,
Status: status,
lat: userLat,
lng: userLng
}
])

}
