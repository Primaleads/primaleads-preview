const supabaseUrl = "https://vnfnclfqgcqlofjzefye.supabase.co"
const supabaseKey = "sb_publishable_q3gMEue0WevkMEEwGzGv-w_jE9eFdNr"
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

let currentUser = null
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

document.addEventListener("DOMContentLoaded", async () => {
  await restoreSession()
})

async function restoreSession() {
  const { data } = await supabaseClient.auth.getSession()
  if (data.session?.user) {
    currentUser = data.session.user
    showApp()
    await refreshAll()
  } else {
    showLogin()
  }
}

function showLogin() {
  document.getElementById("loginView").classList.remove("hidden")
  document.getElementById("appView").classList.add("hidden")
  document.getElementById("bottomTabs").classList.add("hidden")
}

function showApp() {
  document.getElementById("loginView").classList.add("hidden")
  document.getElementById("appView").classList.remove("hidden")
  document.getElementById("bottomTabs").classList.remove("hidden")
  document.getElementById("welcomeText").innerText = currentUser?.email || "Willkommen"
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
    console.log(error)
    return
  }

  currentUser = data.user
  showApp()
  await refreshAll()
}

async function logout() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }

  await supabaseClient.auth.signOut()
  currentUser = null
  cachedLeads = []
  showLogin()
}

function showTab(tabName) {
  document.getElementById("dashboardTab").classList.add("hidden")
  document.getElementById("leadsTab").classList.add("hidden")
  document.getElementById("mapTab").classList.add("hidden")

  document.getElementById("tabBtnDashboard").classList.remove("active")
  document.getElementById("tabBtnLeads").classList.remove("active")
  document.getElementById("tabBtnMap").classList.remove("active")

  if (tabName === "dashboard") {
    document.getElementById("dashboardTab").classList.remove("hidden")
    document.getElementById("tabBtnDashboard").classList.add("active")
  }

  if (tabName === "leads") {
    document.getElementById("leadsTab").classList.remove("hidden")
    document.getElementById("tabBtnLeads").classList.add("active")
  }

  if (tabName === "map") {
    document.getElementById("mapTab").classList.remove("hidden")
    document.getElementById("tabBtnMap").classList.add("active")
    setTimeout(() => {
      if (map) map.invalidateSize()
    }, 150)
  }
}

async function refreshAll() {
  await loadLeadsFromDb()
  renderDashboard()
  renderMyLeads()
  renderMapData()
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
  const myEmail = currentUser?.email || ""

  const myLeads = cachedLeads.filter(lead => lead.setter_email === myEmail)
  const confirmed = myLeads.filter(lead => lead.qualification === "bestätigt").length
  const open = myLeads.filter(lead => !lead.qualification || lead.qualification === "offen").length
  const rejected = myLeads.filter(lead => lead.qualification === "abgelehnt").length

  document.getElementById("confirmedCount").innerText = confirmed
  document.getElementById("openCount").innerText = open
  document.getElementById("rejectedCount").innerText = rejected
  document.getElementById("myLeadCount").innerText = myLeads.length
  document.getElementById("teamLeadCount").innerText = cachedLeads.length

  const rankingMap = {}
  cachedLeads.forEach(lead => {
    const key = lead.setter_email || "Unbekannt"
    rankingMap[key] = (rankingMap[key] || 0) + 1
  })

  const top5 = Object.entries(rankingMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const rankingList = document.getElementById("rankingList")
  rankingList.innerHTML = ""

  if (top5.length === 0) {
    rankingList.innerHTML = `<div class="empty-state">Noch keine Leads vorhanden.</div>`
    return
  }

  top5.forEach((entry, index) => {
    const item = document.createElement("div")
    item.className = "rank-item"

    const medal =
      index === 0 ? "🥇" :
      index === 1 ? "🥈" :
      index === 2 ? "🥉" :
      `${index + 1}.`

    item.innerHTML = `
      <span>${medal} ${entry[0]}</span>
      <strong>${entry[1]} Leads</strong>
    `
    rankingList.appendChild(item)
  })
}

function renderMyLeads() {
  const myEmail = currentUser?.email || ""
  const myLeads = cachedLeads.filter(lead => lead.setter_email === myEmail)

  const leadList = document.getElementById("leadList")
  leadList.innerHTML = ""

  if (myLeads.length === 0) {
    leadList.innerHTML = `<div class="card empty-state">Du hast noch keine Leads aufgenommen.</div>`
    return
  }

  myLeads.forEach(lead => {
    const card = document.createElement("div")
    card.className = "lead-card"

    const createdAt = lead.created_at
      ? new Date(lead.created_at).toLocaleString("de-DE")
      : "-"

    card.innerHTML = `
      <div class="lead-title">${lead.street || "-"} ${lead.number || ""}</div>
      <div class="lead-meta">Status: ${lead.status || "-"}</div>
      <div class="lead-meta">Qualifikation: ${lead.qualification || "offen"}</div>
      <div class="lead-meta">Kunde: ${lead.customer_name || "-"}</div>
      <div class="lead-meta">Telefon: ${lead.customer_phone || "-"}</div>
      <div class="lead-meta">Notiz: ${lead.notes || "-"}</div>
      <div class="lead-meta">Erstellt: ${createdAt}</div>

      <div class="chip-row">
        <button class="chip green" onclick="updateQualification(${lead.id}, 'bestätigt')">Bestätigt</button>
        <button class="chip gray" onclick="updateQualification(${lead.id}, 'offen')">Offen</button>
        <button class="chip red" onclick="updateQualification(${lead.id}, 'abgelehnt')">Abgelehnt</button>
      </div>
    `
    leadList.appendChild(card)
  })
}

async function updateQualification(id, qualification) {
  const { error } = await supabaseClient
    .from("Leads")
    .update({ qualification })
    .eq("id", id)

  if (error) {
    alert("Qualifikation konnte nicht aktualisiert werden")
    console.log(error)
    return
  }

  await refreshAll()
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
      }
    } catch (err) {
      console.log(err)
    }
  })
}

function startRoute() {
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
        `${lead.status || "-"}<br>` +
        `Qualifikation: ${lead.qualification || "offen"}`
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

async function saveLead(status) {
  if (!currentUser) {
    alert("Bitte zuerst einloggen")
    return
  }

  const street = document.getElementById("street").value.trim()
  const number = document.getElementById("number").value.trim()
  const customer_name = document.getElementById("customer_name").value.trim()
  const customer_phone = document.getElementById("customer_phone").value.trim()
  const notes = document.getElementById("notes").value.trim()

  if (!street || !number || userLat == null || userLng == null) {
    alert("Bitte zuerst Haus auf der Karte wählen oder Adresse ausfüllen")
    return
  }

  const { data: existingLead, error: checkError } = await supabaseClient
    .from("Leads")
    .select("id")
    .eq("street", street)
    .eq("number", number)

  if (checkError) {
    alert("Hausprüfung fehlgeschlagen")
    console.log(checkError)
    return
  }

  if (existingLead && existingLead.length > 0) {
    alert("Haus bereits erfasst")
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
        setter_email: currentUser.email,
        qualification: "offen",
        customer_name,
        customer_phone,
        notes
      }
    ])

  if (error) {
    alert("Fehler beim Speichern")
    console.log(error)
    return
  }

  document.getElementById("customer_name").value = ""
  document.getElementById("customer_phone").value = ""
  document.getElementById("notes").value = ""

  await refreshAll()
  alert("Lead gespeichert")
}
