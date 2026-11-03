/* ============================= CONFIG ============================= */
const API = "/api";
const TYPES = ["Single Room","Double Room","Bedsitter","Shop","One Bedroom","Two Bedroom","Three Bedroom","Own Compound","Maisonette"];
const TOWNS = [
  "Nairobi — Kilimani","Nairobi — Kasarani","Nairobi — Rongai","Nairobi — Ruaka","Nairobi — Embakasi","Nairobi — Westlands",
  "Mombasa — Nyali","Kisumu — Milimani","Nakuru — Section 58","Eldoret — Elgon View","Thika — Landless",
  "Nyeri Town","Machakos Town","Kitengela","Ngong","Ruiru"
];
const AMENITY_AXES = [
  {key:"schoolKm", label:"School", icon:"🎓"},
  {key:"hospitalKm", label:"Hospital", icon:"⚕"},
  {key:"roadKm", label:"Tarmac road", icon:"🛣"},
  {key:"policeKm", label:"Police", icon:"🚓"},
  {key:"industryKm", label:"Industry/CBD", icon:"🏭"},
];

/* ============================= STATE ============================= */
let STATE = {
  route: {name:"home"}, user:null, token: localStorage.getItem("wazi_token") || null,
  listings: [], filters: {type:"Any", town:"Any", maxPrice:"", sort:"newest"},
  authOpen:false, authRole:"tenant", authMode:"signin", authError:"",
  loading:true, toast:null, dashTab:"listings",
  favIds:[], prefs:null, notifs:[], notifCount:0,
  addListingFiles:{ premise:null, interior:[] }, addListingError:"",
};

/* ============================= API HELPERS ============================= */
async function api(path, opts={}){
  const headers = opts.headers || {};
  if(STATE.token) headers["Authorization"] = "Bearer " + STATE.token;
  if(opts.json){ headers["Content-Type"]="application/json"; opts.body = JSON.stringify(opts.json); }
  const res = await fetch(API+path, {method:opts.method||"GET", headers, body: opts.body});
  let data = {};
  try{ data = await res.json(); }catch(e){}
  if(!res.ok){ const err = new Error(data.error||"Request failed"); err.status=res.status; err.data=data; throw err; }
  return data;
}
function fmtPrice(n){ return "KSh " + Number(n).toLocaleString("en-KE"); }
function timeAgo(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff/60000);
  if(mins < 1) return "just now";
  if(mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return hrs + "h ago";
  return Math.floor(hrs/24) + "d ago";
}
function imgSrc(filename){ return filename ? "/uploads/"+filename : placeholderSVG(); }
function placeholderSVG(){
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='#E2DAC5'/><text x='50%' y='50%' font-family='sans-serif' font-size='20' fill='#8a8a78' text-anchor='middle'>No photo yet</text></svg>`
  );
}

/* ============================= INIT ============================= */
async function init(){
  if(STATE.token){
    try{
      const {user} = await api("/me");
      STATE.user = user;
    }catch(e){ STATE.token=null; localStorage.removeItem("wazi_token"); }
  }
  await loadListings();
  if(STATE.user) await loadUserExtras();
  STATE.loading = false;
  render();
  setInterval(async ()=>{
    if(!STATE.user) return;
    try{
      const {notifications} = await api("/notifications");
      STATE.notifs = notifications;
      STATE.notifCount = notifications.filter(n=>!n.read).length;
      renderNavOnly();
    }catch(e){}
  }, 15000);
}

async function loadListings(){
  const params = new URLSearchParams();
  if(STATE.filters.type && STATE.filters.type!=="Any") params.set("type", STATE.filters.type);
  if(STATE.filters.town && STATE.filters.town!=="Any") params.set("town", STATE.filters.town);
  if(STATE.filters.maxPrice) params.set("maxPrice", STATE.filters.maxPrice);
  if(STATE.filters.sort) params.set("sort", STATE.filters.sort);
  const {listings} = await api("/listings?"+params.toString());
  STATE.listings = listings;
}
async function loadUserExtras(){
  if(!STATE.user){ STATE.favIds=[]; STATE.prefs=null; STATE.notifs=[]; return; }
  try{
    const favs = await api("/favorites");
    STATE.favIds = favs.favIds;
    const prefRes = await api("/preferences");
    STATE.prefs = prefRes.preferences;
    const notifRes = await api("/notifications");
    STATE.notifs = notifRes.notifications;
    STATE.notifCount = notifRes.notifications.filter(n=>!n.read).length;
  }catch(e){}
}

/* ============================= AMENITY RADAR ============================= */
function radarSVG(am, size=64){
  const cx=size/2, cy=size/2, r=size/2-13;
  const n=AMENITY_AXES.length;
  const pts=[];
  AMENITY_AXES.forEach((a,i)=>{
    const dist = am[a.key] ?? 5;
    const score = Math.max(0.08, Math.min(1, 1 - dist/6));
    const ang = (Math.PI*2*i/n) - Math.PI/2;
    const rad = r*(0.22+0.78*score);
    pts.push(`${(cx+rad*Math.cos(ang)).toFixed(1)},${(cy+rad*Math.sin(ang)).toFixed(1)}`);
  });
  let axisLines="";
  AMENITY_AXES.forEach((a,i)=>{
    const ang = (Math.PI*2*i/n) - Math.PI/2;
    axisLines += `<line x1="${cx}" y1="${cy}" x2="${(cx+r*Math.cos(ang)).toFixed(1)}" y2="${(cy+r*Math.sin(ang)).toFixed(1)}" stroke="#22281F" stroke-opacity="0.10" stroke-width="1"/>`;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#22281F" stroke-opacity="0.08"/>
    ${axisLines}
    <polygon points="${pts.join(' ')}" fill="#2F6F4E" fill-opacity="0.35" stroke="#2F6F4E" stroke-width="1.6"/>
  </svg>`;
}

