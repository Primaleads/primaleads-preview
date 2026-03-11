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
