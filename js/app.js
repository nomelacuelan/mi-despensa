// ---------- Utilidades ----------
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const pad=n=>String(n).padStart(2,"0");
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const addDays=n=>{const d=today();d.setDate(d.getDate()+n);return iso(d)};
const daysLeft=s=>{if(!s)return 999;const [y,m,d]=s.split("-").map(Number);return Math.round((new Date(y,m-1,d)-today())/864e5)};
const fmtDate=s=>{if(!s)return"";const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("es-ES",{day:"numeric",month:"short"})};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const euro=n=>(+n||0).toLocaleString("es-ES",{style:"currency",currency:"EUR"});
const monthKey=s=>s?s.slice(0,7):"";
let toastT;function toast(m){const t=$("#toast");t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2400)}
const VERSION_APP="1.2";
const ia=IA.cargarAjustesIA();
const errTxt=e=>e instanceof IA.ErrorIA?e.message:"No he podido conectar con la IA. Prueba otra vez.";
function needKey(el){if(ia.apiKey)return false;el.innerHTML=`Para usar la IA pega tu clave gratuita en <button class="go" data-goto="mas">Más → Ajustes</button>.`;return true}

// ---------- Catálogo de Mercadona (catalogo.json, descargado de tienda.mercadona.es) ----------
let CATALOG=[],CATS=[],SUBS={},catalogReady=false;const EAN=new Map();
async function loadCatalog(){try{const r=await fetch("catalogo.json");const j=await r.json();
  CATALOG=j.p.map(([n,ci,si,d,k,pr,f,e])=>({n,c:j.cats[ci],s:j.subs[si],d,k,pr,f,e,_n:norm(n)}));
  for(const p of CATALOG)if(p.e)EAN.set(p.e,p);
  CATS=j.cats.filter(c=>CATALOG.some(p=>p.c===c));
  for(const p of CATALOG){SUBS[p.c]??=[];if(!SUBS[p.c].includes(p.s))SUBS[p.c].push(p.s)}
  activeCat=CATS.includes("Fruta y verdura")?"Fruta y verdura":CATS[0];activeSub=SUBS[activeCat][0];catalogReady=true;render();
 }catch(e){$("#browse").innerHTML=`<p class="hint">No he podido cargar el catálogo. Recarga la página.</p>`}}
function search(q,max=12){const words=norm(q.trim()).split(/\s+/).filter(w=>w.length>1);if(!words.length)return[];
  return CATALOG.filter(p=>words.every(w=>p._n.includes(w))).sort((a,b)=>a._n.indexOf(words[0])-b._n.indexOf(words[0])||a.n.length-b.n.length).slice(0,max)}
function fuzzy(q,max=5){let r=search(q,max);if(r.length)return r;
  const words=norm(q).split(/\s+/).filter(w=>w.length>2);
  const scored=CATALOG.map(p=>({p,s:words.filter(w=>p._n.includes(w)).length})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s||a.p.n.length-b.p.n.length);
  return scored.slice(0,max).map(x=>x.p)}
const KEY_LABEL={huevo:"huevos",patata:"patatas",cebolla:"cebolla",tomate:"tomate",pollo:"pollo",arroz:"arroz",pasta:"pasta",ternera:"ternera",cerdo:"cerdo",picada:"carne picada",atun:"atún",salmon:"salmón",merluza:"merluza",gamba:"gambas",lechuga:"lechuga",pimiento:"pimiento",calabacin:"calabacín",berenjena:"berenjena",zanahoria:"zanahoria",ajo:"ajo",queso:"queso",leche:"leche",nata:"nata",yogur:"yogur",pan:"pan",jamon:"jamón",chorizo:"chorizo",garbanzo:"garbanzos",lenteja:"lentejas",alubia:"alubias",espinaca:"espinacas",champinon:"champiñones",platano:"plátano",manzana:"manzana",fresa:"frutos rojos",limon:"limón",aguacate:"aguacate",harina:"harina",tortilla:"tortillas de trigo",bacon:"bacon",pavo:"pavo",mozzarella:"mozzarella",bacalao:"bacalao",calamar:"calamares",mejillon:"mejillones",brocoli:"brócoli",puerro:"puerro",pepino:"pepino",maiz:"maíz",tomatefrito:"tomate frito",york:"jamón cocido",quesofresco:"queso fresco",mantequilla:"mantequilla",caldo:"caldo",guisante:"guisantes",calabaza:"calabaza",hamburguesa:"hamburguesas",panhamb:"pan de hamburguesa",masapizza:"masa de pizza",curry:"curry",pimenton:"pimentón",salchicha:"salchichas",panrallado:"pan rallado",miel:"miel",frutoseco:"frutos secos",boniato:"boniato",avena:"avena",azucar:"azúcar",verdura:"verduras congeladas"};
const label=k=>KEY_LABEL[k]||k;
function guessKey(name){const n=norm(name);const p=CATALOG.find(x=>x._n===n);if(p)return p.k||null;
  for(const k of Object.keys(KEY_LABEL)){if(n.includes(norm(KEY_LABEL[k]))||n.includes(k))return k}return null}