/* ============================= RENDER ROOT ============================= */
function render(){
  document.getElementById("app").innerHTML = navTemplate() + mainTemplate() + footerTemplate() + modalTemplate() + toastTemplate();
}
function renderNavOnly(){
  const nav = document.querySelector(".nav");
  if(nav) nav.outerHTML = navTemplate();
}
function mainTemplate(){
  if(STATE.loading) return `<main class="wrap"><div class="spinner-wrap">Loading WAZI…</div></main>`;
  const r = STATE.route;
  if(r.name==="detail") return detailTemplate(r.id);
  if(r.name==="owner") return ownerDashTemplate();
  if(r.name==="tenant") return tenantDashTemplate();
  return homeTemplate();
}

/* ============================= NAV ============================= */
function navTemplate(){
  const u = STATE.user;
  return `
  <header class="nav">
    <div class="wrap nav-inner">
      <div class="brand" data-action="go-home">
        <div class="brand-mark"></div>
        <div class="brand-name">wazi</div>
        <div class="brand-tag">nyumba wazi, karibu nyumbani</div>
      </div>
      <div class="nav-links">
        ${u ? `
          ${u.role==="owner" ? `<button class="nav-btn ${STATE.route.name==='owner'?'active':''}" data-action="go-owner">My listings</button>` : ""}
          ${u.role==="tenant" ? `<button class="nav-btn ${STATE.route.name==='tenant'?'active':''}" data-action="go-tenant">Saved &amp; alerts ${STATE.notifCount>0?`<span class="badge">${STATE.notifCount}</span>`:""}</button>` : ""}
          <div class="nav-user">
            <div class="avatar">${(u.name||"U").slice(0,1).toUpperCase()}</div>
            <button class="nav-btn" data-action="logout">Log out</button>
          </div>
        ` : `
          <button class="nav-cta" data-action="open-auth" data-role="owner">List a house</button>
          <button class="nav-btn" data-action="open-auth" data-role="tenant">Sign in</button>
        `}
      </div>
    </div>
  </header>`;
}

