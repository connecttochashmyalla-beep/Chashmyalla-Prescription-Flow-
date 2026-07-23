export const rng = (f, t, s) => { const v = []; let x = f; while (s < 0 ? x >= t - 1e-9 : x <= t + 1e-9) { v.push(parseFloat(x.toFixed(2))); x = parseFloat((x + s).toFixed(2)); } return v; };
export const MINUS_SPH = rng(-.25, -10, -.25), PLUS_SPH = rng(.25, 10, .25), CROSS_SPH = rng(.25, 6, .25);
export const CYL_M = rng(0, -4, -.25), CYL_P = rng(0, 4, .25), CYL_X = rng(-.25, -4, -.25);
export const HI_SPH = [...rng(-4, -10, -.25), ...rng(4, 10, .25)].sort((a, b) => b - a);
export const HI_CYL = rng(-.25, -4, -.25);
export const BF_P = [0, .5, .75, ...rng(1, 3, .25)], BF_M = rng(-.5, -3, -.25), BF_ADD = rng(1, 3, .25);
export const CL_SPH = [0, ...rng(-.25, -10, -.25)];
export const fmtNum = (v) => (v === 0 ? "0.00" : v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

const mkTiers = (rows) => rows.map(([maxSph, maxCyl, purchase, sell], i) => ({ label: `T${i + 1}`, maxSph, maxCyl, purchase, sell }));
export const DEF_PRICES = {
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
export const FLAT_IDS = ["bifocal", "bifocalMinus", "rx_price", "cl_sph", "cl_toric"];
export const PRESET_TYPES = [{ id: "pt_simple", name: "Simple" }, { id: "pt_uvbc", name: "UV / BC" }, { id: "pt_pg_sun", name: "PG / Sunglasses" }, { id: "pt_pgbc", name: "PG + BC" }];
export const CL_BRANDS = [{ id: "clb_innova", name: "Innova" }, { id: "clb_ultimate", name: "Ultimate" }, { id: "clb_ultima", name: "Ultima" }, { id: "clb_comfort", name: "Comfort" }];
export const CL_COLORS = [
  { id: "clc_transparent", name: "Transparent", hex: "#CBD5E1" }, { id: "clc_gray", name: "Gray", hex: "#6B7280" },
  { id: "clc_brown", name: "Brown", hex: "#92400E" }, { id: "clc_green", name: "Green", hex: "#059669" },
  { id: "clc_blue", name: "Blue", hex: "#3B82F6" }, { id: "clc_hazel", name: "Hazel", hex: "#D97706" },
];
export const makePresetMeta = () => ({ types: JSON.parse(JSON.stringify(PRESET_TYPES)), vars: Object.fromEntries(PRESET_TYPES.map((t) => [t.id, []])) });
export const makeCLMeta = () => ({ types: JSON.parse(JSON.stringify(CL_BRANDS)), vars: Object.fromEntries(CL_BRANDS.map((b) => [b.id, JSON.parse(JSON.stringify(CL_COLORS))])) });
export const DEF_DATA = { meta: { single_vision: makePresetMeta(), bifocal: makePresetMeta(), rx: makePresetMeta(), contact_lens: makeCLMeta() }, stocks: {}, prices: {} };
export const PRESET_CATS = ["single_vision", "bifocal", "rx"];
export const ensurePresets = (data) => {
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
export const getTier = (a, b, sec) => { if (!sec?.tiers) return null; const as = Math.abs(parseFloat(a) || 0), ac = Math.abs(parseFloat(b) || 0); return sec.tiers.find((t) => as <= t.maxSph && ac <= t.maxCyl) || sec.tiers[sec.tiers.length - 1]; };
export const SK_K = (a, b) => `${parseFloat(a).toFixed(2)}_${parseFloat(b).toFixed(2)}`;
export const round25 = (v) => Math.round((parseFloat(v) || 0) / 0.25) * 0.25;

export const CAT_META = {
  single_vision: { label: "Single Vision", color: "#2563EB", icon: "👓" },
  bifocal: { label: "Bifocal", color: "#059669", icon: "🔍" },
  contact_lens: { label: "Contact Lens", color: "#DB2777", icon: "👁" },
};
export const TAB_LABELS = { minus: "− SPH/CYL", plus: "+ SPH/CYL", cross: "Cross No.", hiIdx: "High Index", bifocal: "Bifocal +", bifocalMinus: "Bifocal −", cl_sph: "Spherical", cl_toric: "Toric" };

export const resolveTab = (category, sph, cyl) => {
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
export const getTypeTags = (name) => {
  const tags = [];
  TAG_RULES.forEach((r) => { if (r.kw.test(name)) r.tags.forEach((t) => { if (!tags.includes(t)) tags.push(t); }); });
  if (tags.length === 0) tags.push("Everyday Clarity", "Standard Coating");
  return tags.slice(0, 3);
};
export const getTypeIcon = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("uv")) return "🕶️";
  if (n.includes("sun")) return "🌞";
  if (n.includes("pg") || n.includes("photo")) return "🌗";
  if (n.includes("bc")) return "🔷";
  if (n.includes("simple")) return "⚪";
  return "👓";
};

export const getVariantSpecs = (category, tab, tier, variant) => {
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

export const getAvailability = (stock) => {
  if (stock === null) return { label: "On Demand", time: "2 Days", bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" };
  if (stock > 0) return { label: "Available", time: "30 Min", bg: "#F0FDF4", fg: "#15803D", bd: "#BBF7D0" };
  return { label: "Unavailable", time: "Next Day", bg: "#FEF2F2", fg: "#DC2626", bd: "#FECACA" };
};

export const BG = "#F1F5F9", SRF = "#FFFFFF", BDR = "#E2E8F0", TXT = "#0F172A", T2 = "#64748B", T3 = "#94A3B8";
export const CARD = { background: SRF, borderRadius: 16, border: `1px solid ${BDR}`, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.06)" };

export const emptyRx = () => ({ rightEye: { sphere: "", cylinder: "", axis: "", pd: "" }, leftEye: { sphere: "", cylinder: "", axis: "", pd: "" }, add: "" });
export const PICKER_VALUES = Array.from({ length: 65 }, (_, i) => Math.round((i - 32) * 25) / 100);
export const formatSigned = (v) => (v === 0 ? "0.00" : v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
export const inputStyle = { width: "100%", padding: "9px 10px", fontSize: 13, background: "#F8FAFC", border: `1px solid ${BDR}`, borderRadius: 8, color: TXT, outline: "none", boxSizing: "border-box" };
export const pickerBtnStyle = { position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T3, fontSize: 11, cursor: "pointer" };
