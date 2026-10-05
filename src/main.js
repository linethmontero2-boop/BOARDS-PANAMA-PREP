import "./style.css";
import { createClient } from "@supabase/supabase-js";

document.addEventListener("DOMContentLoaded", initApp);

const STORAGE_KEY = "boardsPanamaPrep.v01";
const LEGACY_STORAGE_CLAIM_KEY = `${STORAGE_KEY}.legacyClaimedBy`;
const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
const supabase = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

const CLOUD_STATE_TABLE = "boards_user_state";
const CLOUD_STATE_SCHEMA_VERSION = 1;
const CLOUD_SYNC_DEBOUNCE_MS = 750;

const DEFAULT_STUDY_ORDER = [1,2,3,4,5,6,7,8];
const DAY_KEY_BY_INDEX = {0:"sun",1:"mon",2:"tue",3:"wed",4:"thu",5:"fri",6:"sat"};
const SYSTEMS = ["Cardiovascular","Respiratorio","Gastroenterología","Hematología","Neurología","Psiquiatría","Renal / Genitourinario","Ginecología","Obstetricia","Pediatría","Inmunología","Reumatología","Endocrinología","Dermatología","Bioestadística / Epidemiología","Ética / Salud Pública"];
const ALL_SESSION_SYSTEMS = ["Mixto / Integrado",...SYSTEMS];
const MODULE_SYSTEM_OPTIONS = {
  1:["Cardiovascular"], 2:["Respiratorio"], 3:["Gastroenterología","Hematología"], 4:["Neurología","Psiquiatría"],
  5:["Renal / Genitourinario","Ginecología"], 6:["Obstetricia","Pediatría"],
  7:["Inmunología","Reumatología","Bioestadística / Epidemiología","Ética / Salud Pública"], 8:["Mixto / Integrado",...SYSTEMS]
};
const ERROR_TYPES = ["Déficit de conocimiento","Interpretación clínica","Confusión entre diagnósticos","Error de algoritmo","Error de Next Best Step","Error farmacológico","Lectura incompleta","Sobreinterpretación","Cambio injustificado de respuesta","Falta de reconocimiento de patrón"];
const POPULATION_CONTEXTS = ["Adulto","Pediatría","Embarazo","Neonatal","Geriatría","No aplica / General","No determinado"];
const MODEL_PRICING_PER_MILLION = {
  "gpt-6-sol": {input:2,cachedInput:.20,output:10},
  "gpt-6.1-sol": {input:2,cachedInput:.10,output:10}
};
const STUDY_MODULES = [
  {id:1,title:"Cardiovascular y enfermedades vasculares",shortTitle:"Cardiovascular",weight:"CV oficial: 10–12%",description:"Síndrome coronario, insuficiencia cardíaca, arritmias, valvulopatías y enfermedad vascular.",topics:["Dolor torácico y síndrome coronario agudo","Insuficiencia cardíaca","Arritmias y alteraciones de conducción","Valvulopatías","Hipertensión arterial","Pericarditis y taponamiento","Cardiomiopatías","Aorta y enfermedad vascular periférica"]},
  {id:2,title:"Neumología y aparato respiratorio",shortTitle:"Respiratorio",weight:"Respiratorio oficial: 9–11%",description:"Enfermedad obstructiva, infecciones, insuficiencia respiratoria, pleura y circulación pulmonar.",topics:["Asma","EPOC","Neumonía","Tuberculosis","Embolia pulmonar","Neumotórax y derrame pleural","Enfermedad pulmonar intersticial","Insuficiencia respiratoria"]},
  {id:3,title:"Gastroenterología, nutrición y hematología",shortTitle:"Gastro + Hemato",weight:"GI 8–10% · Sangre 4–5%",description:"Patología gastrointestinal, hepatobiliar, pancreática, anemias, coagulación y neoplasias hematológicas.",topics:["Sangrado gastrointestinal","Enfermedad ácido-péptica","Enfermedad inflamatoria intestinal","Hepatitis y cirrosis","Patología biliar","Pancreatitis","Anemias","Coagulopatías y trombocitopenia"]},
  {id:4,title:"Neurología, órganos de los sentidos y trastornos mentales",shortTitle:"Neuro + Psiquiatría",weight:"Neuro 8–10% · Mental 4–5%",description:"Evento cerebrovascular, convulsiones, cefalea, neurodegeneración, psiquiatría y urgencias neurológicas.",topics:["Evento cerebrovascular","Convulsiones","Cefaleas","Alteración del estado mental","Enfermedad neuromuscular","Trastornos del movimiento","Depresión y bipolaridad","Psicosis, ansiedad y sustancias"]},
  {id:5,title:"Nefrología, genitourinario y ginecología",shortTitle:"Renal + Ginecología",weight:"Renal 7–9% · Gine 7–9%",description:"Lesión renal, electrolitos, ácido-base, urología, menstruación, fertilidad y patología ginecológica.",topics:["Lesión renal aguda","Enfermedad renal crónica","Glomerulopatías","Electrolitos","Ácido-base","Infección urinaria y litiasis","Sangrado uterino anormal","Neoplasias ginecológicas"]},
  {id:6,title:"Obstetricia y pediatría",shortTitle:"Obstetricia + Pediatría",weight:"Embarazo oficial: 4–5%",description:"Control prenatal, complicaciones obstétricas, parto, puerperio y pediatría clínica transversal.",topics:["Control prenatal","Hipertensión del embarazo","Diabetes gestacional","Hemorragia obstétrica","Trabajo de parto","Complicaciones del puerperio","Crecimiento y desarrollo","Urgencias pediátricas"]},
  {id:7,title:"Inmunología, reumatología, bioestadística, ética y salud pública",shortTitle:"Integración",weight:"Inmuno 4–5% · MSK 7–9% · Principios 5–7%",description:"Autoinmunidad, inmunodeficiencias, reumatología, epidemiología, decisiones clínicas y ética.",topics:["Anafilaxia","Inmunodeficiencias y VIH","Lupus y artritis reumatoide","Vasculitis","Sensibilidad y especificidad","Diseños de estudio","Consentimiento y capacidad","Salud pública y prevención"]},
  {id:8,title:"Consolidación, High-Yield y simulacros",shortTitle:"Consolidación",weight:"Repaso integrado",description:"Corrección de puntos ciegos, revisión acumulativa, bloques mixtos y simulacros finales.",topics:["Puntos ciegos prioritarios","Algoritmos de emergencia","Prevención y screening","Farmacología High-Yield","Bloque mixto 1","Bloque mixto 2","Simulacro","Repaso final"]}

];
const MODULE_PLANNING_WEIGHTS = {1:11,2:10,3:14,4:14,5:16,6:13,7:12};
const PLAN_PRESETS = {
  custom:{label:"Personalizado"},
  "8w":{label:"8 semanas",weeks:8},
  "12w":{label:"12 semanas",weeks:12},
  "6m":{label:"6 meses",months:6},
  "1y":{label:"1 año",years:1}
};
const PLAN_PHASE_PROFILES = [
  {maxDays:70,key:"intensive",label:"Intensivo",description:"Una vuelta completa por sistemas y cierre de consolidación.",phases:[
    {id:"foundation",label:"Base por sistemas",ratio:.85,mode:"foundation",description:"Primera vuelta de alto rendimiento por los sistemas principales."},
    {id:"consolidation",label:"Consolidación final",ratio:.15,mode:"consolidation",description:"Bloques mixtos, algoritmos y repaso final."}
  ]},
  {maxDays:120,key:"extended",label:"Extendido",description:"Primera vuelta, refuerzo adaptativo y consolidación final.",phases:[
    {id:"foundation",label:"Base por sistemas",ratio:.60,mode:"foundation",description:"Primera vuelta completa por sistemas."},
    {id:"reinforcement",label:"Refuerzo adaptativo",ratio:.25,mode:"reinforcement",description:"Segunda exposición con más tiempo para los sistemas débiles."},
    {id:"consolidation",label:"Consolidación final",ratio:.15,mode:"consolidation",description:"Bloques mixtos, High-Yield y simulación."}
  ]},
  {maxDays:240,key:"longitudinal",label:"Longitudinal",description:"Preparación espaciada con revisitas adaptativas antes del modo examen.",phases:[
    {id:"foundation",label:"Base por sistemas",ratio:.45,mode:"foundation",description:"Primera vuelta estructurada por sistemas."},
    {id:"reinforcement",label:"Refuerzo adaptativo",ratio:.35,mode:"reinforcement",description:"Revisita de sistemas priorizada por rendimiento."},
    {id:"exam",label:"Modo examen",ratio:.20,mode:"exam",description:"Banco mixto, simulaciones y revisión final."}
  ]},
  {maxDays:Infinity,key:"longitudinal-plus",label:"Longitudinal Plus",description:"Ciclos múltiples con repetición espaciada, refuerzo de puntos ciegos y cierre en modo examen.",phases:[
    {id:"foundation",label:"Base por sistemas",ratio:.35,mode:"foundation",description:"Primera vuelta completa y construcción de base clínica."},
    {id:"reinforcement",label:"Refuerzo adaptativo",ratio:.30,mode:"reinforcement",description:"Segunda exposición priorizada por rendimiento."},
    {id:"adaptive",label:"Integración adaptativa",ratio:.20,mode:"adaptive",description:"Bloques mixtos intercalados con los sistemas más débiles."},
    {id:"exam",label:"Modo examen",ratio:.15,mode:"exam",description:"Simulaciones, errores persistentes y consolidación final."}
  ]}
];
const FALLBACK_MODULE_TASKS = [{id:"prebank",title:"Repaso Pre-Bank"},{id:"questions",title:"Banco de preguntas"},{id:"review",title:"Corrección profunda"},{id:"anki",title:"Flashcards"},{id:"highyield",title:"Cierre High-Yield"}];
const DAILY_MANUAL_TASKS = [
  {id:"prebank",title:"Repaso Pre-Bank",description:"Completa el repaso asignado para esta jornada."},
  {id:"review",title:"Corrección profunda",description:"Revisa preguntas incorrectas y dudosas."},
  {id:"anki",title:"Flashcards de errores",description:"Convierte únicamente errores relevantes en tarjetas."},
  {id:"highyield",title:"Cierre High-Yield",description:"Repasa algoritmos y reglas antes de terminar."}
];
const PAGE_META = {
  dashboard:{title:"Dashboard",subtitle:"Tu centro de preparación para IFOM / Step 2 CK"}, today:{title:"Estudiar hoy",subtitle:"Tu sesión operativa de BOARDS"},
  planner:{title:"Study Planner",subtitle:"Orden, calendario y metas de preparación"}, prebank:{title:"Pre-Bank",subtitle:"Repaso integrado antes de iniciar el banco"},
  ai:{title:"BOARDS AI",subtitle:"Clinical Review Engine · V0.6B.1"}, errors:{title:"Error Notebook",subtitle:"Convierte fallos en aprendizaje reutilizable"},
  performance:{title:"Rendimiento",subtitle:"Analiza tus patrones y puntos ciegos"}, settings:{title:"Configuración",subtitle:"Fechas, preferencias y respaldo"}
};

let authSession = null;
let authUser = null;
let authMode = "login";
let authBusy = false;
let authRecoveryMode = false;
let coreAppInitialized = false;
let appSessionReady = false;

let cloudSyncReady = false;
let cloudSyncTimer = null;
let cloudSyncInFlight = null;
let cloudSyncQueued = false;
let cloudLastSyncedAt = null;
let cloudLastError = null;

let state = getDefaultState();
let toastTimer = null, draggedModuleId = null, activeStudyDateKey = todayKey(), editingSessionId = null;
let aiInputMode = "image", aiImageFile = null, aiImagePreviewUrl = "", aiContextDateKey = todayKey(), aiLinkedSessionId = "", aiSelectedSystem = "", aiCurrentAnalysis = null, aiQuizRuntime = null, aiBusy = false;

function getDefaultState(){return {version:"0.6B.1",updatedAt:null,theme:"light",currentPage:"dashboard",currentModuleId:1,studyMode:"recommended",studyOrder:[...DEFAULT_STUDY_ORDER],profile:{name:"",startDate:"",examDate:"",dailyQuestionGoal:40,studyDays:["mon","tue","wed","thu","fri","sat"],planPreset:"custom"},plannerTasks:{},prebankCompleted:{},dailyTasks:{},bankSessions:[],errors:[],aiAnalyses:[],aiUsageEvents:[],scheduleLocks:{},adaptivePlannerMigrated:true};}
function normalizeUsage(usage){
  if(!usage||typeof usage!=="object")return null;
  return {
    inputTokens:Number(usage.inputTokens)||0,
    outputTokens:Number(usage.outputTokens)||0,
    totalTokens:Number(usage.totalTokens)||0,
    cachedInputTokens:Number(usage.cachedInputTokens)||0,
    reasoningTokens:Number(usage.reasoningTokens)||0,
    estimatedCostUsd:Number.isFinite(Number(usage.estimatedCostUsd))?Number(usage.estimatedCostUsd):null,
    pricing:usage.pricing&&typeof usage.pricing==="object"?usage.pricing:null
  };
}
function normalizeStoredAIAnalysis(a){
  if(!a||typeof a!=="object")return a;
  const legacySystem=a.system||"Mixto / Integrado";
  const detectedSystem=a.detectedSystem||legacySystem;
  const planSystem=a.planSystem||legacySystem;
  const populationContext=a.populationContext||"No determinado";
  return {...a,detectedSystem,planSystem,populationContext,system:detectedSystem,usage:normalizeUsage(a.usage)};
}
function normalizeUsageEvent(event){
  if(!event||typeof event!=="object")return null;
  const usage=normalizeUsage(event.usage||event);
  if(!usage||!usage.totalTokens)return null;
  return {id:event.id||createId("usage"),responseId:event.responseId||null,createdAt:event.createdAt||new Date().toISOString(),model:event.model||"OpenAI",sourceType:event.sourceType||"unknown",populationContext:event.populationContext||"No determinado",detectedSystem:event.detectedSystem||"No determinado",usage};
}
function getUserStorageKey(userId=authUser?.id){
  return userId ? `${STORAGE_KEY}.user.${userId}` : null;
}

function hasLocalStateForCurrentUser(userId=authUser?.id){
  const key=getUserStorageKey(userId);
  if(!key)return false;
  try{return localStorage.getItem(key)!==null}
  catch{return false}
}

function writeStateToLocal(snapshot=state,userId=authUser?.id){
  const key=getUserStorageKey(userId);
  if(!key)return false;
  try{
    localStorage.setItem(key,JSON.stringify(snapshot));
    return true;
  }catch(error){
    console.error("No se pudo guardar el progreso local.",error);
    return false;
  }
}

function touchState(){
  state.version="0.6B.1";
  state.updatedAt=new Date().toISOString();
}

function loadStateForCurrentUser(){
  const fallback=getDefaultState();
  const key=getUserStorageKey();
  if(!key)return fallback;

  try{
    const existing=localStorage.getItem(key);
    if(existing)return normalizeState(JSON.parse(existing));

    const legacy=localStorage.getItem(STORAGE_KEY);
    const claimedBy=localStorage.getItem(LEGACY_STORAGE_CLAIM_KEY);
    if(legacy&&(!claimedBy||claimedBy===authUser?.id)){
      const migrated=normalizeState(JSON.parse(legacy));
      localStorage.setItem(key,JSON.stringify(migrated));
      localStorage.setItem(LEGACY_STORAGE_CLAIM_KEY,String(authUser?.id||""));
      return migrated;
    }
  }catch(error){
    console.error("No se pudo cargar el progreso del usuario.",error)
  }

  const name=getAuthDisplayName(authUser);
  if(name)fallback.profile.name=name;
  return fallback;
}

function normalizeState(rawState){const f=getDefaultState(),raw=rawState&&typeof rawState==="object"?rawState:{};let currentModuleId=Number(raw.currentModuleId??raw.currentWeek??1);if(!DEFAULT_STUDY_ORDER.includes(currentModuleId))currentModuleId=1;const studyDays=Array.isArray(raw.profile?.studyDays)&&raw.profile.studyDays.length?raw.profile.studyDays:f.profile.studyDays;const sessions=Array.isArray(raw.bankSessions)?raw.bankSessions.map(s=>({...s,moduleId:Number(s.moduleId??currentModuleId),localDate:s.localDate||(s.date?dateKey(new Date(s.date)):todayKey())})):[];const errors=Array.isArray(raw.errors)?raw.errors.map(e=>({...e,populationContext:e.populationContext||"No determinado"})):[];const usageEvents=Array.isArray(raw.aiUsageEvents)?raw.aiUsageEvents.map(normalizeUsageEvent).filter(Boolean):[];return {...f,...raw,version:"0.6B.1",updatedAt:raw.updatedAt||null,currentModuleId,studyMode:raw.studyMode==="custom"?"custom":"recommended",studyOrder:normalizeStudyOrder(raw.studyOrder),profile:{...f.profile,...(raw.profile||{}),studyDays,planPreset:raw.profile?.planPreset||"custom"},plannerTasks:raw.plannerTasks||{},prebankCompleted:raw.prebankCompleted||{},dailyTasks:raw.dailyTasks||{},bankSessions:sessions,errors,aiAnalyses:Array.isArray(raw.aiAnalyses)?raw.aiAnalyses.map(normalizeStoredAIAnalysis):[],aiUsageEvents:usageEvents,scheduleLocks:raw.scheduleLocks&&typeof raw.scheduleLocks==="object"?raw.scheduleLocks:{},adaptivePlannerMigrated:raw.adaptivePlannerMigrated===true||["0.5B.2","0.5B.3","0.5B.4","0.5B.5","0.6A","0.6B"].includes(String(raw.version||""))};}

function normalizeStudyOrder(order){if(!Array.isArray(order))return [...DEFAULT_STUDY_ORDER];const v=[];order.forEach(x=>{const id=Number(x);if(DEFAULT_STUDY_ORDER.includes(id)&&!v.includes(id))v.push(id)});DEFAULT_STUDY_ORDER.forEach(id=>{if(!v.includes(id))v.push(id)});return [...v.filter(id=>id!==8),8];}

function getStateTimestamp(snapshot){
  const value=Date.parse(snapshot?.updatedAt||"");
  return Number.isFinite(value)?value:0;
}

async function fetchCloudStateRow(userId=authUser?.id){
  if(!supabase||!userId)return null;
  const {data,error}=await supabase
    .from(CLOUD_STATE_TABLE)
    .select("state,schema_version,created_at,updated_at")
    .eq("user_id",userId)
    .maybeSingle();
  if(error)throw error;
  return data||null;
}

async function reconcileInitialStateWithCloud(){
  const localExists=hasLocalStateForCurrentUser();
  const localState=loadStateForCurrentUser();

  if(!supabase||!authUser?.id){
    return {nextState:localState,needsCloudPush:false,source:"local"};
  }

  try{
    const row=await fetchCloudStateRow(authUser.id);
    cloudLastError=null;

    if(!row?.state){
      return {nextState:localState,needsCloudPush:true,source:"local-first-cloud"};
    }

    const cloudState=normalizeState(row.state);
    if(!cloudState.updatedAt&&row.updated_at)cloudState.updatedAt=row.updated_at;

    const localTimestamp=getStateTimestamp(localState);
    const cloudTimestamp=Math.max(
      getStateTimestamp(cloudState),
      Number.isFinite(Date.parse(row.updated_at||""))?Date.parse(row.updated_at):0
    );

    if(localExists&&localTimestamp>cloudTimestamp+1000){
      return {nextState:localState,needsCloudPush:true,source:"local-newer"};
    }

    writeStateToLocal(cloudState,authUser.id);
    cloudLastSyncedAt=row.updated_at||cloudState.updatedAt||null;
    renderCloudSyncStatus();
    return {nextState:cloudState,needsCloudPush:false,source:"cloud"};
  }catch(error){
    cloudLastError=error;
    renderCloudSyncStatus();
    console.warn("No se pudo descargar el progreso de Supabase. BOARDS continuará con la copia local.",error);
    return {nextState:localState,needsCloudPush:false,source:"local-offline"};
  }
}

function scheduleCloudStateSave(delay=CLOUD_SYNC_DEBOUNCE_MS){
  if(!cloudSyncReady||!supabase||!authUser?.id)return;
  cloudSyncQueued=true;
  renderCloudSyncStatus();
  if(cloudSyncTimer)window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer=window.setTimeout(()=>{
    cloudSyncTimer=null;
    void flushCloudStateSave();
  },Math.max(0,Number(delay)||0));
}