/* ============================= HOME ============================= */
function homeTemplate(){
  return `
  <main>
    <section class="hero">
      <div class="wrap hero-inner">
        <div class="eyebrow">Vacant houses across Kenya</div>
        <h1>Find a <em>vacant</em> house<br/>near what matters to you.</h1>
        <p>Browse rooms, bedsitters, family houses and shops with real distances to schools, hospitals, roads, police posts and industry — with real photos from verified owners.</p>
        ${searchCardTemplate()}
      </div>
    </section>
    <div class="wrap">
      ${chipRowTemplate()}
      <div class="section-head">
        <h2>Available now</h2>
        <div style="display:flex;align-items:center;gap:14px;">
          <span class="result-count">${STATE.listings.length} listing${STATE.listings.length===1?"":"s"}</span>
          <select class="sort-select" data-action="sort-change">
            ${["newest","price-asc","price-desc"].map(s=>`<option value="${s}" ${STATE.filters.sort===s?"selected":""}>${s==="newest"?"Newest":s==="price-asc"?"Price: low to high":"Price: high to low"}</option>`).join("")}
          </select>
        </div>
      </div>
      ${gridTemplate(STATE.listings)}
    </div>
  </main>`;
}
function searchCardTemplate(){
  const f = STATE.filters;
  return `
  <div class="search-card">
    <div class="field"><label>Town / area</label>
      <select id="f-town"><option value="Any" ${f.town==="Any"?"selected":""}>Any location</option>
        ${TOWNS.map(t=>`<option value="${t}" ${f.town===t?"selected":""}>${t}</option>`).join("")}</select>
    </div>
    <div class="field"><label>House type</label>
      <select id="f-type"><option value="Any" ${f.type==="Any"?"selected":""}>Any type</option>
        ${TYPES.map(t=>`<option value="${t}" ${f.type===t?"selected":""}>${t}</option>`).join("")}</select>
    </div>
    <div class="field"><label>Max price (KSh)</label><input id="f-max" type="number" min="0" placeholder="e.g. 20000" value="${f.maxPrice}"/></div>
    <button class="search-btn" data-action="apply-search">Search</button>
  </div>`;
}
function chipRowTemplate(){
  const f = STATE.filters;
  return `<div class="chip-row">${["Any", ...TYPES].map(c=>`<button class="chip ${f.type===c?"active":""}" data-action="chip" data-type="${c}">${c}</button>`).join("")}</div>`;
}
function gridTemplate(items){
  if(!items.length) return `<div class="empty"><h3>No listings match yet</h3><p>Try widening your filters, or check back soon — owners add new vacancies often.</p></div>`;
  return `<div class="grid">${items.map(cardTemplate).join("")}</div>`;
}
function cardTemplate(l){
  const isFav = (STATE.favIds||[]).includes(l.id);
  return `
  <article class="card" data-action="view-listing" data-id="${l.id}">
    <div class="card-media">
      <img src="${imgSrc(l.premiseImage)}" alt="${l.title}" loading="lazy"/>
      <div class="card-badge ${l.status==='occupied'?'occupied':''}">${l.status==='occupied'?'Occupied':'Vacant'}</div>
      <button class="fav-btn ${isFav?'saved':''}" data-action="toggle-fav" data-id="${l.id}" aria-label="Save listing">${isFav?"♥":"♡"}</button>
      <div class="card-radar">${radarSVG(l.amenities,54)}</div>
    </div>
    <div class="card-body">
      <div class="card-type">${l.type}</div>
      <div class="card-title">${l.title}</div>
      <div class="card-loc">${l.town}</div>
      <div class="card-price">${fmtPrice(l.price)} <span>/ month</span></div>
      <div class="card-dist">
        <span class="dist-tag">🎓 ${l.amenities.schoolKm} km</span>
        <span class="dist-tag">⚕ ${l.amenities.hospitalKm} km</span>
        <span class="dist-tag">🛣 ${l.amenities.roadType}</span>
      </div>
    </div>
  </article>`;
}

/* ============================= DETAIL ============================= */
function detailTemplate(id){
  const l = STATE.listings.find(x=>x.id===id) || STATE._detailCache;
  if(!l) return `<main class="wrap"><div class="empty"><h3>Loading listing…</h3></div></main>`;
  const isFav = (STATE.favIds||[]).includes(l.id);
  const isOwner = STATE.user && STATE.user.id===l.ownerId;
  const interior = l.interiorImages||[];
  return `
  <main class="wrap">
    <div class="detail-head">
      <button class="back-link" data-action="go-home">← Back to listings</button>
      <div class="gallery">
        <div class="gallery-main"><img src="${imgSrc(l.premiseImage)}" alt="Premise photo"/><div class="premise-label">🏠 Whole premise</div></div>
        <div class="gallery-side">
          ${interior.length ? interior.slice(0,4).map(f=>`<img src="${imgSrc(f)}" alt="Interior photo"/>`).join("") : `<img src="${placeholderSVG()}" alt=""/>`}
        </div>
      </div>
    </div>
    <div class="detail-grid">
      <div>
        <div class="detail-title-row">
          <div>
            <h1>${l.title}</h1>
            <div class="detail-loc">${l.town} · ${l.type}</div>
            <div class="status-pill ${l.status}">${l.status==='vacant'?'● Vacant now':'Currently occupied'}</div>
          </div>
          <button class="fav-btn" style="position:static;" data-action="toggle-fav" data-id="${l.id}" aria-label="Save">${isFav?"♥":"♡"}</button>
        </div>
        <p class="detail-desc">${l.desc}</p>
        <div class="divider"></div>
        <h3 style="font-size:17px;margin-bottom:14px;">What's nearby</h3>
        <div class="amenity-panel">
          <div class="amenity-list">
            ${AMENITY_AXES.map(a=>`<div class="amenity-row"><div class="a-name">${a.icon} ${a.label}</div><div class="a-val">${l.amenities[a.key]} km</div></div>`).join("")}
          </div>
          <div class="util-row">
            <span class="util-pill">💧 ${l.amenities.water} water</span>
            <span class="util-pill">⚡ ${l.amenities.electricity?"Electricity connected":"No electricity"}</span>
            <span class="util-pill">🛣 ${l.amenities.roadType} access road</span>
          </div>
        </div>
      </div>
      <div>
        <div class="sidebar-card">
          <div class="price-big">${fmtPrice(l.price)} <span>/ month</span></div>
          <div class="form-note">Deposit: ${fmtPrice(l.deposit)}</div>
          <div class="owner-row">
            <div class="avatar">${(l.ownerName||"O").slice(0,1).toUpperCase()}</div>
            <div><div class="owner-name">${l.ownerName}</div><div class="owner-role">Property owner</div></div>
          </div>
          ${isOwner ? `
            <button class="btn-secondary" data-action="toggle-status" data-id="${l.id}">Mark as ${l.status==='vacant'?'occupied':'vacant'}</button>
            <button class="btn-secondary danger" data-action="delete-listing" data-id="${l.id}">Delete listing</button>
          ` : `
            <button class="btn-primary" data-action="contact-owner" data-id="${l.id}">Contact owner — ${l.ownerPhone}</button>
            <button class="btn-secondary" data-action="toggle-fav" data-id="${l.id}">${isFav?"Saved to your list":"Save this house"}</button>
          `}
          <div class="form-note" style="margin-top:14px;">Posted ${timeAgo(l.datePosted)}.</div>
        </div>
      </div>
    </div>
  </main>`;
}

