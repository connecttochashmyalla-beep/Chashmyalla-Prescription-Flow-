"use client";
import { useState, useEffect, useRef } from "react";
import { RotateCcw, Plus, X, Eye, Check, ChevronRight, Glasses as GlassesIcon, CircleDot, Settings, ArrowLeft, Clock } from "lucide-react";
import { storage } from "../lib/storage";

const rng = (f, t, s) => { const v = []; let x = f; while (s < 0 ? x >= t - 1e-9 : x <= t + 1e-9) { v.push(parseFloat(x.toFixed(2))); x = parseFloat((x + s).toFixed(2)); } return v; };
const MINUS_SPH = rng(-.25, -10, -.25), PLUS_SPH = rng(.25, 10, .25), CROSS_SPH = rng(.25, 6, .25);
const CYL_M = rng(0, -4, -.25), CYL_P = rng(0, 4, .25), CYL_X = rng(-.25, -4, -.25);
const HI_SPH = [...rng(-4, -10, -.25), ...rng(4, 10, .25)].sort((a, b) => b - a);
const HI_CYL = rng(-.25, -4, -.25);
const BF_P = [0, .5, .75, ...rng(1, 3, .25)], BF_M = rng(-.5, -3, -.25), BF_ADD = rng(1, 3, .25);
const CL_SPH = [0, ...rng(-.25, -10, -.25)];
const fmtNum = (v) => (v === 0 ? "0.00" : v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

const mkTiers = (rows) => rows.map(([maxSph, maxCyl, purchase, sell], i) => ({ label: `T${i + 1}`, maxSph, maxCyl, purchase, sell }));
const DEF_PRICES = {
  minus: { tiers: mkTiers([[6, 2, 800, 1000], [8, 3, 1400, 1800], [10, 4, 2000, 2500]]) },
  plus: { tiers: mkTiers([[6, 2, 700, 900], [8, 3, 1200, 1600], [10, 4, 1700, 2200]]) },
  cross: { tiers: mkTiers([[6, 2, 1000, 1400], [8, 3, 1600, 2200], [10, 4, 2200, 3000]]) },
  hiIdx: { tiers: mkTiers([[6, 2, 1500, 2000], [8, 3, 2100, 2800], [10, 4, 2700, 3500]]) },
  bifocal: { purchase: 1200, sell: 1500 },
  bifocalMinus: { purchase: 1200, sell: 1500 },
  rx_price: { purchase: 0, sell: 0 },
  cl_sph: { purchase: 500, sell: 700 },
  cl_toric: { purchase: 1500, sell: 2000 },
};
const FLAT_IDS = ["bifocal", "bifocalMinus", "rx_price", "cl_sph", "cl_toric"];
const PRESET_TYPES = [{ id: "pt_simple", name: "Simple" }, { id: "pt_uvbc", name: "UV / BC" }, { id: "pt_pg_sun", name: "PG / Sunglasses" }, { id: "pt_pgbc", name: "PG + BC" }];
const CL_BRANDS = [{ id: "clb_innova", name: "Innova" }, { id: "clb_ultimate", name: "Ultimate" }, { id: "clb_ultima", name: "Ultima" }, { id: "clb_comfort", name: "Comfort" }];
const CL_COLORS = [
  { id: "clc_transparent", name: "Transparent", hex: "#CBD5E1" }, { id: "clc_gray", name: "Gray", hex: "#6B7280" },
  { id: "clc_brown", name: "Brown", hex: "#92400E" }, { id: "clc_green", name: "Green", hex: "#059669" },
  { id: "clc_blue", name: "Blue", hex: "#3B82F6" }, { id: "clc_hazel", name: "Hazel", hex: "#D97706" },
];
const makePresetMeta = () => ({ types: JSON.parse(JSON.stringify(PRESET_TYPES)), vars: Object.fromEntries(PRESET_TYPES.map((t) => [t.id, []])) });
const makeCLMeta = () => ({ types: JSON.parse(JSON.stringify(CL_BRANDS)), vars: Object.fromEntries(CL_BRANDS.map((b) => [b.id, JSON.parse(JSON.stringify(CL_COLORS))])) });
const DEF_DATA = { meta: { single_vision: makePresetMeta(), bifocal: makePresetMeta(), rx: makePresetMeta(), contact_lens: makeCLMeta() }, stocks: {}, prices: {} };
const PRESET_CATS = ["single_vision", "bifocal", "rx"];
const ensurePresets = (data) => {
  const nd = JSON.parse(JSON.stringify(data));
  PRESET_CATS.forEach((cat) => {
    if (!nd.meta[cat]) nd.meta[cat] = makePresetMeta();
    PRESET_TYPES.forEach((pt) => {
      if (!nd.meta[cat].types.find((t) => t.id === pt.id)) { nd.meta[cat].types.unshift(JSON.parse(JSON.stringify(pt))); if (!nd.meta[cat].vars[pt.id]) nd.meta[cat].vars[pt.id] = []; }
    });
  });
  if (!nd.meta.contact_lens) nd.meta.contact_lens = makeCLMeta();
  else CL_BRANDS.forEach((b) => { if (!nd.meta.contact_lens.types.find((t) => t.id === b.id)) nd.meta.contact_lens.types.push(JSON.parse(JSON.stringify(b))); });
  if (!nd.meta.contact_lens.vars) nd.meta.contact_lens.vars = {};
  nd.meta.contact_lens.types.forEach((brand) => { if (!nd.meta.contact_lens.vars[brand.id] || nd.meta.contact_lens.vars[brand.id].length === 0) nd.meta.contact_lens.vars[brand.id] = JSON.parse(JSON.stringify(CL_COLORS)); });
  return nd;
};
const getTier = (a, b, sec) => { if (!sec?.tiers) return null; const as = Math.abs(parseFloat(a) || 0), ac = Math.abs(parseFloat(b) || 0); return sec.tiers.find((t) => as <= t.maxSph && ac <= t.maxCyl) || sec.tiers[sec.tiers.length - 1]; };
const SK_K = (a, b) => `${parseFloat(a).toFixed(2)}_${parseFloat(b).toFixed(2)}`;
const round25 = (v) => Math.round((parseFloat(v) || 0) / 0.25) * 0.25;

const CAT_META = {
  single_vision: { label: "Single Vision", color: "#2563EB", icon: "👓" },
  bifocal: { label: "Bifocal", color: "#059669", icon: "🔍" },
  contact_lens: { label: "Contact Lens", color: "#DB2777", icon: "👁" },
};
const TAB_LABELS = { minus: "− SPH/CYL", plus: "+ SPH/CYL", cross: "Cross No.", hiIdx: "High Index", bifocal: "Bifocal +", bifocalMinus: "Bifocal −", cl_sph: "Spherical", cl_toric: "Toric" };

const resolveTab = (category, sph, cyl) => {
  if (category === "bifocal") return sph >= 0 ? "bifocal" : "bifocalMinus";
  if (category === "contact_lens") return cyl !== 0 ? "cl_toric" : "cl_sph";
  const absSph = Math.abs(sph);
  if (absSph > 6) return "hiIdx";
  if (cyl !== 0 && sph !== 0 && Math.sign(cyl) !== Math.sign(sph)) return "cross";
  return sph >= 0 ? "plus" : "minus";
};

const TAG_RULES = [
  { kw: /uv/i, tags: ["UV Protection", "Screen Safe"] },
  { kw: /blue|bc/i, tags: ["Blue Cut Coating"] },
  { kw: /pg|photo/i, tags: ["Photochromic", "Auto-Tint Outdoor"] },
  { kw: /sun/i, tags: ["Dark Tint", "Outdoor Ready"] },
  { kw: /solar/i, tags: ["Solar Tint"] },
  { kw: /polar/i, tags: ["Polarized"] },
  { kw: /simple/i, tags: ["Clear Standard", "No Coating"] },
];
const getTypeTags = (name) => {
  const tags = [];
  TAG_RULES.forEach((r) => { if (r.kw.test(name)) r.tags.forEach((t) => { if (!tags.includes(t)) tags.push(t); }); });
  if (tags.length === 0) tags.push("Everyday Clarity", "Standard Coating");
  return tags.slice(0, 3);
};
const getTypeIcon = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("uv")) return "🕶️";
  if (n.includes("sun")) return "🌞";
  if (n.includes("pg") || n.includes("photo")) return "🌗";
  if (n.includes("bc")) return "🔷";
  if (n.includes("simple")) return "⚪";
  return "👓";
};