// ---------- Recetas: solo microondas (M) y airfryer (A) ----------
// r imprescindibles, o opcionales; s raciones; kcal, prot, hc, gr por ración (aprox.)
const RECIPES=[
{n:"Pechuga de pollo jugosa",a:"A",t:18,s:2,kcal:280,prot:45,hc:2,gr:9,r:["pollo"],o:["limon","pimenton","ajo"],p:["Unta las pechugas con aceite, sal, pimentón y ajo.","Airfryer a 190 °C 8 min, dales la vuelta y 6-8 min más.","Reposa 3 min antes de cortar."]},
{n:"Muslos de pollo crujientes con patatas",a:"A",t:30,s:2,kcal:520,prot:36,hc:35,gr:24,r:["pollo","patata"],o:["pimenton","ajo","limon"],p:["Patata en gajos con aceite y sal.","Muslos con especias encima de las patatas.","200 °C 25 min, removiendo a mitad."]},
{n:"Patatas fritas de airfryer",a:"A",t:25,s:2,kcal:220,prot:4,hc:38,gr:6,r:["patata"],o:["pimenton"],p:["Corta en bastones y lava para quitar el almidón.","Seca bien, una cucharada de aceite y sal.","200 °C 20-22 min, agitando dos veces."]},
{n:"Patata asada rellena",a:"M",t:12,s:2,kcal:380,prot:14,hc:42,gr:16,r:["patata"],o:["queso","bacon","york","nata"],p:["Pincha la patata y envuélvela en film apto.","Microondas a máxima potencia 8-10 min.","Ábrela, rellena con queso y bacon o jamón y 1 min más."]},
{n:"Tortilla de patatas al microondas",a:"M",t:20,s:2,kcal:380,prot:16,hc:28,gr:22,r:["huevo","patata"],o:["cebolla"],p:["Patata (y cebolla) en láminas finas con aceite y sal, tapada, 8-10 min.","Mezcla con 4 huevos batidos en un molde apto.","3-4 min a máxima potencia hasta que cuaje."]},
{n:"Huevos revueltos en taza",a:"M",t:4,s:1,kcal:250,prot:18,hc:2,gr:19,r:["huevo"],o:["queso","york","champinon","espinaca"],p:["Bate 2 huevos con sal en una taza.","30 s, remueve, otros 30 s y remueve.","Añade queso o jamón y 20 s más."]},
{n:"Huevos al plato",a:"A",t:12,s:1,kcal:290,prot:18,hc:8,gr:20,r:["huevo","tomatefrito"],o:["jamon","chorizo","queso","guisante"],p:["Tomate frito en un recipiente apto para airfryer.","Casca 2 huevos encima con jamón o chorizo.","180 °C 8-10 min según te guste la yema."]},
{n:"Salmón con verduras",a:"A",t:20,s:2,kcal:420,prot:32,hc:10,gr:27,r:["salmon"],o:["calabacin","brocoli","limon","zanahoria"],p:["Verduras troceadas con aceite y sal 6 min a 190 °C.","Pon el salmón encima con limón.","190 °C 8-10 min más."]},
{n:"Merluza en papillote",a:"M",t:10,s:2,kcal:220,prot:30,hc:6,gr:8,r:["merluza"],o:["limon","cebolla","pimiento","zanahoria"],p:["Cama de verduras en juliana en un recipiente tapado.","Merluza encima con sal, aceite y limón.","Microondas 5-6 min tapado. Reposa 1 min."]},
{n:"Bacalao con pimientos",a:"M",t:12,s:2,kcal:250,prot:35,hc:8,gr:9,r:["bacalao","pimiento"],o:["cebolla","ajo","tomatefrito"],p:["Pimiento y cebolla en tiras con aceite, tapado, 4 min.","Bacalao encima con un poco de tomate.","4-5 min más tapado."]},
{n:"Gambas al ajillo",a:"M",t:6,s:2,kcal:200,prot:24,hc:2,gr:11,r:["gamba","ajo"],o:["perejil"],p:["Aceite, ajo laminado y guindilla en cazuelita apta, 1 min.","Añade las gambas peladas con sal.","1,5-2 min y sirve con pan."]},
{n:"Calamares rebozados",a:"A",t:15,s:2,kcal:300,prot:25,hc:22,gr:11,r:["calamar","huevo","panrallado"],o:["harina","limon"],p:["Anillas por harina, huevo y pan rallado.","Pulveriza con aceite.","200 °C 8-10 min, vuelta a mitad. Limón al servir."]},
{n:"Hamburguesas completas",a:"A",t:15,s:2,kcal:560,prot:32,hc:35,gr:31,r:["hamburguesa","panhamb"],o:["queso","lechuga","tomate","bacon"],p:["Hamburguesas a 190 °C 10 min, vuelta a mitad.","Queso encima el último minuto.","Tuesta el pan 2 min y monta con lechuga y tomate."]},
{n:"Albóndigas con tomate",a:"A",t:25,s:3,kcal:420,prot:28,hc:16,gr:27,r:["picada"],o:["huevo","panrallado","ajo","tomatefrito"],p:["Mezcla la carne con huevo, pan rallado, ajo y sal; forma bolas.","Airfryer 190 °C 12 min.","Calienta con tomate frito 2 min en el microondas."]},
{n:"Lomo con pimientos",a:"A",t:20,s:2,kcal:380,prot:35,hc:8,gr:22,r:["cerdo","pimiento"],o:["ajo","cebolla"],p:["Pimientos en tiras con aceite 8 min a 180 °C.","Añade los filetes de lomo salpimentados.","200 °C 6-8 min, vuelta a mitad."]},
{n:"Salchichas con patatas",a:"A",t:25,s:2,kcal:540,prot:18,hc:38,gr:34,r:["salchicha","patata"],o:["cebolla"],p:["Patatas en dados con aceite 12 min a 200 °C.","Añade las salchichas con cortes.","8-10 min más."]},
{n:"Verduras asadas",a:"A",t:18,s:2,kcal:150,prot:4,hc:14,gr:9,r:["calabacin"],o:["pimiento","berenjena","cebolla","zanahoria","champinon"],p:["Corta todo en trozos parecidos.","Aceite, sal y especias.","190 °C 15 min, removiendo a mitad."]},
{n:"Brócoli al vapor gratinado",a:"M",t:8,s:2,kcal:160,prot:10,hc:8,gr:10,r:["brocoli"],o:["queso","ajo"],p:["Ramilletes con 2 cucharadas de agua, tapado, 4 min.","Escurre, aceite y sal.","Queso por encima y 1 min más."]},
{n:"Crema de calabacín",a:"M",t:15,s:3,kcal:150,prot:5,hc:12,gr:9,r:["calabacin"],o:["patata","puerro","quesofresco","cebolla"],p:["Todo troceado en un bol grande con un vaso de agua y sal.","Tapado 10-12 min a máxima potencia.","Tritura con un quesito o queso fresco."]},
{n:"Pisto rápido",a:"M",t:15,s:2,kcal:180,prot:6,hc:16,gr:10,r:["calabacin","tomatefrito"],o:["pimiento","cebolla","berenjena","huevo"],p:["Verduras en dados con aceite, tapado, 8 min removiendo a mitad.","Añade tomate frito y 2 min más.","Opcional: un huevo encima y 1 min."]},
{n:"Arroz con pollo en el micro",a:"M",t:22,s:2,kcal:480,prot:32,hc:58,gr:12,r:["arroz","pollo"],o:["guisante","pimiento","caldo","verdura"],p:["Pollo en dados con aceite 3 min.","Añade 1 vaso de arroz y 2 de caldo o agua con sal.","Tapado con rendija 15-17 min y reposa 5."]},
{n:"Pasta con atún y tomate",a:"M",t:15,s:2,kcal:520,prot:25,hc:70,gr:14,r:["pasta","tomatefrito"],o:["atun","queso"],p:["Pasta cubierta de agua con sal en un bol grande.","Microondas el tiempo del paquete + 3 min.","Escurre y mezcla con tomate y atún."]},
{n:"Macarrones gratinados",a:"A",t:25,s:2,kcal:620,prot:28,hc:72,gr:24,r:["pasta","tomatefrito","queso"],o:["picada","chorizo","york"],p:["Cuece la pasta en el microondas como en la receta anterior.","Mezcla con tomate y carne o chorizo en un molde.","Queso encima y airfryer 180 °C 5 min."]},
{n:"Lentejas con chorizo exprés",a:"M",t:8,s:2,kcal:350,prot:20,hc:38,gr:13,r:["lenteja"],o:["chorizo","zanahoria","cebolla","pimenton"],p:["Chorizo en rodajas con pimentón 1 min.","Añade las lentejas cocidas con su caldo y la verdura rallada.","Tapado 4-5 min."]},
{n:"Garbanzos crujientes especiados",a:"A",t:20,s:2,kcal:220,prot:10,hc:28,gr:8,r:["garbanzo"],o:["pimenton","curry"],p:["Escurre y seca muy bien los garbanzos cocidos.","Aceite, sal y especias.","200 °C 15-18 min, agitando."]},
{n:"Quesadillas",a:"A",t:10,s:2,kcal:420,prot:22,hc:36,gr:20,r:["tortilla","queso"],o:["pollo","york","pimiento"],p:["Rellena media tortilla con queso y lo que tengas; dobla.","Sujeta con un palillo.","180 °C 6 min, vuelta a mitad."]},
{n:"Fajitas de pollo",a:"A",t:20,s:2,kcal:480,prot:35,hc:40,gr:18,r:["tortilla","pollo","pimiento"],o:["cebolla","aguacate"],p:["Tiras de pollo, pimiento y cebolla con especias.","190 °C 12-14 min removiendo.","Calienta las tortillas 20 s en el microondas y rellena."]},
{n:"Pizza de tortilla",a:"A",t:10,s:1,kcal:450,prot:22,hc:40,gr:20,r:["tortilla","tomatefrito","queso"],o:["york","champinon","bacon","mozzarella"],p:["Tortilla de trigo con tomate, queso y lo que quieras.","180 °C 6-7 min hasta que el borde esté crujiente."]},
{n:"Sándwich mixto",a:"A",t:8,s:1,kcal:380,prot:20,hc:30,gr:20,r:["pan","york","queso"],o:["huevo","mantequilla"],p:["Monta el sándwich y unta mantequilla por fuera.","180 °C 6 min, vuelta a mitad."]},
{n:"Berenjena rellena de carne",a:"A",t:30,s:2,kcal:380,prot:25,hc:16,gr:24,r:["berenjena","picada"],o:["tomatefrito","queso","cebolla"],p:["Berenjena partida 6 min en el microondas; vacía la pulpa.","Mezcla pulpa, carne y tomate; 5 min en el microondas.","Rellena, queso encima y airfryer 180 °C 8 min."]},
{n:"Nuggets caseros",a:"A",t:20,s:2,kcal:400,prot:35,hc:25,gr:17,r:["pollo","huevo","panrallado"],o:["pimenton"],p:["Pechuga en tacos, por huevo y pan rallado con especias.","Pulveriza con aceite.","200 °C 10-12 min, vuelta a mitad."]},
{n:"Champiñones rellenos",a:"A",t:12,s:2,kcal:150,prot:10,hc:4,gr:10,r:["champinon"],o:["jamon","queso","ajo"],p:["Quita el pie y pícalo con ajo y jamón.","Rellena los sombreros y pon queso.","180 °C 8 min."]},
{n:"Pollo al curry",a:"M",t:15,s:2,kcal:450,prot:38,hc:10,gr:28,r:["pollo","curry"],o:["nata","cebolla","arroz"],p:["Pollo en dados y cebolla con aceite, tapado, 5 min.","Añade curry y nata, remueve.","4 min más. Acompaña de arroz hecho en el micro."]},
{n:"Boniato asado",a:"A",t:30,s:2,kcal:200,prot:3,hc:44,gr:2,r:["boniato"],o:["miel"],p:["Lava y parte el boniato por la mitad.","200 °C 25-30 min.","Un hilo de miel o sal y aceite."]},
{n:"Manzana asada",a:"A",t:18,s:1,kcal:150,prot:1,hc:32,gr:3,r:["manzana"],o:["miel","yogur","frutoseco"],p:["Quita el corazón y rellena con miel.","180 °C 15 min.","Sirve con yogur y nueces."]},
{n:"Bizcocho en taza",a:"M",t:4,s:1,kcal:350,prot:9,hc:45,gr:15,r:["huevo","harina"],o:["leche","azucar","cacao"],p:["En una taza: 1 huevo, 4 cdas de harina, 3 de azúcar, 3 de leche y 2 de aceite.","Mezcla bien.","90 s a máxima potencia."]},
{n:"Tortitas de plátano",a:"M",t:4,s:1,kcal:260,prot:10,hc:38,gr:7,r:["platano","huevo"],o:["avena","miel"],p:["Machaca el plátano con el huevo y 2 cdas de avena.","En un plato hondo engrasado, 2 min.","Sirve con miel."]}
];

