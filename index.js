const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let map = null
let userMarker = null
let watchId = null
let userLat = null
let userLng = null
let routePath = []
let routeLine = null
let leadLayer = null
let heatLayer = null
let currentHeatFilter = "WP Interesse"
let cachedLeads = []
let selectedStreet = ""

document.addEventListener("DOMContentLoaded", async () => {
  await refreshAll()
})

async function refreshAll() {
  await loadLeadsFromDb()
  renderDashboard()
  renderMapData()
  if (selectedStreet) {
    renderStreetSummary(selectedStreet)
  }
}

async function loadLeadsFromDb() {
  const { data, error } = await supabaseClient
    .from("Leads")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.log(error)
    alert("Fehler beim Laden der Leads")
    return
  }

  cachedLeads = data || []
}

function renderDashboard() {
  document.getElementById("totalLeads").innerText = cachedLeads.length

  const confirmed = cachedLeads.filter(l => l.qualification === "bestätigt").length
  const open = cachedLeads.filter(l => !l.qualification || l.qualification === "offen").length
  const rejected = cachedLeads.filter(l => l.qualification === "abgelehnt").length

  document.getElementById("confirmedCount").innerText = confirmed
  document.getElementById("openCount").innerText = open
  document.getElementById("rejectedCount").innerText = rejected

  if (selectedStreet) {
    const streetLeads = cachedLeads.filter(l => l.street === selectedStreet)
    document.getElementById("currentStreetCount").innerText = streetLeads.length
  } else {
    document.getElementById("currentStreetCount").innerText = 0
  }
}

function ensureMap() {
  if (map) return

  map = L.map("map").setView([48.62, 9.05], 16)

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map)

  leadLayer = L.layerGroup().addTo(map)

  map.on("click", async function(e) {
    userLat = e.latlng.lat
    userLng = e.latlng.lng

    try {
      const url =
        "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
        userLat +
        "&lon=" +
        userLng

      const response = await fetch(url)
      const data = await response.json()

      if (data.address) {
        const street = data.address.road || ""
        const number = data.address.house_number || ""

        document.getElementById("street").value = street
        document.getElementById("number").value = number

        selectedStreet = street
        renderStreetSummary(street)
        renderDashboard()
      }
    } catch (err) {
      console.log(err)
    }
  })
}

function startMap() {
  ensureMap()

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
  }

  watchId = navigator.geolocation.watchPosition(
    position => {
      userLat = position.coords.latitude
      userLng = position.coords.longitude

      const point = [userLat, userLng]
      map.setView(point, 18)

      if (!userMarker) {
        userMarker = L.marker(point).addTo(map).bindPopup("Du bist hier")
      } else {
        userMarker.setLatLng(point)
      }

      routePath.push(point)

      if (routeLine) {
        map.removeLayer(routeLine)
      }

      routeLine = L.polyline(routePath, {
        color: "#000000",
        weight: 4
      }).addTo(map)

      renderMapData()
    },
    error => {
      alert("Standort konnte nicht geladen werden")
      console.log(error)
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  )
}

function setHeatFilter(filter) {
  currentHeatFilter = filter

  document.getElementById("filterWp").classList.remove("active")
  document.getElementById("filterPv").classList.remove("active")
  document.getElementById("filterAll").classList.remove("active")

  if (filter === "WP Interesse") document.getElementById("filterWp").classList.add("active")
  if (filter === "PV Interesse") document.getElementById("filterPv").classList.add("active")
  if (filter === "all") document.getElementById("filterAll").classList.add("active")

  renderMapData()
}

function getMarkerColor(status) {
  if (status === "PV Interesse") return "#2ecc71"
  if (status === "WP Interesse") return "#3498db"
  if (status === "Kein Interesse") return "#e74c3c"
  if (status === "Niemand zuhause") return "#7f8c8d"
  return "#111111"
}

function renderMapData() {
  if (!map || !leadLayer) return

  leadLayer.clearLayers()

  if (heatLayer) {
    map.removeLayer(heatLayer)
    heatLayer = null
  }

  const heatPoints = []

  cachedLeads.forEach(lead => {
    if (lead.lat == null || lead.lng == null) return

    const color = getMarkerColor(lead.status)

    L.circleMarker([lead.lat, lead.lng], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2
    })
      .addTo(leadLayer)
      .bindPopup(
        `<strong>${lead.street || "-"} ${lead.number || ""}</strong><br>` +
        `${lead.status || "-"}`
      )

    if (currentHeatFilter === "all") {
      if (lead.status === "WP Interesse" || lead.status === "PV Interesse") {
        heatPoints.push([lead.lat, lead.lng, 0.7])
      }
    } else {
      if (lead.status === currentHeatFilter) {
        heatPoints.push([lead.lat, lead.lng, 1])
      }
    }
  })

  if (heatPoints.length > 0) {
    const gradient =
      currentHeatFilter === "WP Interesse"
        ? { 0.2: "#8ec5ff", 0.5: "#3498db", 0.8: "#1d4ed8", 1.0: "#0f172a" }
        : currentHeatFilter === "PV Interesse"
        ? { 0.2: "#b7f7d0", 0.5: "#2ecc71", 0.8: "#1f8f4e", 1.0: "#14532d" }
        : { 0.2: "#d1fae5", 0.5: "#60a5fa", 0.8: "#22c55e", 1.0: "#111827" }

    heatLayer = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 24,
      maxZoom: 18,
      gradient
    }).addTo(map)
  }
}

function renderStreetSummary(street) {
  if (!street) {
    document.getElementById("streetSummary").innerText = "Klicke ein Haus auf der Karte an."
    return
  }

  const streetLeads = cachedLeads.filter(l => l.street === street)

  const pv = streetLeads.filter(l => l.status === "PV Interesse").length
  const wp = streetLeads.filter(l => l.status === "WP Interesse").length
  const no = streetLeads.filter(l => l.status === "Kein Interesse").length
  const home = streetLeads.filter(l => l.status === "Niemand zuhause").length
  const total = streetLeads.length

  document.getElementById("streetSummary").innerHTML = `
    <strong>${street}</strong><br>
    Besucht: ${total} · PV: ${pv} · WP: ${wp} · Kein Interesse: ${no} · Niemand zuhause: ${home}
  `
}

async function saveLead(status) {
  const street = document.getElementById("street").value.trim()
  const number = document.getElementById("number").value.trim()
  const customer_name = document.getElementById("customer_name").value.trim()
  const customer_phone = document.getElementById("customer_phone").value.trim()
  const notes = document.getElementById("notes").value.trim()

  if (!street || !number || userLat == null || userLng == null) {
    alert("Bitte zuerst ein Haus auf der Karte anklicken")
    return
  }

  const { data: existingLead, error: checkError } = await supabaseClient
    .from("Leads")
    .select("id, status")
    .eq("street", street)
    .eq("number", number)

  if (checkError) {
    alert("Hausprüfung fehlgeschlagen")
    console.log(checkError)
    return
  }

  if (existingLead && existingLead.length > 0) {
    alert("Haus bereits erfasst: " + existingLead[0].status)
    return
  }

  const { error } = await supabaseClient
    .from("Leads")
    .insert([
      {
        street,
        number,
        status,
        lat: userLat,
        lng: userLng,
        customer_name,
        customer_phone,
        notes,
        qualification: "offen"
      }
    ])

  if (error) {
    alert("Fehler beim Speichern")
    console.log(error)
    return
  }

  selectedStreet = street
  document.getElementById("customer_name").value = ""
  document.getElementById("customer_phone").value = ""
  document.getElementById("notes").value = ""

  await refreshAll()
  alert("Lead gespeichert")
}