async function flushCloudStateSave(){
  if(!cloudSyncReady||!supabase||!authUser?.id)return false;

  if(cloudSyncTimer){
    window.clearTimeout(cloudSyncTimer);
    cloudSyncTimer=null;
  }

  if(cloudSyncInFlight){
    cloudSyncQueued=true;
    try{await cloudSyncInFlight}catch{}
    if(cloudSyncQueued)return flushCloudStateSave();
    return !cloudLastError;
  }

  cloudSyncQueued=false;
  renderCloudSyncStatus();
  const userId=authUser.id;
  const snapshot=JSON.parse(JSON.stringify(state));
  const updatedAt=snapshot.updatedAt||new Date().toISOString();
  snapshot.updatedAt=updatedAt;
  snapshot.version="0.6B.1";

  cloudSyncInFlight=(async()=>{
    const {error}=await supabase
      .from(CLOUD_STATE_TABLE)
      .upsert({
        user_id:userId,
        state:snapshot,
        schema_version:CLOUD_STATE_SCHEMA_VERSION,
        updated_at:updatedAt
      },{onConflict:"user_id"});

    if(error)throw error;
    cloudLastSyncedAt=updatedAt;
    cloudLastError=null;
    renderCloudSyncStatus();
    return true;
  })();

  try{
    await cloudSyncInFlight;
    return true;
  }catch(error){
    cloudLastError=error;
    renderCloudSyncStatus();
    console.warn("No se pudo sincronizar el progreso con Supabase. La copia local se conserva y BOARDS reintentará en el próximo cambio.",error);
    return false;
  }finally{
    cloudSyncInFlight=null;
    renderCloudSyncStatus();
    if(cloudSyncQueued&&authUser?.id===userId)scheduleCloudStateSave(150);
  }
}

function saveState({syncCloud=true,touch=true}={}){
  if(touch)touchState();
  if(!writeStateToLocal())return;
  if(syncCloud)scheduleCloudStateSave();
}
function escapeHTML(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function createId(prefix="item"){return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
function clamp(v,min,max){return Math.min(Math.max(v,min),max)}
function formatTokens(value){return Number(value||0).toLocaleString("es-PA")}
function formatUsd(value){const n=Number(value);if(!Number.isFinite(n))return "—";if(n===0)return "$0.0000";return `$${n<.1?n.toFixed(4):n.toFixed(3)}`}
function estimateCostFallback(model,usage){
  const pricing=MODEL_PRICING_PER_MILLION[model];
  if(!pricing||!usage)return null;
  const input=Number(usage.inputTokens)||0,cached=Math.min(Number(usage.cachedInputTokens)||0,input),output=Number(usage.outputTokens)||0;
  return ((input-cached)*pricing.input+cached*pricing.cachedInput+output*pricing.output)/1_000_000
}
function getActiveStudyOrder(){return state.studyMode==="custom"?[...state.studyOrder]:[...DEFAULT_STUDY_ORDER]}
function getModule(id=state.currentModuleId){return STUDY_MODULES.find(m=>m.id===Number(id))||STUDY_MODULES[0]}
function getCurrentModule(){return getModule(state.currentModuleId)}
function getModulePosition(id){const i=getActiveStudyOrder().indexOf(Number(id));return i>=0?i+1:1}
function getCurrentPosition(){return getModulePosition(state.currentModuleId)}
function getAllowedSystemsForModule(id){return MODULE_SYSTEM_OPTIONS[Number(id)]||[]}
function isSessionSystemAllowed(system,moduleId){return getAllowedSystemsForModule(moduleId).includes(system)}
function isViewingToday(){return activeStudyDateKey===todayKey()}
function parseLocalDate(value){if(!value)return null;const p=value.split("-").map(Number);if(p.length!==3)return null;const d=new Date(p[0],p[1]-1,p[2]);d.setHours(0,0,0,0);return d}
function normalizeDate(value=new Date()){const d=value instanceof Date?new Date(value.getTime()):new Date(value);d.setHours(0,0,0,0);return d}
function cloneDate(d){return new Date(d.getTime())}
function addDays(d,n){const c=cloneDate(d);c.setDate(c.getDate()+n);return c}
function dateKey(d){const n=normalizeDate(d),y=n.getFullYear(),m=String(n.getMonth()+1).padStart(2,"0"),day=String(n.getDate()).padStart(2,"0");return `${y}-${m}-${day}`}
function todayKey(){return dateKey(new Date())}
function differenceInDays(a,b){return Math.ceil((normalizeDate(b)-normalizeDate(a))/86400000)}
function formatDate(v){const d=v instanceof Date?v:new Date(v);if(Number.isNaN(d.getTime()))return "";return new Intl.DateTimeFormat("es-PA",{day:"2-digit",month:"short",year:"numeric"}).format(d)}
function formatShortDate(d){return d?new Intl.DateTimeFormat("es-PA",{day:"numeric",month:"short"}).format(d):""}
function formatDateRange(a,b){return a&&b?`${formatShortDate(a)} – ${formatShortDate(b)}`:"Sin fechas asignadas"}
function formatLongLocalDate(d){return new Intl.DateTimeFormat("es-PA",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(d)}

function getSystemStudyOrder(){return getActiveStudyOrder().filter(id=>id!==8)}
function getStudyDates(start,exam,enabled){const dates=[];let cursor=cloneDate(start);while(cursor<exam){if(enabled.includes(DAY_KEY_BY_INDEX[cursor.getDay()]))dates.push(cloneDate(cursor));cursor=addDays(cursor,1)}return dates}
function getPlanProfile(totalStudyDays){return PLAN_PHASE_PROFILES.find(p=>totalStudyDays<=p.maxDays)||PLAN_PHASE_PROFILES.at(-1)}
function getPlanDurationLabel(calendarDays){if(calendarDays<70){const weeks=Math.max(1,Math.round(calendarDays/7));return `${weeks} ${weeks===1?'semana':'semanas'}`}if(calendarDays<330){const months=Math.max(1,Math.round(calendarDays/30.44));return `${months} ${months===1?'mes':'meses'}`}const years=(calendarDays/365.25).toFixed(1).replace('.0','');return `${years} ${years==='1'?'año':'años'}`}
function allocateIntegerCounts(total,items,weightGetter,minEach=true){const result=new Map(items.map(id=>[id,0]));if(total<=0||!items.length)return result;let remaining=total;if(minEach&&total>=items.length){items.forEach(id=>result.set(id,1));remaining-=items.length}if(remaining<=0)return result;const weights=items.map(id=>Math.max(.01,Number(weightGetter(id))||1)),sum=weights.reduce((a,b)=>a+b,0);const raw=items.map((id,i)=>({id,value:remaining*weights[i]/sum}));let used=0;raw.forEach(x=>{const n=Math.floor(x.value);result.set(x.id,result.get(x.id)+n);used+=n});let leftover=remaining-used;raw.sort((a,b)=>(b.value-Math.floor(b.value))-(a.value-Math.floor(a.value)));for(let i=0;i<leftover;i++)result.set(raw[i%raw.length].id,result.get(raw[i%raw.length].id)+1);return result}
function getAdaptiveModuleScore(moduleId){const base=MODULE_PLANNING_WEIGHTS[moduleId]||10,stats=getModuleQuestionStats(moduleId);let accuracyFactor=1.08;if(stats.accuracy!==null){if(stats.accuracy<60)accuracyFactor=1.65;else if(stats.accuracy<70)accuracyFactor=1.45;else if(stats.accuracy<80)accuracyFactor=1.25;else if(stats.accuracy<90)accuracyFactor=1;else accuracyFactor=.82}const allowed=getAllowedSystemsForModule(moduleId),errors=state.errors.filter(e=>allowed.includes(e.system)).length,errorFactor=1+Math.min(errors,10)*.035;return base*accuracyFactor*errorFactor}
function allocatePhaseCounts(total,phases){const counts=phases.map(p=>Math.floor(total*p.ratio)),used=counts.reduce((a,b)=>a+b,0);let rest=total-used;const fractions=phases.map((p,i)=>({i,f:total*p.ratio-counts[i]})).sort((a,b)=>b.f-a.f);for(let i=0;i<rest;i++)counts[fractions[i%fractions.length].i]++;return counts}
function makePhaseAssignments(dates,phase,systemOrder){if(!dates.length)return[];if(phase.mode==='consolidation'||phase.mode==='exam')return dates.map(date=>({date,moduleId:8,phaseId:phase.id,phaseLabel:phase.label,phaseDescription:phase.description,blockLabel:phase.mode==='exam'?'Modo examen':'Consolidación final'}));let ids=[...systemOrder],weightGetter=id=>MODULE_PLANNING_WEIGHTS[id]||10;if(phase.mode==='reinforcement'){ids=[...ids].sort((a,b)=>getAdaptiveModuleScore(b)-getAdaptiveModuleScore(a));weightGetter=id=>getAdaptiveModuleScore(id)}if(phase.mode==='adaptive'){const weak=[...systemOrder].sort((a,b)=>getAdaptiveModuleScore(b)-getAdaptiveModuleScore(a)).slice(0,3);ids=[8,...weak];weightGetter=id=>id===8?Math.max(18,dates.length*.45):getAdaptiveModuleScore(id)}const counts=allocateIntegerCounts(dates.length,ids,weightGetter,phase.mode!=='adaptive');const assignments=[];let offset=0;ids.forEach(moduleId=>{const count=counts.get(moduleId)||0;for(let i=0;i<count;i++){const date=dates[offset++];if(!date)break;assignments.push({date,moduleId,phaseId:phase.id,phaseLabel:phase.label,phaseDescription:phase.description,blockLabel:phase.mode==='foundation'?'Primera vuelta':phase.mode==='reinforcement'?'Revisión adaptativa':phase.mode==='adaptive'?(moduleId===8?'Bloques mixtos':'Refuerzo de punto ciego'):phase.label})}});while(offset<dates.length){assignments.push({date:dates[offset++],moduleId:8,phaseId:phase.id,phaseLabel:phase.label,phaseDescription:phase.description,blockLabel:phase.label})}return assignments}
function annotateScheduleAssignments(assignments){const blocks=[];let current=null;assignments.forEach(day=>{const groupKey=`${day.phaseId}|${day.moduleId}|${day.blockLabel}`;if(!current||current.groupKey!==groupKey){current={id:`block-${blocks.length+1}-${day.phaseId}-${day.moduleId}`,groupKey,moduleId:day.moduleId,phaseId:day.phaseId,phaseLabel:day.phaseLabel,phaseDescription:day.phaseDescription,blockLabel:day.blockLabel,dates:[],dayRefs:[],position:getModulePosition(day.moduleId),sequence:blocks.length+1};blocks.push(current)}current.dates.push(day.date);current.dayRefs.push(day);day.blockId=current.id});const visits={};blocks.forEach(block=>{visits[block.moduleId]=(visits[block.moduleId]||0)+1;block.visitNumber=visits[block.moduleId];block.studyDays=block.dates.length;block.startDate=block.dates[0]||null;block.endDate=block.dates.at(-1)||null;block.targetQuestions=block.studyDays*Number(state.profile.dailyQuestionGoal||0);block.dayRefs.forEach((day,i)=>{day.visitNumber=block.visitNumber;day.dayIndex=i;day.totalDays=block.studyDays;day.blockStartDate=block.startDate;day.blockEndDate=block.endDate;day.blockSequence=block.sequence});delete block.dayRefs});return {assignments,blocks}}
function buildRawStudySchedule(){const start=parseLocalDate(state.profile.startDate),exam=parseLocalDate(state.profile.examDate);if(!start||!exam||exam<=start)return null;const enabled=state.profile.studyDays||[];if(!enabled.length)return null;const studyDates=getStudyDates(start,exam,enabled);if(!studyDates.length)return null;const profile=getPlanProfile(studyDates.length),phaseCounts=allocatePhaseCounts(studyDates.length,profile.phases),systemOrder=getSystemStudyOrder();let offset=0,assignments=[];const phases=profile.phases.map((phase,index)=>{const dates=studyDates.slice(offset,offset+phaseCounts[index]);offset+=phaseCounts[index];const phaseAssignments=makePhaseAssignments(dates,phase,systemOrder);assignments.push(...phaseAssignments);return {...phase,index:index+1,studyDays:dates.length,startDate:dates[0]||null,endDate:dates.at(-1)||null,dates}});const annotated=annotateScheduleAssignments(assignments);return {start,exam,profile,phases,assignments:annotated.assignments,blocks:annotated.blocks,studyDates,totalStudyDays:studyDates.length,totalQuestions:studyDates.length*Number(state.profile.dailyQuestionGoal||0),calendarDays:differenceInDays(start,exam)}}
function hasActivityOnDate(localDate){if(state.bankSessions.some(s=>getSessionDateKey(s)===localDate))return true;return Object.keys(state.dailyTasks||{}).some(k=>k.startsWith(`${localDate}|`))}
function getRecordedModuleForDate(localDate){const sessionModules=[...new Set(state.bankSessions.filter(s=>getSessionDateKey(s)===localDate).map(s=>Number(s.moduleId)).filter(DEFAULT_STUDY_ORDER.includes.bind(DEFAULT_STUDY_ORDER)))];if(sessionModules.length===1)return sessionModules[0];const taskKeys=Object.keys(state.dailyTasks||{}).filter(k=>k.startsWith(`${localDate}|`));const taskModules=[...new Set(taskKeys.map(k=>Number(k.split('|')[1])).filter(DEFAULT_STUDY_ORDER.includes.bind(DEFAULT_STUDY_ORDER)))];if(taskModules.length===1)return taskModules[0];return null}
function buildLegacyStudySchedule(){const start=parseLocalDate(state.profile.startDate),exam=parseLocalDate(state.profile.examDate);if(!start||!exam||exam<=start)return null;const enabled=state.profile.studyDays||[];if(!enabled.length)return null;const studyDates=getStudyDates(start,exam,enabled);if(!studyDates.length)return null;const order=getActiveStudyOrder(),base=Math.floor(studyDates.length/order.length),remainder=studyDates.length%order.length;let offset=0;const blocks=order.map((moduleId,index)=>{const count=base+(index<remainder?1:0),dates=studyDates.slice(offset,offset+count);offset+=count;return {moduleId,position:index+1,dates,studyDays:dates.length,startDate:dates[0]||null,endDate:dates.at(-1)||null}});return {start,exam,blocks,studyDates}}
function migrateLegacyPlannerIfNeeded(){if(state.adaptivePlannerMigrated)return false;state.scheduleLocks=state.scheduleLocks||{};const legacy=buildLegacyStudySchedule(),today=normalizeDate(new Date());if(legacy){legacy.blocks.forEach(block=>block.dates.forEach((date,i)=>{const key=dateKey(date);if(!(date<today||hasActivityOnDate(key))||state.scheduleLocks[key])return;const recordedModule=getRecordedModuleForDate(key),moduleId=recordedModule||block.moduleId;state.scheduleLocks[key]={moduleId,phaseId:"legacy",phaseLabel:"Plan previo",phaseDescription:"Jornada preservada desde el calendario anterior a Adaptive Study Planner.",blockLabel:"Asignación histórica",visitNumber:1,dayIndex:i,totalDays:block.studyDays,blockStartDate:block.startDate?dateKey(block.startDate):key,blockEndDate:block.endDate?dateKey(block.endDate):key}}))}state.adaptivePlannerMigrated=true;return true}
function ensureHistoricalScheduleLocks(){const raw=buildRawStudySchedule();if(!raw)return false;state.scheduleLocks=state.scheduleLocks||{};const today=normalizeDate(new Date());let changed=false;raw.assignments.forEach(day=>{const key=dateKey(day.date),shouldLock=day.date<today||hasActivityOnDate(key);if(!shouldLock||state.scheduleLocks[key])return;const recordedModule=getRecordedModuleForDate(key),moduleId=recordedModule||day.moduleId;state.scheduleLocks[key]={moduleId,phaseId:day.phaseId,phaseLabel:day.phaseLabel,phaseDescription:day.phaseDescription,blockLabel:recordedModule&&recordedModule!==day.moduleId?'Histórico preservado':day.blockLabel,visitNumber:day.visitNumber||1,dayIndex:day.dayIndex??0,totalDays:day.totalDays||1,blockStartDate:day.blockStartDate?dateKey(day.blockStartDate):key,blockEndDate:day.blockEndDate?dateKey(day.blockEndDate):key};changed=true});return changed}
function getStudySchedule(){const raw=buildRawStudySchedule();if(!raw)return null;const merged=new Map(raw.assignments.map(day=>[dateKey(day.date),{...day}]));Object.entries(state.scheduleLocks||{}).forEach(([key,lock])=>{const date=parseLocalDate(key);if(!date)return;const current=merged.get(key)||{};merged.set(key,{...current,date,moduleId:Number(lock.moduleId),phaseId:lock.phaseId||current.phaseId||'historical',phaseLabel:lock.phaseLabel||current.phaseLabel||'Histórico',phaseDescription:lock.phaseDescription||current.phaseDescription||'Asignación histórica preservada.',blockLabel:lock.blockLabel||current.blockLabel||'Histórico preservado',locked:true,visitNumber:lock.visitNumber||current.visitNumber||1,dayIndex:lock.dayIndex??current.dayIndex??0,totalDays:lock.totalDays||current.totalDays||1,blockStartDate:parseLocalDate(lock.blockStartDate)||current.blockStartDate||date,blockEndDate:parseLocalDate(lock.blockEndDate)||current.blockEndDate||date})});const assignments=[...merged.values()].sort((a,b)=>a.date-b.date),annotated=annotateScheduleAssignments(assignments.map(x=>({...x})));const phases=raw.phases.map(phase=>{const dates=assignments.filter(d=>d.phaseId===phase.id).map(d=>d.date);return {...phase,studyDays:dates.length,startDate:dates[0]||phase.startDate,endDate:dates.at(-1)||phase.endDate,dates}});return {...raw,assignments:annotated.assignments,blocks:annotated.blocks,phases,studyDates:assignments.map(x=>x.date),totalStudyDays:assignments.length,totalQuestions:assignments.length*Number(state.profile.dailyQuestionGoal||0)}}
function getScheduledDayForDate(date,schedule=null){const s=schedule||getStudySchedule(),key=dateKey(date);return s?.assignments.find(d=>dateKey(d.date)===key)||null}
function getScheduleBlocksForModule(moduleId,schedule=null){const s=schedule||getStudySchedule();return s?.blocks.filter(b=>b.moduleId===Number(moduleId))||[]}
function getScheduleBlock(moduleId,schedule=null){const blocks=getScheduleBlocksForModule(moduleId,schedule);if(!blocks.length)return null;const today=normalizeDate(new Date()),active=blocks.find(b=>b.startDate<=today&&b.endDate>=today);return active||blocks.find(b=>b.startDate>=today)||blocks.at(-1)}
function getScheduledBlockForDate(date,schedule=null){const s=schedule||getStudySchedule(),day=getScheduledDayForDate(date,s);return day?s?.blocks.find(b=>b.id===day.blockId)||null:null}
function getNearestBlockForDate(date,schedule=null){const s=schedule||getStudySchedule();if(!s)return null;const t=normalizeDate(date),exact=getScheduledBlockForDate(t,s);if(exact)return exact;const prev=s.blocks.filter(b=>b.endDate&&b.endDate<t).at(-1),next=s.blocks.find(b=>b.startDate&&b.startDate>t);return prev||next||null}
function getModuleDayProgress(date,moduleId,schedule=null){const s=schedule||getStudySchedule();if(!s)return null;const key=dateKey(date),days=s.assignments.filter(day=>Number(day.moduleId)===Number(moduleId)).sort((a,b)=>a.date-b.date),index=days.findIndex(day=>dateKey(day.date)===key);if(index<0)return null;return {dayIndex:index,totalDays:days.length}}
function getOperationalContext(date=new Date()){const t=normalizeDate(date),key=dateKey(t),lock=state.scheduleLocks?.[key];if(lock){const moduleId=Number(lock.moduleId),s=getStudySchedule(),continuity=getModuleDayProgress(t,moduleId,s),block={moduleId,phaseId:lock.phaseId||'historical',phaseLabel:lock.phaseLabel||'Histórico',phaseDescription:lock.phaseDescription||'',blockLabel:lock.blockLabel||'Histórico preservado',visitNumber:lock.visitNumber||1,position:getModulePosition(moduleId),studyDays:lock.totalDays||1,startDate:parseLocalDate(lock.blockStartDate)||t,endDate:parseLocalDate(lock.blockEndDate)||t,dates:[t],targetQuestions:(lock.totalDays||1)*Number(state.profile.dailyQuestionGoal||0)};return {type:'study',isStudyDay:true,moduleId,block,date:t,dayIndex:lock.dayIndex??0,totalDays:lock.totalDays||1,moduleDayIndex:continuity?.dayIndex??(lock.dayIndex??0),moduleTotalDays:continuity?.totalDays??(lock.totalDays||1),phaseId:block.phaseId,phaseLabel:block.phaseLabel,locked:true}}const s=getStudySchedule();if(!s)return {type:"no-calendar",isStudyDay:false,moduleId:state.currentModuleId,block:null,date:t,dayIndex:null,totalDays:null,moduleDayIndex:null,moduleTotalDays:null,phaseLabel:""};if(t<s.start)return {type:"before-plan",isStudyDay:false,moduleId:state.currentModuleId,block:s.blocks[0]||null,date:t,dayIndex:null,totalDays:null,moduleDayIndex:null,moduleTotalDays:null,phaseLabel:s.blocks[0]?.phaseLabel||""};if(t>=s.exam)return {type:"after-exam",isStudyDay:false,moduleId:state.currentModuleId,block:s.blocks.at(-1)||null,date:t,dayIndex:null,totalDays:null,moduleDayIndex:null,moduleTotalDays:null,phaseLabel:s.blocks.at(-1)?.phaseLabel||""};const day=getScheduledDayForDate(t,s),b=getScheduledBlockForDate(t,s);if(day&&b){const continuity=getModuleDayProgress(t,day.moduleId,s);return {type:"study",isStudyDay:true,moduleId:day.moduleId,block:b,date:t,dayIndex:day.dayIndex??b.dates.findIndex(d=>dateKey(d)===key),totalDays:day.totalDays||b.dates.length,moduleDayIndex:continuity?.dayIndex??(day.dayIndex??0),moduleTotalDays:continuity?.totalDays??(day.totalDays||b.dates.length),phaseId:day.phaseId,phaseLabel:day.phaseLabel,locked:Boolean(day.locked)}}const n=getNearestBlockForDate(t,s);return {type:"rest",isStudyDay:false,moduleId:n?.moduleId??state.currentModuleId,block:n,date:t,dayIndex:null,totalDays:n?.dates.length??null,moduleDayIndex:null,moduleTotalDays:null,phaseLabel:n?.phaseLabel||""}}
function getAssignedTopics(c){if(!c?.isStudyDay||c.dayIndex===null)return [];const m=getModule(c.moduleId),topics=m.topics,total=c.totalDays;if(!total||!topics.length)return [];const start=Math.floor(c.dayIndex*topics.length/total),end=Math.floor((c.dayIndex+1)*topics.length/total),a=topics.slice(start,Math.max(end,start+1));const base=a.length?a:["Repaso acumulativo y puntos débiles"];if(c.phaseId==='reinforcement')return base.map(x=>`Refuerzo · ${x}`);if(c.phaseId==='adaptive'&&c.moduleId!==8)return base.map(x=>`Punto ciego · ${x}`);return base}
function getSessionDateKey(s){return s.localDate||(s.date?dateKey(new Date(s.date)):"")}
function getSessionsForDate(localDate,moduleId=null){return state.bankSessions.filter(s=>getSessionDateKey(s)===localDate&&(moduleId===null||Number(s.moduleId)===Number(moduleId)))}
function getQuestionStatsForDate(localDate,moduleId){const sessions=getSessionsForDate(localDate,moduleId),questions=sessions.reduce((a,s)=>a+Number(s.questions||0),0),correct=sessions.reduce((a,s)=>a+Number(s.correct||0),0);return {sessions,questions,correct,accuracy:questions?Math.round(correct/questions*100):null}}
function getModuleQuestionStats(moduleId){const sessions=state.bankSessions.filter(s=>Number(s.moduleId)===Number(moduleId)),questions=sessions.reduce((a,s)=>a+Number(s.questions||0),0),correct=sessions.reduce((a,s)=>a+Number(s.correct||0),0);return {questions,correct,accuracy:questions?Math.round(correct/questions*100):null}}
function getDailyTaskKey(localDate,moduleId){return `${localDate}|${moduleId}`}
function getDailyTaskRecord(localDate,moduleId){return state.dailyTasks[getDailyTaskKey(localDate,moduleId)]||{moduleId:Number(moduleId),prebank:false,review:false,anki:false,highyield:false}}
function toggleDailyTask(localDate,moduleId,taskId){if(!DAILY_MANUAL_TASKS.some(t=>t.id===taskId))return;const key=getDailyTaskKey(localDate,moduleId),r=getDailyTaskRecord(localDate,moduleId);state.dailyTasks[key]={...r,[taskId]:!r[taskId]};ensureHistoricalScheduleLocks();saveState();renderAll()}
function getDailyCompletionData(localDate,moduleId){const record=getDailyTaskRecord(localDate,moduleId),questionStats=getQuestionStatsForDate(localDate,moduleId),goal=Number(state.profile.dailyQuestionGoal||40),fraction=clamp(questionStats.questions/goal,0,1),components={prebank:record.prebank?1:0,questions:fraction,review:record.review?1:0,anki:record.anki?1:0,highyield:record.highyield?1:0},total=Object.values(components).reduce((a,b)=>a+b,0);return {record,questionStats,goal,components,percentage:Math.round(total/5*100),questionsCompleted:questionStats.questions>=goal}}
function getPendingPastStudyDays(){const s=getStudySchedule();if(!s)return [];const t=normalizeDate(new Date());return s.assignments.filter(day=>day.date<t).map(day=>{const block=s.blocks.find(b=>b.id===day.blockId);if(!block)return null;return {date:day.date,block,completion:getDailyCompletionData(dateKey(day.date),day.moduleId)}}).filter(x=>x&&x.completion.percentage<100)}
function setActiveStudyDate(localDate){if(!parseLocalDate(localDate))return;editingSessionId=null;activeStudyDateKey=localDate;renderToday();window.scrollTo({top:0,behavior:"smooth"})}
function returnToToday(){editingSessionId=null;activeStudyDateKey=todayKey();renderToday();window.scrollTo({top:0,behavior:"smooth"})}

/* ======================== AUTH · V0.6B.1 ======================== */

function getAuthDisplayName(user=authUser){
  if(!user)return "";
  const metadataName=String(user.user_metadata?.full_name||user.user_metadata?.name||"").trim();
  if(metadataName)return metadataName;
  const email=String(user.email||"").trim();
  return email ? email.split("@")[0] : "Estudiante";
}

function getAuthProvider(user=authUser){
  const providers=Array.isArray(user?.app_metadata?.providers)?user.app_metadata.providers:[];
  const provider=user?.app_metadata?.provider||providers[0]||"email";
  if(provider==="google")return "Google";
  if(provider==="email")return "E-mail";
  return provider.charAt(0).toUpperCase()+provider.slice(1);
}

function getAuthRedirectUrl(){
  return `${window.location.origin}/`;
}

function setAuthStatus(message="",type="info"){
  const el=document.getElementById("authStatus");
  if(!el)return;
  if(!message){
    el.hidden=true;
    el.textContent="";
    el.className="auth-status";
    return;
  }
  el.hidden=false;
  el.textContent=message;
  el.className=`auth-status ${type}`;
}

function setAuthBusy(isBusy){
  authBusy=Boolean(isBusy);
  const submit=document.getElementById("authSubmitButton");
  const google=document.getElementById("authGoogleButton");
  if(submit)submit.disabled=authBusy;
  if(google)google.disabled=authBusy;
}

function setAuthMode(mode="login"){
  authMode=["login","signup","forgot","recovery"].includes(mode)?mode:"login";
  const title=document.getElementById("authTitle");
  const subtitle=document.getElementById("authSubtitle");
  const tabs=document.getElementById("authTabs");
  const google=document.getElementById("authGoogleButton");
  const divider=document.getElementById("authDivider");
  const nameGroup=document.getElementById("authNameGroup");
  const emailGroup=document.getElementById("authEmailGroup");
  const passwordGroup=document.getElementById("authPasswordGroup");
  const confirmGroup=document.getElementById("authConfirmGroup");
  const password=document.getElementById("authPassword");
  const confirm=document.getElementById("authPasswordConfirm");
  const passwordLabel=document.getElementById("authPasswordLabel");
  const submit=document.getElementById("authSubmitButton");
  const forgot=document.getElementById("authForgotButton");
  const back=document.getElementById("authBackButton");

  document.querySelectorAll("[data-auth-mode]").forEach(button=>{
    button.classList.toggle("active",button.dataset.authMode===authMode)
  });

  if(authMode==="login"){
    title.textContent="Bienvenido a BOARDS";
    subtitle.textContent="Inicia sesión para abrir tu espacio personal de estudio.";
    tabs.hidden=false; google.hidden=false; divider.hidden=false;
    nameGroup.hidden=true; emailGroup.hidden=false; passwordGroup.hidden=false; confirmGroup.hidden=true;
    passwordLabel.textContent="Contraseña";
    password.autocomplete="current-password";
    password.required=true;
    confirm.required=false;
    submit.textContent="Iniciar sesión";
    forgot.hidden=false; back.hidden=true;
  }

  if(authMode==="signup"){
    title.textContent="Crea tu cuenta BOARDS";
    subtitle.textContent="Tu progreso quedará separado del de otros usuarios en este dispositivo.";
    tabs.hidden=false; google.hidden=false; divider.hidden=false;
    nameGroup.hidden=false; emailGroup.hidden=false; passwordGroup.hidden=false; confirmGroup.hidden=false;
    passwordLabel.textContent="Contraseña";
    password.autocomplete="new-password";
    password.required=true;
    confirm.required=true;
    submit.textContent="Crear cuenta";
    forgot.hidden=true; back.hidden=true;
  }

  if(authMode==="forgot"){
    title.textContent="Recupera tu contraseña";
    subtitle.textContent="Te enviaremos un enlace seguro al correo de tu cuenta.";
    tabs.hidden=true; google.hidden=true; divider.hidden=true;
    nameGroup.hidden=true; emailGroup.hidden=false; passwordGroup.hidden=true; confirmGroup.hidden=true;
    password.required=false; confirm.required=false;
    submit.textContent="Enviar enlace de recuperación";
    forgot.hidden=true; back.hidden=false;
  }

  if(authMode==="recovery"){
    title.textContent="Crea una nueva contraseña";
    subtitle.textContent="El enlace de recuperación fue validado. Define tu nueva contraseña.";
    tabs.hidden=true; google.hidden=true; divider.hidden=true;
    nameGroup.hidden=true; emailGroup.hidden=true; passwordGroup.hidden=false; confirmGroup.hidden=false;
    passwordLabel.textContent="Nueva contraseña";
    password.autocomplete="new-password";
    password.required=true; confirm.required=true;
    submit.textContent="Guardar nueva contraseña";
    forgot.hidden=true; back.hidden=false;
  }

  setAuthStatus();
}

function showAuthGate(mode=authMode){
  document.getElementById("appShell")?.setAttribute("hidden","");
  const gate=document.getElementById("authGate");
  if(gate)gate.hidden=false;
  setAuthMode(mode);
}

function showApplication(){
  const gate=document.getElementById("authGate");
  if(gate)gate.hidden=true;
  document.getElementById("appShell")?.removeAttribute("hidden");
}

function friendlyAuthError(error){
  const raw=String(error?.message||error||"No se pudo completar la autenticación.");
  const lower=raw.toLowerCase();
  if(lower.includes("invalid login credentials"))return "Correo o contraseña incorrectos.";
  if(lower.includes("email not confirmed"))return "Primero confirma tu correo desde el enlace que te enviamos.";
  if(lower.includes("user already registered"))return "Ya existe una cuenta con este correo.";
  if(lower.includes("password should be at least"))return "La contraseña debe tener al menos 6 caracteres.";
  if(lower.includes("signup is disabled"))return "La creación de cuentas está desactivada temporalmente.";
  if(lower.includes("rate limit"))return "Se hicieron demasiados intentos. Espera un momento y vuelve a intentar.";
  return raw;
}

function initAuthControls(){
  document.querySelectorAll("[data-auth-mode]").forEach(button=>{
    button.addEventListener("click",()=>setAuthMode(button.dataset.authMode))
  });

  document.getElementById("authForgotButton")?.addEventListener("click",()=>setAuthMode("forgot"));

  document.getElementById("authBackButton")?.addEventListener("click",async()=>{
    if(authMode==="recovery"&&supabase){
      await supabase.auth.signOut();
    }
    authRecoveryMode=false;
    setAuthMode("login");
  });

  document.getElementById("authForm")?.addEventListener("submit",handleAuthSubmit);
  document.getElementById("authGoogleButton")?.addEventListener("click",signInWithGoogle);
  document.getElementById("settingsSignOutButton")?.addEventListener("click",signOutCurrentUser);
}

async function handleAuthSubmit(event){
  event.preventDefault();
  if(authBusy)return;
  if(!supabase){
    setAuthStatus("Faltan las variables VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.","error");
    return;
  }

  const email=String(document.getElementById("authEmail")?.value||"").trim();
  const password=String(document.getElementById("authPassword")?.value||"");
  const confirmation=String(document.getElementById("authPasswordConfirm")?.value||"");
  const name=String(document.getElementById("authName")?.value||"").trim();

  try{
    setAuthBusy(true);
    setAuthStatus();

    if(authMode==="login"){
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw error;
      if(data?.session)await activateAuthenticatedSession(data.session);
      return;
    }

    if(authMode==="signup"){
      if(!name){
        setAuthStatus("Escribe tu nombre para crear la cuenta.","error");
        return;
      }
      if(password.length<6){
        setAuthStatus("La contraseña debe tener al menos 6 caracteres.","error");
        return;
      }
      if(password!==confirmation){
        setAuthStatus("Las contraseñas no coinciden.","error");
        return;
      }

      const {data,error}=await supabase.auth.signUp({
        email,
        password,
        options:{
          data:{full_name:name},
          emailRedirectTo:getAuthRedirectUrl()
        }
      });
      if(error)throw error;

      if(data?.session){
        await activateAuthenticatedSession(data.session);
      }else{
        setAuthStatus("Cuenta creada. Revisa tu correo y confirma el registro antes de iniciar sesión.","success");
        document.getElementById("authPassword").value="";
        document.getElementById("authPasswordConfirm").value="";
      }
      return;
    }

    if(authMode==="forgot"){
      if(!email){
        setAuthStatus("Escribe el correo de tu cuenta.","error");
        return;
      }
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:getAuthRedirectUrl()});
      if(error)throw error;
      setAuthStatus("Te enviamos el enlace de recuperación. Revisa tu correo.","success");
      return;
    }

    if(authMode==="recovery"){
      if(password.length<6){
        setAuthStatus("La nueva contraseña debe tener al menos 6 caracteres.","error");
        return;
      }
      if(password!==confirmation){
        setAuthStatus("Las contraseñas no coinciden.","error");
        return;
      }
      const {data,error}=await supabase.auth.updateUser({password});
      if(error)throw error;
      authRecoveryMode=false;
      if(data?.user){
        authUser=data.user;
        const {data:sessionData}=await supabase.auth.getSession();
        if(sessionData?.session)await activateAuthenticatedSession(sessionData.session,{force:true});
      }
      showApplication();
      showToast("Contraseña actualizada correctamente.");
      return;
    }
  }catch(error){
    console.error("Auth error:",error);
    setAuthStatus(friendlyAuthError(error),"error");
  }finally{
    setAuthBusy(false);
  }
}

async function signInWithGoogle(){
  if(authBusy)return;
  if(!supabase){
    setAuthStatus("Supabase no está configurado en este entorno.","error");
    return;
  }

  try{
    setAuthBusy(true);
    setAuthStatus("Abriendo Google…","info");
    const {error}=await supabase.auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo:getAuthRedirectUrl()}
    });
    if(error)throw error;
  }catch(error){
    console.error("Google auth error:",error);
    setAuthStatus(friendlyAuthError(error),"error");
    setAuthBusy(false);
  }
}