/* ============================= AUTH MODAL ============================= */
function modalTemplate(){
  if(!STATE.authOpen) return "";
  const role = STATE.authRole, mode = STATE.authMode;
  return `
  <div class="overlay" data-action="close-modal-bg">
    <div class="modal" data-stop="1">
      <button class="modal-close" data-action="close-modal">✕</button>
      <h2>${mode==='signin'?'Welcome back':'Join WAZI'}</h2>
      <div class="modal-sub">${mode==='signin' ? 'Sign in to manage listings or your saved homes.' : 'Create an account to post houses or save your search.'}</div>
      <div class="role-toggle">
        <button class="role-btn ${role==='tenant'?'selected':''}" data-action="set-role" data-role="tenant">I'm a tenant</button>
        <button class="role-btn ${role==='owner'?'selected':''}" data-action="set-role" data-role="owner">I'm an owner</button>
      </div>
      ${STATE.authError ? `<div class="form-error">${STATE.authError}</div>` : ""}
      <form data-action="submit-auth">
        ${mode==='signup' ? `<div class="form-group"><label>Full name</label><input id="auth-name" type="text" placeholder="e.g. Wanjiru Kamau" required /></div>` : ""}
        <div class="form-group"><label>Email</label><input id="auth-email" type="email" placeholder="you@example.com" required /></div>
        ${mode==='signup' ? `<div class="form-group"><label>Phone</label><input id="auth-phone" type="tel" placeholder="07xx xxx xxx" /></div>` : ""}
        <div class="form-group"><label>Password</label><input id="auth-password" type="password" placeholder="At least 6 characters" required minlength="6"/></div>
        <button type="submit" class="btn-primary">${mode==='signin' ? 'Sign in' : `Create ${role} account`}</button>
      </form>
      <div class="mode-toggle">
        ${mode==='signin' ? `No account yet? <button data-action="set-mode" data-mode="signup">Sign up</button>` : `Already registered? <button data-action="set-mode" data-mode="signin">Sign in</button>`}
      </div>
    </div>
  </div>`;
}