// ---------- Almacenamiento ----------
let items=[];
const LS="midespensa.items.v1";
const isProd=x=>x.status==="lista"||x.status==="casa"||x.status==="gastado"||x.status==="tirado";
const byStatus=s=>items.filter(x=>x.status===s);
function settings(){return items.find(x=>x.id==="ajustes")||{id:"ajustes",status:"ajustes",budget:0,favs:[]}}
const favRec=()=>settings().favRec||[];const myRec=()=>settings().myRec||[];
function loadLocal(){try{items=JSON.parse(localStorage.getItem(LS)||"[]")}catch(e){items=[]}}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(items))}catch(e){}}
function put(it){const i=items.findIndex(x=>x.id===it.id);if(i>=0)items[i]=it;else items.push(it);saveLocal();render()}
function del(id){items=items.filter(x=>x.id!==id);saveLocal();render()}
function initStore(){loadLocal();render()}

// ---------- Acciones ----------
function newItem(p,status,extra={}){return{id:uid(),name:p.n,cat:p.c||"Otros",sub:p.s||"",fmt:p.f||"",price:+p.pr||0,days:p.d||7,key:p.k||guessKey(p.n),qty:1,status,added:iso(today()),...extra}}
function addToList(p,silent){const ex=byStatus("lista").find(x=>x.name.toLowerCase()===p.n.toLowerCase()&&(x.fmt||"")===(p.f||""));
  if(ex){put({...ex,qty:(ex.qty||1)+1});if(!silent)toast(`${p.n}: ${ex.qty+1} en la lista`);return}
  put(newItem(p,"lista"));if(!silent)toast(`${p.n} añadido a la lista`)}
function buy(it){put({...it,status:"casa",bought:iso(today()),exp:addDays(it.days||7)})}
function addToPantry(p,extra={}){put(newItem(p,"casa",{bought:iso(today()),exp:addDays(p.d||7),...extra}))}
function finish(it,how){put({...it,status:how,done:iso(today())})}
function isFav(it){return settings().favs.some(f=>f.n===it.name&&(f.f||"")===(it.fmt||""))}
function toggleFav(it){const s=settings();const fav={n:it.name,c:it.cat,s:it.sub,f:it.fmt,pr:it.price,d:it.days,k:it.key};
  const on=isFav(it);const favs=on?s.favs.filter(f=>!(f.n===it.name&&(f.f||"")===(it.fmt||""))):[...s.favs,fav];
  put({...s,favs});toast(on?`${it.name} quitado de «Lo de siempre»`:`${it.name} guardado en «Lo de siempre»`)}

// ---------- Lista ----------
let pantryMode=false,activeCat="",activeSub="";
function renderResults(){const q=$("#q").value;const box=$("#results");
  if(!q.trim()){box.hidden=true;box.innerHTML="";return}
  const r=search(q);const exact=r.some(p=>p._n===norm(q.trim()));
  let html=r.map(p=>`<button data-i="${CATALOG.indexOf(p)}"><span>${esc(p.n)}<br><small>${esc(p.f)}</small></span><small>${p.pr?euro(p.pr):""}</small></button>`).join("");
  if(!exact)html+=`<button data-custom="1"><span>Añadir «${esc(q.trim())}»</span><small>Producto propio</small></button>`;
  box.innerHTML=html;box.hidden=false}
function resetSearch(){$("#q").value="";renderResults();pantryMode=false;$("#q").placeholder="Busca entre los productos de Mercadona…"}
$("#q").addEventListener("input",renderResults);
$("#q").addEventListener("keydown",e=>{if(e.key==="Enter"){const f=$("#results button");if(f)f.click()}if(e.key==="Escape")resetSearch()});
$("#results").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  let p;if(b.dataset.custom){const n=$("#q").value.trim();p={n:n.charAt(0).toUpperCase()+n.slice(1),c:"Otros",d:7,k:guessKey(n)}}else p=CATALOG[+b.dataset.i];
  const wasPantry=pantryMode;if(wasPantry)addToPantry(p);else addToList(p);
  resetSearch();if(wasPantry)show("casa");else $("#q").focus()});