async function signOutCurrentUser(){
  if(!supabase)return;
  const button=document.getElementById("settingsSignOutButton");
  if(button)button.disabled=true;
  try{
    await flushCloudStateSave();
    const {error}=await supabase.auth.signOut();
    if(error)throw error;
  }catch(error){
    console.error(error);
    showToast(friendlyAuthError(error));
    if(button)button.disabled=false;
  }
}

async function syncAuthDisplayName(name){
  if(!supabase||!authUser||!name)return;
  const current=String(authUser.user_metadata?.full_name||"").trim();
  if(current===name)return;
  try{
    const {data,error}=await supabase.auth.updateUser({data:{full_name:name}});
    if(error)throw error;
    if(data?.user)authUser=data.user;
  }catch(error){
    console.warn("No se pudo sincronizar el nombre del perfil.",error)
  }
}

function formatCloudSyncTimestamp(value){
  if(!value)return "";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "";
  const sameDay=dateKey(date)===todayKey();
  return new Intl.DateTimeFormat("es-PA",sameDay
    ? {hour:"numeric",minute:"2-digit"}
    : {day:"2-digit",month:"short",hour:"numeric",minute:"2-digit"}
  ).format(date);
}

function getCloudSyncView(){
  const offline=typeof navigator!=="undefined"&&navigator.onLine===false;
  if(offline){
    return {state:"offline",badge:"☁ Sin conexión",status:"Sin conexión",detail:"BOARDS sigue guardando una copia local en este dispositivo."};
  }
  if(cloudLastError){
    return {state:"error",badge:"⚠ Pendiente",status:"Pendiente de sincronizar",detail:"La copia local está segura. BOARDS reintentará al recuperar conexión."};
  }
  if(cloudSyncInFlight||cloudSyncQueued||cloudSyncTimer){
    return {state:"syncing",badge:"☁ Sincronizando…",status:"Sincronizando…",detail:"Guardando tus últimos cambios en la nube."};
  }
  if(cloudSyncReady&&cloudLastSyncedAt){
    const when=formatCloudSyncTimestamp(cloudLastSyncedAt);
    return {state:"synced",badge:"☁ Sincronizado",status:"Sincronizado",detail:when?`Última copia: ${when}`:"Tu progreso está respaldado en Supabase."};
  }
  if(cloudSyncReady){
    return {state:"ready",badge:"☁ Nube activa",status:"Nube activa",detail:"La sincronización está preparada para esta cuenta."};
  }
  return {state:"idle",badge:"☁ Preparando",status:"Preparando…",detail:"Conectando tu cuenta con la copia en la nube."};
}

function renderCloudSyncStatus(){
  const view=getCloudSyncView();
  const badge=document.getElementById("settingsCloudSyncBadge");
  const status=document.getElementById("settingsCloudSyncStatus");
  const detail=document.getElementById("settingsCloudSyncDetail");
  if(badge){
    badge.textContent=view.badge;
    badge.className=`account-status-badge sync-${view.state}`;
    badge.title=view.detail;
  }
  if(status)status.textContent=view.status;
  if(detail)detail.textContent=view.detail;
}

function renderAccountSettings(){
  const email=document.getElementById("settingsAccountEmail");
  const provider=document.getElementById("settingsAccountProvider");
  const created=document.getElementById("settingsAccountCreated");
  if(email)email.textContent=authUser?.email||"—";
  if(provider)provider.textContent=getAuthProvider(authUser);
  if(created){
    created.textContent=authUser?.created_at
      ? new Intl.DateTimeFormat("es-PA",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(authUser.created_at))
      : "—";
  }
  renderCloudSyncStatus();
}

async function activateAuthenticatedSession(session,{force=false}={}){
  if(!session?.user)return;
  const changedUser=authUser?.id!==session.user.id;
  authSession=session;
  authUser=session.user;

  if(changedUser||force||!appSessionReady){
    cloudSyncReady=false;
    cloudSyncQueued=false;
    if(cloudSyncTimer){window.clearTimeout(cloudSyncTimer);cloudSyncTimer=null}

    const reconciliation=await reconcileInitialStateWithCloud();
    state=normalizeState(reconciliation.nextState);

    let stateChanged=false;
    const authName=getAuthDisplayName(authUser);
    if(!String(state.profile?.name||"").trim()&&authName){
      state.profile.name=authName;
      stateChanged=true;
    }

    activeStudyDateKey=todayKey();
    aiContextDateKey=todayKey();
    editingSessionId=null;
    aiCurrentAnalysis=null;
    aiQuizRuntime=null;

    if(migrateLegacyPlannerIfNeeded())stateChanged=true;
    if(ensureHistoricalScheduleLocks())stateChanged=true;

    if(stateChanged||reconciliation.needsCloudPush&&!state.updatedAt){
      touchState();
      writeStateToLocal();
      stateChanged=true;
    }else{
      writeStateToLocal();
    }

    cloudSyncReady=true;
    renderCloudSyncStatus();
    if(reconciliation.needsCloudPush||stateChanged)scheduleCloudStateSave(0);
    appSessionReady=true;
  }

  initializeCoreAppOnce();
  applyTheme();
  renderAll();
  showApplication();
  navigateTo(state.currentPage||"dashboard",false);
}