/* ============================= OWNER DASHBOARD ============================= */
function ownerDashTemplate(){
  if(!STATE.user || STATE.user.role!=="owner") return `<main class="wrap"><div class="empty"><h3>Owner sign-in required</h3><p>Sign in as an owner to manage listings.</p></div></main>`;
  const mine = STATE.listings.filter(l=>l.ownerId===STATE.user.id);
  return `
  <main class="wrap">
    <div class="dash-head"><h1 style="font-size:28px;">Owner dashboard</h1><div class="form-note">Manage the houses you've listed and see how they appear to tenants.</div></div>
    <div class="dash-tabs">
      <button class="dash-tab ${STATE.dashTab==='listings'?'active':''}" data-action="dash-tab" data-tab="listings">My listings (${mine.length})</button>
      <button class="dash-tab ${STATE.dashTab==='add'?'active':''}" data-action="dash-tab" data-tab="add">+ Add a listing</button>
    </div>
    ${STATE.dashTab==='listings' ? ownerListingsTemplate(mine) : addListingFormTemplate()}
  </main>`;
}
function ownerListingsTemplate(mine){
  if(!mine.length) return `<div class="empty"><h3>No listings yet</h3><p>Add your first vacant house so tenants nearby can find it.</p></div>`;
  return mine.map(l=>`
    <div class="my-listing-row">
      <img src="${imgSrc(l.premiseImage)}" alt=""/>
      <div class="my-listing-info"><h4>${l.title}</h4><div class="my-listing-meta">${l.town} · ${l.type} · ${fmtPrice(l.price)}/mo · ${l.status==='vacant'?'Vacant':'Occupied'}</div></div>
      <div class="row-actions">
        <button class="pill-btn" data-action="view-listing" data-id="${l.id}">View</button>
        <button class="pill-btn ${l.status==='vacant'?'on':''}" data-action="toggle-status" data-id="${l.id}">${l.status==='vacant'?'Vacant':'Mark vacant'}</button>
        <button class="pill-btn danger" data-action="delete-listing" data-id="${l.id}">Delete</button>
      </div>
    </div>`).join("");
}
function addListingFormTemplate(){
  const premise = STATE.addListingFiles.premise;
  const interior = STATE.addListingFiles.interior;
  return `
  <form data-action="submit-listing" style="max-width:640px;">
    ${STATE.addListingError ? `<div class="form-error">${STATE.addListingError}</div>` : ""}

    <div class="form-section-title">Photos</div>
    <div class="form-group">
      <label>Whole premise / compound photo — required</label>
      <div class="upload-box ${premise?'':'required'}" data-action="pick-premise">
        ${premise ? "Change premise photo" : "Click to upload a photo of the whole compound/premise"}
        <small>Tenants see this first — show the gate, exterior and surroundings.</small>
      </div>
      <input type="file" id="premise-input" accept="image/*" style="display:none;"/>
      ${premise ? `<div class="preview-strip"><div class="preview-thumb"><img src="${premise.url}"/><button type="button" data-action="clear-premise">✕</button></div></div>` : ""}
    </div>
    <div class="form-group">
      <label>Interior photos — optional, up to 8</label>
      <div class="upload-box" data-action="pick-interior">Click to add interior photos<small>Rooms, kitchen, bathroom — whatever helps a tenant picture living there.</small></div>
      <input type="file" id="interior-input" accept="image/*" multiple style="display:none;"/>
      ${interior.length ? `<div class="preview-strip">${interior.map((f,i)=>`<div class="preview-thumb"><img src="${f.url}"/><button type="button" data-action="clear-interior" data-idx="${i}">✕</button></div>`).join("")}</div>` : ""}
    </div>

    <div class="form-section-title">Details</div>
    <div class="form-row">
      <div class="form-group"><label>Title</label><input id="l-title" required placeholder="e.g. Bright bedsitter near stage"/></div>
      <div class="form-group"><label>House type</label><select id="l-type">${TYPES.map(t=>`<option value="${t}">${t}</option>`).join("")}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Town / area</label><select id="l-town">${TOWNS.map(t=>`<option value="${t}">${t}</option>`).join("")}</select></div>
      <div class="form-group"><label>Monthly rent (KSh)</label><input id="l-price" type="number" min="0" required placeholder="12000"/></div>
    </div>
    <div class="form-group"><label>Deposit (KSh)</label><input id="l-deposit" type="number" min="0" placeholder="12000"/></div>
    <div class="form-group"><label>Description</label><textarea id="l-desc" placeholder="Describe the house, finishes, security, parking..."></textarea></div>

    <div class="form-section-title">Nearby amenities (distance in km)</div>
    <div class="form-row">
      <div class="form-group"><label>🎓 School</label><input id="l-school" type="number" step="0.1" min="0" value="1"/></div>
      <div class="form-group"><label>⚕ Hospital</label><input id="l-hospital" type="number" step="0.1" min="0" value="1.5"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>🚓 Police</label><input id="l-police" type="number" step="0.1" min="0" value="2"/></div>
      <div class="form-group"><label>🏭 Industry / CBD</label><input id="l-industry" type="number" step="0.1" min="0" value="3"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Road to nearest tarmac</label><input id="l-road" type="number" step="0.1" min="0" value="0"/></div>
      <div class="form-group"><label>Road type at the house</label><select id="l-roadtype"><option>Tarmac</option><option>Murram</option></select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Water supply</label><select id="l-water"><option>Piped</option><option>Borehole</option><option>Tank</option></select></div>
      <div class="form-group" style="display:flex;align-items:end;"><label class="checkbox-row" style="margin-bottom:11px;"><input id="l-electricity" type="checkbox" checked/> Electricity connected</label></div>
    </div>
    <button type="submit" class="btn-primary" id="publish-btn">Publish listing</button>
    <div class="form-note">Your listing goes live immediately, and tenants with a matching alert are notified right away.</div>
  </form>`;
}