function renderBrowse(){if(!catalogReady){$("#browse").innerHTML=`<p class="hint">Cargando los productos de Mercadona…</p>`;return}
  $("#cats").innerHTML=CATS.map(c=>`<button class="chip" aria-pressed="${c===activeCat}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
  $("#subs").innerHTML=(SUBS[activeCat]||[]).map(s=>`<button class="chip sub" aria-pressed="${s===activeSub}" data-s="${esc(s)}">${esc(s)}</button>`).join("");
  const inList=new Map(byStatus("lista").map(x=>[x.name.toLowerCase()+"|"+(x.fmt||""),x.qty||1]));
  const P=CATALOG.filter(p=>p.c===activeCat&&p.s===activeSub);
  $("#browse").innerHTML=`<div class="list prods">`+P.map(p=>{const q=inList.get(p.n.toLowerCase()+"|"+(p.f||""));return`
    <div class="row prod"><div class="name"><b>${esc(p.n)}</b><small>${esc(p.f)}</small></div>
    <span class="price">${p.pr?euro(p.pr):""}</span>
    <button class="icon add ${q?"in":""}" data-i="${CATALOG.indexOf(p)}" aria-label="Añadir ${esc(p.n)} a la lista">${q||"+"}</button></div>`}).join("")+`</div>`}
$("#cats").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;activeCat=b.dataset.c;activeSub=SUBS[activeCat][0];renderBrowse()});
$("#subs").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;activeSub=b.dataset.s;renderBrowse()});
$("#browse").addEventListener("click",e=>{const b=e.target.closest("button[data-i]");if(!b)return;addToList(CATALOG[+b.dataset.i])});

let confirmClear=false;
function renderList(){const L=byStatus("lista");const box=$("#list");
  $("#buy-all").disabled=!L.length;$("#clear-list").disabled=!L.length;
  const favs=settings().favs;$("#usual").textContent=`★ Lo de siempre${favs.length?` (${favs.length})`:""}`;
  if(!L.length){box.innerHTML=`<div class="empty"><b>La lista está vacía</b><p>Busca arriba o navega por las secciones de Mercadona. ${favs.length?"Pulsa «Lo de siempre» para añadir tu compra habitual.":"Marca productos con ★ para guardarlos en «Lo de siempre»."}</p><button class="btn ghost small" id="demo">Cargar ejemplo</button></div>`;return}
  const groups={};for(const it of L){(groups[it.cat]??=[]).push(it)}
  const order=[...CATS,"Otros"].filter(c=>groups[c]);for(const c in groups)if(!order.includes(c))order.push(c);
  const total=L.reduce((s,x)=>s+(x.price||0)*(x.qty||1),0);
  box.innerHTML=`<div class="list">`+order.map(c=>`<div class="group-h">${esc(c)}</div>`+groups[c].map(it=>`
    <div class="row" data-id="${esc(it.id)}">
      <button class="check" data-act="buy" aria-label="Marcar ${esc(it.name)} como comprado" title="Comprado"></button>
      <div class="name"><b>${esc(it.name)}</b><small>${it.fmt?esc(it.fmt)+" · ":""}${it.price?euro(it.price*(it.qty||1)):""}</small></div>
      <div class="qty"><button class="icon star ${isFav(it)?"on":""}" data-act="fav" aria-label="Guardar en Lo de siempre">★</button><button class="icon" data-act="minus" aria-label="Menos">−</button><span>${it.qty||1}</span><button class="icon" data-act="plus" aria-label="Más">+</button></div>
    </div>`).join("")).join("")+`</div>`+(total?`<p class="total">Total estimado <b>${euro(total)}</b> · ${L.reduce((s,x)=>s+(x.qty||1),0)} productos</p>`:"")}
$("#list").addEventListener("click",e=>{if(e.target.id==="demo"){loadDemo();return}
  const b=e.target.closest("button[data-act]");if(!b)return;const id=b.closest(".row").dataset.id;const it=items.find(x=>x.id===id);if(!it)return;
  const a=b.dataset.act;
  if(a==="buy"){buy(it);toast(`${it.name} pasa a «En casa»`)}
  if(a==="fav")toggleFav(it);
  if(a==="plus")put({...it,qty:(it.qty||1)+1});
  if(a==="minus"){if((it.qty||1)<=1)del(id);else put({...it,qty:it.qty-1})}});
$("#buy-all").addEventListener("click",()=>{const L=byStatus("lista");L.forEach(buy);toast(`${L.length} productos guardados en «En casa»`)});
$("#clear-list").addEventListener("click",()=>{const b=$("#clear-list");if(!confirmClear){confirmClear=true;b.textContent="¿Seguro?";setTimeout(()=>{confirmClear=false;b.textContent="Vaciar"},3000);return}
  confirmClear=false;b.textContent="Vaciar";byStatus("lista").forEach(x=>del(x.id));toast("Lista vaciada")});
$("#usual").addEventListener("click",()=>{const favs=settings().favs;if(!favs.length){toast("Marca productos con ★ en la lista para guardarlos aquí");return}
  let n=0;for(const f of favs){if(!byStatus("lista").some(x=>x.name===f.n&&(x.fmt||"")===(f.f||""))){addToList(f,true);n++}}
  toast(n?`${n} productos habituales añadidos`:"Tu compra habitual ya está en la lista")});

// ---------- En casa ----------
function status(dl){return dl<0?"bad":dl<=2?"warn":"ok"}
function expiryText(dl){if(dl<0)return dl===-1?"Caducó ayer":`Caducó hace ${-dl} días`;if(dl===0)return"Caduca hoy";if(dl===1)return"Caduca mañana";if(dl<=60)return`${dl} días`;return`${Math.round(dl/30)} meses`}
function renderPantry(){const P=byStatus("casa").map(x=>({...x,dl:daysLeft(x.exp)})).sort((a,b)=>a.dl-b.dl);
  const bad=P.filter(x=>x.dl<0).length,warn=P.filter(x=>x.dl>=0&&x.dl<=2).length,week=P.filter(x=>x.dl>2&&x.dl<=7).length;
  $("#summary").innerHTML=`<div class="stat bad"><b>${bad}</b><small>Caducados</small></div><div class="stat warn"><b>${warn}</b><small>Caducan en 2 días</small></div><div class="stat"><b>${week}</b><small>Esta semana</small></div><div class="stat ok"><b>${P.length}</b><small>Productos en casa</small></div>`;
  const box=$("#pantry");
  if(!P.length){box.innerHTML=`<div class="empty"><b>Aún no hay nada en casa</b><p>Marca productos como comprados en la lista o escanea el ticket de tu última compra.</p></div>`;return}
  box.innerHTML=`<div class="list">`+P.map(it=>{const s=status(it.dl);return`
    <div class="row prow" data-id="${esc(it.id)}">
      <span class="stripe ${s}"></span>
      <div class="name"><b>${esc(it.name)}${(it.qty||1)>1?` ×${it.qty}`:""}</b><small>${it.fmt?esc(it.fmt)+" · ":""}comprado el ${fmtDate(it.bought)}</small></div>
      <div class="pright">
        <span class="pill ${s}">${expiryText(it.dl)}</span>
        <input type="date" id="d-${esc(it.id)}" value="${esc(it.exp)}" aria-label="Fecha de caducidad de ${esc(it.name)}">
        <button class="icon" data-act="gastado" title="Me lo he comido o usado">Gastado</button>
        <button class="icon" data-act="tirado" title="Se ha echado a perder">Tirado</button>
        <button class="icon" data-act="again" title="Volver a comprar" aria-label="Añadir ${esc(it.name)} a la lista">↻</button>
      </div>
    </div>`}).join("")+`</div>`}
$("#pantry").addEventListener("change",e=>{if(e.target.type!=="date"||!e.target.value)return;const id=e.target.closest(".row").dataset.id;const it=items.find(x=>x.id===id);if(it)put({...it,exp:e.target.value})});
$("#pantry").addEventListener("click",e=>{const b=e.target.closest("button[data-act]");if(!b)return;const id=b.closest(".row").dataset.id;const it=items.find(x=>x.id===id);if(!it)return;
  const a=b.dataset.act;
  if(a==="gastado"){finish(it,"gastado");toast(`${it.name}: gastado`)}
  if(a==="tirado"){finish(it,"tirado");toast(`${it.name}: anotado como desperdicio`)}
  if(a==="again")addToList({n:it.name,c:it.cat,s:it.sub,f:it.fmt,pr:it.price,d:it.days,k:it.key})});
$("#add-manual").addEventListener("click",()=>{pantryMode=true;show("lista");$("#q").placeholder="Producto que ya tienes en casa…";$("#q").focus();toast("Busca el producto que ya tienes en casa")});

// ---------- Avisos de caducidad ----------
const ALERT_KEY="midespensa.alert.dismissed";
function renderAlert(){const box=$("#alertbar");const P=byStatus("casa").map(x=>({...x,dl:daysLeft(x.exp)}));
  const exp=P.filter(x=>x.dl<0),soon=P.filter(x=>x.dl>=0&&x.dl<=1);
  let dismissed="";try{dismissed=localStorage.getItem(ALERT_KEY)||""}catch(e){}
  if((!exp.length&&!soon.length)||dismissed===iso(today())){box.hidden=true;return}
  const parts=[];if(soon.length)parts.push(`<b>Caduca hoy o mañana:</b> ${soon.map(x=>esc(x.name)).slice(0,4).join(", ")}${soon.length>4?"…":""}`);
  if(exp.length)parts.push(`<b>Caducado:</b> ${exp.map(x=>esc(x.name)).slice(0,3).join(", ")}${exp.length>3?"…":""}`);
  box.innerHTML=`<button class="go" id="alert-go">${parts.join(" · ")}</button><button class="x" id="alert-x" aria-label="Ocultar aviso hasta mañana">✕</button>`;box.hidden=false}
$("#alertbar").addEventListener("click",e=>{if(e.target.closest("#alert-x")){try{localStorage.setItem(ALERT_KEY,iso(today()))}catch(err){}$("#alertbar").hidden=true}
  else if(e.target.closest("#alert-go"))show("recetas")});

// ---------- Escanear ticket ----------
let ticketRows=[];
const leerImagen=f=>new Promise((ok,ko)=>{const img=new Image();const u=URL.createObjectURL(f);img.onload=()=>{const m=1600/Math.max(img.width,img.height);const c=document.createElement("canvas");c.width=Math.round(img.width*Math.min(1,m));c.height=Math.round(img.height*Math.min(1,m));c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);ok({mimeType:"image/jpeg",data:c.toDataURL("image/jpeg",.85).split(",")[1]})};img.onerror=ko;img.src=u});
$("#ticket-file").addEventListener("change",async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;const out=$("#ticket-out");
  if(needKey(out))return;
  out.innerHTML=`<p class="hint">Leyendo el ticket…</p>`;
  try{const data=await IA.pedirJSON({ajustes:ia,imagen:await leerImagen(f),texto:`Esta es la foto de un ticket de compra de Mercadona. Extrae SOLO los productos de alimentación y bebida. Para cada línea devuelve el nombre del producto escrito de forma clara y completa en español (desarrolla abreviaturas: "LECHE SEMI" -> "leche semidesnatada"), las unidades y el importe total de esa línea en euros. Responde solo con un array JSON: [{"nombre":"leche semidesnatada","unidades":6,"importe":5.4}]`});
    if(!Array.isArray(data)||!data.length){out.innerHTML=`<p class="hint">No he encontrado productos en la foto. Prueba con una foto más nítida y recta.</p>`;return}
    ticketRows=data.map(r=>{const m=fuzzy(String(r.nombre||""),4);return{raw:String(r.nombre||""),u:Math.max(1,Math.round(+r.unidades||1)),imp:+r.importe||0,opts:m,sel:0,on:true}});
    renderTicket()}catch(err){out.innerHTML=`<p class="hint">${esc(errTxt(err))}</p>`}});
function renderTicket(){const out=$("#ticket-out");
  out.innerHTML=ticketRows.map((r,i)=>`<div class="ticket-row" data-i="${i}">
    <input type="checkbox" id="tk-${i}" ${r.on?"checked":""} aria-label="Incluir ${esc(r.raw)}">
    <div style="min-width:0"><b>${esc(r.raw)}</b><br>${r.opts.length?`<select id="tks-${i}" aria-label="Producto de Mercadona">${r.opts.map((p,j)=>`<option value="${j}" ${j===r.sel?"selected":""}>${esc(p.n)}${p.f?" · "+esc(p.f):""}</option>`).join("")}<option value="-1" ${r.sel===-1?"selected":""}>Usar el nombre del ticket</option></select>`:`<small class="hint">Se añadirá con el nombre del ticket</small>`}</div>
    <span class="price">${r.u>1?r.u+" × ":""}${euro(r.imp)}</span></div>`).join("")+
    `<div class="bar" style="padding-top:10px"><button class="btn ghost small" id="tk-cancel">Descartar</button><button class="btn small" id="tk-ok">Añadir ${ticketRows.filter(r=>r.on).length} a «En casa»</button></div>`}
$("#ticket-out").addEventListener("change",e=>{const row=e.target.closest(".ticket-row");if(!row)return;const r=ticketRows[+row.dataset.i];
  if(e.target.type==="checkbox")r.on=e.target.checked;else r.sel=+e.target.value;renderTicket()});
$("#ticket-out").addEventListener("click",e=>{if(e.target.id==="tk-cancel"){ticketRows=[];$("#ticket-out").innerHTML="";}
  if(e.target.id==="tk-ok"){const rows=ticketRows.filter(r=>r.on);
    for(const r of rows){const p=r.sel>=0&&r.opts[r.sel]?r.opts[r.sel]:{n:r.raw.charAt(0).toUpperCase()+r.raw.slice(1),c:"Otros",d:7,k:guessKey(r.raw)};
      addToPantry({...p,pr:r.imp?r.imp/r.u:p.pr},{qty:r.u})}
    ticketRows=[];$("#ticket-out").innerHTML="";toast(`${rows.length} productos del ticket añadidos`)}});

// ---------- Recetas ----------
let rfilter="all";const servings={};
function pantryKeys(){const m=new Map();for(const it of byStatus("casa")){if(!it.key)continue;const dl=daysLeft(it.exp);if(!m.has(it.key)||m.get(it.key)>dl)m.set(it.key,dl)}return m}
function scoredRecipes(){const have=pantryKeys();
  return RECIPES.map(r=>{const miss=r.r.filter(k=>!have.has(k));const got=[...r.r,...r.o].filter(k=>have.has(k));
    const urgent=got.filter(k=>have.get(k)<=3&&have.get(k)>=0);
    const score=(r.r.length-miss.length)*10+got.length*3+urgent.length*8-miss.length*12;return{...r,miss,got,urgent,score}})
    .sort((a,b)=>b.score-a.score)}
function myRecipeCard(r){return`<article class="recipe">
      <div class="rhead"><h3>${esc(r.titulo)}</h3><button class="icon star on" data-delmy="${esc(r.id)}" aria-label="Quitar de favoritas">★</button></div>
      <div class="meta"><span class="pill mute">${esc(r.aparato||"")}</span><span>${esc(r.minutos||"?")} min</span><span>${esc(r.raciones||2)} raciones</span><span class="pill mute">Creada con IA</span></div>
      <div class="nutri" style="grid-template-columns:repeat(2,1fr)"><div><b>${esc(r.kcal_racion||"?")}</b>kcal/ración</div><div><b>${esc(r.proteina_g||"?")} g</b>proteína</div></div>
      ${(r.usa||[]).length?`<p>Usa: ${esc(r.usa.join(", "))}</p>`:""}
      <ol>${(r.pasos||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ol></article>`}
function renderRecipes(){const have=pantryKeys();
  let list=scoredRecipes();
  if(rfilter==="fav"){const fav=favRec();list=list.filter(r=>fav.includes(r.n));const mine=myRec();
    if(!list.length&&!mine.length){$("#recipes").innerHTML=`<div class="empty" style="grid-column:1/-1"><b>Aún no tienes favoritas</b><p>Toca la ★ de una receta, guarda una idea de la IA o pídele al asistente «guárdame esta receta».</p></div>`;return}
    $("#recipes").innerHTML=mine.map(myRecipeCard).join("")+list.map(r=>recipeCard(r,have)).join("");return}
  if(have.size)list=list.filter(r=>r.got.length>0);
  if(rfilter==="A"||rfilter==="M")list=list.filter(r=>r.a===rfilter);
  if(rfilter==="ready")list=list.filter(r=>!r.miss.length);
  const box=$("#recipes");
  if(!list.length){box.innerHTML=`<div class="empty" style="grid-column:1/-1"><p>${have.size?"Con este filtro no hay recetas que encajen con lo que tienes. Prueba otro filtro o pide ideas a la IA.":"Marca productos como comprados para ver recetas con lo que tienes."}</p></div>`;return}
  box.innerHTML=list.slice(0,24).map(r=>recipeCard(r,have)).join("")}
function recipeCard(r,have){const ready=!r.miss.length;const sv=servings[r.n]||r.s;const f=sv/r.s;const fav=favRec().includes(r.n);
    return`<article class="recipe" data-n="${esc(r.n)}">
      <div class="rhead"><h3>${esc(r.n)}</h3><button class="icon star ${fav?"on":""}" data-fav="1" aria-label="${fav?"Quitar de":"Guardar en"} favoritas">★</button></div>
      <div class="meta"><span class="pill mute">${r.a==="A"?"Airfryer":"Microondas"}</span><span>${r.t} min</span>${have.size?`<span class="pill ${ready?"ok":"warn"}">${ready?"Lo tienes todo":`Faltan ${r.miss.length}`}</span>`:""}${r.urgent.length?`<span class="pill bad">Aprovecha lo que caduca</span>`:""}</div>
      <div class="tags">${[...new Set([...r.r,...r.o.filter(k=>have.has(k))])].map(k=>`<span class="tag ${!have.has(k)?"miss":r.urgent.includes(k)?"urgent":""}">${esc(label(k))}</span>`).join("")}</div>
      <div class="serv"><span>Raciones</span><button class="icon" data-sv="-1" aria-label="Menos raciones">−</button><b>${sv}</b><button class="icon" data-sv="1" aria-label="Más raciones">+</button><span class="hint">${f!==1?`multiplica cantidades × ${(+f.toFixed(2)).toLocaleString("es-ES")}`:""}</span></div>
      <div class="nutri"><div><b>${r.kcal}</b>kcal</div><div><b>${r.prot} g</b>proteína</div><div><b>${r.hc} g</b>hidratos</div><div><b>${r.gr} g</b>grasa</div></div>
      <ol>${r.p.map(s=>`<li>${esc(s)}</li>`).join("")}</ol>
      ${r.miss.length&&have.size?`<button class="btn ghost small" data-miss="${esc(r.miss.join(","))}">Añadir lo que falta a la lista</button>`:""}
    </article>`}
$("#rfilter").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;rfilter=b.dataset.f;for(const x of $("#rfilter").children)x.setAttribute("aria-pressed",x===b);renderRecipes()});
function productForKey(k){return CATALOG.filter(p=>p.k===k).sort((a,b)=>(a.pr||99)-(b.pr||99))[0]}
function saveMyRecipe(r){const s=settings();const rec={id:uid(),titulo:String(r.titulo||"Receta"),aparato:String(r.aparato||""),minutos:+r.minutos||0,raciones:+r.raciones||2,kcal_racion:+r.kcal_racion||0,proteina_g:+r.proteina_g||0,usa:(r.usa||r.ingredientes||[]).map(String).slice(0,30),pasos:(r.pasos||[]).map(String).slice(0,20)};
  put({...s,myRec:[rec,...myRec()]});return rec}
$("#recipes").addEventListener("click",e=>{const fv=e.target.closest("button[data-fav]");
  if(fv){const n=fv.closest(".recipe").dataset.n;const s=settings();const on=favRec().includes(n);put({...s,favRec:on?favRec().filter(x=>x!==n):[...favRec(),n]});toast(on?"Quitada de favoritas":"Guardada en favoritas ★");return}
  const dm=e.target.closest("button[data-delmy]");
  if(dm){const s=settings();put({...s,myRec:myRec().filter(x=>x.id!==dm.dataset.delmy)});toast("Receta quitada de favoritas");return}
  const sv=e.target.closest("button[data-sv]");
  if(sv){const n=sv.closest(".recipe").dataset.n;const r=RECIPES.find(x=>x.n===n);servings[n]=Math.max(1,Math.min(12,(servings[n]||r.s)+ +sv.dataset.sv));renderRecipes();return}
  const b=e.target.closest("button[data-miss]");if(!b)return;
  for(const k of b.dataset.miss.split(",")){const p=productForKey(k);addToList(p||{n:label(k).charAt(0).toUpperCase()+label(k).slice(1),c:"Otros",d:7,k},true)}toast("Ingredientes añadidos a la lista")});
$("#ask-ai").addEventListener("click",async()=>{const out=$("#ai-out");const btn=$("#ask-ai");
  const P=byStatus("casa").map(x=>({n:x.name,d:daysLeft(x.exp)})).filter(x=>x.d>=0).sort((a,b)=>a.d-b.d);
  if(!P.length){out.textContent="Primero añade productos a «En casa».";return}
  if(needKey(out))return;
  btn.disabled=true;out.className="hint";out.textContent="Pensando platos…";
  try{const data=await IA.pedirJSON({ajustes:ia,texto:`Eres un cocinero casero español. Solo tengo MICROONDAS y AIRFRYER (no hay fuego, vitrocerámica ni horno). Tengo en casa (días hasta que caduca):\n${P.slice(0,60).map(x=>`- ${x.n}: ${x.d} días`).join("\n")}\nSupón aceite, sal y especias básicas. Propón 3 platos sencillos hechos solo con microondas o airfryer que usen sobre todo lo que caduca antes. Responde solo con JSON: [{"titulo":"","aparato":"Airfryer|Microondas","minutos":0,"raciones":2,"kcal_racion":0,"proteina_g":0,"usa":["producto"],"pasos":["paso con tiempo y temperatura"]}]`});
    out.className="";out.innerHTML="";out.style.cssText="display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))";
    for(const r of (Array.isArray(data)?data:[]).slice(0,3)){const art=document.createElement("article");art.className="recipe";
      const sb=document.createElement("button");sb.className="btn ghost small";sb.textContent="★ Guardar en favoritas";sb.onclick=()=>{saveMyRecipe(r);sb.disabled=true;sb.textContent="★ Guardada";toast("Receta guardada en favoritas")};
      const h=document.createElement("h3");h.textContent=r.titulo||"Plato";
      const meta=document.createElement("div");meta.className="meta";meta.textContent=`${r.aparato||""} · ${r.minutos||"?"} min · ${r.raciones||2} raciones · ~${r.kcal_racion||"?"} kcal y ${r.proteina_g||"?"} g de proteína por ración`;
      const usa=document.createElement("p");usa.textContent="Usa: "+(r.usa||[]).join(", ");
      const ol=document.createElement("ol");for(const s of (r.pasos||[])){const li=document.createElement("li");li.textContent=s;ol.appendChild(li)}
      art.append(h,meta,usa,ol,sb);out.appendChild(art)}
  }catch(e){out.className="hint";out.style.cssText="";out.textContent=errTxt(e)}
  btn.disabled=false});

// ---------- Asistente ----------
let turns=[];let chatBusy=false;
function addMsg(cls,text){const d=document.createElement("div");d.className="msg "+cls;d.textContent=text;$("#chat").appendChild(d);d.scrollIntoView({block:"end",behavior:"smooth"});return d}
function chatContext(){const P=byStatus("casa").map(x=>`${x.name}${x.fmt?` (${x.fmt})`:""}: caduca en ${daysLeft(x.exp)} días`).slice(0,80);
  const L=byStatus("lista").map(x=>`${x.qty||1} × ${x.name}${x.fmt?` (${x.fmt})`:""}${x.price?` ${euro(x.price*(x.qty||1))}`:""}`).slice(0,80);
  const s=settings();const spent=monthSpend(monthKey(iso(today())));
  return `Hoy es ${new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}.
Eres el asistente de cocina y compra de la app «Mi Despensa». Respondes en español, breve y práctico. Formato: **negrita** y listas con "•". Sin tablas ni títulos con #.
REGLA DE COCINA: el usuario solo tiene MICROONDAS y AIRFRYER. Todas las recetas y técnicas deben hacerse solo con esos dos aparatos (indica tiempos y temperaturas). Nunca propongas fuego, vitro, sartén ni horno.
Para precios o productos usa la herramienta buscar_productos (catálogo real de Mercadona). Si el usuario te pide añadir algo a la lista, usa anadir_a_lista con el nombre exacto que devolvió buscar_productos.
Cuando des una receta, incluye raciones y una estimación de kcal y proteína por ración.
EN CASA (${P.length}):\n${P.join("\n")||"(nada)"}
LISTA DE LA COMPRA (${L.length}):\n${L.join("\n")||"(vacía)"}
Gasto este mes: ${euro(spent)}${s.budget?` de un presupuesto de ${euro(s.budget)}`:""}.`}
const TOOLS=[
 {name:"buscar_productos",description:"Busca en el catálogo real de Mercadona. Devuelve hasta 10 productos con nombre exacto, formato, precio en euros y sección. Usa palabras clave cortas, p. ej. 'leche semidesnatada' o 'pechuga pollo'.",
  parameters:{type:"object",properties:{texto:{type:"string",description:"palabras clave del producto"}},required:["texto"]},
  execute:(i)=>{const r=fuzzy(String(i.texto||""),10);if(!r.length)return"Sin resultados. Prueba con otras palabras.";return r.map(p=>({nombre:p.n,formato:p.f,precio:p.pr,seccion:p.s}))}},
 {name:"anadir_a_lista",description:"Añade un producto a la lista de la compra del usuario. Usa el nombre exacto de buscar_productos y, si lo tienes, el formato. Devuelve confirmación.",
  parameters:{type:"object",properties:{nombre:{type:"string"},formato:{type:"string"},cantidad:{type:"number"}},required:["nombre"]},
  execute:(i)=>{const n=String(i.nombre||"").trim();if(!n)throw new Error("Falta el nombre");
    let p=CATALOG.find(x=>x.n===n&&(!i.formato||x.f===String(i.formato)))||CATALOG.find(x=>x.n===n)||fuzzy(n,1)[0];
    if(!p)p={n:n.charAt(0).toUpperCase()+n.slice(1),c:"Otros",d:7,k:guessKey(n)};
    const q=Math.max(1,Math.min(20,Math.round(+i.cantidad||1)));for(let k=0;k<q;k++)addToList(p,true);
    return `Añadido: ${q} × ${p.n}${p.f?` (${p.f})`:""}${p.pr?`, ${euro(p.pr)} cada uno`:""}`}},
 {name:"recetas_con_lo_que_tengo",description:"Devuelve las recetas de microondas y airfryer de la app que mejor encajan con lo que hay en casa, con lo que falta para cada una.",
  execute:()=>scoredRecipes().slice(0,8).map(r=>({receta:r.n,aparato:r.a==="A"?"airfryer":"microondas",minutos:r.t,raciones:r.s,kcal_racion:r.kcal,falta:r.miss.map(label),pasos:r.p}))},
 {name:"guardar_receta_favorita",description:"Guarda una receta en las favoritas del usuario (Recetas → ★ Favoritas). Úsala cuando el usuario pida guardar una receta. Para una receta de la app basta el título exacto.",
  parameters:{type:"object",properties:{titulo:{type:"string"},aparato:{type:"string",description:"Airfryer o Microondas"},minutos:{type:"number"},raciones:{type:"number"},kcal_racion:{type:"number"},proteina_g:{type:"number"},ingredientes:{type:"array",items:{type:"string"}},pasos:{type:"array",items:{type:"string"}}},required:["titulo"]},
  execute:(i)=>{const t=String(i.titulo||"").trim();const app=RECIPES.find(r=>norm(r.n)===norm(t));
    if(app){if(!favRec().includes(app.n))put({...settings(),favRec:[...favRec(),app.n]});return `Guardada en favoritas: ${app.n}`}
    if(!(i.pasos||[]).length)throw new Error("Faltan los pasos de la receta");
    const r=saveMyRecipe(i);return `Guardada en favoritas: ${r.titulo}`}},
 {name:"ver_recetas_favoritas",description:"Devuelve las recetas favoritas guardadas por el usuario.",
  execute:()=>({de_la_app:favRec(),creadas:myRec().map(r=>({titulo:r.titulo,aparato:r.aparato,minutos:r.minutos,pasos:r.pasos}))})}
];
function fmtBot(el,t){el.innerHTML=esc(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>")}
async function sendChat(text){text=text.trim();if(!text||chatBusy)return;
  chatBusy=true;$("#chat-send").disabled=true;$("#suggest").hidden=true;
  addMsg("me",text);
  const bot=addMsg("bot","Pensando…");
  if(!ia.apiKey){bot.className="msg note";needKey(bot);chatBusy=false;$("#chat-send").disabled=false;return}
  turns.push({rol:"user",texto:text});
  try{const res=await IA.conversar({ajustes:ia,sistema:chatContext(),historial:(()=>{const h=turns.slice(-16);while(h.length&&h[0].rol!=="user")h.shift();return h})(),herramientas:TOOLS});
    fmtBot(bot,res);turns.push({rol:"model",texto:res});bot.scrollIntoView({block:"end",behavior:"smooth"});
  }catch(e){turns.pop();bot.className="msg note";bot.textContent=errTxt(e)}
  chatBusy=false;$("#chat-send").disabled=false}
$("#composer").addEventListener("submit",e=>{e.preventDefault();const t=$("#chat-in");const v=t.value;t.value="";sendChat(v)});
$("#chat-in").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#composer").requestSubmit()}});
$("#suggest").addEventListener("click",e=>{const b=e.target.closest("button");if(b)sendChat(b.textContent)});
$("#chat-reset").addEventListener("click",()=>{turns=[];$("#chat").innerHTML="";$("#suggest").hidden=false;greet()});
function greet(){addMsg("bot","¡Hola! Conozco lo que tienes en casa y tu lista. Pregúntame qué cocinar con microondas o airfryer, precios de Mercadona o pídeme que te prepare la compra.")}

// ---------- Cuentas: gasto y desperdicio ----------
const spendOf=x=>(x.price||0)*(x.qty||1);
function monthSpend(mk){return items.filter(x=>(x.status==="casa"||x.status==="gastado"||x.status==="tirado")&&monthKey(x.bought)===mk).reduce((s,x)=>s+spendOf(x),0)}
function renderCuentas(){const s=settings();const mk=monthKey(iso(today()));const spent=monthSpend(mk);
  const pct=s.budget?Math.min(100,spent/s.budget*100):0;
  const d=today();const dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();const proj=spent/d.getDate()*dim;
  $("#budget-card").innerHTML=`<div class="bar"><div><b style="font-family:var(--font-display);font-size:1.8rem">${euro(spent)}</b> <span class="hint">${s.budget?`de ${euro(s.budget)}`:"gastado este mes"}</span></div>
    <label class="hint" for="budget-in">Presupuesto mensual <input class="field" id="budget-in" type="number" min="0" step="10" value="${s.budget||""}" placeholder="300" style="width:110px;padding:6px 10px;display:inline-block"> €</label></div>
    ${s.budget?`<div class="meter"><i class="${spent>s.budget?"over":""}" style="width:${pct}%"></i></div><p class="hint">${spent>s.budget?`Te has pasado ${euro(spent-s.budget)}.`:`Te quedan ${euro(s.budget-spent)}.`} A este ritmo acabarás el mes en ${euro(proj)}.</p>`:`<p class="hint">Pon un presupuesto para ver cuánto te queda. Se cuenta lo que marcas como comprado, con precios de Mercadona o del ticket.</p>`}`;
  const months=[];for(let i=5;i>=0;i--){const m=new Date(d.getFullYear(),d.getMonth()-i,1);months.push({k:iso(m).slice(0,7),l:m.toLocaleDateString("es-ES",{month:"short"})})}
  const vals=months.map(m=>monthSpend(m.k));const max=Math.max(...vals,s.budget||0,1);
  $("#months").innerHTML=months.map((m,i)=>`<div><span>${vals[i]?Math.round(vals[i])+" €":""}</span><span class="b ${i===5?"cur":""}" style="height:${vals[i]/max*100}%"></span><span>${m.l}</span></div>`).join("");
  const done=items.filter(x=>(x.status==="gastado"||x.status==="tirado")&&monthKey(x.done)===mk);
  const thrown=done.filter(x=>x.status==="tirado");const rate=done.length?Math.round(thrown.length/done.length*100):0;
  $("#waste-sum").innerHTML=`<div class="stat bad"><b>${thrown.length}</b><small>Tirados este mes</small></div><div class="stat bad"><b>${euro(thrown.reduce((s,x)=>s+spendOf(x),0))}</b><small>Dinero tirado</small></div><div class="stat ${rate>20?"warn":"ok"}"><b>${rate}%</b><small>De lo que acabas, se tira</small></div><div class="stat ok"><b>${done.length-thrown.length}</b><small>Aprovechados</small></div>`;
  const all=byStatus("tirado");const cnt={};for(const x of all){cnt[x.name]=(cnt[x.name]||0)+1}
  const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,6);
  $("#waste-list").innerHTML=top.length?`<div class="list"><div class="group-h">Lo que más tiras</div>${top.map(([n,c])=>`<div class="row" style="grid-template-columns:1fr auto"><div class="name"><b>${esc(n)}</b></div><span class="pill bad">${c} ${c===1?"vez":"veces"}</span></div>`).join("")}</div><p class="hint">Consejo: compra menos cantidad de estos productos o elige formatos más pequeños.</p>`:`<div class="empty"><p>Cuando marques algo como «Tirado» en «En casa» verás aquí qué productos se te echan a perder más.</p></div>`}
function renderHistory(){const H=items.filter(x=>x.status==="gastado"||x.status==="tirado").sort((a,b)=>(b.done||"").localeCompare(a.done||"")).slice(0,25);
  $("#history").innerHTML=H.length?`<div class="list">${H.map(it=>`<div class="row" style="grid-template-columns:1fr auto" data-id="${esc(it.id)}">
    <div class="name"><b>${esc(it.name)}${(it.qty||1)>1?` ×${it.qty}`:""}</b><small><span class="pill ${it.status==="tirado"?"bad":"ok"}">${it.status==="tirado"?"Tirado":"Gastado"}</span> el ${fmtDate(it.done)}${it.exp?` · caducaba el ${fmtDate(it.exp)}`:""}</small></div>
    <button class="btn ghost small" data-back="1">Devolver a casa</button></div>`).join("")}</div>`:`<div class="empty"><p>Aquí aparecerá lo que marques como «Gastado» o «Tirado».</p></div>`}
$("#history").addEventListener("click",e=>{const b=e.target.closest("button[data-back]");if(!b)return;const it=items.find(x=>x.id===b.closest(".row").dataset.id);if(!it)return;
  const o={...it,status:"casa"};delete o.done;put(o);toast(`${it.name} ha vuelto a «En casa»`)});
$("#v-mas").addEventListener("change",e=>{if(e.target.id==="budget-in"){put({...settings(),budget:Math.max(0,+e.target.value||0)});toast("Presupuesto guardado")}});

// ---------- Ejemplo ----------
function loadDemo(){if(!catalogReady){toast("Espera a que cargue el catálogo");return}
  const pick=q=>fuzzy(q,1)[0];
  const demo=[["leche semidesnatada","lista"],["pechuga pollo","lista"],["pimiento rojo","lista"],["arroz redondo","lista"],["platano","lista"],
    ["huevos","casa",9],["patata","casa",20],["calabacin","casa",2],["champiñon","casa",1],["yogur natural","casa",-1],["bacon taco","casa",6],["tomate frito","casa",200]];
  for(const [q,s,dd] of demo){const p=pick(q);if(!p)continue;if(s==="lista")addToList(p,true);else addToPantry(p,{exp:addDays(dd)})}
  toast("Ejemplo cargado. Bórralo cuando quieras.")}

// ---------- Pestañas ----------
let tab="lista";
function show(t){if(!$("#v-"+t))t="lista";tab=t;for(const b of document.querySelectorAll(".tabs button"))b.setAttribute("aria-selected",b.dataset.tab===t);
  for(const v of ["lista","casa","recetas","chat","mas"])$("#v-"+v).hidden=t!==v;
  if(location.hash!=="#"+t)history.replaceState(null,"","#"+t);window.scrollTo(0,0);render()}
document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(b)show(b.dataset.tab)});
document.addEventListener("click",e=>{const g=e.target.closest("[data-goto]");if(g){show(g.dataset.goto);if(g.dataset.goto==="mas")setTimeout(()=>$("#ajustes").scrollIntoView(),50)}});

function render(){const L=byStatus("lista").length;const P=byStatus("casa");
  $("#c-lista").textContent=L||"";const urgent=P.filter(x=>daysLeft(x.exp)<=1).length;const c=$("#c-casa");c.textContent=urgent?`${urgent} ⚠`:(P.length||"");c.classList.toggle("alert",!!urgent);
  renderAlert();
  if(tab==="lista"){renderBrowse();renderList()}if(tab==="casa")renderPantry();if(tab==="recetas")renderRecipes();if(tab==="mas"){renderCuentas();renderHistory();renderAjustes()}}

// ---------- Escáner de código de barras ----------
let scanMode="lista",scanStream=null,scanTimer=null,scanBusy=false,lastCode="";
function scanTarget(p){if(scanMode==="casa"){addToPantry(p)}else addToList(p)}
async function openScanner(mode){scanMode=mode;lastCode="";$("#scan-title").textContent=mode==="casa"?"Escanear lo que tienes en casa":"Escanear para la lista";
  $("#scan-res").innerHTML="";$("#scan-code").value="";$("#scan").hidden=false;$("#scan-cam").hidden=false;
  const msg=$("#scan-msg");
  if(!("BarcodeDetector" in window)||!navigator.mediaDevices?.getUserMedia){$("#scan-cam").hidden=true;msg.textContent="Este navegador no puede leer códigos con la cámara. Escribe los números que hay debajo del código de barras.";return}
  let det;try{const f=await BarcodeDetector.getSupportedFormats();det=new BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e"].filter(x=>f.includes(x))})}catch(e){det=null}
  if(!det){$("#scan-cam").hidden=true;msg.textContent="Tu móvil no puede leer códigos de barras aquí. Escribe los números.";return}
  try{scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280}},audio:false})}
  catch(e){$("#scan-cam").hidden=true;msg.textContent="No tengo permiso para usar la cámara. Actívalo en los ajustes de Chrome o escribe los números del código.";return}
  const v=$("#scan-video");v.srcObject=scanStream;await v.play().catch(()=>{});
  msg.textContent="Apunta al código de barras del envase.";
  scanTimer=setInterval(async()=>{if(scanBusy||v.readyState<2)return;scanBusy=true;
    try{const r=await det.detect(v);const c=r[0]?.rawValue;if(c&&c!==lastCode){lastCode=c;navigator.vibrate?.(60);await handleCode(c)}}catch(e){}
    scanBusy=false},250)}
function closeScanner(){clearInterval(scanTimer);scanTimer=null;scanStream?.getTracks().forEach(t=>t.stop());scanStream=null;$("#scan").hidden=true;render()}
function hitCard(p,code){return`<div class="scan-hit"><div><b>${esc(p.n)}</b><br><small class="hint">${esc(p.f||"")}${p.pr?" · "+euro(p.pr):""}${code?" · "+esc(code):""}</small></div>
  <div class="bar" style="justify-content:flex-start"><button class="btn small" data-hit="${CATALOG.indexOf(p)}">${scanMode==="casa"?"Añadir a «En casa»":"Añadir a la lista"}</button></div></div>`}
async function handleCode(raw){let code=String(raw).replace(/\D/g,"");if(code.length===12)code="0"+code;
  const res=$("#scan-res");$("#scan-msg").textContent=`Código ${code}`;
  const p=EAN.get(code)||EAN.get(code.replace(/^0/,""));
  if(p){res.innerHTML=hitCard(p,"");return}
  res.innerHTML=`<p class="hint">No está en el catálogo de Mercadona. Buscando el producto…</p>`;
  let name="";try{const r=await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,quantity`);const j=await r.json();
    if(j.status===1)name=[j.product.product_name,j.product.brands].filter(Boolean).join(" ").trim()}catch(e){}
  if(!name){res.innerHTML=`<p class="hint">No encuentro este código. Busca el producto por su nombre en la lista.</p>`;return}
  const opts=fuzzy(name,3);
  res.innerHTML=`<p class="hint">Es <b>${esc(name)}</b>. Lo más parecido en Mercadona:</p>`+opts.map(o=>hitCard(o,"")).join("")+
    `<div class="scan-hit"><b>${esc(name)}</b><div class="bar" style="justify-content:flex-start"><button class="btn ghost small" data-hitname="${esc(name)}">Añadir con este nombre</button></div></div>`}
$("#scan-res").addEventListener("click",e=>{const b=e.target.closest("button[data-hit],button[data-hitname]");if(!b)return;
  const p=b.dataset.hit!==undefined?CATALOG[+b.dataset.hit]:{n:b.dataset.hitname,c:"Otros",d:7,k:guessKey(b.dataset.hitname)};
  scanTarget(p);$("#scan-res").innerHTML=`<p class="hint">✅ ${esc(p.n)} añadido. Escanea el siguiente o cierra.</p>`;lastCode=""});
$("#scan-form").addEventListener("submit",e=>{e.preventDefault();const v=$("#scan-code").value.trim();if(v.replace(/\D/g,"").length>=8)handleCode(v);else $("#scan-msg").textContent="Escribe los 8 o 13 números del código."});
$("#scan-close").addEventListener("click",closeScanner);
$("#scan").addEventListener("click",e=>{if(e.target.id==="scan")closeScanner()});
document.addEventListener("click",e=>{const b=e.target.closest("[data-scan]");if(b)openScanner(b.dataset.scan)});

// ---------- Ajustes, tema y copias ----------
function renderAjustes(){const k=$("#api-key");if(document.activeElement!==k)k.value=ia.apiKey||"";
  if(!$("#api-status").textContent)$("#api-status").textContent=ia.apiKey?`Clave guardada${ia.modelo?`. Modelo: ${ia.modelo}`:""}.`:"Sin clave: la lista, la despensa y las recetas funcionan igual; la IA no.";
  let t="auto";try{t=localStorage.getItem("midespensa.tema")||"auto"}catch(e){}
  for(const b of $("#tema").children)b.setAttribute("aria-pressed",b.dataset.t===t);
  $("#version").textContent=`Mi Despensa ${VERSION_APP} · ${CATALOG.length} productos de Mercadona`}
$("#api-show").addEventListener("click",()=>{const k=$("#api-key");k.type=k.type==="password"?"text":"password";$("#api-show").textContent=k.type==="password"?"Mostrar":"Ocultar"});
$("#api-save").addEventListener("click",async()=>{const st=$("#api-status");ia.apiKey=$("#api-key").value.trim();IA.guardarAjustesIA(ia);
  if(!ia.apiKey){st.textContent="Clave borrada.";return}
  st.textContent="Probando la clave…";$("#api-save").disabled=true;
  try{const m=await IA.probarClave(ia);st.textContent=`✅ ¡Funciona! Clave guardada. Modelo: ${m}`}catch(e){st.textContent="❌ "+errTxt(e)}
  $("#api-save").disabled=false});
$("#tema").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const t=b.dataset.t;
  try{localStorage.setItem("midespensa.tema",t)}catch(err){}
  if(t==="auto")delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t;renderAjustes()});
$("#backup").addEventListener("click",()=>{const blob=new Blob([JSON.stringify({app:"mi-despensa",fecha:new Date().toISOString(),items},null,1)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`mi-despensa-${iso(today())}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast("Copia descargada")});
$("#restore").addEventListener("change",async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
  try{const d=JSON.parse(await f.text());if(!Array.isArray(d.items))throw 0;items=d.items;saveLocal();render();toast(`Copia restaurada: ${items.filter(isProd).length} productos`)}catch(err){toast("Ese archivo no es una copia de Mi Despensa")}});
window.addEventListener("hashchange",()=>{const t=location.hash.slice(1);if(t&&t!==tab&&$("#v-"+t))show(t)});
{const h=location.hash.slice(1);if(h&&$("#v-"+h))tab=h;else try{const t=localStorage.getItem("midespensa.tab");if(t&&$("#v-"+t))tab=t}catch(e){}}
show(tab);greet();try{localStorage.removeItem("midespensa.tab")}catch(e){}loadCatalog();initStore();
if("serviceWorker" in navigator&&location.protocol!=="file:"){navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).catch(()=>{})}