async function handleAuthStateChange(event,session){
  if(event==="PASSWORD_RECOVERY"){
    authRecoveryMode=true;
    authSession=session||authSession;
    authUser=session?.user||authUser;
    showAuthGate("recovery");
    return;
  }

  if(event==="SIGNED_OUT"){
    authSession=null;
    authUser=null;
    appSessionReady=false;
    cloudSyncReady=false;
    cloudSyncQueued=false;
    cloudLastSyncedAt=null;
    cloudLastError=null;
    if(cloudSyncTimer){window.clearTimeout(cloudSyncTimer);cloudSyncTimer=null}
    state=getDefaultState();
    showAuthGate("login");
    return;
  }

  if(session?.user){
    authSession=session;
    authUser=session.user;
    if(event==="SIGNED_IN"||event==="INITIAL_SESSION"){
      if(!authRecoveryMode)await activateAuthenticatedSession(session);
      return;
    }
    if(event==="USER_UPDATED"){
      renderProfile();
      renderAccountSettings();
      return;
    }
    return;
  }

  if(event==="INITIAL_SESSION"&&!session){
    showAuthGate("login");
  }
}

function initializeCoreAppOnce(){
  if(coreAppInitialized)return;
  initNavigation();
  initSidebar();
  initThemeToggle();
  initForms();
  initModal();
  initPlannerControls();
  initDataActions();
  initSessionEditControls();
  initAIControls();
  populateStaticSelects();
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="hidden"&&cloudSyncReady)void flushCloudStateSave();
  });
  window.addEventListener("pagehide",()=>{
    if(cloudSyncReady)void flushCloudStateSave();
  });
  window.addEventListener("offline",()=>{
    renderCloudSyncStatus();
  });
  window.addEventListener("online",()=>{
    cloudLastError=null;
    renderCloudSyncStatus();
    if(cloudSyncReady)scheduleCloudStateSave(0);
  });
  coreAppInitialized=true;
}