/* ============================= TENANT DASHBOARD ============================= */
function tenantDashTemplate(){
  if(!STATE.user || STATE.user.role!=="tenant") return `<main class="wrap"><div class="empty"><h3>Tenant sign-in required</h3><p>Sign in as a tenant to save homes and set alerts.</p></div></main>`;
  return `
  <main class="wrap">
    <div class="dash-head"><h1 style="font-size:28px;">Saved homes &amp; alerts</h1><div class="form-note">Set what you're looking for and we'll notify you the moment a matching house is listed as vacant.</div></div>
    <div class="dash-tabs">
      <button class="dash-tab ${['saved',undefined].includes(STATE.dashTab)||!['saved','prefs','notifs'].includes(STATE.dashTab)?'active':''}" data-action="dash-tab" data-tab="saved">Saved homes</button>
      <button class="dash-tab ${STATE.dashTab==='prefs'?'active':''}" data-action="dash-tab" data-tab="prefs">My preferences</button>
      <button class="dash-tab ${STATE.dashTab==='notifs'?'active':''}" data-action="dash-tab" data-tab="notifs">Notifications ${STATE.notifCount>0?`<span class="badge" style="background:var(--rust);color:#fff;">${STATE.notifCount}</span>`:""}</button>
    </div>
    ${tenantTabBody()}
  </main>`;
}
function tenantTabBody(){
  const tab = ['saved','prefs','notifs'].includes(STATE.dashTab) ? STATE.dashTab : 'saved';
  if(tab==='saved') return gridTemplate(STATE.listings.filter(l=>(STATE.favIds||[]).includes(l.id)));
  if(tab==='prefs') return tenantPrefsTemplate();
  return tenantNotifsTemplate();
}
function tenantPrefsTemplate(){
  const p = STATE.prefs || {town:"Any", type:"Any", minPrice:"", maxPrice:""};
  return `
  <div class="pref-card">
    <h3 style="font-size:17px;margin-bottom:14px;">Alert me when a matching house is vacant</h3>
    <form data-action="submit-prefs">
      <div class="form-group"><label>Preferred town/area</label><select id="p-town"><option value="Any" ${p.town==='Any'?'selected':''}>Any location</option>${TOWNS.map(t=>`<option value="${t}" ${p.town===t?'selected':''}>${t}</option>`).join("")}</select></div>
      <div class="form-group"><label>House type</label><select id="p-type"><option value="Any" ${p.type==='Any'?'selected':''}>Any type</option>${TYPES.map(t=>`<option value="${t}" ${p.type===t?'selected':''}>${t}</option>`).join("")}</select></div>
      <div class="form-row">
        <div class="form-group"><label>Min price (KSh)</label><input id="p-min" type="number" min="0" value="${p.minPrice||''}"/></div>
        <div class="form-group"><label>Max price (KSh)</label><input id="p-max" type="number" min="0" value="${p.maxPrice||''}"/></div>
      </div>
      <button type="submit" class="btn-primary">Save preferences</button>
      <div class="form-note">We check every new listing against this and notify you right away when one matches.</div>
    </form>
  </div>`;
}
function tenantNotifsTemplate(){
  const notifs = STATE.notifs || [];
  if(!notifs.length) return `<div class="empty"><h3>No notifications yet</h3><p>Set your preferences and we'll let you know when a matching house opens up.</p></div>`;
  return `<div style="max-width:600px;">${notifs.map(n=>`
    <div class="notif-item ${n.read?'read':''}" data-action="view-notif" data-listing="${n.listingId||''}">
      <div class="notif-dot"></div>
      <div><div class="notif-text">${n.message}</div><div class="notif-time">${timeAgo(n.date)}</div></div>
    </div>`).join("")}</div>`;
}

/* ============================= FOOTER / TOAST ============================= */
function footerTemplate(){
  return `<footer class="site-footer"><div class="wrap footer-inner">
    <div class="brand"><div class="brand-mark"></div><div class="brand-name" style="font-size:18px;">wazi</div></div>
    <div class="footer-note">WAZI connects tenants with vacant houses across Kenya. Listings and photos are provided by owners.</div>
  </div></footer>`;
}
function toastTemplate(){ return STATE.toast ? `<div class="toast">${STATE.toast}</div>` : ""; }
function showToast(msg){ STATE.toast = msg; render(); setTimeout(()=>{ STATE.toast=null; render(); }, 2600); }

/* ============================= FILE HELPERS ============================= */
function fileToPreview(file){
  return new Promise((resolve)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve({file, url:reader.result});
    reader.readAsDataURL(file);
  });
}

