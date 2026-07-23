"use client";
import { useState, useEffect, useRef } from "react";
import { RotateCcw, Plus, X, Eye, Check, ChevronRight, Glasses as GlassesIcon, CircleDot, Settings, Clock } from "lucide-react";
import { storage } from "../lib/storage";
import StockManagerEmbedded from "../components/StockManager";
import {
  ensurePresets, DEF_DATA, getTier, SK_K, round25, CAT_META, resolveTab,
  getTypeTags, getTypeIcon, getVariantSpecs, getAvailability, DEF_PRICES, FLAT_IDS,
  BG, SRF, BDR, TXT, T2, T3, CARD, emptyRx, PICKER_VALUES, formatSigned, inputStyle, pickerBtnStyle,
} from "../lib/constants";

export default function PrescriptionLensFlow() {
  const [view, setView] = useState("rx");
  const [inv, setInv] = useState(DEF_DATA);

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
        <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.08)", border: `1px solid ${BDR}`, marginBottom: 20 }}>
          <div style={{ background: "linear-gradient(90deg,#2563EB,#4F46E5)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Eye size={20} color="#fff" />
              <div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Prescription Details</div>
                <div style={{ color: "#DBEAFE", fontSize: 11 }}>Via {selectedSource}</div>
              </div>
            </div>
            <button onClick={handleResetPrescription} title="Reset" style={{ width: 32, height: 32, borderRadius: 16, border: "none", background: "rgba(255,255,255,.18)", color: "#fff", cursor: "pointer" }}><RotateCcw size={16} /></button>
          </div>

          <div style={{ background: SRF, padding: 20 }}>
            <button onClick={() => setShowReferencePopup(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: T3, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 14, padding: 0 }}>
              <Plus size={14} /> Save previous as reference
            </button>

            <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 6, fontSize: 10, color: T3, fontWeight: 600, textAlign: "center" }}>
              <div></div><div>SPH</div><div>CYL</div><div>AXIS</div><div>PD</div>
            </div>

            {["rightEye", "leftEye"].map((eye) => (
              <div key={eye} style={{ display: "grid", gridTemplateColumns: "20px 1fr 1fr 1fr 1fr", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, color: T2 }}>{eye === "rightEye" ? "R" : "L"}</div>
                <div style={{ position: "relative" }}>
                  <input type="text" placeholder="±0.0" value={prescription[eye].sphere} onChange={(e) => handlePrescriptionChange(eye, "sphere", e.target.value)} style={{ ...inputStyle, paddingRight: 24 }} />
                  <button onClick={() => openPicker(eye, "sphere")} style={pickerBtnStyle}>▦</button>
                </div>
                <div style={{ position: "relative" }}>
                  <input type="text" placeholder="±0.0" value={prescription[eye].cylinder} onChange={(e) => handlePrescriptionChange(eye, "cylinder", e.target.value)} style={{ ...inputStyle, paddingRight: 24 }} />
                  <button onClick={() => openPicker(eye, "cylinder")} style={pickerBtnStyle}>▦</button>
                </div>
                <input type="text" placeholder="0-180" value={prescription[eye].axis} onChange={(e) => handlePrescriptionChange(eye, "axis", e.target.value)}
                  style={{ ...inputStyle, background: !isAxisRequired(eye) ? SRF : isAxisValid(eye) ? "#F0FDF4" : "#FEF2F2", borderColor: !isAxisRequired(eye) ? BDR : isAxisValid(eye) ? "#BBF7D0" : "#FECACA" }} />
                <input type="text" placeholder="63mm" value={prescription[eye].pd} onChange={(e) => handlePrescriptionChange(eye, "pd", e.target.value)} style={inputStyle} />
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T3, display: "block", marginBottom: 6 }}>ADD</label>
              <input type="text" placeholder="+0.00" value={prescription.add} onChange={(e) => { setPrescription((p) => ({ ...p, add: e.target.value })); resetDownstream(); }} style={{ ...inputStyle, maxWidth: 140 }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => {
                if (!isAxisValid("rightEye") || !isAxisValid("leftEye")) { alert("Please enter AXIS value when CYL is provided."); return; }
                setPrescriptionDone(true);
                const opts = getAvailableVisionTypes();
                if (opts.length === 1) { setSelectedVisionType(opts[0]); setPickedTypeId(null); setLockedVariant(null); }
              }} style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: "#16A34A", color: "#fff", fontSize: 16, cursor: "pointer" }}>✓</button>
            </div>
          </div>
        </div>
      )}

      {prescriptionDone && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TXT, marginBottom: 10 }}>Vision Type *</div>
          {getAvailableVisionTypes().length > 1 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {getAvailableVisionTypes().map((type) => (
                <button key={type} onClick={() => { setSelectedVisionType(type); setPickedTypeId(null); setLockedVariant(null); }}
                  style={{ padding: 12, borderRadius: 10, border: `2px solid ${selectedVisionType === type ? "#2563EB" : BDR}`, background: selectedVisionType === type ? "#EFF6FF" : SRF, color: selectedVisionType === type ? "#1D4ED8" : T2, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {type}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ width: "100%", textAlign: "left", padding: 12, borderRadius: 10, border: "1px solid #BFDBFE", background: "#EFF6FF", color: "#1D4ED8" }}>
              ✓ Auto-Selected: <strong>Distance</strong> (Single Vision)
            </div>
          )}
        </div>
      )}
        {selectedVisionType && showLensChoiceToggle && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TXT, marginBottom: 8 }}>Lens Category</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setLensChoice("glasses"); setPickedTypeId(null); setLockedVariant(null); }}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, border: `2px solid ${lensChoice === "glasses" ? "#2563EB" : BDR}`, background: lensChoice === "glasses" ? "#EFF6FF" : SRF, color: lensChoice === "glasses" ? "#1D4ED8" : T2, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <GlassesIcon size={16} /> Glasses
            </button>
            <button onClick={() => { setLensChoice("contactLens"); setPickedTypeId(null); setLockedVariant(null); }}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10, border: `2px solid ${lensChoice === "contactLens" ? "#DB2777" : BDR}`, background: lensChoice === "contactLens" ? "#FDF2F8" : SRF, color: lensChoice === "contactLens" ? "#BE185D" : T2, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <CircleDot size={16} /> Contact Lens
            </button>
          </div>
        </div>
      )}

      {selectedVisionType && (!showLensChoiceToggle || lensChoice) && (
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#F8FAFC", border: `1px solid ${BDR}`, borderRadius: 10 }}>
          <span style={{ fontSize: 12, color: T3, fontWeight: 600 }}>Lenses needed:</span>
          <span style={{ fontSize: 13, color: TXT, fontWeight: 800 }}>
            {eyesNeeded.length === 2 ? "Both Eyes" : eyesNeeded[0] === "rightEye" ? "Right Eye Only" : "Left Eye Only"}
          </span>
          {eyesNeeded.length === 1 && <span style={{ fontSize: 11, color: T3 }}>— only this eye has a prescription entered</span>}
          {clForceToric && <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: "#BE185D", background: "#FDF2F8", padding: "3px 8px", borderRadius: 20 }}>Toric pair (matched)</span>}
        </div>
      )}

      {selectedVisionType && (!showLensChoiceToggle || lensChoice) && (() => {
        const finalRx = getFinalPrescription();
        if (!finalRx) return null;
        return (
          <div style={{ background: "linear-gradient(135deg,#F0FDF4,#ECFDF5)", border: "2px solid #86EFAC", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, color: "#15803D", fontSize: 15, marginBottom: 8 }}>Final Reading Result — {selectedVisionType}{showLensChoiceToggle ? ` · ${lensChoice === "glasses" ? "Glasses" : "Contact Lens"}` : ""}</div>
            <div style={{ background: SRF, borderRadius: 8, padding: 12, fontSize: 13 }}>
              {["rightEye", "leftEye"].map((eye) => (
                <div key={eye} style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: T2 }}>{eye === "rightEye" ? "R: " : "L: "}</span>
                  <span style={{ color: TXT }}>{[finalRx[eye].sphere && `SPH ${finalRx[eye].sphere}`, finalRx[eye].cylinder && `CYL ${finalRx[eye].cylinder}`, finalRx[eye].axis && `AXIS ${finalRx[eye].axis}`, finalRx[eye].pd && `PD ${finalRx[eye].pd}`, finalRx[eye].add && `ADD ${finalRx[eye].add}`].filter(Boolean).join(" | ")}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {resolvedCategory && !lockedVariant && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{CAT_META[resolvedCategory].icon}</span>
            <div style={{ fontWeight: 800, fontSize: 14, color: TXT }}>{CAT_META[resolvedCategory].label}</div>
            {pickedType && <button onClick={() => setPickedTypeId(null)} style={{ marginLeft: "auto", fontSize: 11, color: T3, background: "none", border: "none", cursor: "pointer" }}>‹ Change type</button>}
          </div>

          {!pickedType ? (
            types.length === 0 ? (
              <div style={{ ...CARD, textAlign: "center", color: T3, fontSize: 12 }}>No lens types set up in Lens Stock Manager for this category yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {types.map((t) => {
                  const tags = getTypeTags(t.name);
                  return (
                    <button key={t.id} onClick={() => setPickedTypeId(t.id)} style={{ ...CARD, cursor: "pointer", textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${CAT_META[resolvedCategory].color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{getTypeIcon(t.name)}</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: TXT }}>{t.name}</div>
                        <ChevronRight size={16} color={T3} style={{ marginLeft: "auto" }} />
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                        {tags.map((tag) => (
                          <span key={tag} style={{ fontSize: 10.5, fontWeight: 700, color: CAT_META[resolvedCategory].color, background: `${CAT_META[resolvedCategory].color}12`, padding: "4px 9px", borderRadius: 20 }}>{tag}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div>
              <div style={{ fontSize: 12, color: T2, marginBottom: 10 }}>Select a variation for this prescription's power:</div>
              {variantsForType.length === 0 ? (
                <div style={{ ...CARD, textAlign: "center", color: T3, fontSize: 12 }}>No variations under "{pickedType.name}" yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {variantsForType.map((v) => {
                    const { total, parts, avail } = totalForVariant(pickedType.id, v.id);
                    const mainPart = parts[0];
                    const specs = getVariantSpecs(resolvedCategory, mainPart.tab, mainPart.tier, v);
                    const disabled = avail.label === "Unavailable";
                    const eyeLabel = (e) => (e === "rightEye" ? "R" : "L");
                    const showBreakdown = parts.length > 1 && (parts[0].sell !== parts[1].sell || parts[0].sk !== parts[1].sk);
                    return (
                      <button key={v.id} disabled={disabled} onClick={() => lockVariant(pickedType, v)}
                        style={{ ...CARD, textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, padding: 0, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 16px 14px" }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 17, color: TXT }}>{v.name}</div>
                            {showBreakdown && <div style={{ fontSize: 10.5, color: T3, marginTop: 2 }}>{parts.map((p) => `${eyeLabel(p.eye)}: PKR ${p.sell.toLocaleString()}${p.tier ? ` (${p.tier.label})` : ""}`).join("  ·  ")}</div>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: TXT }}>PKR {total.toLocaleString()}</div>
                            {parts.length > 1 && <div style={{ fontSize: 10, color: T3 }}>Total ({parts.length} lens{parts.length > 1 ? "es" : ""})</div>}
                          </div>
                        </div>
                        <div style={{ height: 1, background: BDR }} />
                        <div style={{ display: "grid", gridTemplateColumns: `repeat(${specs.length},1fr)`, padding: "14px 8px" }}>
                          {specs.map((s, i) => (
                            <div key={s.label} style={{ textAlign: "center", borderLeft: i === 0 ? "none" : `1px solid ${BDR}` }}>
                              <div style={{ fontSize: 10.5, color: T3, marginBottom: 4 }}>{s.label}</div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: TXT }}>{s.value}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ height: 1, background: BDR }} />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: avail.fg, background: avail.bg, border: `1px solid ${avail.bd}`, padding: "5px 11px", borderRadius: 20 }}>{avail.label}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: T2 }}><Clock size={13} /> {avail.time}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
                  {lockedVariant && (
        <div style={{ ...CARD, borderColor: "#86EFAC", background: "#F0FDF4", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, background: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={18} color="#fff" /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#15803D" }}>{lockedVariant.confirmed ? "Locked" : "Ready to lock"}</div>
              <div style={{ fontSize: 11, color: T2 }}>{CAT_META[lockedVariant.category].label} · {lockedVariant.typeName} · {lockedVariant.variantName}</div>
            </div>
          </div>
          <div style={{ background: SRF, borderRadius: 8, padding: 10, marginBottom: 10 }}>
            {lockedVariant.parts.map((p) => (
              <div key={p.eye} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 2px" }}>
                <span style={{ color: T2, fontWeight: 700 }}>{p.eye === "rightEye" ? "Right Lens" : "Left Lens"}{p.tier ? ` · ${p.tier.label}` : ""}</span>
                <span style={{ color: TXT, fontFamily: "monospace", fontWeight: 700 }}>PKR {p.sell.toLocaleString()} {p.stock === null ? "(On Demand)" : p.stock === 0 ? "(Out of stock)" : `(${p.stock} in stock)`}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: SRF, borderRadius: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: T3, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#059669", fontFamily: "monospace" }}>PKR {lockedVariant.total.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setLockedVariant(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${BDR}`, background: SRF, color: T2, fontWeight: 700, cursor: "pointer" }}>Back</button>
            {!lockedVariant.confirmed ? (
              <button onClick={confirmLock} disabled={lockedVariant.avail.label === "Unavailable"} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: lockedVariant.avail.label === "Unavailable" ? "#94A3B8" : "#16A34A", color: "#fff", fontWeight: 800, cursor: lockedVariant.avail.label === "Unavailable" ? "not-allowed" : "pointer" }}>Confirm & Lock</button>
            ) : (
              <div style={{ flex: 2, padding: 12, borderRadius: 10, background: "#16A34A", color: "#fff", fontWeight: 800, textAlign: "center" }}>✓ Locked{lockedVariant.avail.label === "On Demand" ? " — order queued" : " — stock reserved"}</div>
            )}
          </div>
        </div>
      )}

      {savedReferences.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T3, textTransform: "uppercase", marginBottom: 8 }}>Saved References</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {savedReferences.map((ref, i) => (
              <div key={i} style={{ background: "#F8FAFC", border: `1px solid ${BDR}`, borderRadius: 8, padding: 10, fontSize: 11, color: T2 }}>
                <span style={{ fontWeight: 700, color: TXT }}>{ref.savedAt}</span>
                {" — R: "}{[ref.rightEye.sphere && `SPH ${ref.rightEye.sphere}`, ref.rightEye.cylinder && `CYL ${ref.rightEye.cylinder}`, ref.rightEye.axis && `AXIS ${ref.rightEye.axis}`].filter(Boolean).join(" ") || "—"}
                {" | L: "}{[ref.leftEye.sphere && `SPH ${ref.leftEye.sphere}`, ref.leftEye.cylinder && `CYL ${ref.leftEye.cylinder}`, ref.leftEye.axis && `AXIS ${ref.leftEye.axis}`].filter(Boolean).join(" ") || "—"}
              </div>
            ))}
          </div>
        </div>
      )}

      {showReferencePopup && (
        <div onClick={handleCancelReference} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "linear-gradient(135deg,#EFF6FF,#F0F9FF,#EEF2FF)", border: `1px solid ${BDR}`, borderRadius: 16, padding: 22, boxShadow: "0 10px 40px rgba(0,0,0,.2)", maxWidth: 380, width: "100%", position: "relative" }}>
            <button onClick={handleCancelReference} style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: 15, background: SRF, border: `1px solid ${BDR}`, color: T2, cursor: "pointer" }}><X size={14} /></button>
            <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: T3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 18 }}>Previous Prescription (Reference Only)</div>
            {["rightEye", "leftEye"].map((eye) => (
              <div key={eye} style={{ display: "grid", gridTemplateColumns: "20px 1fr 1fr 1fr 1fr", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 700, color: T2 }}>{eye === "rightEye" ? "R" : "L"}</div>
                <input type="text" placeholder="±0.00" value={referenceDraft[eye].sphere} onChange={(e) => handleReferenceDraftChange(eye, "sphere", e.target.value)} style={inputStyle} />
                <input type="text" placeholder="±0.00" value={referenceDraft[eye].cylinder} onChange={(e) => handleReferenceDraftChange(eye, "cylinder", e.target.value)} style={inputStyle} />
                <input type="text" placeholder="0-180" value={referenceDraft[eye].axis} onChange={(e) => handleReferenceDraftChange(eye, "axis", e.target.value)} style={inputStyle} />
                <input type="text" placeholder="63mm" value={referenceDraft[eye].pd} onChange={(e) => handleReferenceDraftChange(eye, "pd", e.target.value)} style={inputStyle} />
              </div>
            ))}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 10, color: T3, fontWeight: 600, display: "block", marginBottom: 6 }}>ADD</label>
              <input type="text" placeholder="+0.00" value={referenceDraft.add} onChange={(e) => setReferenceDraft((p) => ({ ...p, add: e.target.value }))} style={{ ...inputStyle, maxWidth: 140 }} />
            </div>
            <button onClick={handleSaveReference} style={{ width: 40, height: 40, borderRadius: 20, margin: "0 auto", display: "block", border: "none", background: "#16A34A", color: "#fff", cursor: "pointer" }}>✓</button>
          </div>
        </div>
      )}

      {activePicker && (
        <div onClick={closePicker} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: SRF, borderRadius: "18px 18px 0 0", width: "100%", maxHeight: "75vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "#DC2626", padding: "10px 8px", display: "flex" }}>
              {["positive", "all", "negative"].map((f) => (
                <button key={f} onClick={() => setPickerFilter(f)} style={{ flex: 1, background: "none", border: "none", color: pickerFilter === f ? "#fff" : "#FCA5A5", fontWeight: pickerFilter === f ? 800 : 500, fontSize: 12, cursor: "pointer", padding: "4px 0" }}>
                  {f === "positive" ? "Positive (+)" : f === "negative" ? "Negative (−)" : "All"}
                </button>
              ))}
            </div>
            <div ref={pickerScrollRef} style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {getFilteredPickerValues().map((v) => {
                  const label = formatSigned(v);
                  const isSelected = activePicker && parseFloat(prescription[activePicker.eye][activePicker.field] || "") === v;
                  return (
                    <button key={v} ref={v === 0 ? pickerZeroRef : null} onClick={() => selectPickerValue(v)}
                      style={{ padding: "10px 0", borderRadius: 8, border: "none", background: isSelected ? "#DC2626" : "#F1F5F9", color: isSelected ? "#fff" : T2, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPwGate && (
        <div onClick={() => setShowPwGate(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: SRF, borderRadius: 16, padding: 24, maxWidth: 320, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}><Settings size={17} color="#2563EB" /></div>
              <div style={{ fontWeight: 800, fontSize: 15, color: TXT }}>Manager Access</div>
            </div>
            <div style={{ fontSize: 12, color: T2, marginBottom: 12 }}>Enter the manager password to edit stock, prices, types, and variations.</div>
            <input
              type="password"
              autoFocus
              placeholder="Password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const ok = pwInput === (process.env.NEXT_PUBLIC_MANAGER_PASSWORD || "admin123");
                  if (ok) { setShowPwGate(false); setView("manager"); } else setPwError(true);
                }
              }}
              style={{ ...inputStyle, marginBottom: pwError ? 6 : 14, borderColor: pwError ? "#FCA5A5" : BDR }}
            />
            {pwError && <div style={{ fontSize: 11, color: "#DC2626", marginBottom: 10 }}>Incorrect password. Try again.</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowPwGate(false)} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1.5px solid ${BDR}`, background: SRF, color: T2, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button
                onClick={() => {
                  const ok = pwInput === (process.env.NEXT_PUBLIC_MANAGER_PASSWORD || "admin123");
                  if (ok) { setShowPwGate(false); setView("manager"); } else setPwError(true);
                }}
                style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: "#2563EB", color: "#fff", fontWeight: 800, cursor: "pointer" }}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
              }