async function initApp(){
  initAuthControls();

  if(!supabase){
    showAuthGate("login");
    setAuthStatus("Faltan las variables de Supabase. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en este entorno.","error");
    return;
  }

  supabase.auth.onAuthStateChange((event,session)=>{
    window.setTimeout(()=>handleAuthStateChange(event,session),0);
  });

  const params=new URLSearchParams(window.location.search);
  const hashParams=new URLSearchParams(window.location.hash.replace(/^#/,""));
  const oauthError=params.get("error_description")||hashParams.get("error_description");
  const recoveryRequested=params.get("type")==="recovery"||hashParams.get("type")==="recovery";
  if(oauthError){
    showAuthGate("login");
    setAuthStatus(decodeURIComponent(oauthError),"error");
    return;
  }

  try{
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    if(data?.session?.user&&recoveryRequested){
      authRecoveryMode=true;
      authSession=data.session;
      authUser=data.session.user;
      showAuthGate("recovery");
    }else if(data?.session?.user){
      await activateAuthenticatedSession(data.session);
    }else{
      showAuthGate("login");
    }
  }catch(error){
    console.error("Supabase session error:",error);
    showAuthGate("login");
    setAuthStatus(friendlyAuthError(error),"error");
  }
}
function initNavigation(){document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>navigateTo(b.dataset.page)));document.querySelectorAll("[data-page-link]").forEach(b=>b.addEventListener("click",()=>navigateTo(b.dataset.pageLink)))}
function navigateTo(pageName,persist=true){if(!PAGE_META[pageName])pageName="dashboard";document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById(`page-${pageName}`)?.classList.add("active");document.querySelectorAll(".nav-item").forEach(i=>i.classList.toggle("active",i.dataset.page===pageName));document.getElementById("pageTitle").textContent=PAGE_META[pageName].title;document.getElementById("pageSubtitle").textContent=PAGE_META[pageName].subtitle;if(pageName==="today")renderToday();if(pageName==="ai")renderAIPage();if(persist){state.currentPage=pageName;saveState()}closeSidebar();window.scrollTo({top:0,behavior:"smooth"})}
function initSidebar(){document.getElementById("menuButton")?.addEventListener("click",openSidebar);document.getElementById("sidebarClose")?.addEventListener("click",closeSidebar);document.getElementById("sidebarOverlay")?.addEventListener("click",closeSidebar)}
function openSidebar(){document.getElementById("sidebar")?.classList.add("open");document.getElementById("sidebarOverlay")?.classList.add("open")}
function closeSidebar(){document.getElementById("sidebar")?.classList.remove("open");document.getElementById("sidebarOverlay")?.classList.remove("open")}
function initThemeToggle(){document.getElementById("themeToggle")?.addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";applyTheme();saveState()})}
function applyTheme(){document.body.classList.toggle("dark",state.theme==="dark");const t=document.getElementById("themeToggle");if(t)t.textContent=state.theme==="dark"?"☀":"☾"}
function populateStaticSelects(){fillSelect("errorSystem",SYSTEMS);fillSelect("errorSystemFilter",SYSTEMS,true);fillSelect("errorPopulation",POPULATION_CONTEXTS);fillSelect("errorPopulationFilter",POPULATION_CONTEXTS,true);fillSelect("errorType",ERROR_TYPES);fillSelect("errorTypeFilter",ERROR_TYPES,true)}
function fillSelect(id,values,all=false){const el=document.getElementById(id);if(!el)return;el.innerHTML=(all?'<option value="all">Todos</option>':"")+values.map(v=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join("")}
function renderAll(){renderProfile();renderDashboard();renderToday();renderPlanner();renderPrebank();renderAIPage();renderErrors();renderPerformance();renderSettings();renderSidebar()}
function renderProfile(){
  const name=String(state.profile?.name||"").trim()||getAuthDisplayName(authUser)||"Estudiante";
  const nameEl=document.getElementById("profileName");
  const avatar=document.getElementById("profileAvatar");
  const email=document.getElementById("profileEmail");
  if(nameEl)nameEl.textContent=name;
  if(avatar)avatar.textContent=name.split(/\s+/).slice(0,2).map(p=>p[0]).join("").toUpperCase()||"BP";
  if(email)email.textContent=authUser?.email||"BOARDS Prep";
}
function getGreeting(){const h=new Date().getHours();return h<12?"Buenos días":h<18?"Buenas tardes":"Buenas noches"}
function renderDashboard(){const ctx=getOperationalContext(new Date()),m=getModule(ctx.isStudyDay?ctx.moduleId:state.currentModuleId),pos=getModulePosition(m.id),name=state.profile.name.trim(),schedule=getStudySchedule();document.getElementById("dashboardGreeting").textContent=name?`${getGreeting()}, ${name.split(" ")[0]}`:getGreeting();document.getElementById("dashboardWeekDescription").textContent=ctx.isStudyDay?`${ctx.phaseLabel||"Plan adaptativo"} · ${m.title}`:`Bloque curricular ${pos} de 8 · ${m.title}`;document.getElementById("dashboardPlanMode").textContent=schedule?`Plan adaptativo · ${schedule.profile.label}`:(state.studyMode==="custom"?"Orden personalizado":"Orden recomendado");renderDashboardSchedule();renderDashboardStats();renderDashboardToday();renderPriorities();renderDashboardWeeks();renderOverallProgress()}
function renderDashboardSchedule(){const c=document.getElementById("dashboardScheduleInfo"),schedule=getStudySchedule(),ctx=getOperationalContext(new Date());if(!schedule){c.textContent="Configura tus fechas para generar el calendario adaptativo.";return}const b=ctx.isStudyDay?ctx.block:getScheduleBlock(state.currentModuleId);c.textContent=b?`${formatDateRange(b.startDate,b.endDate)} · ${b.studyDays} días efectivos en esta visita · ${schedule.totalStudyDays} días efectivos totales`:`${formatDate(schedule.start)} → ${formatDate(schedule.exam)} · ${schedule.totalStudyDays} días efectivos` }
function getQuestionTotals(){const questions=state.bankSessions.reduce((a,s)=>a+Number(s.questions||0),0),correct=state.bankSessions.reduce((a,s)=>a+Number(s.correct||0),0);return {questions,correct,accuracy:questions?Math.round(correct/questions*100):0}}
function renderDashboardStats(){const t=getQuestionTotals();document.getElementById("statQuestions").textContent=t.questions;document.getElementById("statAccuracy").textContent=t.questions?`${t.accuracy}%`:"—";document.getElementById("statErrors").textContent=state.errors.length;document.getElementById("statStreak").textContent=calculateStreak()}
function renderDashboardToday(){const c=document.getElementById("dashboardWeekTasks"),title=document.getElementById("currentWeekPanelTitle"),chip=document.getElementById("currentWeekDateChip"),ctx=getOperationalContext(new Date()),m=getModule(ctx.moduleId);title.textContent=ctx.isStudyDay?m.shortTitle:"Objetivos del día";chip.textContent=formatShortDate(new Date());chip.classList.add("visible");if(!ctx.isStudyDay){let msg="Hoy no tienes una jornada de estudio programada.";if(ctx.type==="before-plan")msg="Tu calendario todavía no ha comenzado.";if(ctx.type==="no-calendar")msg="Configura tu calendario para activar los objetivos diarios.";c.innerHTML=`<div class="empty-mini">${msg}</div>`;return}c.innerHTML=renderDailyTaskRowsHTML(ctx,false);bindDailyTaskButtons(c,ctx)}
function getErrorPriorities(){const counts={};state.errors.forEach(i=>counts[i.topic]=(counts[i.topic]||0)+1);return Object.entries(counts).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)}
function renderPriorities(){const c=document.getElementById("priorityList"),p=getErrorPriorities();c.innerHTML=p.length?p.slice(0,4).map((x,i)=>`<div class="priority-item"><div class="priority-rank">${i+1}</div><div class="priority-copy"><strong>${escapeHTML(x.name)}</strong><span>${x.count} ${x.count===1?"error":"errores"}</span></div></div>`).join(""):'<div class="empty-mini">Aún no hay suficientes errores registrados. Cuando agregues preguntas falladas, aquí aparecerán tus principales puntos ciegos.</div>'}
function renderDashboardWeeks(){const c=document.getElementById("dashboardWeeks"),ctx=getOperationalContext(new Date()),currentId=ctx.isStudyDay?ctx.moduleId:state.currentModuleId;c.innerHTML=getActiveStudyOrder().map((id,i)=>{const m=getModule(id),p=getModuleProgress(id),visits=getScheduleBlocksForModule(id).length;return `<div class="week-progress-card ${id===currentId?"current":""}"><span class="week-progress-position">BLOQUE ${i+1}${visits>1?` · ${visits} visitas`:""}</span><strong>${escapeHTML(m.shortTitle)}</strong><span>${p}% completado</span><div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div></div>`}).join("")}
function renderOverallProgress(){const p=getOverallProgress();document.getElementById("overallProgressRing").style.setProperty("--progress",`${p*3.6}deg`);document.getElementById("overallProgressValue").textContent=`${p}%`}

function renderToday(){const d=parseLocalDate(activeStudyDateKey)||normalizeDate(new Date()),ctx=getOperationalContext(d);document.getElementById("todayDate").textContent=formatLongLocalDate(d);renderTodayHeadingActions();renderTodayPendingAlert();renderTodayCommandCard(ctx);renderTodayMetrics(ctx);renderTodayProgress(ctx);renderTodayTopics(ctx);renderQuestionGoal(ctx);renderSessionFormContext(ctx);renderTodaySessionHistory(ctx)}
function renderTodayHeadingActions(){const c=document.getElementById("todayHeadingActions");if(isViewingToday()){c.innerHTML="";return}c.innerHTML='<span class="history-date-badge">Viendo jornada histórica</span><button class="button button-secondary" data-return-today>Volver a hoy</button>';c.querySelector("[data-return-today]")?.addEventListener("click",returnToToday)}
function renderTodayCommandCard(ctx){const c=document.getElementById("todayCommandCard"),m=getModule(ctx.moduleId);c.classList.toggle("history-mode",!isViewingToday());if(ctx.type==="no-calendar"){c.innerHTML='<div class="daily-command-main"><span class="daily-command-label">CALENDARIO ADAPTATIVO</span><h3>Configura tu plan de estudio</h3><p>Añade tus fechas y días disponibles para que BOARDS pueda construir cada jornada.</p></div><div class="daily-command-side"><span class="daily-status-pill future">Sin calendario</span></div>';return}if(ctx.type==="before-plan"){c.innerHTML=`<div class="daily-command-main"><span class="daily-command-label">TU PLAN COMIENZA PRONTO</span><h3>${escapeHTML(getModule(ctx.block?.moduleId??ctx.moduleId).shortTitle)}</h3><p>Tu primera jornada está programada para ${ctx.block?.startDate?formatDate(ctx.block.startDate):"la fecha configurada"}.</p></div><div class="daily-command-side"><span class="daily-status-pill future">Próximamente</span></div>`;return}if(ctx.type==="after-exam"){c.innerHTML='<div class="daily-command-main"><span class="daily-command-label">PLAN FINALIZADO</span><h3>La fecha del examen ya llegó</h3><p>Actualiza tu calendario si deseas continuar utilizando la plataforma.</p></div><div class="daily-command-side"><span class="daily-status-pill future">Finalizado</span></div>';return}if(ctx.type==="rest"){c.innerHTML='<div class="daily-command-main"><span class="daily-command-label">RECUPERACIÓN</span><h3>Día de descanso programado</h3><p>Esta fecha no tiene una jornada formal asignada en el calendario.</p></div><div class="daily-command-side"><span class="daily-status-pill rest">Descanso</span></div>';return}c.innerHTML=`<div class="daily-command-main"><span class="daily-command-label">${escapeHTML((ctx.phaseLabel||ctx.block.phaseLabel||"PLAN ADAPTATIVO").toUpperCase())} · BLOQUE ${getModulePosition(ctx.moduleId)}</span><h3>${escapeHTML(m.title)}</h3><p>${escapeHTML(ctx.block.blockLabel||"Jornada programada")} · ${formatDateRange(ctx.block.startDate,ctx.block.endDate)} · Meta diaria: ${state.profile.dailyQuestionGoal} preguntas${ctx.locked?' · Histórico protegido':''}</p></div><div class="daily-command-side"><span class="daily-day-number">Día ${(ctx.moduleDayIndex??ctx.dayIndex)+1}</span><span class="daily-day-label">de ${ctx.moduleTotalDays??ctx.totalDays} en el plan actual</span><span class="daily-status-pill ${isViewingToday()?"":"history"}">${isViewingToday()?"Jornada activa":"Jornada histórica"}</span></div>`}
function renderTodayMetrics(ctx){const c=document.getElementById("todayMetricsGrid"),local=dateKey(ctx.date),s=getQuestionStatsForDate(local,ctx.moduleId),ms=getModuleQuestionStats(ctx.moduleId),goal=Number(state.profile.dailyQuestionGoal||40),r=Math.max(goal-s.questions,0);c.innerHTML=`<article class="daily-metric-card"><span>PREGUNTAS DEL DÍA</span><strong>${s.questions} / ${goal}</strong><small>${s.questions>=goal?"Meta alcanzada":"Progreso del banco"}</small></article><article class="daily-metric-card"><span>RESTANTES</span><strong>${r}</strong><small>preguntas para completar la meta</small></article><article class="daily-metric-card"><span>PRECISIÓN DEL DÍA</span><strong>${s.accuracy===null?"—":`${s.accuracy}%`}</strong><small>${s.questions?`${s.correct}/${s.questions} correctas`:"Sin bloques todavía"}</small></article><article class="daily-metric-card"><span>PRECISIÓN DEL MÓDULO</span><strong>${ms.accuracy===null?"—":`${ms.accuracy}%`}</strong><small>${ms.questions?`${ms.questions} preguntas acumuladas`:"Sin datos suficientes"}</small></article>`}
function renderTodayProgress(ctx){const c=document.getElementById("todayTaskList"),bar=document.getElementById("todayProgressBar"),value=document.getElementById("todayProgressValue");if(!ctx.isStudyDay){bar.style.width="0%";value.textContent="—";c.innerHTML=`<div class="empty-mini">${ctx.type==="rest"?"Esta fecha es un día de descanso programado.":"No hay una jornada operativa activa para esta fecha."}</div>`;return}const local=dateKey(ctx.date),d=getDailyCompletionData(local,ctx.moduleId);bar.style.width=`${d.percentage}%`;value.textContent=`${d.percentage}%`;c.innerHTML=renderDailyTaskRowsHTML(ctx,true);bindDailyTaskButtons(c,ctx)}
function getAIAnalysisCountForDate(localDate,moduleId){return state.aiAnalyses.filter(a=>a.localDate===localDate&&Number(a.moduleId)===Number(moduleId)).length}
function renderDailyTaskRowsHTML(ctx,detailed=true){const local=dateKey(ctx.date),d=getDailyCompletionData(local,ctx.moduleId),rows=[];DAILY_MANUAL_TASKS.forEach(task=>{const done=Boolean(d.record[task.id]);let desc=task.description;if(task.id==="review"){const n=getAIAnalysisCountForDate(local,ctx.moduleId);if(n)desc=`${n} análisis BOARDS AI realizado${n===1?"":"s"} en esta jornada · ${task.description}`}rows.push(`<div class="daily-task-row ${done?"done":""}"><div class="daily-task-check">${done?"✓":""}</div><div class="daily-task-copy"><strong>${escapeHTML(task.title)}</strong>${detailed?`<span>${escapeHTML(desc)}</span>`:""}</div><button class="daily-task-action" data-daily-task="${task.id}">${done?"Reabrir":"Completar"}</button></div>`);if(task.id==="prebank"){const q=d.questionsCompleted;rows.push(`<div class="daily-task-row ${q?"done":""}"><div class="daily-task-check">${q?"✓":""}</div><div class="daily-task-copy"><strong>Banco de preguntas</strong><span>${d.questionStats.questions} / ${d.goal} preguntas realizadas</span></div><span class="auto-badge">AUTOMÁTICO</span></div>`)}});return rows.join("")}
function bindDailyTaskButtons(c,ctx){c.querySelectorAll("[data-daily-task]").forEach(b=>b.addEventListener("click",()=>toggleDailyTask(dateKey(ctx.date),ctx.moduleId,b.dataset.dailyTask)))}
function renderTodayTopics(ctx){const c=document.getElementById("todayTopicAssignment");if(!ctx.isStudyDay){c.innerHTML=`<div class="empty-mini">${ctx.type==="rest"?"No hay temas obligatorios asignados en esta fecha.":"Los temas aparecerán cuando exista una jornada activa."}</div>`;return}const t=getAssignedTopics(ctx);c.innerHTML=`<div class="today-topic-list">${t.map((x,i)=>`<div class="today-topic-item"><div class="today-topic-index">${i+1}</div><div><strong>${escapeHTML(x)}</strong><span>Presentación → diagnóstico → Next Best Step → tratamiento</span></div></div>`).join("")}</div><div class="today-topic-actions"><button class="button button-secondary" data-open-today-prebank>Abrir Pre-Bank</button></div>`;c.querySelector("[data-open-today-prebank]")?.addEventListener("click",()=>{state.currentModuleId=ctx.moduleId;saveState();renderAll();navigateTo("prebank")})}
function renderQuestionGoal(ctx){const c=document.getElementById("todayQuestionGoal"),local=dateKey(ctx.date),s=getQuestionStatsForDate(local,ctx.moduleId),goal=Number(state.profile.dailyQuestionGoal||40),pct=Math.round(clamp(s.questions/goal,0,1)*100),r=Math.max(goal-s.questions,0);c.innerHTML=`<div class="question-goal-top"><div><span>META DEL DÍA</span><strong>${s.questions} / ${goal}</strong></div><span>${r?`${r} pendientes`:"Meta completada ✓"}</span></div><div class="question-goal-track"><div class="question-goal-fill" style="width:${pct}%"></div></div><div class="question-goal-meta"><span>${pct}% de la meta</span><span>${s.accuracy===null?"Sin precisión aún":`${s.accuracy}% correctas`}</span></div>`}
function renderSessionFormContext(ctx){const select=document.getElementById("sessionSystem"),badge=document.getElementById("sessionContextBadge"),note=document.getElementById("sessionSystemNote"),submit=document.getElementById("sessionSubmitButton"),q=document.getElementById("sessionQuestions"),correct=document.getElementById("sessionCorrect"),noteInput=document.getElementById("sessionNote"),editing=editingSessionId?state.bankSessions.find(s=>s.id===editingSessionId):null,allowed=getAllowedSystemsForModule(ctx.moduleId);select.innerHTML=allowed.map(s=>`<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");let mismatch=false;if(editing&&!allowed.includes(editing.system)){mismatch=true;select.insertAdjacentHTML("afterbegin",`<option value="${escapeHTML(editing.system)}">⚠ ${escapeHTML(editing.system)} — revisar</option>`)}if(editing)select.value=editing.system;const m=getModule(ctx.moduleId);badge.innerHTML=`<strong>Bloque ${getModulePosition(ctx.moduleId)} · ${escapeHTML(m.shortTitle)}</strong><span>${escapeHTML(ctx.phaseLabel||ctx.block?.phaseLabel||"")} · ${formatShortDate(ctx.date)}</span>${allowed.length===1?'<span class="system-lock-chip">Sistema bloqueado</span>':""}`;note.className=mismatch?"integrity-note visible warning":"integrity-note visible";note.textContent=mismatch?"Este registro antiguo usa un sistema que no pertenece al módulo. Selecciona una opción válida antes de guardar.":allowed.length===1?"El sistema se asigna automáticamente para evitar inconsistencias entre el módulo y las estadísticas.":"Selecciona el componente específico que trabajaste dentro de este módulo.";const enabled=ctx.isStudyDay;select.disabled=!enabled||(allowed.length===1&&!mismatch);q.disabled=!enabled;correct.disabled=!enabled;noteInput.disabled=!enabled;submit.disabled=!enabled;renderSessionEditMode(editing)}
function initSessionEditControls(){document.getElementById("cancelSessionEdit")?.addEventListener("click",()=>cancelSessionEdit())}
function renderSessionEditMode(session){const title=document.getElementById("sessionFormTitle"),mode=document.getElementById("sessionFormMode"),submit=document.getElementById("sessionSubmitButton"),cancel=document.getElementById("cancelSessionEdit"),hidden=document.getElementById("sessionEditId");if(!session){title.textContent="Registrar bloque";mode.textContent="";mode.classList.remove("visible");submit.textContent="Registrar bloque";cancel.hidden=true;hidden.value="";return}title.textContent="Editar bloque";mode.textContent="MODO EDICIÓN";mode.classList.add("visible");submit.textContent="Guardar cambios";cancel.hidden=false;hidden.value=session.id;document.getElementById("sessionQuestions").value=session.questions;document.getElementById("sessionCorrect").value=session.correct;document.getElementById("sessionNote").value=session.note||""}
function startEditingSession(id){const s=state.bankSessions.find(x=>x.id===id);if(!s)return;activeStudyDateKey=getSessionDateKey(s);editingSessionId=s.id;renderToday();requestAnimationFrame(()=>document.getElementById("sessionForm")?.scrollIntoView({behavior:"smooth",block:"center"}))}
function cancelSessionEdit(render=true){editingSessionId=null;document.getElementById("sessionForm")?.reset();if(render)renderToday()}
function initForms(){document.getElementById("sessionForm")?.addEventListener("submit",handleSessionSubmit);document.getElementById("errorForm")?.addEventListener("submit",handleErrorSubmit);document.getElementById("settingsForm")?.addEventListener("submit",handleSettingsSubmit);document.getElementById("errorSystemFilter")?.addEventListener("change",renderErrors);document.getElementById("errorPopulationFilter")?.addEventListener("change",renderErrors);document.getElementById("errorTypeFilter")?.addEventListener("change",renderErrors);document.getElementById("prebankWeekSelect")?.addEventListener("change",renderPrebank);document.getElementById("settingsPlanPreset")?.addEventListener("change",handlePlanPresetChange);["settingsStartDate","settingsExamDate","settingsDailyGoal"].forEach(id=>document.getElementById(id)?.addEventListener("input",()=>{const preset=document.getElementById("settingsPlanPreset");if(id==="settingsExamDate"&&preset)preset.value="custom";if(id==="settingsStartDate"&&preset&&preset.value!=="custom"){const start=parseLocalDate(document.getElementById("settingsStartDate")?.value),end=start?applyPresetEndDate(start,preset.value):null;if(end)document.getElementById("settingsExamDate").value=dateKey(end)}renderSettingsPlanPreview()}));document.querySelectorAll("[data-study-day]").forEach(i=>i.addEventListener("change",renderSettingsPlanPreview))}
function handleSessionSubmit(e){e.preventDefault();const active=parseLocalDate(activeStudyDateKey),ctx=getOperationalContext(active);if(!ctx.isStudyDay){showToast("Esta fecha no tiene una jornada de estudio activa.");return}const questions=Number(document.getElementById("sessionQuestions").value),correct=Number(document.getElementById("sessionCorrect").value),system=document.getElementById("sessionSystem").value,allowed=getAllowedSystemsForModule(ctx.moduleId);if(!allowed.includes(system)){showToast("Selecciona un sistema compatible con este módulo.");return}if(!questions||questions<1){showToast("Introduce un total válido de preguntas.");return}if(correct<0||correct>questions){showToast("Las correctas no pueden superar el total.");return}const note=document.getElementById("sessionNote").value.trim();if(editingSessionId){const i=state.bankSessions.findIndex(s=>s.id===editingSessionId);if(i===-1){showToast("No se encontró el bloque a editar.");return}state.bankSessions[i]={...state.bankSessions[i],system,questions,correct,note,moduleId:ctx.moduleId,localDate:activeStudyDateKey,updatedAt:new Date().toISOString()};editingSessionId=null;ensureHistoricalScheduleLocks();saveState();renderAll();showToast("Bloque actualizado correctamente.");return}state.bankSessions.unshift({id:createId("session"),system,questions,correct,note,moduleId:ctx.moduleId,localDate:activeStudyDateKey,date:new Date().toISOString()});ensureHistoricalScheduleLocks();saveState();e.currentTarget.reset();renderAll();const d=getDailyCompletionData(activeStudyDateKey,ctx.moduleId);showToast(d.questionsCompleted?"Bloque guardado · Meta diaria alcanzada ✓":`Bloque guardado · faltan ${Math.max(d.goal-d.questionStats.questions,0)} preguntas.`)}
function openSessionInAI(session){aiContextDateKey=getSessionDateKey(session);aiLinkedSessionId=session.id;aiSelectedSystem=session.system;aiCurrentAnalysis=null;aiQuizRuntime=null;navigateTo("ai")}
function renderTodaySessionHistory(ctx){const c=document.getElementById("todaySessionHistory"),k=document.getElementById("sessionHistoryKicker");k.textContent=isViewingToday()?"HOY":formatShortDate(ctx.date).toUpperCase();const sessions=getSessionsForDate(dateKey(ctx.date),ctx.moduleId);if(!sessions.length){c.innerHTML='<div class="empty-mini">Todavía no hay bloques registrados para esta jornada.</div>';return}c.innerHTML=sessions.map(s=>{const acc=s.questions?Math.round(s.correct/s.questions*100):0,time=s.date?new Intl.DateTimeFormat("es-PA",{hour:"numeric",minute:"2-digit"}).format(new Date(s.date)):"",valid=isSessionSystemAllowed(s.system,s.moduleId),errors=Math.max(Number(s.questions)-Number(s.correct),0);return `<div class="session-row"><div class="session-system"><div class="session-system-header"><strong>${escapeHTML(s.system)}</strong>${!valid?'<span class="session-integrity-warning">REVISAR SISTEMA</span>':""}</div><span>${time}${s.note?` · ${escapeHTML(s.note)}`:""}${errors?` · ${errors} error${errors===1?"":"es"}`:""}</span></div><div class="session-data">Preguntas<strong>${s.questions}</strong></div><div class="session-data">Correctas<strong>${s.correct}</strong></div><div class="session-data">Precisión<strong>${acc}%</strong></div><div class="session-actions">${errors?`<button class="session-ai" data-ai-session="${s.id}">✦ Analizar errores</button>`:""}<button class="session-edit" data-edit-session="${s.id}">Editar</button><button class="session-delete" data-delete-session="${s.id}">Eliminar</button></div></div>`}).join("");c.querySelectorAll("[data-ai-session]").forEach(b=>b.addEventListener("click",()=>{const s=state.bankSessions.find(x=>x.id===b.dataset.aiSession);if(s)openSessionInAI(s)}));c.querySelectorAll("[data-edit-session]").forEach(b=>b.addEventListener("click",()=>startEditingSession(b.dataset.editSession)));c.querySelectorAll("[data-delete-session]").forEach(b=>b.addEventListener("click",()=>{if(!window.confirm("¿Eliminar este bloque de preguntas?"))return;const id=b.dataset.deleteSession;state.bankSessions=state.bankSessions.filter(s=>s.id!==id);if(editingSessionId===id)editingSessionId=null;if(aiLinkedSessionId===id)aiLinkedSessionId="";saveState();renderAll();showToast("Bloque eliminado.")}))}
function renderTodayPendingAlert(){const c=document.getElementById("todayPendingAlert"),p=getPendingPastStudyDays();if(!p.length){c.innerHTML="";return}const v=p.slice(0,3);c.innerHTML=`<div class="pending-alert"><div class="pending-alert-main"><strong>${p.length} ${p.length===1?"jornada previa incompleta":"jornadas previas incompletas"}</strong><span>El calendario no se moverá automáticamente. Puedes abrir una jornada para completarla o corregir sus registros.</span><div class="pending-links">${v.map(x=>`<button class="pending-day-button" data-open-pending-day="${dateKey(x.date)}">${formatShortDate(x.date)} · ${escapeHTML(getModule(x.block.moduleId).shortTitle)} · ${x.completion.percentage}%</button>`).join("")}${p.length>3?`<span class="pending-more">+${p.length-3} más</span>`:""}</div></div></div>`;c.querySelectorAll("[data-open-pending-day]").forEach(b=>b.addEventListener("click",()=>setActiveStudyDate(b.dataset.openPendingDay)))}

function initPlannerControls(){document.querySelectorAll("[data-study-mode]").forEach(b=>b.addEventListener("click",()=>{const m=b.dataset.studyMode;if(!["recommended","custom"].includes(m))return;ensureHistoricalScheduleLocks();state.studyMode=m;saveState();renderAll()}));document.getElementById("resetStudyOrder")?.addEventListener("click",()=>{if(!window.confirm("¿Restaurar el orden personalizado?"))return;ensureHistoricalScheduleLocks();state.studyOrder=[...DEFAULT_STUDY_ORDER];state.studyMode="custom";saveState();renderAll();showToast("Orden restaurado. El historial previo permanece protegido.")})}
function renderPlanner(){renderPlannerModeButtons();renderScheduleOverview();renderPlannerOrderSummary();renderPlannerInstruction();renderPlannerCards()}
function renderPlannerModeButtons(){document.querySelectorAll("[data-study-mode]").forEach(b=>b.classList.toggle("active",b.dataset.studyMode===state.studyMode));document.getElementById("resetStudyOrder").style.display=state.studyMode==="custom"?"inline-flex":"none"}
function renderScheduleOverview(){const c=document.getElementById("scheduleOverview"),s=getStudySchedule();if(!s){c.innerHTML='<div class="schedule-empty"><div><strong>Configura tu calendario</strong><p>Añade fecha de inicio, fecha del examen y días de estudio. BOARDS elegirá automáticamente la estrategia según el tiempo disponible.</p></div><button class="button button-secondary" data-open-settings>Configurar fechas</button></div>';c.querySelector("[data-open-settings]")?.addEventListener("click",()=>navigateTo("settings"));return}const days=differenceInDays(normalizeDate(new Date()),s.exam),pending=getPendingPastStudyDays(),locked=Object.keys(state.scheduleLocks||{}).length;c.innerHTML=`<div class="adaptive-plan-banner"><div><span class="panel-kicker">ADAPTIVE STUDY PLANNER</span><h3>${escapeHTML(s.profile.label)} · ${escapeHTML(getPlanDurationLabel(s.calendarDays))}</h3><p>${escapeHTML(s.profile.description)}</p></div><div class="adaptive-plan-badge">${s.phases.length} fases</div></div><div class="schedule-stats"><div class="schedule-stat"><span>DURACIÓN</span><strong>${escapeHTML(getPlanDurationLabel(s.calendarDays))}</strong></div><div class="schedule-stat"><span>DÍAS EFECTIVOS</span><strong>${s.totalStudyDays}</strong></div><div class="schedule-stat"><span>PREGUNTAS PROYECTADAS</span><strong>${s.totalQuestions}</strong></div><div class="schedule-stat"><span>DÍAS HASTA EXAMEN</span><strong>${days>=0?days:"—"}</strong></div></div><div class="phase-timeline">${s.phases.map((phase,i)=>`<article class="phase-card"><div class="phase-card-top"><span>FASE ${i+1}</span><strong>${escapeHTML(phase.label)}</strong></div><p>${escapeHTML(phase.description)}</p><div class="phase-meta"><span>${phase.studyDays} días efectivos</span><span>${phase.startDate&&phase.endDate?formatDateRange(phase.startDate,phase.endDate):"Sin fechas"}</span></div></article>`).join("")}</div><div class="schedule-current"><div><strong>Calendario adaptativo activo</strong><span>${formatDate(s.start)} → ${formatDate(s.exam)} · ${state.profile.dailyQuestionGoal} preguntas/día${pending.length?` · ${pending.length} jornadas pendientes`:""}${locked?` · ${locked} jornadas históricas protegidas`:""}</span></div><span class="future-recalc-note">El pasado queda bloqueado; solo se recalcula el futuro.</span></div>`}
function renderPlannerOrderSummary(){const c=document.getElementById("plannerOrderSummary"),systemOrder=getSystemStudyOrder();c.innerHTML='<span class="order-summary-label">PRIMERA VUELTA</span>'+systemOrder.map((id,i)=>`<span class="order-summary-chip ${id===state.currentModuleId?"current":""}">${i+1}. ${escapeHTML(getModule(id).shortTitle)}</span>`).join("")+`<span class="order-summary-chip fixed">${systemOrder.length+1}. Consolidación · fija</span>`}
function renderPlannerInstruction(){const s=getStudySchedule(),profile=s?.profile;document.getElementById("plannerInstruction").innerHTML=state.studyMode==="custom"?`<strong>Orden personalizado activo.</strong> Reordena los 7 sistemas de la primera vuelta. La consolidación permanece al final; en planes largos, BOARDS vuelve a visitar sistemas débiles durante las fases adaptativas.${profile?` Estrategia actual: <strong>${escapeHTML(profile.label)}</strong>.`:""}`:`<strong>Orden recomendado activo.</strong> BOARDS distribuye los días según peso curricular y, en planes extensos, añade revisitas adaptativas.${profile?` Estrategia actual: <strong>${escapeHTML(profile.label)}</strong>.`:""}`}
function getModuleScheduleSummary(moduleId){const blocks=getScheduleBlocksForModule(moduleId),dates=blocks.flatMap(b=>b.dates),unique=[...new Map(dates.map(d=>[dateKey(d),d])).values()].sort((a,b)=>a-b),phases=[...new Set(blocks.map(b=>b.phaseLabel).filter(Boolean))];return {blocks,studyDays:unique.length,targetQuestions:unique.length*Number(state.profile.dailyQuestionGoal||0),firstDate:unique[0]||null,lastDate:unique.at(-1)||null,visits:blocks.length,phases}}
function renderPlannerCards(){const c=document.getElementById("plannerWeeks"),order=getActiveStudyOrder(),custom=state.studyMode==="custom",ctx=getOperationalContext(new Date()),currentId=ctx.isStudyDay?ctx.moduleId:state.currentModuleId;c.innerHTML=order.map((id,i)=>{const m=getModule(id),p=getModuleProgress(id),summary=getModuleScheduleSummary(id),current=id===currentId,isConsolidation=id===8,draggable=custom&&!isConsolidation;return `<article class="week-card ${current?"current":""} ${draggable?"custom-order":""}" draggable="${draggable}" data-planner-module="${id}"><div class="week-card-top"><div class="week-card-heading"><div class="week-position-group"><div class="drag-handle ${isConsolidation?"locked":""}">${isConsolidation?"🔒":"⋮⋮"}</div><div><span class="week-number">BLOQUE CURRICULAR ${i+1}</span><span class="week-date-range">${summary.firstDate&&summary.lastDate?formatDateRange(summary.firstDate,summary.lastDate):"Sin fechas asignadas"}</span></div></div><span class="weight-chip">${escapeHTML(m.weight)}</span></div><h3>${escapeHTML(m.title)}</h3><p>${escapeHTML(m.description)}</p><div class="module-visit-summary">${summary.phases.map(x=>`<span>${escapeHTML(x)}</span>`).join("")||'<span>Sin calendario</span>'}</div><div class="week-targets">${summary.studyDays?`<span class="target-chip">${summary.studyDays} días totales</span><span class="target-chip">${summary.visits} ${summary.visits===1?"visita":"visitas"}</span><span class="target-chip">${summary.targetQuestions} preguntas</span>`:'<span class="target-chip">Configura tus fechas</span>'}</div><div class="week-card-progress"><div class="progress-track"><div class="progress-fill" style="width:${p}%"></div></div></div></div><div class="week-card-footer"><span class="week-card-status">${p}% completado${isConsolidation?" · cierre fijo":""}</span><div class="week-card-controls">${draggable?`<button class="reorder-button" data-move-module="${id}" data-direction="-1" ${i===0?"disabled":""}>↑</button><button class="reorder-button" data-move-module="${id}" data-direction="1" ${i>=order.length-2?"disabled":""}>↓</button>`:""}${current?'<span class="current-week-label">Bloque activo</span>':`<button class="current-week-button" data-set-current-module="${id}">Abrir bloque</button>`}</div></div></article>`}).join("");bindPlannerCardEvents(c)}
function bindPlannerCardEvents(c){c.querySelectorAll("[data-set-current-module]").forEach(b=>b.addEventListener("click",()=>setCurrentModule(Number(b.dataset.setCurrentModule))));c.querySelectorAll("[data-move-module]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();moveModuleRelative(Number(b.dataset.moveModule),Number(b.dataset.direction))}));if(state.studyMode!=="custom")return;c.querySelectorAll('[data-planner-module][draggable="true"]').forEach(card=>{card.addEventListener("dragstart",handlePlannerDragStart);card.addEventListener("dragend",handlePlannerDragEnd);card.addEventListener("dragover",handlePlannerDragOver);card.addEventListener("dragleave",handlePlannerDragLeave);card.addEventListener("drop",handlePlannerDrop)})}
function setCurrentModule(id){if(!DEFAULT_STUDY_ORDER.includes(id))return;state.currentModuleId=id;saveState();renderAll();showToast(`Bloque ${getCurrentPosition()}: ${getCurrentModule().shortTitle}.`)}
function moveModuleRelative(id,dir){if(state.studyMode!=="custom"||id===8)return;ensureHistoricalScheduleLocks();const systems=state.studyOrder.filter(x=>x!==8),i=systems.indexOf(id),n=i+dir;if(n<0||n>=systems.length)return;[systems[i],systems[n]]=[systems[n],systems[i]];state.studyOrder=[...systems,8];saveState();renderAll()}
function handlePlannerDragStart(e){draggedModuleId=Number(e.currentTarget.dataset.plannerModule);if(draggedModuleId===8){e.preventDefault();return}e.currentTarget.classList.add("dragging");e.dataTransfer?.setData("text/plain",String(draggedModuleId))}
function handlePlannerDragEnd(e){e.currentTarget.classList.remove("dragging");document.querySelectorAll(".drag-over").forEach(x=>x.classList.remove("drag-over"));draggedModuleId=null}
function handlePlannerDragOver(e){e.preventDefault();const target=Number(e.currentTarget.dataset.plannerModule);if(target!==draggedModuleId&&target!==8)e.currentTarget.classList.add("drag-over")}
function handlePlannerDragLeave(e){e.currentTarget.classList.remove("drag-over")}
function handlePlannerDrop(e){e.preventDefault();e.currentTarget.classList.remove("drag-over");const target=Number(e.currentTarget.dataset.plannerModule);if(!draggedModuleId||draggedModuleId===target||target===8)return;reorderModuleBefore(draggedModuleId,target)}
function reorderModuleBefore(source,target){if(source===8||target===8)return;ensureHistoricalScheduleLocks();const systems=state.studyOrder.filter(x=>x!==8),i=systems.indexOf(source);if(i===-1)return;systems.splice(i,1);const j=systems.indexOf(target);if(j===-1)return;systems.splice(j,0,source);state.studyOrder=[...systems,8];saveState();renderAll();showToast("Orden futuro actualizado. Las jornadas pasadas permanecen intactas.")}

function renderPrebank(){const sel=document.getElementById("prebankWeekSelect"),prev=Number(sel.value),order=getActiveStudyOrder(),selected=DEFAULT_STUDY_ORDER.includes(prev)?prev:state.currentModuleId;sel.innerHTML=order.map((id,i)=>`<option value="${id}">Bloque ${i+1} · ${escapeHTML(getModule(id).shortTitle)}</option>`).join("");sel.value=String(selected);if(!sel.value)sel.value=String(state.currentModuleId);const id=Number(sel.value),m=getModule(id),pos=getModulePosition(id),summary=getModuleScheduleSummary(id),completed=m.topics.filter((_,i)=>isPrebankCompleted(id,i)).length,pct=Math.round(completed/m.topics.length*100);document.getElementById("prebankSummary").innerHTML=`<div class="prebank-summary-main"><strong>Bloque ${pos} · ${escapeHTML(m.shortTitle)}</strong><span>${escapeHTML(m.weight)}${summary.studyDays?` · ${summary.studyDays} días programados · ${summary.visits} ${summary.visits===1?"visita":"visitas"}`:""}</span></div><strong class="prebank-summary-score">${completed}/${m.topics.length} · ${pct}%</strong>`;const c=document.getElementById("prebankTopics");c.innerHTML=m.topics.map((t,i)=>{const checked=isPrebankCompleted(id,i);return `<article class="topic-card ${checked?"completed":""}"><span class="topic-index">${String(i+1).padStart(2,"0")}</span><h3>${escapeHTML(t)}</h3><p>Presentación clínica, diagnóstico, Next Best Step, tratamiento, complicaciones y trampas BOARDS.</p><button class="topic-check-button" data-prebank-topic="${i}" data-prebank-module="${id}">${checked?"✓ Repasado":"Marcar como repasado"}</button></article>`}).join("");c.querySelectorAll("[data-prebank-topic]").forEach(b=>b.addEventListener("click",()=>togglePrebankTopic(Number(b.dataset.prebankModule),Number(b.dataset.prebankTopic))))}
function isPrebankCompleted(id,i){return Boolean(state.prebankCompleted?.[`week-${id}`]?.[i])}
function togglePrebankTopic(id,i){const k=`week-${id}`;if(!state.prebankCompleted[k])state.prebankCompleted[k]={};state.prebankCompleted[k][i]=!state.prebankCompleted[k][i];saveState();renderAll()}

function initModal(){document.getElementById("openErrorModal")?.addEventListener("click",openErrorModal);document.querySelectorAll("[data-close-modal]").forEach(x=>x.addEventListener("click",closeErrorModal));document.addEventListener("keydown",e=>{if(e.key==="Escape")closeErrorModal()})}
function openErrorModal(){document.getElementById("errorModal")?.classList.add("open")}
function closeErrorModal(){document.getElementById("errorModal")?.classList.remove("open")}
function handleErrorSubmit(e){e.preventDefault();state.errors.unshift({id:createId("error"),system:document.getElementById("errorSystem").value,populationContext:document.getElementById("errorPopulation").value,type:document.getElementById("errorType").value,topic:document.getElementById("errorTopic").value.trim(),concept:document.getElementById("errorConcept").value.trim(),userAnswer:document.getElementById("errorUserAnswer").value.trim(),correctAnswer:document.getElementById("errorCorrectAnswer").value.trim(),rule:document.getElementById("errorRule").value.trim(),date:new Date().toISOString()});saveState();e.currentTarget.reset();closeErrorModal();renderAll();showToast("Error registrado.")}
function renderErrors(){const c=document.getElementById("errorList"),sf=document.getElementById("errorSystemFilter")?.value||"all",pf=document.getElementById("errorPopulationFilter")?.value||"all",tf=document.getElementById("errorTypeFilter")?.value||"all",f=state.errors.filter(i=>(sf==="all"||i.system===sf)&&(pf==="all"||(i.populationContext||"No determinado")===pf)&&(tf==="all"||i.type===tf));if(!f.length){c.innerHTML='<div class="empty-state"><strong>No hay errores en esta vista</strong><p>Registra preguntas falladas para construir tu mapa personal de puntos ciegos.</p></div>';return}c.innerHTML=f.map(i=>`<article class="error-card"><div class="error-card-top"><div><h3>${escapeHTML(i.topic)}</h3><div class="error-meta"><span class="meta-chip">${escapeHTML(i.system)}</span><span class="meta-chip population">${escapeHTML(i.populationContext||"No determinado")}</span><span class="meta-chip danger">${escapeHTML(i.type)}</span>${i.richAnalysisId?'<span class="meta-chip ai">✦ BOARDS AI</span>':""}<span class="meta-chip">${formatDate(i.date)}</span></div></div><div class="error-card-actions">${i.richAnalysisId?`<button class="text-button" data-open-analysis="${i.richAnalysisId}">Ver análisis</button>`:""}<button class="delete-error" data-delete-error="${i.id}">Eliminar</button></div></div><div class="error-content-grid"><div class="error-info-box full"><span>CONCEPTO EVALUADO</span><p>${escapeHTML(i.concept)}</p></div><div class="error-info-box"><span>MI RESPUESTA</span><p>${escapeHTML(i.userAnswer||"No registrada")}</p></div><div class="error-info-box"><span>RESPUESTA CORRECTA</span><p>${escapeHTML(i.correctAnswer)}</p></div><div class="error-info-box full"><span>REGLA PARA NO REPETIRLO</span><p>${escapeHTML(i.rule)}</p></div></div></article>`).join("");c.querySelectorAll("[data-open-analysis]").forEach(b=>b.addEventListener("click",()=>openSavedAnalysis(b.dataset.openAnalysis)));c.querySelectorAll("[data-delete-error]").forEach(b=>b.addEventListener("click",()=>{if(!window.confirm("¿Eliminar este error?"))return;state.errors=state.errors.filter(i=>i.id!==b.dataset.deleteError);saveState();renderAll()}))}
function renderPerformance(){const t=getQuestionTotals();document.getElementById("perfQuestions").textContent=t.questions;document.getElementById("perfCorrect").textContent=t.correct;document.getElementById("perfAccuracy").textContent=t.questions?`${t.accuracy}%`:"—";document.getElementById("perfBlindSpots").textContent=getErrorPriorities().length;renderSystemPerformance();renderErrorTypeAnalytics()}
function renderSystemPerformance(){const c=document.getElementById("performanceSystemList"),rows=ALL_SESSION_SYSTEMS.map(system=>{const ss=state.bankSessions.filter(i=>i.system===system),questions=ss.reduce((a,i)=>a+Number(i.questions||0),0),correct=ss.reduce((a,i)=>a+Number(i.correct||0),0);return {system,questions,accuracy:questions?Math.round(correct/questions*100):null}}).filter(x=>x.questions>0).sort((a,b)=>a.accuracy-b.accuracy);c.innerHTML=rows.length?rows.map(x=>`<div class="performance-row"><div class="performance-name"><strong>${escapeHTML(x.system)}</strong><span>${x.questions} preguntas</span></div><div class="performance-bar"><span style="width:${x.accuracy}%"></span></div><div class="performance-value">${x.accuracy}%</div></div>`).join(""):'<div class="empty-mini">Registra sesiones de banco para calcular el rendimiento por sistema.</div>'}
function renderErrorTypeAnalytics(){const c=document.getElementById("errorTypeAnalytics");if(!state.errors.length){c.innerHTML='<div class="empty-mini">Tus patrones de error aparecerán aquí.</div>';return}const counts={};state.errors.forEach(i=>counts[i.type]=(counts[i.type]||0)+1);const max=Math.max(...Object.values(counts));c.innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([type,count])=>`<div class="performance-row"><div class="performance-name"><strong>${escapeHTML(type)}</strong><span>${count} ${count===1?"error":"errores"}</span></div><div class="performance-bar"><span style="width:${Math.round(count/max*100)}%"></span></div><div class="performance-value">${count}</div></div>`).join("")}
function addCalendarMonths(date,months){const d=cloneDate(date),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+months);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return d}
function applyPresetEndDate(start,presetKey){const preset=PLAN_PRESETS[presetKey],d=cloneDate(start);if(!preset||presetKey==='custom')return null;if(preset.weeks)return addDays(d,preset.weeks*7);if(preset.months)return addCalendarMonths(d,preset.months);if(preset.years){d.setFullYear(d.getFullYear()+preset.years);return d}return null}
function handlePlanPresetChange(){const select=document.getElementById("settingsPlanPreset"),startInput=document.getElementById("settingsStartDate"),examInput=document.getElementById("settingsExamDate");if(!select||select.value==='custom'){renderSettingsPlanPreview();return}let start=parseLocalDate(startInput.value);if(!start){start=normalizeDate(new Date());startInput.value=dateKey(start)}const end=applyPresetEndDate(start,select.value);if(end)examInput.value=dateKey(end);renderSettingsPlanPreview()}
function renderSettingsPlanPreview(){const c=document.getElementById("settingsPlanPreview");if(!c)return;const start=parseLocalDate(document.getElementById("settingsStartDate")?.value),exam=parseLocalDate(document.getElementById("settingsExamDate")?.value),studyDays=Array.from(document.querySelectorAll("[data-study-day]:checked")).map(i=>i.value),goal=Number(document.getElementById("settingsDailyGoal")?.value)||40;if(!start||!exam||exam<=start||!studyDays.length){c.innerHTML='<strong>Vista previa del plan</strong><span>Completa las fechas y selecciona al menos un día de estudio.</span>';return}const dates=getStudyDates(start,exam,studyDays),profile=getPlanProfile(dates.length),calendarDays=differenceInDays(start,exam);c.innerHTML=`<div><span>ESTRATEGIA ESTIMADA</span><strong>${escapeHTML(profile.label)}</strong></div><div><span>DURACIÓN</span><strong>${escapeHTML(getPlanDurationLabel(calendarDays))}</strong></div><div><span>DÍAS EFECTIVOS</span><strong>${dates.length}</strong></div><div><span>PREGUNTAS PROYECTADAS</span><strong>${dates.length*goal}</strong></div><p>${escapeHTML(profile.description)} El historial ya realizado no se moverá al guardar cambios.</p>`}
function renderSettings(){
  document.getElementById("settingsName").value=state.profile.name||"";
  document.getElementById("settingsStartDate").value=state.profile.startDate||"";
  document.getElementById("settingsExamDate").value=state.profile.examDate||"";
  document.getElementById("settingsDailyGoal").value=state.profile.dailyQuestionGoal||40;
  const preset=document.getElementById("settingsPlanPreset");
  if(preset)preset.value=state.profile.planPreset||"custom";
  document.querySelectorAll("[data-study-day]").forEach(i=>i.checked=state.profile.studyDays.includes(i.value));
  renderSettingsPlanPreview();
  renderAccountSettings();
}
function handleSettingsSubmit(e){
  e.preventDefault();
  const startDate=document.getElementById("settingsStartDate").value,examDate=document.getElementById("settingsExamDate").value;
  if(startDate&&examDate&&parseLocalDate(examDate)<=parseLocalDate(startDate)){showToast("La fecha del examen debe ser posterior al inicio.");return}
  const studyDays=Array.from(document.querySelectorAll("[data-study-day]:checked")).map(i=>i.value);
  if(!studyDays.length){showToast("Selecciona al menos un día de estudio.");return}
  ensureHistoricalScheduleLocks();
  const name=document.getElementById("settingsName").value.trim();
  state.profile={...state.profile,name,startDate,examDate,dailyQuestionGoal:clamp(Number(document.getElementById("settingsDailyGoal").value)||40,5,200),studyDays,planPreset:document.getElementById("settingsPlanPreset")?.value||"custom"};
  activeStudyDateKey=todayKey();
  aiContextDateKey=todayKey();
  editingSessionId=null;
  saveState();
  if(name)syncAuthDisplayName(name);
  renderAll();
  showToast("Plan futuro recalculado. El historial previo permanece intacto.");
}
function renderSidebar(){const ctx=getOperationalContext(new Date()),moduleId=ctx.isStudyDay?ctx.moduleId:state.currentModuleId,m=getModule(moduleId),p=getModuleProgress(moduleId),progressBox=document.querySelector(".sidebar-progress"),hint=document.getElementById("sidebarProgressHint");document.getElementById("sidebarProgressTitle").textContent=m.shortTitle;document.getElementById("sidebarProgressLabel").textContent=`${p}%`;document.getElementById("sidebarProgressBar").style.width=`${p}%`;if(hint)hint.textContent="Progreso del plan actual";if(progressBox)progressBox.title="Este porcentaje refleja el trabajo completado respecto al plan actual. Si amplías la fecha del examen, BOARDS puede añadir jornadas futuras y el porcentaje puede bajar sin borrar tu progreso realizado.";document.getElementById("topCurrentWeek").textContent=`${getModulePosition(moduleId)} / 8`;document.getElementById("sidebarErrorCount").textContent=state.errors.length}
function calculateStreak(){const dates=new Set(state.bankSessions.map(getSessionDateKey).filter(Boolean));if(!dates.size)return 0;let streak=0,cursor=normalizeDate(new Date());while(true){const k=dateKey(cursor);if(!dates.has(k)){if(streak===0&&k===todayKey()){cursor=addDays(cursor,-1);continue}break}streak++;cursor=addDays(cursor,-1)}return streak}
function getModuleProgress(moduleId){const m=getModule(moduleId),completed=m.topics.filter((_,i)=>isPrebankCompleted(moduleId,i)).length,topicProgress=m.topics.length?completed/m.topics.length*100:0,blocks=getScheduleBlocksForModule(moduleId),dates=[...new Map(blocks.flatMap(b=>b.dates).map(d=>[dateKey(d),d])).values()];if(dates.length){const vals=dates.map(d=>getDailyCompletionData(dateKey(d),moduleId).percentage),avg=vals.length?vals.reduce((a,v)=>a+v,0)/vals.length:0;return Math.round(topicProgress*.4+avg*.6)}const old=FALLBACK_MODULE_TASKS.filter(t=>Boolean(state.plannerTasks?.[`week-${moduleId}`]?.[t.id])).length,total=m.topics.length+FALLBACK_MODULE_TASKS.length;return Math.round((completed+old)/total*100)}
function getOverallProgress(){const v=STUDY_MODULES.map(m=>getModuleProgress(m.id));return Math.round(v.reduce((a,b)=>a+b,0)/v.length)}

function initDataActions(){document.getElementById("exportDataButton")?.addEventListener("click",exportData);document.getElementById("importDataInput")?.addEventListener("change",importData);document.getElementById("resetDataButton")?.addEventListener("click",resetData)}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`boards-panama-${todayKey()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("Respaldo exportado.")}
function importData(e){const file=e.target.files?.[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{state=normalizeState(JSON.parse(r.result));activeStudyDateKey=todayKey();aiContextDateKey=todayKey();editingSessionId=null;aiCurrentAnalysis=null;aiQuizRuntime=null;saveState();applyTheme();renderAll();showToast("Progreso importado.")}catch(err){console.error(err);showToast("Archivo no válido.")}};r.readAsText(file);e.target.value=""}
function resetData(){if(!window.confirm("¿Eliminar todo tu progreso de BOARDS? Este cambio también se sincronizará con la nube."))return;state=getDefaultState();activeStudyDateKey=todayKey();aiContextDateKey=todayKey();editingSessionId=null;aiCurrentAnalysis=null;aiQuizRuntime=null;clearAIImage(false);saveState();applyTheme();renderAll();navigateTo("dashboard");showToast("Datos reiniciados.")}
function showToast(message){const t=document.getElementById("toast");if(!t)return;t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2600)}

/* ======================== BOARDS AI V0.6B.1 ======================== */
function initAIControls(){
  document.querySelectorAll("[data-ai-input-mode]").forEach(b=>b.addEventListener("click",()=>setAIInputMode(b.dataset.aiInputMode)));
  const input=document.getElementById("aiImageInput"),drop=document.getElementById("aiDropzone");
  document.getElementById("aiChooseImageButton")?.addEventListener("click",()=>input?.click());
  document.getElementById("aiChangeImageButton")?.addEventListener("click",()=>input?.click());
  document.getElementById("aiRemoveImageButton")?.addEventListener("click",()=>clearAIImage());
  input?.addEventListener("change",e=>{const f=e.target.files?.[0];if(f)setAIImageFile(f);e.target.value=""});
  ["dragenter","dragover"].forEach(type=>drop?.addEventListener(type,e=>{e.preventDefault();drop.classList.add("dragging")}));
  ["dragleave","drop"].forEach(type=>drop?.addEventListener(type,e=>{e.preventDefault();drop.classList.remove("dragging")}));
  drop?.addEventListener("drop",e=>{const f=e.dataTransfer?.files?.[0];if(f)setAIImageFile(f)});
  document.addEventListener("paste",e=>{
    if(state.currentPage!=="ai"||aiInputMode!=="image")return;
    const item=Array.from(e.clipboardData?.items||[]).find(x=>x.type.startsWith("image/"));
    const f=item?.getAsFile();
    if(f){e.preventDefault();setAIImageFile(f)}
  });
  document.getElementById("aiAnalyzeButton")?.addEventListener("click",runAIAnalysis);
  document.getElementById("aiSystemSelect")?.addEventListener("change",e=>{aiSelectedSystem=e.target.value});
  document.getElementById("aiBlockSelect")?.addEventListener("change",e=>{
    aiLinkedSessionId=e.target.value;
    const session=state.bankSessions.find(x=>x.id===aiLinkedSessionId);
    if(session&&isSessionSystemAllowed(session.system,session.moduleId))aiSelectedSystem=session.system;
    renderAIContext()
  })
}
function setAIInputMode(mode){aiInputMode=mode==="text"?"text":"image";document.querySelectorAll("[data-ai-input-mode]").forEach(b=>b.classList.toggle("active",b.dataset.aiInputMode===aiInputMode));document.getElementById("aiImageMode")?.classList.toggle("active",aiInputMode==="image");document.getElementById("aiTextMode")?.classList.toggle("active",aiInputMode==="text")}
function setAIImageFile(file){
  if(!file.type.startsWith("image/")){showToast("Selecciona una imagen válida.");return}
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)){showToast("Usa una imagen PNG, JPG o WEBP.");return}
  if(file.size>12*1024*1024){showToast("La imagen supera 12 MB. Recórtala o comprímela antes de subirla.");return}
  clearAIImage(false);
  aiImageFile=file;
  aiImagePreviewUrl=URL.createObjectURL(file);
  renderAIImagePreview()
}
function clearAIImage(render=true){if(aiImagePreviewUrl)URL.revokeObjectURL(aiImagePreviewUrl);aiImagePreviewUrl="";aiImageFile=null;if(render)renderAIImagePreview()}
function renderAIImagePreview(){const preview=document.getElementById("aiImagePreview"),empty=document.getElementById("aiDropzoneEmpty"),img=document.getElementById("aiPreviewImage");if(!preview||!empty||!img)return;if(aiImageFile&&aiImagePreviewUrl){empty.hidden=true;preview.hidden=false;img.src=aiImagePreviewUrl;document.getElementById("aiPreviewName").textContent=aiImageFile.name||"captura pegada";document.getElementById("aiPreviewSize").textContent=`${(aiImageFile.size/1024/1024).toFixed(2)} MB`}else{empty.hidden=false;preview.hidden=true;img.removeAttribute("src")}}
function getAIContext(){const d=parseLocalDate(aiContextDateKey)||normalizeDate(new Date()),ctx=getOperationalContext(d);return {...ctx,localDate:dateKey(d)}}
function renderAIPage(){setAIInputMode(aiInputMode);renderAIImagePreview();renderAIContext();renderAIUsageMeter();renderAIRecent();renderAIResult()}
function renderAIContext(){const ctx=getAIContext(),c=document.getElementById("aiContextSummary"),systemSelect=document.getElementById("aiSystemSelect"),blockSelect=document.getElementById("aiBlockSelect");if(!c||!systemSelect||!blockSelect)return;const m=getModule(ctx.moduleId),dayText=ctx.isStudyDay?`Día ${(ctx.moduleDayIndex??ctx.dayIndex)+1} de ${ctx.moduleTotalDays??ctx.totalDays}`:ctx.type==="rest"?"Día de descanso":"Sin jornada activa";c.className="ai-context-summary";c.innerHTML=`<div class="ai-context-stat"><span>FECHA</span><strong>${formatShortDate(ctx.date)}</strong></div><div class="ai-context-stat"><span>FASE</span><strong>${escapeHTML(ctx.phaseLabel||ctx.block?.phaseLabel||"Plan adaptativo")}</strong></div><div class="ai-context-stat full"><span>MÓDULO</span><strong>${escapeHTML(m.shortTitle)} · ${escapeHTML(dayText)}</strong></div>`;const allowed=getAllowedSystemsForModule(ctx.moduleId);systemSelect.innerHTML=allowed.map(s=>`<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join("");const linked=state.bankSessions.find(s=>s.id===aiLinkedSessionId);let preferred=aiSelectedSystem;if(linked&&Number(linked.moduleId)===Number(ctx.moduleId)&&allowed.includes(linked.system))preferred=linked.system;if(!allowed.includes(preferred))preferred=allowed[0]||"";aiSelectedSystem=preferred;systemSelect.value=preferred;systemSelect.disabled=allowed.length===1;const sessions=getSessionsForDate(ctx.localDate,ctx.moduleId);blockSelect.innerHTML='<option value="">No vincular</option>'+sessions.map(s=>{const acc=s.questions?Math.round(s.correct/s.questions*100):0,errors=Math.max(s.questions-s.correct,0);return `<option value="${s.id}">${s.questions} preguntas · ${acc}% · ${errors} error${errors===1?"":"es"}</option>`}).join("");if(sessions.some(s=>s.id===aiLinkedSessionId))blockSelect.value=aiLinkedSessionId;else{aiLinkedSessionId="";blockSelect.value=""}}
function renderAILoading(done=0,message="Analizando con BOARDS AI..."){
  const stage=document.getElementById("aiAnalysisStage");
  if(!stage)return;
  const steps=["Leyendo la pregunta y sus opciones","Identificando datos discriminantes","Evaluando razonamiento clínico","Construyendo High-Yield","Generando mini-quiz de 5 preguntas","Preparando Intelligent Flashcards"];
  stage.hidden=false;
  stage.innerHTML=`<div class="ai-loading-header"><div class="ai-spinner"></div><div><strong>${escapeHTML(message)}</strong><span>La solicitud se procesa mediante el backend seguro. Puede tardar varios segundos en preguntas con imágenes.</span></div></div><div class="ai-loading-steps">${steps.map((step,i)=>`<div class="ai-loading-step ${i<done?"done":""}">${i<done?"✓ ":""}${escapeHTML(step)}</div>`).join("")}</div>`
}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function runAIAnalysis(){
  if(aiBusy)return;
  const questionText=document.getElementById("aiQuestionText")?.value.trim()||"";
  if(aiInputMode==="image"&&!aiImageFile){showToast("Sube o pega una captura primero.");return}
  if(aiInputMode==="text"&&questionText.length<20){showToast("Pega una pregunta o vignette más completa.");return}

  aiBusy=true;
  const button=document.getElementById("aiAnalyzeButton");
  if(button)button.disabled=true;
  aiCurrentAnalysis=null;
  aiQuizRuntime=null;
  const root=document.getElementById("aiResultRoot");
  if(root)root.innerHTML="";

  let loadingStep=0;
  renderAILoading(loadingStep);
  const loadingTimer=window.setInterval(()=>{
    loadingStep=Math.min(loadingStep+1,5);
    renderAILoading(loadingStep)
  },1100);

  try{
    const ctx=getAIContext();
    const linked=state.bankSessions.find(session=>session.id===aiLinkedSessionId);
    const imageDataUrl=aiInputMode==="image"?await prepareImageForAI(aiImageFile):null;
    const payload={
      mode:aiInputMode,
      questionText:aiInputMode==="text"?questionText:"",
      imageDataUrl,
      userAnswer:document.getElementById("aiUserAnswer")?.value||"",
      correctAnswer:document.getElementById("aiCorrectAnswer")?.value||"",
      context:{
        localDate:ctx.localDate,
        moduleId:ctx.moduleId,
        moduleTitle:getModule(ctx.moduleId).title,
        planSystem:aiSelectedSystem,
        system:aiSelectedSystem,
        block:linked?{
          id:linked.id,
          questions:Number(linked.questions)||0,
          correct:Number(linked.correct)||0,
          note:linked.note||""
        }:null
      }
    };

    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),95000);
    let response;
    try{
      response=await fetch("/.netlify/functions/analyze-question",{
        method:"POST",
        headers:{"Content-Type":"application/json",...(authSession?.access_token?{Authorization:`Bearer ${authSession.access_token}`}:{})},
        body:JSON.stringify(payload),
        signal:controller.signal
      })
    }finally{
      window.clearTimeout(timeout)
    }

    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const backendMessage=data?.message||data?.error||`El backend respondió ${response.status}.`;
      if(response.status===404&&location.hostname.includes("webcontainer.io")){
        throw new Error("La interfaz está lista, pero StackBlitz no ejecuta la función de Netlify en esta vista. Despliega el proyecto en Netlify y prueba desde la URL publicada.")
      }
      throw new Error(backendMessage)
    }

    if(data.status!=="ok"||!data.analysis){
      renderAIInputIssue(data);
      return
    }

    aiCurrentAnalysis=normalizeAIAnalysis(data,ctx,linked);
    recordAIUsage(aiCurrentAnalysis);
    initializeQuizRuntime(aiCurrentAnalysis);
    renderAIUsageMeter();
    renderAIResult();
    requestAnimationFrame(()=>document.getElementById("aiResultRoot")?.scrollIntoView({behavior:"smooth",block:"start"}))
  }catch(error){
    console.error(error);
    const message=error?.name==="AbortError"?"El análisis tardó demasiado y fue cancelado. Inténtalo nuevamente.":(error?.message||"No se pudo completar el análisis.");
    renderAIBackendError(message)
  }finally{
    window.clearInterval(loadingTimer);
    const stage=document.getElementById("aiAnalysisStage");
    if(stage&&aiCurrentAnalysis)stage.hidden=true;
    aiBusy=false;
    if(button)button.disabled=false
  }
}

async function prepareImageForAI(file){
  if(!file)return null;
  if(file.size<=2.8*1024*1024)return fileToDataURL(file);
  try{
    const bitmap=await createImageBitmap(file);
    const maxDimension=2200;
    const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext("2d",{alpha:false});
    ctx.fillStyle="#ffffff";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg",0.9)
  }catch(error){
    console.warn("No se pudo optimizar la imagen; se enviará el archivo original.",error);
    return fileToDataURL(file)
  }
}

function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||""));
    reader.onerror=()=>reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file)
  })
}

function renderAIInputIssue(data){
  const stage=document.getElementById("aiAnalysisStage");
  if(!stage)return;
  const quality=data?.inputQuality||{};
  const issues=Array.isArray(quality.issues)?quality.issues:[];
  stage.hidden=false;
  stage.innerHTML=`<div class="ai-analysis-alert"><strong>Necesito una entrada más completa</strong><p>${escapeHTML(quality.message||data?.message||"No pude interpretar la pregunta con suficiente confianza.")}</p>${issues.length?`<ul>${issues.map(item=>`<li>${escapeHTML(item)}</li>`).join("")}</ul>`:""}<div class="ai-backend-hint">Cambia la captura o completa el texto y vuelve a analizar.</div></div>`
}

function renderAIBackendError(message){
  const stage=document.getElementById("aiAnalysisStage");
  if(!stage)return;
  stage.hidden=false;
  stage.innerHTML=`<div class="ai-analysis-alert error"><strong>No se pudo conectar con BOARDS AI</strong><p>${escapeHTML(message)}</p><div class="ai-backend-hint">Tus datos locales, sesiones y progreso no fueron modificados.</div></div>`
}

function normalizeAIAnalysis(payload,ctx,linked){
  const raw=payload.analysis||{};
  const snapshot=raw.snapshot||{};
  const ua=raw.user_answer||{};
  const ca=raw.correct_answer||{};
  const answerStatus=raw.answer_status||"not_provided";
  const formatAnswer=(answer,fallback)=>{
    const letter=String(answer?.letter||"").trim();
    const text=String(answer?.text||"").trim();
    if(!letter&&!text)return fallback;
    if(letter&&text)return `${letter} · ${text}`;
    return letter||text
  };
  const questions=Array.isArray(raw.mini_quiz)?raw.mini_quiz.map((question,index)=>({
    domain:question.focus||`Integración ${index+1}`,
    stem:question.stem||"",
    options:(Array.isArray(question.options)?question.options:[]).map((option,i)=>{
      const letters=["A","B","C","D","E"];
      const text=String(option||"").trim();
      return /^[A-E][\.\)]\s*/i.test(text)?text:`${letters[i]||String.fromCharCode(65+i)}. ${text}`
    }),
    correct:clamp(Number(question.correct_index)||0,0,4),
    explanation:question.explanation||""
  })):[];
  const planSystem=aiSelectedSystem||getAllowedSystemsForModule(ctx.moduleId)[0]||"Mixto / Integrado";
  const detectedSystem=String(raw.detected_system||"").trim()||planSystem;
  const populationContext=String(raw.population_context||"").trim()||"No determinado";
  const usage=normalizeUsage(payload.usage);
  if(usage&&usage.estimatedCostUsd===null)usage.estimatedCostUsd=estimateCostFallback(payload.model||"",usage);
  return {
    id:createId("analysis"),
    isDemo:false,
    engineModel:payload.model||"OpenAI",
    responseId:payload.responseId||null,
    createdAt:new Date().toISOString(),
    localDate:ctx.localDate,
    moduleId:ctx.moduleId,
    planSystem,
    detectedSystem,
    populationContext,
    system:detectedSystem,
    usage,
    blockId:linked?.id||null,
    sourceType:aiInputMode,
    answerStatus,
    userAnswer:formatAnswer(ua,"No especificada"),
    correctAnswer:formatAnswer(ca,"No determinada"),
    correctAnswerOrigin:ca.origin||"model_determined",
    topic:raw.topic||"Concepto clínico",
    diagnosis:raw.diagnosis_or_core_concept||raw.topic||"Concepto clínico",
    questionType:raw.question_type||"Integración clínica",
    errorType:raw.error_type||"Interpretación clínica",
    snapshot:{
      patient:snapshot.patient||"No especificado",
      context:snapshot.context||"Contexto clínico",
      stability:snapshot.stability||"No determinada",
      question:snapshot.question||raw.question_type||"Pregunta clínica",
      clues:Array.isArray(snapshot.key_findings)?snapshot.key_findings:[]
    },
    correctReason:raw.why_correct||"",
    incorrectReason:raw.user_reasoning_feedback||"",
    distractor:raw.distractor_or_trap||"",
    rule:raw.rule||"",
    managementMap:Array.isArray(raw.management_map)?raw.management_map.map(item=>({label:item.label||"PASO",text:item.text||""})):[],
    highYield:Array.isArray(raw.high_yield)?raw.high_yield.map(item=>({category:item.category||"HIGH-YIELD",text:item.pearl||""})):[],
    quiz:{questions,score:null},
    flashcards:Array.isArray(raw.flashcards)?raw.flashcards.map(card=>({
      front:card.front||"",
      back:`${card.back||""}${card.key?`\n\nClave BOARDS: ${card.key}`:""}`,
      key:card.key||""
    })):[],
    clinicalCaveat:raw.clinical_caveat||"",
    saved:false
  }
}
function createMockAnalysis(){const ctx=getAIContext(),userLetter=document.getElementById("aiUserAnswer").value||"B",linked=state.bankSessions.find(s=>s.id===aiLinkedSessionId);return {id:createId("analysis"),isDemo:true,createdAt:new Date().toISOString(),localDate:ctx.localDate,moduleId:ctx.moduleId,planSystem:aiSelectedSystem||"Cardiovascular",detectedSystem:aiSelectedSystem||"Cardiovascular",populationContext:"Adulto",system:aiSelectedSystem||"Cardiovascular",usage:null,blockId:linked?.id||null,sourceType:aiInputMode,userAnswer:`${userLetter} · Metoprolol IV`,correctAnswer:"D · Cardioversión eléctrica sincronizada",topic:"Fibrilación auricular",diagnosis:"Fibrilación auricular con inestabilidad hemodinámica",questionType:"Next Best Step",errorType:"Error de Next Best Step",snapshot:{patient:"67 años",context:"Taquiarritmia",stability:"Inestable",question:"Next Best Step in Management",clues:["Palpitaciones de inicio súbito","TA 78/46 mmHg","Alteración del estado mental","ECG compatible con fibrilación auricular"]},correctReason:"La hipotensión y la alteración del estado mental indican inestabilidad hemodinámica. Una taquiarritmia inestable con pulso requiere cardioversión eléctrica sincronizada inmediata.",incorrectReason:"Los fármacos para control de frecuencia pueden ser apropiados en pacientes estables, pero retrasan la intervención indicada cuando la arritmia está causando inestabilidad hemodinámica.",distractor:"Reconocer la fibrilación auricular pero no priorizar la estabilidad hemodinámica antes del control farmacológico.",rule:"Taquiarritmia + pulso + inestabilidad hemodinámica → cardioversión eléctrica sincronizada.",managementMap:[{label:"SOSPECHA",text:"Taquiarritmia + síntomas"},{label:"PRIMER FILTRO",text:"¿Hay inestabilidad hemodinámica?"},{label:"SI ESTÁ INESTABLE",text:"Cardioversión sincronizada"},{label:"DESPUÉS",text:"Estabilizar y buscar precipitantes"},{label:"SEGUIMIENTO",text:"Evaluar estrategia de anticoagulación"}],highYield:[{category:"NBS",text:"Taquiarritmia con pulso e inestabilidad hemodinámica → cardioversión sincronizada inmediata."},{category:"PATRÓN",text:"Hipotensión, isquemia, edema pulmonar o alteración mental sugieren inestabilidad atribuible a la arritmia."},{category:"TRAMPA",text:"No priorices control de frecuencia farmacológico si el paciente está inestable."},{category:"PROCEDIMIENTO",text:"La cardioversión sincroniza la descarga con el QRS para reducir el riesgo de inducir fibrilación ventricular."},{category:"DIFERENCIAL",text:"Taquicardia sin pulso o fibrilación ventricular requieren desfibrilación, no cardioversión sincronizada."},{category:"SEGUIMIENTO",text:"Tras estabilizar, reevalúa riesgo tromboembólico, duración de la arritmia y necesidad de anticoagulación."}],quiz:{questions:getMockQuizQuestions(),score:null},flashcards:[{front:"Taquiarritmia con pulso + hipotensión o alteración del estado mental: ¿manejo inmediato?",back:"Cardioversión eléctrica sincronizada.\n\nClave BOARDS: la inestabilidad hemodinámica determina el manejo inmediato."},{front:"¿Qué hallazgos convierten una taquiarritmia en clínicamente inestable?",back:"Hipotensión, signos de shock, isquemia miocárdica, edema pulmonar/insuficiencia cardíaca aguda o alteración del estado mental atribuible a la arritmia."}],saved:false};}
function getMockQuizQuestions(){return [
  {domain:"Next Best Step",stem:"Un hombre de 68 años con fibrilación auricular presenta presión arterial de 76/44 mmHg, diaforesis y confusión. Tiene pulso. ¿Cuál es el siguiente paso más apropiado?",options:["A. Metoprolol IV","B. Adenosina IV","C. Digoxina IV","D. Cardioversión eléctrica sincronizada","E. Observación"],correct:3,explanation:"La arritmia está asociada a inestabilidad hemodinámica. Con pulso, la intervención inmediata es cardioversión sincronizada."},
  {domain:"Reconocimiento",stem:"¿Cuál de los siguientes hallazgos es el dato más importante para decidir entre control farmacológico inicial y cardioversión inmediata en una taquiarritmia con pulso?",options:["A. Edad mayor de 65 años","B. Duración de las palpitaciones","C. Inestabilidad hemodinámica","D. Frecuencia exacta de 130/min","E. Antecedente de hipertensión"],correct:2,explanation:"La estabilidad hemodinámica es el determinante inmediato del algoritmo de manejo de una taquiarritmia con pulso."},
  {domain:"Procedimiento",stem:"¿Por qué la descarga se sincroniza con el complejo QRS durante una cardioversión eléctrica?",options:["A. Para reducir el dolor","B. Para evitar una descarga durante la onda T vulnerable","C. Para aumentar la energía administrada","D. Para eliminar la necesidad de sedación","E. Para prevenir bradicardia sinusal"],correct:1,explanation:"La sincronización evita descargar durante la fase vulnerable de repolarización, lo que podría precipitar fibrilación ventricular."},
  {domain:"Diferenciación",stem:"Un paciente con taquicardia ventricular pierde el pulso y queda inconsciente. ¿Qué intervención eléctrica corresponde ahora?",options:["A. Cardioversión sincronizada","B. Desfibrilación no sincronizada","C. Marcapasos transcutáneo","D. Cardioversión farmacológica","E. Maniobras vagales"],correct:1,explanation:"La taquicardia ventricular sin pulso se maneja como ritmo desfibrilable con descarga no sincronizada y reanimación cardiopulmonar."},
  {domain:"Integración",stem:"Después de estabilizar a un paciente con fibrilación auricular mediante cardioversión urgente, ¿qué aspecto debe reconsiderarse como parte del manejo posterior?",options:["A. Riesgo tromboembólico y necesidad de anticoagulación","B. Uso rutinario de antibióticos","C. Restricción absoluta de líquidos","D. Profilaxis anticonvulsivante","E. Corticoides sistémicos"],correct:0,explanation:"Tras resolver la urgencia, la estrategia posterior incluye valorar riesgo tromboembólico, duración de la fibrilación auricular y necesidad de anticoagulación."}
]}
function initializeQuizRuntime(a){aiQuizRuntime={analysisId:a.id,index:0,selected:null,answers:Array(a.quiz.questions.length).fill(null),revealed:false,complete:false}}
function recordAIUsage(a){
  if(!a?.usage?.totalTokens)return;
  const id=a.responseId||a.id;
  if(state.aiUsageEvents.some(e=>(e.responseId&&a.responseId&&e.responseId===a.responseId)||e.id===id))return;
  state.aiUsageEvents.unshift({id,responseId:a.responseId||null,createdAt:a.createdAt,model:a.engineModel||"OpenAI",sourceType:a.sourceType||"unknown",populationContext:a.populationContext||"No determinado",detectedSystem:a.detectedSystem||a.system||"No determinado",usage:{...a.usage}});
  state.aiUsageEvents=state.aiUsageEvents.slice(0,500);
  saveState();
}
function sumUsageEvents(events){
  return events.reduce((acc,event)=>{const u=event.usage||{};acc.requests++;acc.inputTokens+=Number(u.inputTokens)||0;acc.outputTokens+=Number(u.outputTokens)||0;acc.totalTokens+=Number(u.totalTokens)||0;acc.cachedInputTokens+=Number(u.cachedInputTokens)||0;acc.reasoningTokens+=Number(u.reasoningTokens)||0;const cost=Number(u.estimatedCostUsd);if(Number.isFinite(cost)){acc.estimatedCostUsd+=cost;acc.costKnown++}return acc},{requests:0,inputTokens:0,outputTokens:0,totalTokens:0,cachedInputTokens:0,reasoningTokens:0,estimatedCostUsd:0,costKnown:0})
}
function usageEventsSince(days){const cutoff=Date.now()-days*86400000;return state.aiUsageEvents.filter(e=>new Date(e.createdAt).getTime()>=cutoff)}
function renderAIUsageMeter(){
  const mount=document.getElementById("aiUsageMeter");if(!mount)return;
  const all=Array.isArray(state.aiUsageEvents)?state.aiUsageEvents:[],today=dateKey(new Date()),todayEvents=all.filter(e=>{const d=new Date(e.createdAt);return !Number.isNaN(d.getTime())&&dateKey(d)===today}),week=usageEventsSince(7),todaySum=sumUsageEvents(todayEvents),weekSum=sumUsageEvents(week),allSum=sumUsageEvents(all),last=all[0];
  mount.innerHTML=`<div class="ai-usage-meter-head"><div><span class="panel-kicker">USO DE IA · LOCAL</span><strong>Consumo de BOARDS AI</strong><small>Seguimiento desde V0.5B.5. El costo es una estimación basada en los tokens reportados por la API.</small></div>${last?`<span class="ai-usage-model">${escapeHTML(last.model)}</span>`:""}</div><div class="ai-usage-meter-grid"><div><span>HOY</span><strong>${todaySum.requests} llamada${todaySum.requests===1?"":"s"}</strong><small>${formatTokens(todaySum.totalTokens)} tokens · ${formatUsd(todaySum.costKnown?todaySum.estimatedCostUsd:null)}</small></div><div><span>7 DÍAS</span><strong>${weekSum.requests} llamada${weekSum.requests===1?"":"s"}</strong><small>${formatTokens(weekSum.totalTokens)} tokens · ${formatUsd(weekSum.costKnown?weekSum.estimatedCostUsd:null)}</small></div><div><span>TOTAL LOCAL</span><strong>${allSum.requests} llamada${allSum.requests===1?"":"s"}</strong><small>${formatTokens(allSum.totalTokens)} tokens · ${formatUsd(allSum.costKnown?allSum.estimatedCostUsd:null)}</small></div>${last?`<div><span>ÚLTIMA</span><strong>${formatUsd(last.usage?.estimatedCostUsd)}</strong><small>${formatTokens(last.usage?.totalTokens)} tokens</small></div>`:`<div><span>ÚLTIMA</span><strong>—</strong><small>Aún sin llamadas registradas</small></div>`}</div>`
}
function renderAIUsageDetails(a){
  const u=a?.usage;if(!u?.totalTokens)return "";
  const pricing=u.pricing||{};
  return `<details class="ai-usage-details"><summary><span>Consumo de esta llamada</span><strong>${formatUsd(u.estimatedCostUsd)} · ${formatTokens(u.totalTokens)} tokens</strong></summary><div class="ai-usage-details-grid"><div><span>INPUT</span><strong>${formatTokens(u.inputTokens)}</strong></div><div><span>OUTPUT</span><strong>${formatTokens(u.outputTokens)}</strong></div><div><span>REASONING</span><strong>${formatTokens(u.reasoningTokens)}</strong></div><div><span>CACHED INPUT</span><strong>${formatTokens(u.cachedInputTokens)}</strong></div><div><span>COSTO EST.</span><strong>${formatUsd(u.estimatedCostUsd)}</strong></div></div><p>Estimación con precios ${escapeHTML(pricing.tierLabel||"Standard")} disponibles para ${escapeHTML(a.engineModel||"el modelo")}. El portal de OpenAI es la fuente definitiva de facturación; ajustes por cache writes, procesamiento regional u otros tiers pueden producir diferencias.</p></details>`
}
function renderAIResult(){
  const root=document.getElementById("aiResultRoot");
  if(!root)return;
  if(!aiCurrentAnalysis){root.innerHTML="";return}
  const a=aiCurrentAnalysis,saved=state.aiAnalyses.some(x=>x.id===a.id);
  const modelLabel=a.isDemo?"LEGACY DEMO":(a.engineModel||"BOARDS AI");
  const statusLabel=a.isDemo?"✓ ANÁLISIS DEMO":"✓ ANÁLISIS IA COMPLETADO";
  const answerStatus=a.answerStatus||"incorrect";
  const saveButtonLabel=answerStatus==="incorrect"?"Guardar en Error Notebook":"Guardar análisis";
  const detectedSystem=a.detectedSystem||a.system||"No determinado";
  const planSystem=a.planSystem||a.system||"No determinado";
  const differs=detectedSystem!==planSystem;
  const populationContext=a.populationContext||"No determinado";
  const usageText=a.usage?.totalTokens?`${formatTokens(a.usage.totalTokens)} tokens` : "";
  root.innerHTML=`
  <div class="ai-result-hero"><div class="ai-result-topline"><div><span class="ai-result-status">${statusLabel}</span><h3>${escapeHTML(a.diagnosis)}</h3><p>${a.isDemo?"Análisis heredado de la fase de interfaz.":"Análisis generado a partir de la captura o texto proporcionado."}</p></div><div class="ai-result-engine"><span class="ai-model-tag">${escapeHTML(modelLabel)}</span>${usageText?`<small>${escapeHTML(usageText)} · ${formatUsd(a.usage.estimatedCostUsd)}</small>`:""}</div></div><div class="ai-result-tags"><span class="ai-result-tag detected">Clínico · ${escapeHTML(detectedSystem)}</span><span class="ai-result-tag population">Población · ${escapeHTML(populationContext)}</span>${differs?`<span class="ai-result-tag plan">Plan · ${escapeHTML(planSystem)}</span>`:""}<span class="ai-result-tag">${escapeHTML(a.topic)}</span><span class="ai-result-tag">${escapeHTML(a.questionType)}</span><span class="ai-result-tag">${formatShortDate(parseLocalDate(a.localDate))}</span></div></div>
  ${renderAIUsageDetails(a)}
  ${renderSnapshotSection(a)}${renderAnswerSection(a)}${renderReasoningSection(a)}${renderManagementSection(a)}${renderHighYieldSection(a)}
  ${a.clinicalCaveat?`<div class="clinical-caveat"><span>NOTA DE ACTUALIZACIÓN</span><p>${escapeHTML(a.clinicalCaveat)}</p></div>`:""}
  <section class="ai-section"><div class="ai-section-header"><div><span class="panel-kicker">RECALL ACTIVO</span><h3>6. Mini-Quiz · 5 preguntas</h3></div><div class="ai-section-index">06</div></div><div id="aiQuizMount"></div></section>
  ${renderFlashcardsSection(a)}
  <div class="ai-save-bar"><div class="ai-save-status"><strong>${saved?"✓ Análisis guardado":"Análisis no guardado"}</strong><span>${saved?"Este análisis ya forma parte de tu historial.":"Se guardará localmente sin almacenar la captura original."}</span></div><div class="ai-save-actions">${saved?`${answerStatus==="incorrect"?'<button class="button button-secondary" data-view-error-notebook>Ver en Error Notebook</button>':""}`:`<button class="button button-secondary" data-discard-analysis>Descartar</button><button class="button button-primary" data-save-analysis>${saveButtonLabel}</button>`}</div></div>`;
  bindAIResultEvents();
  renderAIQuiz()
}
function renderSnapshotSection(a){const detected=a.detectedSystem||a.system||"No determinado",plan=a.planSystem||a.system||"No determinado",population=a.populationContext||"No determinado",differs=detected!==plan;return `<section class="ai-section"><div class="ai-section-header"><div><span class="panel-kicker">LECTURA CLÍNICA</span><h3>1. Clinical Snapshot</h3></div><div class="ai-section-index">01</div></div><div class="snapshot-grid"><div class="snapshot-chip"><span>PACIENTE</span><strong>${escapeHTML(a.snapshot.patient)}</strong></div><div class="snapshot-chip"><span>SISTEMA CLÍNICO</span><strong>${escapeHTML(detected)}</strong></div><div class="snapshot-chip"><span>POBLACIÓN / CONTEXTO</span><strong>${escapeHTML(population)}</strong></div><div class="snapshot-chip"><span>ESTABILIDAD</span><strong>${escapeHTML(a.snapshot.stability)}</strong></div><div class="snapshot-chip"><span>PREGUNTA</span><strong>${escapeHTML(a.snapshot.question)}</strong></div></div>${differs?`<div class="snapshot-context-note"><span>CONTEXTO DEL PLAN</span><strong>${escapeHTML(plan)}</strong><p>La pregunta se clasifica como ${escapeHTML(detected)} · ${escapeHTML(population)}; ${escapeHTML(plan)} se conserva únicamente como contexto de la jornada.</p></div>`:""}<div class="snapshot-clues">${a.snapshot.clues.map(x=>`<div class="snapshot-clue"><b>•</b><span>${escapeHTML(x)}</span></div>`).join("")}</div><div class="snapshot-diagnosis"><span>DIAGNÓSTICO CLÍNICO</span><strong>${escapeHTML(a.diagnosis)}</strong></div></section>`}
function renderAnswerSection(a){
  const status=a.answerStatus||"incorrect";
  const userClass=status==="correct"?"correct":status==="not_provided"?"neutral":"wrong";
  const userMark=status==="correct"?"✓":status==="not_provided"?"—":"✕";
  const originLabels={provided_by_user:"Indicada por ti",visible_in_source:"Visible en la fuente",model_determined:"Determinada por BOARDS AI"};
  return `<section class="ai-section"><div class="ai-section-header"><div><span class="panel-kicker">DECISIÓN</span><h3>2. Respuesta</h3></div><div class="ai-section-index">02</div></div><div class="answer-comparison"><div class="answer-card ${userClass}"><span>TU RESPUESTA · ${userMark}</span><strong>${escapeHTML(a.userAnswer)}</strong></div><div class="answer-card correct"><span>RESPUESTA CORRECTA · ✓</span><strong>${escapeHTML(a.correctAnswer)}</strong><small class="answer-origin">${escapeHTML(originLabels[a.correctAnswerOrigin]||"Determinada durante el análisis")}</small></div></div></section>`
}
function renderReasoningSection(a){
  const status=a.answerStatus||"incorrect";
  const title=status==="correct"?"3. Análisis del razonamiento":status==="not_provided"?"3. Razonamiento clínico":"3. Análisis del error";
  const userLabel=status==="correct"?"POR QUÉ TU RESPUESTA FUNCIONA":status==="not_provided"?"CLAVE DE RAZONAMIENTO":"POR QUÉ TU OPCIÓN NO";
  const trapLabel=status==="correct"?"TRAMPA QUE DEBÍAS EVITAR":status==="not_provided"?"DISTRACTOR / TRAMPA CLÁSICA":"EL DISTRACTOR QUE TE ATRAPÓ";
  const typeLabel=status==="incorrect"?`${escapeHTML(a.errorType)} · Alta relevancia BOARDS`:"Revisión de razonamiento · aprendizaje consolidado";
  return `<section class="ai-section"><div class="ai-section-header"><div><span class="panel-kicker">RAZONAMIENTO</span><h3>${title}</h3></div><div class="ai-section-index">03</div></div><div class="reason-grid"><div class="reason-card"><span>POR QUÉ LA CORRECTA ES CORRECTA</span><p>${escapeHTML(a.correctReason)}</p></div><div class="reason-card"><span>${userLabel}</span><p>${escapeHTML(a.incorrectReason)}</p></div><div class="reason-card full"><span>${trapLabel}</span><p>${escapeHTML(a.distractor)}</p></div></div><div class="error-type-card"><span>${status==="incorrect"?"TIPO DE ERROR":"CLASIFICACIÓN"}</span><strong>${typeLabel}</strong></div></section>`
}
function renderManagementSection(a){return `<section class="ai-section"><div class="ai-section-header"><div><span class="panel-kicker">ALGORITMO</span><h3>4. Mapa diagnóstico-terapéutico</h3></div><div class="ai-section-index">04</div></div><div class="management-flow">${a.managementMap.map((n,i)=>`<div class="management-node"><span class="management-step-number">${String(i+1).padStart(2,"0")}</span><span class="management-label">${escapeHTML(n.label)}</span><strong>${escapeHTML(n.text)}</strong></div>`).join("")}</div></section>`}
function renderHighYieldSection(a){return `<section class="ai-section"><div class="ai-section-header"><div><span class="panel-kicker">MEMORIA DE EXAMEN</span><h3>5. High-Yield</h3></div><div class="ai-section-index">05</div></div><div class="highyield-grid">${a.highYield.slice(0,8).map((x,i)=>`<article class="highyield-card"><span class="highyield-number">${String(i+1).padStart(2,"0")}</span><span class="highyield-category">${escapeHTML(x.category)}</span><p>${escapeHTML(x.text)}</p></article>`).join("")}</div></section>`}
function renderFlashcardsSection(a){
  const cards=Array.isArray(a.flashcards)?a.flashcards:[];
  const content=cards.length?`<div class="flashcards-grid">${cards.map((f,i)=>`<article class="flashcard"><div class="flashcard-side"><span>FRONT · CARD ${String(i+1).padStart(2,"0")}</span><p>${escapeHTML(f.front)}</p></div><div class="flashcard-side"><span>BACK</span><p>${escapeHTML(f.back).replaceAll("\n","<br>")}</p></div></article>`).join("")}</div><div class="flashcard-actions">${cards.map((_,i)=>`<button class="button button-secondary" data-copy-flashcard="${i}">Copiar Card ${i+1}</button>`).join("")}<button class="button button-secondary" data-copy-all-flashcards>Copiar todas</button></div>`:`<div class="flashcards-empty">BOARDS no recomienda crear una tarjeta adicional para este análisis porque no aportaría una regla clínica reutilizable.</div>`;
  return `<section class="ai-section"><div class="ai-section-header"><div><span class="panel-kicker">ACTIVE RECALL</span><h3>7. Intelligent Flashcards</h3></div><div class="ai-section-index">07</div></div><p class="ai-section-lead">BOARDS recomienda ${cards.length} tarjeta${cards.length===1?"":"s"} para este concepto.</p>${content}</section>`
}
function bindAIResultEvents(){
  document.querySelector("[data-discard-analysis]")?.addEventListener("click",()=>{
    aiCurrentAnalysis=null;
    aiQuizRuntime=null;
    renderAIResult();
    showToast("Análisis descartado.")
  });
  document.querySelector("[data-save-analysis]")?.addEventListener("click",saveCurrentAIAnalysis);
  document.querySelector("[data-view-error-notebook]")?.addEventListener("click",()=>navigateTo("errors"));
  document.querySelectorAll("[data-copy-flashcard]").forEach(b=>b.addEventListener("click",()=>copyFlashcard(Number(b.dataset.copyFlashcard))));
  document.querySelector("[data-copy-all-flashcards]")?.addEventListener("click",copyAllFlashcards)
}
function copyFlashcard(i){const f=aiCurrentAnalysis?.flashcards?.[i];if(!f)return;copyText(`${f.front};${f.back.replaceAll("\n"," ")}`,"Flashcard copiada.")}
function copyAllFlashcards(){const a=aiCurrentAnalysis;if(!a)return;copyText(a.flashcards.map(f=>`${f.front};${f.back.replaceAll("\n"," ")}`).join("\n"),"Todas las flashcards fueron copiadas.")}
async function copyText(text,msg){try{await navigator.clipboard.writeText(text);showToast(msg)}catch{showToast("No se pudo copiar automáticamente.")}}
function saveCurrentAIAnalysis(){
  if(!aiCurrentAnalysis)return;
  if(state.aiAnalyses.some(a=>a.id===aiCurrentAnalysis.id)){showToast("Este análisis ya está guardado.");return}
  const saved={...aiCurrentAnalysis,saved:true,savedAt:new Date().toISOString()};
  state.aiAnalyses.unshift(saved);
  if((saved.answerStatus||"incorrect")==="incorrect"){
    state.errors.unshift({
      id:createId("error"),
      system:saved.detectedSystem||saved.system,
      populationContext:saved.populationContext||"No determinado",
      type:saved.errorType,
      topic:saved.topic,
      concept:saved.diagnosis,
      userAnswer:saved.userAnswer,
      correctAnswer:saved.correctAnswer,
      rule:saved.rule,
      date:saved.createdAt,
      richAnalysisId:saved.id,
      isDemo:Boolean(saved.isDemo)
    })
  }
  aiCurrentAnalysis=saved;
  saveState();
  renderAll();
  showToast((saved.answerStatus||"incorrect")==="incorrect"?"Análisis guardado en Error Notebook.":"Análisis correcto guardado en tu historial.")
}
function openSavedAnalysis(id){const a=state.aiAnalyses.find(x=>x.id===id);if(!a){showToast("No se encontró el análisis.");return}aiCurrentAnalysis={...a,saved:true};aiContextDateKey=a.localDate||todayKey();aiLinkedSessionId=a.blockId||"";aiSelectedSystem=a.planSystem||a.system||"";initializeQuizRuntime(aiCurrentAnalysis);navigateTo("ai");requestAnimationFrame(()=>document.getElementById("aiResultRoot")?.scrollIntoView({behavior:"smooth",block:"start"}))}
function renderAIRecent(){
  const c=document.getElementById("aiRecentAnalyses"),count=document.getElementById("aiRecentCount");
  if(!c||!count)return;
  count.textContent=state.aiAnalyses.length;
  if(!state.aiAnalyses.length){
    c.innerHTML='<div class="ai-empty-recent">Todavía no hay análisis guardados. Analiza una captura o una vignette para comenzar tu historial clínico.</div>';
    return
  }
  c.innerHTML=`<div class="ai-recent-list">${state.aiAnalyses.slice(0,6).map(a=>`<div class="ai-recent-item"><div class="ai-recent-copy"><strong>${escapeHTML(a.diagnosis||a.topic)}</strong><span>${escapeHTML(a.detectedSystem||a.system)} · ${escapeHTML(a.populationContext||"No determinado")} · ${escapeHTML(a.errorType||a.questionType)} · ${formatShortDate(parseLocalDate(a.localDate))}</span></div><div class="ai-recent-actions"><button class="button button-secondary" data-open-recent-analysis="${a.id}">Abrir</button></div></div>`).join("")}</div>`;
  c.querySelectorAll("[data-open-recent-analysis]").forEach(b=>b.addEventListener("click",()=>openSavedAnalysis(b.dataset.openRecentAnalysis)))
}
function renderAIQuiz(){
  const mount=document.getElementById("aiQuizMount"),a=aiCurrentAnalysis;
  if(!mount||!a)return;
  if(!aiQuizRuntime||aiQuizRuntime.analysisId!==a.id)initializeQuizRuntime(a);
  const rt=aiQuizRuntime,qs=a.quiz.questions;
  if(!Array.isArray(qs)||qs.length!==5){
    mount.innerHTML='<div class="flashcards-empty">El análisis no devolvió un mini-quiz válido de 5 preguntas. Vuelve a generar el análisis.</div>';
    return
  }
  if(rt.complete){
    const correct=rt.answers.filter((ans,i)=>ans===qs[i].correct).length,score=Math.round(correct/qs.length*100);
    a.quiz.score=score;
    const rows=qs.map((q,i)=>`<div class="quiz-domain-row"><span>${escapeHTML(q.domain)}</span><strong>${rt.answers[i]===q.correct?"✓":"✕"}</strong></div>`).join("");
    mount.innerHTML=`<div class="quiz-shell"><div class="quiz-card"><span class="panel-kicker">RESULTADO</span><h3>${correct} / ${qs.length} · ${score}%</h3><p class="quiz-vignette">Este porcentaje mide retención del mini-quiz y no se mezcla con tu precisión del banco.</p><div class="quiz-actions"><button class="button button-secondary" data-review-wrong>Repasar incorrecta</button><button class="button button-primary" data-repeat-quiz>Repetir mini-quiz</button></div></div><aside class="quiz-score-panel"><span>RETENCIÓN</span><div class="quiz-score-big">${score}%</div><p>Resultado post-error.</p><div class="quiz-domain-list">${rows}</div></aside></div>`;
    mount.querySelector("[data-repeat-quiz]")?.addEventListener("click",()=>{initializeQuizRuntime(a);renderAIQuiz()});
    mount.querySelector("[data-review-wrong]")?.addEventListener("click",()=>{
      const idx=rt.answers.findIndex((ans,i)=>ans!==qs[i].correct);
      initializeQuizRuntime(a);
      if(idx>=0)aiQuizRuntime.index=idx;
      renderAIQuiz()
    });
    return
  }
  const q=qs[rt.index],selected=rt.selected,answer=rt.answers[rt.index],revealed=rt.revealed;
  const dots=qs.map((_,i)=>{
    let cls="";
    if(i===rt.index)cls="current";
    if(rt.answers[i]!==null&&rt.answers[i]!==undefined)cls=rt.answers[i]===qs[i].correct?"correct":"wrong";
    return `<span class="quiz-dot ${cls}"></span>`
  }).join("");
  mount.innerHTML=`<div class="quiz-shell"><div class="quiz-card"><div class="quiz-progress-top"><span>Pregunta ${rt.index+1} de ${qs.length}</span><span>${Math.round(rt.index/qs.length*100)}%</span></div><div class="quiz-dots">${dots}</div><div class="quiz-vignette">${escapeHTML(q.stem)}</div><div class="quiz-options">${q.options.map((o,i)=>{
    let cls="";
    if(!revealed&&selected===i)cls="selected";
    if(revealed&&i===q.correct)cls="correct";
    else if(revealed&&i===answer&&answer!==q.correct)cls="wrong";
    return `<button class="quiz-option ${cls}" data-quiz-option="${i}" ${revealed?"disabled":""}>${escapeHTML(o)}</button>`
  }).join("")}</div>${revealed?`<div class="quiz-feedback"><strong>${answer===q.correct?"✓ Correcto":"✕ Incorrecto"}</strong><p>${escapeHTML(q.explanation)}</p></div>`:""}<div class="quiz-actions">${revealed?`<button class="button button-primary" data-quiz-next>${rt.index===qs.length-1?"Ver resultado":"Siguiente pregunta →"}</button>`:'<button class="button button-primary" data-quiz-confirm>Confirmar respuesta</button>'}</div></div><aside class="quiz-score-panel"><span>OBJETIVO</span><strong>${escapeHTML(q.domain)}</strong><p>Pregunta inédita generada para comprobar transferencia y retención del concepto.</p></aside></div>`;
  mount.querySelectorAll("[data-quiz-option]").forEach(b=>b.addEventListener("click",()=>{rt.selected=Number(b.dataset.quizOption);renderAIQuiz()}));
  mount.querySelector("[data-quiz-confirm]")?.addEventListener("click",()=>{
    if(rt.selected===null){showToast("Selecciona una respuesta.");return}
    rt.answers[rt.index]=rt.selected;
    rt.revealed=true;
    renderAIQuiz()
  });
  mount.querySelector("[data-quiz-next]")?.addEventListener("click",()=>{
    if(rt.index===qs.length-1){rt.complete=true}else{rt.index++;rt.selected=rt.answers[rt.index];rt.revealed=false}
    renderAIQuiz()
  })
}