/* ============================= ACTIONS ============================= */
async function handleAction(action, ds, ev){
  if(action==="go-home"){ STATE.route={name:"home"}; render(); return; }
  if(action==="go-owner"){ STATE.route={name:"owner"}; STATE.dashTab="listings"; render(); return; }
  if(action==="go-tenant"){
    STATE.route={name:"tenant"}; STATE.dashTab="saved";
    render();
    try{ await api("/notifications/read", {method:"POST"}); STATE.notifCount=0; if(STATE.notifs) STATE.notifs=STATE.notifs.map(n=>({...n,read:true})); renderNavOnly(); }catch(e){}
    return;
  }
  if(action==="open-auth"){ STATE.authOpen=true; STATE.authRole=ds.role||"tenant"; STATE.authMode="signin"; STATE.authError=""; render(); return; }
  if(action==="close-modal" || action==="close-modal-bg"){
    if(action==="close-modal-bg" && ev.target.dataset.stop) return;
    STATE.authOpen=false; render(); return;
  }
  if(action==="set-role"){ STATE.authRole=ds.role; render(); return; }
  if(action==="set-mode"){ STATE.authMode=ds.mode; STATE.authError=""; render(); return; }
  if(action==="logout"){
    STATE.user=null; STATE.token=null; localStorage.removeItem("wazi_token");
    STATE.route={name:"home"}; STATE.favIds=[]; STATE.notifs=[]; STATE.notifCount=0;
    render(); return;
  }
  if(action==="submit-auth"){
    ev.preventDefault();
    STATE.authError = "";
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    try{
      let res;
      if(STATE.authMode==="signin"){
        res = await api("/auth/login", {method:"POST", json:{email, password}});
      } else {
        const name = document.getElementById("auth-name").value.trim();
        const phone = document.getElementById("auth-phone").value.trim();
        res = await api("/auth/register", {method:"POST", json:{name, email, phone, password, role: STATE.authRole}});
      }
      STATE.user = res.user; STATE.token = res.token;
      localStorage.setItem("wazi_token", res.token);
      STATE.authOpen = false;
      await loadUserExtras();
      STATE.route = { name: res.user.role==="owner" ? "owner" : "home" };
      if(res.user.role==="owner") STATE.dashTab="listings";
      render();
      showToast(`Welcome, ${res.user.name.split(" ")[0]}!`);
    }catch(e){
      STATE.authError = e.data?.error || "Something went wrong. Please try again.";
      render();
    }
    return;
  }
  if(action==="view-listing"){
    STATE.route={name:"detail", id:ds.id};
    window.scrollTo(0,0);
    render();
    try{ const {listing} = await api("/listings/"+ds.id); STATE._detailCache = listing;
      const i = STATE.listings.findIndex(l=>l.id===listing.id);
      if(i>-1) STATE.listings[i]=listing; else STATE.listings.push(listing);
      render();
    }catch(e){}
    return;
  }
  if(action==="toggle-fav"){
    if(!STATE.user){ STATE.authOpen=true; STATE.authRole="tenant"; render(); return; }
    try{
      const {favIds} = await api("/favorites/"+ds.id, {method:"POST"});
      STATE.favIds = favIds; render();
    }catch(e){ showToast("Couldn't update favorites"); }
    return;
  }
  if(action==="contact-owner"){
    const l = STATE.listings.find(x=>x.id===ds.id) || STATE._detailCache;
    showToast(`Call or SMS ${l.ownerPhone} to inquire about "${l.title}"`);
    return;
  }
  if(action==="chip"){ STATE.filters.type = ds.type; await loadListings(); render(); return; }
  if(action==="apply-search"){
    STATE.filters.town = document.getElementById("f-town").value;
    STATE.filters.type = document.getElementById("f-type").value;
    STATE.filters.maxPrice = document.getElementById("f-max").value;
    await loadListings(); render(); return;
  }
  if(action==="sort-change"){
    STATE.filters.sort = document.querySelector(".sort-select").value;
    await loadListings(); render(); return;
  }
  if(action==="dash-tab"){
    STATE.dashTab = ds.tab;
    if(ds.tab==='add'){ STATE.addListingFiles={premise:null, interior:[]}; STATE.addListingError=""; }
    render(); return;
  }
  if(action==="pick-premise"){ document.getElementById("premise-input").click(); return; }
  if(action==="pick-interior"){ document.getElementById("interior-input").click(); return; }
  if(action==="clear-premise"){ STATE.addListingFiles.premise=null; render(); return; }
  if(action==="clear-interior"){
    STATE.addListingFiles.interior.splice(Number(ds.idx),1); render(); return;
  }
  if(action==="submit-listing"){
    ev.preventDefault();
    if(!STATE.user || STATE.user.role!=="owner") return;
    if(!STATE.addListingFiles.premise){
      STATE.addListingError = "Please add a photo of the whole premise — it's required.";
      render(); return;
    }
    const btn = document.getElementById("publish-btn");
    if(btn){ btn.disabled = true; btn.textContent = "Publishing…"; }
    const fd = new FormData();
    fd.append("title", document.getElementById("l-title").value.trim());
    fd.append("type", document.getElementById("l-type").value);
    fd.append("town", document.getElementById("l-town").value);
    fd.append("price", document.getElementById("l-price").value);
    fd.append("deposit", document.getElementById("l-deposit").value || "0");
    fd.append("desc", document.getElementById("l-desc").value.trim());
    fd.append("schoolKm", document.getElementById("l-school").value);
    fd.append("hospitalKm", document.getElementById("l-hospital").value);
    fd.append("policeKm", document.getElementById("l-police").value);
    fd.append("industryKm", document.getElementById("l-industry").value);
    fd.append("roadKm", document.getElementById("l-road").value);
    fd.append("roadType", document.getElementById("l-roadtype").value);
    fd.append("water", document.getElementById("l-water").value);
    fd.append("electricity", document.getElementById("l-electricity").checked ? "true" : "false");
    fd.append("premiseImage", STATE.addListingFiles.premise.file);
    STATE.addListingFiles.interior.forEach(f=> fd.append("interiorImages", f.file));

    try{
      const res = await fetch(API+"/listings", { method:"POST", headers:{"Authorization":"Bearer "+STATE.token}, body: fd });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || "Could not publish listing");
      await loadListings();
      STATE.dashTab = "listings"; STATE.addListingError="";
      STATE.addListingFiles = {premise:null, interior:[]};
      render();
      showToast("Listing published!");
    }catch(e){
      STATE.addListingError = e.message;
      render();
    }
    return;
  }
  if(action==="toggle-status"){
    const l = STATE.listings.find(x=>x.id===ds.id) || STATE._detailCache;
    if(!l) return;
    const newStatus = l.status==='vacant' ? 'occupied' : 'vacant';
    try{
      const {listing} = await api("/listings/"+l.id, {method:"PATCH", json:{status:newStatus}});
      const i = STATE.listings.findIndex(x=>x.id===listing.id);
      if(i>-1) STATE.listings[i]=listing;
      STATE._detailCache = listing;
      render();
    }catch(e){ showToast("Couldn't update status"); }
    return;
  }
  if(action==="delete-listing"){
    try{
      await api("/listings/"+ds.id, {method:"DELETE"});
      STATE.listings = STATE.listings.filter(x=>x.id!==ds.id);
      STATE.route = {name:"owner"}; STATE.dashTab="listings";
      render();
      showToast("Listing deleted");
    }catch(e){ showToast("Couldn't delete listing"); }
    return;
  }
  if(action==="submit-prefs"){
    ev.preventDefault();
    const body = {
      town: document.getElementById("p-town").value,
      type: document.getElementById("p-type").value,
      minPrice: document.getElementById("p-min").value,
      maxPrice: document.getElementById("p-max").value,
    };
    try{
      const {preferences} = await api("/preferences", {method:"PUT", json:body});
      STATE.prefs = preferences;
      showToast("Preferences saved — we'll alert you when a match appears");
      render();
    }catch(e){ showToast("Couldn't save preferences"); }
    return;
  }
  if(action==="view-notif"){ if(ds.listing) handleAction("view-listing", {id:ds.listing}); return; }
}

/* file input change listeners (delegated, since inputs are re-rendered) */
document.addEventListener("change", async (ev)=>{
  if(ev.target.id === "premise-input" && ev.target.files[0]){
    const preview = await fileToPreview(ev.target.files[0]);
    STATE.addListingFiles.premise = preview;
    STATE.addListingError="";
    render();
  }
  if(ev.target.id === "interior-input" && ev.target.files.length){
    const files = Array.from(ev.target.files).slice(0, 8 - STATE.addListingFiles.interior.length);
    const previews = await Promise.all(files.map(fileToPreview));
    STATE.addListingFiles.interior = [...STATE.addListingFiles.interior, ...previews].slice(0,8);
    render();
  }
});

/* ============================= EVENT DELEGATION ============================= */
document.addEventListener("click", (ev)=>{
  const el = ev.target.closest("[data-action]");
  if(!el) return;
  const action = el.dataset.action;
  if(["submit-auth","submit-listing","submit-prefs"].includes(action)) return;
  handleAction(action, el.dataset, ev);
});
document.addEventListener("submit", (ev)=>{
  const el = ev.target.closest("[data-action]");
  if(!el) return;
  handleAction(el.dataset.action, el.dataset, ev);
});

init();
