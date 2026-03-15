const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let map = null
let userMarker = null
let watchId = null
let userLat = null
let userLng = null
let leadLayer = null
let heatLayer = null
let currentHeatFilter = "WP Interesse"
let currentUserEmail = ""
let currentUserArea = ""
let cachedLeads = []
let cachedAreas = []

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"))
  document.getElementById(page).classList.add("active")
  if (page === "mapPage" && map) {
    setTimeout(() => map.invalidateSize(), 150)
  }
}

async function login() {
  const email = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value.trim()

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    alert("Login fehlgeschlagen")
    return
  }

  currentUserEmail = data.user.email
  await loadCurrentUserArea()

  document.getElementById("currentSetter").innerText = currentUserEmail
  document.getElementById("loginPage").classList.remove("active")
  document.getElementById("dashboardPage").classList.add("active")

  await loadAll()
}

async function loadCurrentUserArea() {
  const { data, error } = await supabaseClient
    .from("setter_areas")
    .select("*")
    .eq("setter_email", currentUserEmail)
    .limit(1)

  if (error) {
    console.log(error)
    currentUserArea = ""
    return
  }

  currentUserArea = data && data.length > 0 ? data[0].area : ""
}

async function loadAll() {
  await loadLeads()
  await loadAreaDashboard()
  renderDashboard()
  renderLeads()
  renderMap()
}

