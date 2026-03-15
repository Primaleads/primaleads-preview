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
let selectedArea = "Alle"

document.addEventListener("DOMContentLoaded", async () => {
  updateSyncInfo()
  window.addEventListener("online", updateSyncInfo)
  window.addEventListener("offline", updateSyncInfo)
  await refreshAll()
})

function updateSyncInfo() {
  const el = document.getElementById("syncInfo")
  if (!el) return

  if (navigator.onLine) {
    el.innerText = "Online"
  } else {
    const queued = getOfflineLeads().length
    el.innerText = `Offline · ${queued} Lead(s) lokal gespeichert`
  }
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"))
  document.getElementById(pageId).classList.add("active")
  if (pageId === "mapPage" && map) {
    setTimeout(() => map.invalidateSize(), 150)
  }
}

function changeArea() {
  selectedArea = document.getElementById("areaSelect").value
  renderDashboard()
  renderLeads()
  renderMapData()
}

async function refreshAll() {
  await loadLeadsFromDb()
  renderDashboard()
  renderLeads()
  renderMapData()
  updateSyncInfo()
}

async function loadLeadsFromDb() {
  const { data, error } = await supabaseClient
    .from("Leads")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.log(error)
    return
  }

  cachedLeads = data || []
}

function getFilteredLeads() {
  if (selectedArea === "Alle") return cachedLeads
  return cachedLeads.filter(l => (l.area || "Unbekannt") === selectedArea)
}

function renderDashboard() {
  const leads = getFilteredLeads()

  let confirmed = 0
  let open = 0
  let rejected = 0
  const ranking = {}
  const streetMap = {}

  leads.forEach(l => {
    if (l.qualification === "bestätigt") confirmed++
    else if (l.qualification === "abgelehnt") rejected++
    else open++

    const setter = l.setter_email || "Unbekannt"
    ranking[setter] = (ranking[setter] || 0) + 1

    const street = l.street || "Unbekannt"
    if (!streetMap[street]) {
      streetMap[street] = {
        total: 0,
        pv: 0,
        wp: 0,
        no: 0,
        home: 0
      }
    }

    streetMap[street].total++
    if (l.status === "PV Interesse") streetMap[street].pv++
    if (l.status === "WP Interesse") streetMap[street].wp++
    if (l.status === "Kein Interesse") streetMap[street].no++
    if (l.status === "Niemand zuhause") streetMap[street].home++
  })

  document.getElementById("confirmed").innerText = confirmed
  document.getElementById("open").innerText = open
  document.getElementById("rejected").innerText = rejected
  document.getElementById("areaLeadCount").innerText = leads.length
  document.getElementById("areaStreetCount").innerText = Object.keys(streetMap).length

  let rankingHtml = ""
  Object.entries(ranking)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach((entry, index) => {
      const medal =
        index === 0 ? "🥇 " :
        index === 1 ? "🥈 " :
        index === 2 ? "🥉 " :
        `${index + 1}. `
      rankingHtml += `<div class="street-item"><div class="street-title">${medal}${entry[0]}</div><div class="muted">${entry[1]} Leads</div></div>`
    })

  document.getElementById("ranking").innerHTML = rankingHtml || `<div class="empty">Noch keine Leads.</div>`

  let streetsHtml = ""
  Object.entries(streetMap)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([street, stats]) => {
      streetsHtml += `
        <div class="street-item">
          <div class="street-title">${street}</div>
          <div class="muted">
            Besucht: ${stats.total} · PV: ${stats.pv} · WP: ${stats.wp} · Kein Interesse: ${stats.no} · Niemand zuhause: ${stats.home}
          </div>
        </div>
      `
    })

  document.getElementById("streetProgressList").innerHTML = streetsHtml || `<div class="empty">Noch keine Straßen im Gebiet.</div>`
}