const getVariantSpecs = (category, tab, tier, variant) => {
  if (category === "single_vision") {
    return [
      { label: "Power up to", value: tier ? `±${tier.maxSph.toFixed(2)}` : "—" },
      { label: "Cylinder up to", value: tier ? tier.maxCyl.toFixed(2) : "—" },
      { label: "Lens Index", value: tab === "hiIdx" ? "High Index" : "Standard" },
    ];
  }
  if (category === "bifocal") {
    return [
      { label: "Design", value: "Distance + Near" },
      { label: "ADD Range", value: "+1.00 to +3.00" },
      { label: "Power Side", value: tab === "bifocal" ? "Plus" : "Minus" },
    ];
  }
  return [
    { label: "Mode", value: tab === "cl_toric" ? "Toric" : "Spherical" },
    { label: "Wear Schedule", value: "Daily" },
    { label: "Color", value: variant?.name || "—" },
  ];
};

const getAvailability = (stock) => {
  if (stock === null) return { label: "On Demand", time: "2 Days", bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" };
  if (stock > 0) return { label: "Available", time: "30 Min", bg: "#F0FDF4", fg: "#15803D", bd: "#BBF7D0" };
  return { label: "Unavailable", time: "Next Day", bg: "#FEF2F2", fg: "#DC2626", bd: "#FECACA" };
};

const BG = "#F1F5F9", SRF = "#FFFFFF", BDR = "#E2E8F0", TXT = "#0F172A", T2 = "#64748B", T3 = "#94A3B8";
const CARD = { background: SRF, borderRadius: 16, border: `1px solid ${BDR}`, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.06)" };

const emptyRx = () => ({ rightEye: { sphere: "", cylinder: "", axis: "", pd: "" }, leftEye: { sphere: "", cylinder: "", axis: "", pd: "" }, add: "" });
const PICKER_VALUES = Array.from({ length: 65 }, (_, i) => Math.round((i - 32) * 25) / 100);
const formatSigned = (v) => (v === 0 ? "0.00" : v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
const inputStyle = { width: "100%", padding: "9px 10px", fontSize: 13, background: "#F8FAFC", border: `1px solid ${BDR}`, borderRadius: 8, color: TXT, outline: "none", boxSizing: "border-box" };
const pickerBtnStyle = { position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T3, fontSize: 11, cursor: "pointer" };

export default function PrescriptionLensFlow() {
  const [view, setView] = useState("rx");
  const [inv, setInv] = useState(DEF_DATA);

  // Live sync: any device that edits stock/price/types updates this app automatically
  useEffect(() => {
    const unsub = storage.subscribe("lens-v9", (value) => {
      setInv(value ? ensurePresets(JSON.parse(value)) : ensurePresets(DEF_DATA));
    });
    return () => unsub();
  }, []);

  const persistInv = async (nd) => { setInv(nd); try { await storage.set("lens-v9", JSON.stringify(nd)); } catch {} };

  const [prescription, setPrescription] = useState(emptyRx());
  const [selectedSource, setSelectedSource] = useState("");
  const [prescriptionDone, setPrescriptionDone] = useState(false);
  const [selectedVisionType, setSelectedVisionType] = useState("");
  const [lensChoice, setLensChoice] = useState("glasses");

  const [savedReferences, setSavedReferences] = useState([]);
  const [showReferencePopup, setShowReferencePopup] = useState(false);
  const [referenceDraft, setReferenceDraft] = useState(emptyRx());

  const [activePicker, setActivePicker] = useState(null);
  const [pickerFilter, setPickerFilter] = useState("all");
  const pickerScrollRef = useRef(null);
  const pickerZeroRef = useRef(null);

  const [pickedTypeId, setPickedTypeId] = useState(null);
  const [lockedVariant, setLockedVariant] = useState(null);

  // Password gate for Manage Stock
  const [showPwGate, setShowPwGate] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get("rx-draft-v1");
        if (r?.value) {
          const d = JSON.parse(r.value);
          if (d.prescription) setPrescription(d.prescription);
          if (d.selectedSource) setSelectedSource(d.selectedSource);
          if (d.savedReferences) setSavedReferences(d.savedReferences);
        }
      } catch {}
      setDraftLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!draftLoaded) return;
    const t = setTimeout(() => {
      storage.set("rx-draft-v1", JSON.stringify({ prescription, selectedSource, savedReferences })).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [prescription, selectedSource, savedReferences, draftLoaded]);

  useEffect(() => { if (activePicker && pickerZeroRef.current && pickerScrollRef.current) pickerZeroRef.current.scrollIntoView({ block: "start" }); }, [activePicker, pickerFilter]);

  const openPicker = (eye, field) => { setActivePicker({ eye, field }); setPickerFilter("all"); };
  const closePicker = () => setActivePicker(null);
  const selectPickerValue = (value) => { if (activePicker) handlePrescriptionChange(activePicker.eye, activePicker.field, formatSigned(value)); setActivePicker(null); };
  const getFilteredPickerValues = () => { let values = pickerFilter === "positive" ? PICKER_VALUES.filter((v) => v >= 0) : pickerFilter === "negative" ? PICKER_VALUES.filter((v) => v <= 0) : PICKER_VALUES; return [...values].sort((a, b) => b - a); };

  const isAxisRequired = (eye) => { const cyl = prescription[eye].cylinder; return cyl && cyl !== "0" && cyl !== ""; };
  const isAxisValid = (eye) => (!isAxisRequired(eye) ? true : !!prescription[eye].axis);

  const resetDownstream = () => { setPrescriptionDone(false); setSelectedVisionType(""); setLensChoice("glasses"); setPickedTypeId(null); setLockedVariant(null); };
  const handlePrescriptionChange = (eye, field, value) => { setPrescription((prev) => ({ ...prev, [eye]: { ...prev[eye], [field]: value } })); resetDownstream(); };
  const handleResetPrescription = () => { setPrescription(emptyRx()); resetDownstream(); };

  const handleReferenceDraftChange = (eye, field, value) => setReferenceDraft((prev) => ({ ...prev, [eye]: { ...prev[eye], [field]: value } }));
  const handleSaveReference = () => { setSavedReferences((prev) => [...prev, { ...referenceDraft, savedAt: new Date().toLocaleDateString() }]); setReferenceDraft(emptyRx()); setShowReferencePopup(false); };
  const handleCancelReference = () => { setReferenceDraft(emptyRx()); setShowReferencePopup(false); };

  const getAvailableVisionTypes = () => { const addValue = parseFloat(prescription.add) || 0; return addValue === 0 ? ["Distance"] : ["Distance", "NearSide", "Bifocal"]; };

  const getFinalPrescription = () => {
    const rightSph = parseFloat(prescription.rightEye.sphere) || 0, leftSph = parseFloat(prescription.leftEye.sphere) || 0, addValue = parseFloat(prescription.add) || 0;
    const fv = (v) => (!v || v === "0" || v === 0 ? "" : v);
    const fws = (v) => { if (!v || v === "0" || v === 0) return ""; const n = parseFloat(v); return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2); };
    if (selectedVisionType === "NearSide") return { rightEye: { sphere: fws(rightSph + addValue), cylinder: fv(prescription.rightEye.cylinder), axis: fv(prescription.rightEye.axis), pd: fv(prescription.rightEye.pd) }, leftEye: { sphere: fws(leftSph + addValue), cylinder: fv(prescription.leftEye.cylinder), axis: fv(prescription.leftEye.axis), pd: fv(prescription.leftEye.pd) } };
    if (selectedVisionType === "Distance") return { rightEye: { sphere: fv(prescription.rightEye.sphere), cylinder: fv(prescription.rightEye.cylinder), axis: fv(prescription.rightEye.axis), pd: fv(prescription.rightEye.pd) }, leftEye: { sphere: fv(prescription.leftEye.sphere), cylinder: fv(prescription.leftEye.cylinder), axis: fv(prescription.leftEye.axis), pd: fv(prescription.leftEye.pd) } };
    if (selectedVisionType === "Bifocal") return { rightEye: { sphere: fv(prescription.rightEye.sphere), cylinder: fv(prescription.rightEye.cylinder), axis: fv(prescription.rightEye.axis), pd: fv(prescription.rightEye.pd), add: fv(prescription.add) }, leftEye: { sphere: fv(prescription.leftEye.sphere), cylinder: fv(prescription.leftEye.cylinder), axis: fv(prescription.leftEye.axis), pd: fv(prescription.leftEye.pd), add: fv(prescription.add) } };
    return null;
  };

  const resolvedCategory = selectedVisionType === "Bifocal" ? "bifocal" : selectedVisionType === "Distance" && lensChoice === "contactLens" ? "contact_lens" : selectedVisionType ? "single_vision" : null;
  const showLensChoiceToggle = selectedVisionType === "Distance";

  const catMeta = resolvedCategory ? inv.meta?.[resolvedCategory] : null;
  const types = catMeta?.types || [];
  const pickedType = pickedTypeId ? types.find((t) => t.id === pickedTypeId) : null;
  const variantsForType = pickedType ? catMeta?.vars?.[pickedType.id] || [] : [];

  const addAbs = Math.abs(parseFloat(prescription.add) || 0);
  const eyeHasRx = (eye) => { const s = prescription[eye].sphere, c = prescription[eye].cylinder; return (s !== "" && s !== undefined) || (c !== "" && c !== undefined && parseFloat(c) !== 0); };
  const rightHasRx = eyeHasRx("rightEye"), leftHasRx = eyeHasRx("leftEye");
  const eyesNeeded = rightHasRx && leftHasRx ? ["rightEye", "leftEye"] : rightHasRx ? ["rightEye"] : leftHasRx ? ["leftEye"] : ["rightEye", "leftEye"];

  const clForceToric = resolvedCategory === "contact_lens" && eyesNeeded.some((eye) => Math.abs(parseFloat(prescription[eye].cylinder) || 0) > 0);

  const getEyeGrid = (eye) => {
    const sph = parseFloat(prescription[eye].sphere) || 0;
    const cyl = parseFloat(prescription[eye].cylinder) || 0;
    if (!resolvedCategory) return null;
    if (resolvedCategory === "bifocal") { const tab = resolveTab("bifocal", sph, addAbs); return { a: round25(sph), b: round25(addAbs), tab }; }
    if (resolvedCategory === "contact_lens") { const tab = clForceToric ? "cl_toric" : "cl_sph"; return { a: round25(sph), b: round25(cyl), tab }; }
    const sphUsed = selectedVisionType === "NearSide" ? sph + (parseFloat(prescription.add) || 0) : sph;
    const tab = resolveTab("single_vision", sphUsed, cyl);
    return { a: round25(sphUsed), b: round25(cyl), tab };
  };

  const skForEye = (typeId, variantId, tab) => resolvedCategory === "contact_lens" ? `contact_lens::${typeId}::${variantId}${tab === "cl_toric" ? "_t2" : "_t1"}` : `${resolvedCategory}::${typeId}::${variantId}`;

  const priceForEye = (eye, typeId, variantId) => {
    const g = getEyeGrid(eye);
    if (!g) return null;
    const sk = skForEye(typeId, variantId, g.tab);
    const storedPr = inv.prices?.[sk]?.[g.tab];
    const sec = storedPr || DEF_PRICES[g.tab];
    const flat = FLAT_IDS.includes(g.tab);
    const tier = flat ? null : getTier(g.a, g.b, sec);
    const sell = flat ? sec?.sell || 0 : tier?.sell || 0;
    const buy = flat ? sec?.purchase || 0 : tier?.purchase || 0;
    const cellKey = SK_K(g.a, g.b);
    const stockCell = inv.stocks?.[sk]?.[cellKey];
    const stock = typeof stockCell === "number" ? stockCell : null;
    return { eye, sk, tab: g.tab, tier, sell, buy, stock, cellKey };
  };

  const totalForVariant = (typeId, variantId) => {
    const parts = eyesNeeded.map((eye) => priceForEye(eye, typeId, variantId));
    const total = parts.reduce((s, p) => s + (p?.sell || 0), 0);
    const stocks = parts.map((p) => p?.stock);
    const avail = stocks.some((s) => s === 0) ? getAvailability(0) : stocks.some((s) => s === null) ? getAvailability(null) : getAvailability(Math.min(...stocks));
    return { total, parts, avail };
  };

  const lockVariant = (type, variant) => {
    const { total, parts, avail } = totalForVariant(type.id, variant.id);
    setLockedVariant({ typeId: type.id, typeName: type.name, variantId: variant.id, variantName: variant.name, total, parts, avail, category: resolvedCategory, eyesNeeded });
  };
  const confirmLock = async () => {
    if (!lockedVariant) return;
    if (lockedVariant.avail.label === "Unavailable") return;
    const nd = JSON.parse(JSON.stringify(inv));
    lockedVariant.parts.forEach((p) => {
      if (p.stock !== null && p.stock > 0) { if (!nd.stocks[p.sk]) nd.stocks[p.sk] = {}; nd.stocks[p.sk][p.cellKey] = Math.max(0, (nd.stocks[p.sk][p.cellKey] || 0) - 1); }
    });
    await persistInv(nd);
    setLockedVariant((prev) => ({ ...prev, confirmed: true }));
  };

  if (view === "manager") return <StockManagerEmbedded inv={inv} persistInv={persistInv} onBack={() => setView("rx")} />;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 20, background: BG, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: TXT, margin: 0 }}>Prescription Details</h2>
        <button onClick={() => { setPwInput(""); setPwError(false); setShowPwGate(true); }} title="Manage Stock & Pricing"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${BDR}`, background: SRF, color: T2, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          <Settings size={15} /> Manage Stock
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, maxWidth: 300 }}>
        {["Card", "Exam", "Glasses"].map((source) => (
          <button key={source} onClick={() => setSelectedSource(selectedSource === source ? "" : source)}
            style={{ flex: 1, padding: "7px 8px", borderRadius: 8, border: `1.5px solid ${selectedSource === source ? "#2563EB" : BDR}`, background: selectedSource === source ? "#EFF6FF" : SRF, color: selectedSource === source ? "#1D4ED8" : T2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {source}
          </button>
        ))}
      </div>

      {selectedSource && (
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0