async function loadLeads() {
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

async function loadAreaDashboard() {
  const { data, error } = await supabaseClient
    .from("area_dashboard")
    .select("*")

  if (error) {
    console.log(error)
    return
  }

  cachedAreas = data || []
}

function getScopedLeads() {
  if (!currentUserArea) return cachedLeads
  return cachedLeads.filter(l => (l.area || "") === currentUserArea)
}

function renderDashboard() {
  const scoped = getScopedLeads()

  document.getElementById("myArea").innerText = currentUserArea || "-"
  document.getElementById("myLeadCount").innerText =
    scoped.filter(l => l.setter === currentUserEmail).length

  const confirmed = scoped.filter(l => l.qualification === "bestätigt").length
  const open = scoped.filter(l => !l.qualification || l.qualification === "offen").length
  const rejected = scoped.filter(l => l.qualification === "abgelehnt").length

  document.getElementById("confirmed").innerText = confirmed
  document.getElementById("open").innerText = open
  document.getElementById("rejected").innerText = rejected

  const ranking = {}
  scoped.forEach(l => {
    const key = l.setter || "Unbekannt"
    ranking[key] = (ranking[key] || 0) + 1
  })

  let rankingHtml = ""
  Object.entries(ranking)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(entry => {
      rankingHtml += `
        <div class="street-item">
          <div class="title">${entry[0]}</div>
          <div class="muted">${entry[1]} Leads</div>
        </div>
      `
    })

  document.getElementById("ranking").innerHTML =
    rankingHtml || `<div class="empty">Keine Daten vorhanden.</div>`

  let areaHtml = ""
  cachedAreas.forEach(a => {
    if (currentUserArea && a.area !== currentUserArea) return

    areaHtml += `
      <div class="street-item">
        <div class="title">${a.area || "Unbekannt"}</div>
        <div class="muted">
          Leads: ${a.total_leads} · PV: ${a.pv_leads} · WP: ${a.wp_leads} · Kein Interesse: ${a.no_interest} · Niemand zuhause: ${a.nobody_home}
        </div>
      </div>
    `
  })

  document.getElementById("areaList").innerHTML =
    areaHtml || `<div class="empty">Keine Gebietsinfos vorhanden.</div>`

  const streetMap = {}
  scoped.forEach(l => {
    const street = l.street || "Unbekannt"
    if (!streetMap[street]) {
      streetMap[street] = { total: 0, visited: 0 }
    }
    streetMap[street].total++
    if (l.status) streetMap[street].visited++
  })

  let openStreetHtml = ""
  Object.entries(streetMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([street, stats]) => {
      openStreetHtml += `
        <div class="street-item">
          <div class="title">${street}</div>
          <div class="muted">Erfasst: ${stats.visited} Lead(s) in dieser Straße</div>
        </div>
      `
    })

  document.getElementById("openStreetList").innerHTML =
    openStreetHtml || `<div class="empty">Noch keine Straßen erfasst.</div>`
}

function renderLeads(search = "") {
  const scoped = getScopedLeads()
  const q = search.toLowerCase()

  const filtered = scoped.filter(l =>
    (l.street || "").toLowerCase().includes(q) ||
    (l.number || "").toLowerCase().includes(q)
  )

  let html = ""

  filtered.forEach(l => {
    let color = "gray"
    if (l.status === "PV Interesse") color = "green"
    if (l.status === "WP Interesse") color = "blue"
    if (l.status === "Kein Interesse") color = "red"

    html += `
      <div class="lead-item">
        <div class="title">${l.street || "-"} ${l.number || ""}</div>
        <div class="muted">Gebiet: ${l.area || "Unbekannt"}</div>
        <div class="muted">Setter: ${l.setter || "Unbekannt"}</div>
        <div class="muted">Status: ${l.status || "-"}</div>
        <span class="badge ${color}">${l.qualification || "offen"}</span>
      </div>
    `
  })

  document.getElementById("leadList").innerHTML =
    html || `<div class="empty">Keine Leads gefunden.</div>`
}

function searchLeads() {
  const value = document.getElementById("search").value || ""
  renderLeads(value)
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
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`
      const res = await fetch(url)
      const data = await res.json()

      document.getElementById("street").value = data.address.road || ""
      document.getElementById("number").value = data.address.house_number || ""
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
    pos => {
      userLat = pos.coords.latitude
      userLng = pos.coords.longitude

      const point = [userLat, userLng]
      map.setView(point, 18)

      if (!userMarker) {
        userMarker = L.marker(point).addTo(map).bindPopup("Du bist hier")
      } else {
        userMarker.setLatLng(point)
      }

      renderMap()
    },
    err => {
      console.log(err)
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

  renderMap()
}

function getMarkerColor(status) {
  if (status === "PV Interesse") return "#2ecc71"
  if (status === "WP Interesse") return "#3498db"
  if (status === "Kein Interesse") return "#e74c3c"
  if (status === "Niemand zuhause") return "#7f8c8d"
  return "#111111"
}

function renderMap() {
  if (!map || !leadLayer) return

  const scoped = getScopedLeads()

  leadLayer.clearLayers()

  if (heatLayer) {
    map.removeLayer(heatLayer)
    heatLayer = null
  }

  const heatPoints = []

  scoped.forEach(l => {
    if (!l.lat || !l.lng) return

    const color = getMarkerColor(l.status)

    L.circleMarker([l.lat, l.lng], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2
    })
      .addTo(leadLayer)
      .bindPopup(`<strong>${l.street || "-"} ${l.number || ""}</strong><br>${l.status || "-"}`)

    if (currentHeatFilter === "all") {
      if (l.status === "WP Interesse" || l.status === "PV Interesse") {
        heatPoints.push([l.lat, l.lng, 0.7])
      }
    } else {
      if (l.status === currentHeatFilter) {
        heatPoints.push([l.lat, l.lng, 1])
      }
    }
  })

  if (heatPoints.length > 0) {
    heatLayer = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 24,
      maxZoom: 18
    }).addTo(map)
  }
}

async function saveLead(status) {
  const street = document.getElementById("street").value.trim()
  const number = document.getElementById("number").value.trim()
  const customer_name = document.getElementById("customer_name").value.trim()
  const customer_phone = document.getElementById("customer_phone").value.trim()
  const notes = document.getElementById("notes").value.trim()

  if (!street || !number || userLat == null || userLng == null) {
    alert("Bitte zuerst ein Haus anklicken")
    return
  }

  const existing = cachedLeads.find(l => l.street === street && l.number === number)
  if (existing) {
    alert("Haus bereits erfasst")
    return
  }

  const { error } = await supabaseClient
    .from("Leads")
    .insert([{
      street,
      number,
      status,
      lat: userLat,
      lng: userLng,
      customer_name,
      customer_phone,
      notes,
      qualification: "offen",
      setter: currentUserEmail,
      area: currentUserArea || "Unbekannt"
    }])

  if (error) {
    console.log(error)
    alert("Fehler beim Speichern")
    return
  }

  document.getElementById("customer_name").value = ""
  document.getElementById("customer_phone").value = ""
  document.getElementById("notes").value = ""

  alert("Lead gespeichert")
  await loadAll()
}
