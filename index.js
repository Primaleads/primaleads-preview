document.getElementById("root").innerHTML = `
<div style="font-family:Arial;padding:20px">

<h1>PrimaLeads Dashboard</h1>

<div style="margin-top:30px">

<button onclick="showPage('dashboard')" style="margin:5px">Dashboard</button>
<button onclick="showPage('lead')" style="margin:5px">Neuer Lead</button>
<button onclick="showPage('leads')" style="margin:5px">Meine Leads</button>
<button onclick="showPage('route')" style="margin:5px">Laufroute</button>

</div>

<div id="content" style="margin-top:40px"></div>

</div>
`;

function showPage(page){

let content = document.getElementById("content");

if(page === "dashboard"){
content.innerHTML = `
<h2>Dashboard</h2>
<p>Willkommen im PrimaLeads System.</p>
`;
}

if(page === "lead"){
content.innerHTML = `
<h2>Neuer Lead</h2>

<input placeholder="Name" style="display:block;margin:10px 0;padding:8px"/>
<input placeholder="Telefon" style="display:block;margin:10px 0;padding:8px"/>
<input placeholder="Adresse" style="display:block;margin:10px 0;padding:8px"/>

<button>Lead speichern</button>
`;
}

if(page === "leads"){
content.innerHTML = `
<h2>Meine Leads</h2>
<p>Hier erscheinen später alle Leads.</p>
`;
}

if(page === "route"){
content.innerHTML = `
<h2>Laufroute</h2>
<p>Hier wird später deine Door-to-Door Route angezeigt.</p>
`;
}

}
