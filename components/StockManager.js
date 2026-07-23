"use client";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  CAT_META, DEF_PRICES, FLAT_IDS, TAB_LABELS, SK_K, fmtNum,
  MINUS_SPH, PLUS_SPH, CROSS_SPH, HI_SPH, CYL_M, CYL_P, CYL_X, HI_CYL,
  BF_P, BF_M, BF_ADD, CL_SPH, BG, SRF, BDR, TXT, T2, T3, CARD, inputStyle,
} from "../lib/constants";

export default function StockManagerEmbedded({ inv, persistInv, onBack }) {
  const [cat, setCat] = useState("single_vision");
  const [typeId, setTypeId] = useState(null);
  const [varId, setVarId] = useState(null);
  const [tab, setTab] = useState("minus");
  const [newTypeName, setNewTypeName] = useState("");
  const [newVarName, setNewVarName] = useState("");
  const [cellModal, setCellModal] = useState(null);
  const [cellQty, setCellQty] = useState(0);
  const [showPriceEd, setShowPriceEd] = useState(false);

  const catCfg = CAT_META[cat];
  const meta = inv.meta?.[cat] || { types: [], vars: {} };
  const types = meta.types || [];
  const cType = typeId ? types.find((t) => t.id === typeId) : null;
  const vars = cType ? meta.vars?.[cType.id] || [] : [];
  const cVar = varId ? vars.find((v) => v.id === varId) : null;

  const tabsForCat = cat === "single_vision" ? ["minus", "plus", "cross", "hiIdx"] : cat === "bifocal" ? ["bifocal", "bifocalMinus"] : ["cl_sph", "cl_toric"];
  const SK = cType && cVar ? (cat === "contact_lens" ? `contact_lens::${cType.id}::${cVar.id}${tab === "cl_toric" ? "_t2" : "_t1"}` : `${cat}::${cType.id}::${cVar.id}`) : null;
  const stock = SK ? inv.stocks?.[SK] || {} : {};
  const storedPr = SK ? inv.prices?.[SK]?.[tab] : null;
  const vPr = storedPr || DEF_PRICES[tab];

  const gridRows = tab === "minus" ? MINUS_SPH : tab === "plus" ? PLUS_SPH : tab === "cross" ? CROSS_SPH : tab === "hiIdx" ? HI_SPH : tab === "bifocal" ? BF_P : tab === "bifocalMinus" ? BF_M : CL_SPH;
  const gridCols = tab === "minus" ? CYL_M : tab === "plus" ? CYL_P : tab === "cross" ? CYL_X : tab === "hiIdx" ? HI_CYL : tab === "bifocal" || tab === "bifocalMinus" ? BF_ADD : tab === "cl_toric" ? CYL_M : [0];

  const selectCat = (c) => { setCat(c); setTypeId(null); setVarId(null); setTab(c === "single_vision" ? "minus" : c === "bifocal" ? "bifocal" : "cl_sph"); };

  const addType = () => {
    const name = newTypeName.trim(); if (!name) return;
    const nd = JSON.parse(JSON.stringify(inv));
    if (!nd.meta[cat]) nd.meta[cat] = { types: [], vars: {} };
    const nt = { id: `t${Date.now()}`, name };
    nd.meta[cat].types.push(nt); nd.meta[cat].vars[nt.id] = [];
    persistInv(nd); setNewTypeName(""); setTypeId(nt.id);
  };
  const addVar = () => {
    const name = newVarName.trim(); if (!name || !cType) return;
    const nd = JSON.parse(JSON.stringify(inv));
    const nv = { id: `v${Date.now()}`, name };
    if (!nd.meta[cat].vars[cType.id]) nd.meta[cat].vars[cType.id] = [];
    nd.meta[cat].vars[cType.id].push(nv);
    persistInv(nd); setNewVarName(""); setVarId(nv.id);
  };

  const openCell = (a, b) => { if (!SK) return; setCellModal({ a, b, key: SK_K(a, b) }); setCellQty(stock[SK_K(a, b)] || 0); };
  const saveCell = async () => {
    if (!SK) return;
    const nd = JSON.parse(JSON.stringify(inv));
    if (!nd.stocks[SK]) nd.stocks[SK] = {};
    nd.stocks[SK][cellModal.key] = Math.max(0, cellQty);
    await persistInv(nd); setCellModal(null);
  };

  const [tierEdit, setTierEdit] = useState(null);
  const openPriceEditor = () => { setTierEdit(JSON.parse(JSON.stringify(vPr))); setShowPriceEd(true); };
  const savePriceEditor = async () => {
    if (!SK) return;
    const nd = JSON.parse(JSON.stringify(inv));
    if (!nd.prices[SK]) nd.prices[SK] = {};
    nd.prices[SK][tab] = tierEdit;
    await persistInv(nd); setShowPriceEd(false);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 20, background: BG, minHeight: "100vh", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${BDR}`, background: SRF, color: T2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft size={17} /></button>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: TXT, margin: 0 }}>Lens Stock Manager</h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {Object.keys(CAT_META).map((c) => (
          <button key={c} onClick={() => selectCat(c)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: `2px solid ${cat === c ? CAT_META[c].color : BDR}`, background: cat === c ? `${CAT_META[c].color}12` : SRF, color: cat === c ? CAT_META[c].color : T2, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {CAT_META[c].icon} {CAT_META[c].label}
          </button>
        ))}
      </div>

      <div style={{ ...CARD, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T3, marginBottom: 8, textTransform: "uppercase" }}>Type</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {types.map((t) => (
            <button key={t.id} onClick={() => { setTypeId(t.id); setVarId(null); }} style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${typeId === t.id ? catCfg.color : BDR}`, background: typeId === t.id ? `${catCfg.color}12` : SRF, color: typeId === t.id ? catCfg.color : T2, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{t.name}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Add new type…" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addType} style={{ padding: "0 14px", borderRadius: 8, border: "none", background: catCfg.color, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add</button>
        </div>
      </div>

      {cType && (
        <div style={{ ...CARD, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T3, marginBottom: 8, textTransform: "uppercase" }}>Variation</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {vars.map((v) => (
              <button key={v.id} onClick={() => setVarId(v.id)} style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${varId === v.id ? catCfg.color : BDR}`, background: varId === v.id ? `${catCfg.color}12` : SRF, color: varId === v.id ? catCfg.color : T2, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{v.name}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={newVarName} onChange={(e) => setNewVarName(e.target.value)} placeholder="Add new variation…" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addVar} style={{ padding: "0 14px", borderRadius: 8, border: "none", background: catCfg.color, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Add</button>
          </div>
        </div>
      )}

      {cVar && (
        <div style={CARD}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {tabsForCat.map((tb) => (
              <button key={tb} onClick={() => setTab(tb)} style={{ padding: "5px 10px", borderRadius: 7, border: `1.5px solid ${tab === tb ? catCfg.color : BDR}`, background: tab === tb ? `${catCfg.color}12` : SRF, color: tab === tb ? catCfg.color : T2, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{TAB_LABELS[tb]}</button>
            ))}
            <button onClick={openPriceEditor} style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 7, border: `1.5px solid ${BDR}`, background: "#F8FAFC", color: T2, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>⚙ Set Price</button>
          </div>

          <div style={{ overflow: "auto", maxHeight: 320, border: `1px solid ${BDR}`, borderRadius: 8 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 10, fontFamily: "monospace" }}>
              <thead>
                <tr>
                  <th style={{ position: "sticky", left: 0, top: 0, background: "#F8FAFC", padding: 5, border: `1px solid ${BDR}`, zIndex: 2 }}>SPH\{tab.includes("bifocal") ? "ADD" : "CYL"}</th>
                  {gridCols.map((c) => <th key={c} style={{ position: "sticky", top: 0, background: "#F8FAFC", padding: "5px 3px", border: `1px solid ${BDR}`, minWidth: 34, zIndex: 1 }}>{fmtNum(c)}</th>)}
                </tr>
              </thead>
              <tbody>
                {gridRows.map((r) => (
                  <tr key={r}>
                    <td style={{ position: "sticky", left: 0, background: "#F8FAFC", padding: "3px 6px", border: `1px solid ${BDR}`, fontWeight: 700, textAlign: "right" }}>{fmtNum(r)}</td>
                    {gridCols.map((c) => {
                      const q = stock[SK_K(r, c)] || 0;
                      const col = q === 0 ? { bg: "#F8FAFC", fg: T3 } : q <= 3 ? { bg: "#FFFBEB", fg: "#B45309" } : { bg: "#F0FDF4", fg: "#15803D" };
                      return <td key={c} onClick={() => openCell(r, c)} style={{ width: 34, height: 26, textAlign: "center", background: col.bg, color: col.fg, border: `1px solid ${BDR}`, cursor: "pointer", fontWeight: 700 }}>{q || "·"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cellModal && (
        <div onClick={() => setCellModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: SRF, width: "100%", borderRadius: "18px 18px 0 0", padding: 20 }}>
            <div style={{ fontSize: 13, color: T3, marginBottom: 4 }}>{cType?.name} · {cVar?.name}</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>SPH {fmtNum(cellModal.a)} / {tab.includes("bifocal") ? "ADD" : "CYL"} {fmtNum(cellModal.b)}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 16 }}>
              <button onClick={() => setCellQty((q) => Math.max(0, q - 1))} style={{ width: 42, height: 42, borderRadius: 21, border: `1.5px solid ${BDR}`, background: "#F8FAFC", fontSize: 20, cursor: "pointer" }}>−</button>
              <input type="number" value={cellQty} onChange={(e) => setCellQty(Math.max(0, parseInt(e.target.value) || 0))} style={{ width: 70, textAlign: "center", fontSize: 24, fontWeight: 800, border: `2px solid #BFDBFE`, borderRadius: 10, padding: "6px 0" }} />
              <button onClick={() => setCellQty((q) => q + 1)} style={{ width: 42, height: 42, borderRadius: 21, border: "none", background: catCfg.color, color: "#fff", fontSize: 20, cursor: "pointer" }}>+</button>
            </div>
            <button onClick={saveCell} style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", background: catCfg.color, color: "#fff", fontWeight: 800, cursor: "pointer" }}>Save Stock</button>
          </div>
        </div>
      )}

      {showPriceEd && tierEdit && (
        <div onClick={() => setShowPriceEd(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: SRF, width: "100%", borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Set Price — {TAB_LABELS[tab]}</div>
            {FLAT_IDS.includes(tab) ? (
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T3 }}>Purchase</label><input type="number" value={tierEdit.purchase} onChange={(e) => setTierEdit((p) => ({ ...p, purchase: parseFloat(e.target.value) || 0 }))} style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 10, color: T3 }}>Sell</label><input type="number" value={tierEdit.sell} onChange={(e) => setTierEdit((p) => ({ ...p, sell: parseFloat(e.target.value) || 0 }))} style={inputStyle} /></div>
              </div>
            ) : (
              tierEdit.tiers.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: T3, width: 40 }}>≤{t.maxSph}/{t.maxCyl}</span>
                  <input type="number" value={t.purchase} onChange={(e) => setTierEdit((p) => { const nt = [...p.tiers]; nt[i] = { ...nt[i], purchase: parseFloat(e.target.value) || 0 }; return { ...p, tiers: nt }; })} placeholder="Purchase" style={{ ...inputStyle, flex: 1 }} />
                  <input type="number" value={t.sell} onChange={(e) => setTierEdit((p) => { const nt = [...p.tiers]; nt[i] = { ...nt[i], sell: parseFloat(e.target.value) || 0 }; return { ...p, tiers: nt }; })} placeholder="Sell" style={{ ...inputStyle, flex: 1 }} />
                </div>
              ))
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setShowPriceEd(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${BDR}`, background: SRF, color: T2, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={savePriceEditor} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: catCfg.color, color: "#fff", fontWeight: 800, cursor: "pointer" }}>Save Prices</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
