const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let userLat
let userLng
let map
let leadLayer = null


// LOGIN

async function login() {
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  })

  if (error) {
    alert("Login fehlgeschlagen")
    console.log("LOGIN ERROR:", error)
  } else {
    document.getElementById("login").style.display = "none"
  }
}


// FARBE JE STATUS

function getLeadColor(status) {
  if (status === "PV Interesse") return "green"
  if (status === "WP Interesse") return "blue"
  if (status === "Kein Interesse") return "red"
  if (status === "Niemand zuhause") return "gray"
  return "black"
}


// FARBIGEN MARKER SETZEN

function addLeadMarker(lat, lng, street, number, status) {
  const color = getLeadColor(status)

  L.circleMarker([lat, lng], {
    radius: 10,
    color: color,
    fillColor: color,
    fillOpacity: 0.8
  })
  .addTo(leadLayer)
  .bindPopup((street || "") + " " + (number || "") + "<br>" + status)
}


// LEADS LADEN

async function loadLeads() {
  const { data, error } = await supabaseClient
    .from("Leads")
    .select("*")

  console.log("LOAD LEADS DATA:", data)
  console.log("LOAD LEADS ERROR:", error)

  if (error) {
    alert("Fehler beim Laden der Leads")
    console.log(error)
    return
  }

  leadLayer.clearLayers()

  data.forEach(lead => {
    if (lead.lat != null && lead.lng != null) {
      addLeadMarker(lead.lat, lead.lng, lead.street, lead.number, lead.status)
    }
  })
}


// MAP START

function startRoute() {

  if (map) {
    map.remove()
  }

  map = L.map("map").setView([48.62, 9.05], 16)

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map)

  leadLayer = L.layerGroup().addTo(map)

  // Haus anklicken → Adresse erkennen
  map.on("click", async function(e) {
    const lat = e.latlng.lat
    const lng = e.latlng.lng

    userLat = lat
    userLng = lng

    const url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lng

    try {
      const response = await fetch(url)
      const data = await response.json()

      console.log("REVERSE DATA:", data)

      if (data.address) {
        document.getElementById("street").value = data.address.road || ""
        document.getElementById("number").value = data.address.house_number || ""
      }
    } catch (err) {
      console.log("REVERSE ERROR:", err)
    }
  })

  navigator.geolocation.getCurrentPosition(async position => {
    userLat = position.coords.latitude
    userLng = position.coords.longitude

    map.setView([userLat, userLng], 18)

    L.marker([userLat, userLng])
      .addTo(map)
      .bindPopup("Du bist hier")
      .openPopup()

    await loadLeads()
  })
}


// LEAD SPEICHERN

async function saveLead(status) {
  const street = document.getElementById("street").value
  const number = document.getElementById("number").value

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
    .select()

  console.log("SAVE DATA:", data)
  console.log("SAVE ERROR:", error)

  if (error) {
    alert("Fehler beim Speichern")
    console.log(error)
  } else {
    addLeadMarker(userLat, userLng, street, number, status)
    alert("Lead gespeichert")
  }
}