function renderLeads(searchQuery = "") {
  const leads = getFilteredLeads()
    .filter(l => {
      const q = searchQuery.toLowerCase()
      return (
        (l.street || "").toLowerCase().includes(q) ||
        (l.number || "").toLowerCase().includes(q)
      )
    })

  let html = ""

  leads.forEach(l => {
    let badgeClass = "gray"
    if (l.status === "PV Interesse") badgeClass = "green"
    if (l.status === "WP Interesse") badgeClass = "blue"
    if (l.status === "Kein Interesse") badgeClass = "red"

    html += `
      <div class="lead-item">
        <div class="lead-title"><strong>${l.street || "-"} ${l.number || ""}</strong></div>
        <div class="muted">Gebiet: ${l.area || "Unbekannt"}</div>
        <div class="muted">Status: ${l.status || "-"}</div>
        <div class="muted">Kunde: ${l.customer_name || "-"}</div>
        <div class="muted">Telefon: ${l.customer_phone || "-"}</div>
        <span class="badge ${badgeClass}">${l.qualification || "offen"}</span>
      </div>
    `
  })

  document.getElementById("leadList").innerHTML = html || `<div class="empty">Keine Leads gefunden.</div>`
}

function searchLeads() {
  const q = document.getElementById("search").value || ""
  renderLeads(q)
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
        document.getElementById("street").value = data.address.road || ""
        document.getElementById("number").value = data.address.house_number || ""

        const city =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.municipality ||
          "Unbekannt"

        if (document.getElementById("areaSelect")) {
          const select = document.getElementById("areaSelect")
          const options = Array.from(select.options).map(o => o.value)
          if (options.includes(city)) {
            select.value = city
            selectedArea = city
          }
        }
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

  const leads = getFilteredLeads()

  leadLayer.clearLayers()

  if (heatLayer) {
    map.removeLayer(heatLayer)
    heatLayer = null
  }

  const heatPoints = []

  leads.forEach(lead => {
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
      .bindPopup(`<strong>${lead.street || "-"} ${lead.number || ""}</strong><br>${lead.status || "-"}`)

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
        ? { 0.2: "#8ec5ff", 0.5: "#3498db", 0.8: "#1d4ed8", 1: "#0f172a" }
        : currentHeatFilter === "PV Interesse"
        ? { 0.2: "#b7f7d0", 0.5: "#2ecc71", 0.8: "#1f8f4e", 1: "#14532d" }
        : { 0.2: "#d1fae5", 0.5: "#60a5fa", 0.8: "#22c55e", 1: "#111827" }

    heatLayer = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 24,
      maxZoom: 18,
      gradient
    }).addTo(map)
  }
}

function getOfflineLeads() {
  try {
    return JSON.parse(localStorage.getItem("offlineLeads") || "[]")
  } catch {
    return []
  }
}

function setOfflineLeads(leads) {
  localStorage.setItem("offlineLeads", JSON.stringify(leads))
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

  const area = selectedArea === "Alle" ? "Unbekannt" : selectedArea

  const existingLead = cachedLeads.find(l => l.street === street && l.number === number)
  if (existingLead) {
    alert("Haus bereits erfasst: " + existingLead.status)
    return
  }

  const payload = {
    street,
    number,
    status,
    lat: userLat,
    lng: userLng,
    customer_name,
    customer_phone,
    notes,
    qualification: "offen",
    area
  }

  if (!navigator.onLine) {
    const offline = getOfflineLeads()
    offline.push(payload)
    setOfflineLeads(offline)

    document.getElementById("customer_name").value = ""
    document.getElementById("customer_phone").value = ""
    document.getElementById("notes").value = ""

    updateSyncInfo()
    alert("Offline gespeichert")
    return
  }

  const { error } = await supabaseClient
    .from("Leads")
    .insert([payload])

  if (error) {
    console.log(error)
    alert("Fehler beim Speichern")
    return
  }

  document.getElementById("customer_name").value = ""
  document.getElementById("customer_phone").value = ""
  document.getElementById("notes").value = ""

  await refreshAll()
  alert("Lead gespeichert")
}

async function syncOfflineLeads() {
  if (!navigator.onLine) {
    alert("Kein Internet verfügbar")
    return
  }

  const offline = getOfflineLeads()
  if (offline.length === 0) {
    alert("Keine Offline Leads vorhanden")
    return
  }

  const { error } = await supabaseClient
    .from("Leads")
    .insert(offline)

  if (error) {
    console.log(error)
    alert("Sync fehlgeschlagen")
    return
  }

  setOfflineLeads([])
  updateSyncInfo()
  await refreshAll()
  alert("Offline Leads synchronisiert")
}
