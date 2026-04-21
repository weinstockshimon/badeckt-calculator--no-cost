import React, { useEffect, useMemo, useState } from "react";

const MAX_PROJECTION_FT = 23;
const IN_PER_FT = 12;
const MM_PER_IN = 25.4;
const M_PER_IN = 0.0254;

function Section({ title, children }) {
  return (
    <div className="bg-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, readOnly = false, onBlur }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onChange("");
          return;
        }
        const cleaned = raw.replace(/[^0-9.-]/g, "");
        onChange(cleaned);
      }}
      onBlur={onBlur}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-400 ${
        readOnly ? "bg-gray-50 text-gray-600" : "bg-white"
      }`}
    />
  );
}

function FeetInchesInput({ value, onChange, placeholder, onBlur }) {
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-green-400 bg-white"
    />
  );
}

function parseNum(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(value, decimals = 4) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return Number(value.toFixed(decimals)).toString();
}

function parseFeetInches(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/[′’]/g, "'")
    .replace(/[″“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.includes("'")) {
    const parts = cleaned.split("'");
    const feet = parseNum(parts[0].trim()) ?? 0;
    const inchesText = (parts[1] || "").replace(/"/g, "").trim();
    const inches = inchesText === "" ? 0 : parseInchesFraction(inchesText);
    if (inches === null) return null;
    return feet * IN_PER_FT + inches;
  }

  const pieces = cleaned.replace(/"/g, "").split(" ").filter(Boolean);
  if (pieces.length >= 2) {
    const feet = parseNum(pieces[0]);
    const inches = parseInchesFraction(pieces.slice(1).join(" "));
    if (feet === null || inches === null) return null;
    return feet * IN_PER_FT + inches;
  }

  const asFeetDecimal = parseNum(cleaned);
  if (asFeetDecimal === null) return null;
  return asFeetDecimal * IN_PER_FT;
}

function formatFeetInchesFromInches(totalInches) {
  if (totalInches === null || totalInches === undefined || Number.isNaN(totalInches)) return "";
  const sign = totalInches < 0 ? "-" : "";
  const abs = Math.abs(totalInches);
  const feet = Math.floor(abs / IN_PER_FT);
  const inches = abs - feet * IN_PER_FT;
  return `${sign}${feet}' ${formatInchesFraction(inches)}\"`;
}

function parseInchesFraction(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const cleaned = raw.replace(/"/g, "").trim();

  if (cleaned.includes("/")) {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      const fractionParts = parts[0].split("/").map(Number);
      const num = fractionParts[0];
      const den = fractionParts[1];
      if (!num || !den) return null;
      return num / den;
    }
    const whole = parseNum(parts[0]) ?? 0;
    const fractionParts = (parts[1] || "").split("/").map(Number);
    const num = fractionParts[0];
    const den = fractionParts[1];
    if (!num || !den) return whole;
    return whole + num / den;
  }

  return parseNum(cleaned);
}

function formatInchesFraction(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const whole = Math.floor(abs);
  const frac = abs - whole;
  const denom = 16;
  let num = Math.round(frac * denom);

  // carry over (e.g. 11.999 -> 12)
  if (num === denom) {
    return sign + String(whole + 1);
  }

  // if no fraction, just show whole number (fixes your issue)
  if (num === 0) {
    return sign + String(whole);
  }

  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const g = gcd(num, denom);
  const reducedNum = num / g;
  const reducedDen = denom / g;

  return sign + String(whole) + " " + String(reducedNum) + "/" + String(reducedDen);
}

export default function App() {
  const [converterInches, setConverterInches] = useState(null);
  const [converterFeetText, setConverterFeetText] = useState("");
  const [converterFeetInchesText, setConverterFeetInchesText] = useState("");
  const [converterInchesText, setConverterInchesText] = useState("");
  const [converterMmText, setConverterMmText] = useState("");
  const [converterMetersText, setConverterMetersText] = useState("");
  const [activeConverterField, setActiveConverterField] = useState(null);
  const [showConverterModal, setShowConverterModal] = useState(false);

  const [projectionText, setProjectionText] = useState("");
  const [widthText, setWidthText] = useState("");
  const [heightText, setHeightText] = useState("8.86");
  const [wall1Text, setWall1Text] = useState("");
  const [wall2Text, setWall2Text] = useState("");
  const [wall3Text, setWall3Text] = useState("");
  const [wall4Text, setWall4Text] = useState("");

  const [awningRateMode, setAwningRateMode] = useState("auto");
  const [showBracketEditor, setShowBracketEditor] = useState(false);
  const [awningBrackets, setAwningBrackets] = useState([
    { min: 0, max: 110, rate: "19.5" },
    { min: 110, max: 130, rate: "17.5" },
    { min: 130, max: 150, rate: "16" },
    { min: 150, max: 180, rate: "14" },
    { min: 180, max: "", rate: "13" },
  ]);

  const [manualAwningRateText, setManualAwningRateText] = useState("20");
  const [wallRateText, setWallRateText] = useState("7.5");
  const [laborBase, setLaborBase] = useState(3500);
  const [laborText, setLaborText] = useState("3500");
  const [locationSurcharge, setLocationSurcharge] = useState(0);
  const [acrylic, setAcrylic] = useState(500);
  const [manualOverride, setManualOverride] = useState(500);
  const [markup, setMarkup] = useState(100);

  useEffect(() => {
    if (converterInches === null) {
      if (activeConverterField !== "feet") setConverterFeetText("");
      if (activeConverterField !== "feetInches") setConverterFeetInchesText("");
      if (activeConverterField !== "inches") setConverterInchesText("");
      if (activeConverterField !== "mm") setConverterMmText("");
      if (activeConverterField !== "meters") setConverterMetersText("");
      return;
    }

    if (activeConverterField !== "feet") {
      setConverterFeetText(formatNumber(converterInches / IN_PER_FT, 6));
    }
    if (activeConverterField !== "feetInches") {
      setConverterFeetInchesText(formatFeetInchesFromInches(converterInches));
    }
    if (activeConverterField !== "inches") {
      setConverterInchesText(formatInchesFraction(converterInches));
    }
    if (activeConverterField !== "mm") {
      setConverterMmText(formatNumber(converterInches * MM_PER_IN, 4));
    }
    if (activeConverterField !== "meters") {
      setConverterMetersText(formatNumber(converterInches * M_PER_IN, 6));
    }
  }, [converterInches, activeConverterField]);

  const projection = parseNum(projectionText) || 0;
  const width = parseNum(widthText) || 0;
  const height = parseNum(heightText) || 0;
  const wall1 = parseNum(wall1Text) || 0;
  const wall2 = parseNum(wall2Text) || 0;
  const wall3 = parseNum(wall3Text) || 0;
  const wall4 = parseNum(wall4Text) || 0;

  const projectionError = projection > MAX_PROJECTION_FT;

  const sections = Math.max(1, Math.ceil(width / 15));
  const sectionWidth = sections > 0 ? width / sections : 0;
  const sectionArea = projection * sectionWidth;
  const awningArea = projection * width;

  const activeBracketIndex = useMemo(() => {
    return awningBrackets.findIndex((bracket) => {
      const min = Number(bracket.min || 0);
      const max = bracket.max === "" || bracket.max === null ? null : Number(bracket.max);
      const meetsMin = sectionArea >= min;
      const meetsMax = max === null ? true : sectionArea < max;
      return meetsMin && meetsMax;
    });
  }, [sectionArea, awningBrackets]);

  const activeBracket =
    activeBracketIndex >= 0 ? awningBrackets[activeBracketIndex] : awningBrackets[awningBrackets.length - 1];

  const manualAwningRate = parseNum(manualAwningRateText) ?? 0;
  const wallRate = parseNum(wallRateText) ?? 0;
  const awningRate = awningRateMode === "auto" ? Number(activeBracket?.rate || 0) : manualAwningRate;

  const wallArea = wall1 * height + wall2 * height + wall3 * height + wall4 * height;

  const awningCost = awningArea * awningRate;
  const wallCost = wallArea * wallRate;
  const materialSubtotal = awningCost + wallCost;
  const materialWithMarkup = materialSubtotal + materialSubtotal * (markup / 100);
  const installCost = laborBase + (sections - 1) * 500 + locationSurcharge;
  const total = materialWithMarkup + installCost + acrylic + manualOverride;

  useEffect(() => {
    setLaborText(String(installCost));
  }, [installCost]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Pricing Sheet Generator</h1>

      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => setShowConverterModal(true)}
          className="px-4 py-2 rounded-lg border bg-white text-sm font-medium shadow-sm"
        >
          Open Converter
        </button>
      </div>

      {showConverterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4 rounded-t-2xl">
              <h2 className="text-lg font-semibold">Converter</h2>
              <button
                type="button"
                onClick={() => setShowConverterModal(false)}
                className="px-3 py-1 rounded-lg border bg-gray-50 text-sm"
              >
                Close
              </button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm">Feet (decimal)</label>
                  <TextInput
                    value={converterFeetText}
                    onChange={(raw) => {
                      setActiveConverterField("feet");
                      setConverterFeetText(raw);
                      const n = parseNum(raw);
                      setConverterInches(n === null ? null : n * IN_PER_FT);
                    }}
                    onBlur={() => setActiveConverterField(null)}
                    placeholder="14.5"
                  />
                </div>
                <div>
                  <label className="text-sm">Feet & Inches</label>
                  <FeetInchesInput
                    value={converterFeetInchesText}
                    onChange={(raw) => {
                      setActiveConverterField("feetInches");
                      setConverterFeetInchesText(raw);
                      const n = parseFeetInches(raw);
                      setConverterInches(n);
                    }}
                    onBlur={() => setActiveConverterField(null)}
                    placeholder={`1' 6 1/2\"`}
                  />
                </div>
                <div>
                  <label className="text-sm">Inches</label>
                  <FeetInchesInput
                    value={converterInchesText}
                    onChange={(raw) => {
                      setActiveConverterField("inches");
                      setConverterInchesText(raw);
                      const n = parseInchesFraction(raw);
                      setConverterInches(n);
                    }}
                    onBlur={() => setActiveConverterField(null)}
                    placeholder={`5 3/4\"`}
                  />
                </div>
                <div>
                  <label className="text-sm">Millimeters</label>
                  <TextInput
                    value={converterMmText}
                    onChange={(raw) => {
                      setActiveConverterField("mm");
                      setConverterMmText(raw);
                      const n = parseNum(raw);
                      setConverterInches(n === null ? null : n / MM_PER_IN);
                    }}
                    onBlur={() => setActiveConverterField(null)}
                    placeholder="4419.6"
                  />
                </div>
                <div>
                  <label className="text-sm">Meters</label>
                  <TextInput
                    value={converterMetersText}
                    onChange={(raw) => {
                      setActiveConverterField("meters");
                      setConverterMetersText(raw);
                      const n = parseNum(raw);
                      setConverterInches(n === null ? null : n / M_PER_IN);
                    }}
                    onBlur={() => setActiveConverterField(null)}
                    placeholder="4.4196"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Section title="Awning">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Projection (ft)</label>
            <TextInput
              value={projectionText}
              onChange={(raw) => {
                setProjectionText(raw);
                setWall1Text(raw);
                setWall2Text(raw);
              }}
            />
            {projectionError && <div className="text-red-500 text-xs mt-1">Projection cannot exceed 23 feet</div>}
          </div>
          <div>
            <label className="text-sm">Width (ft)</label>
            <TextInput
              value={widthText}
              onChange={(raw) => {
                setWidthText(raw);
                setWall3Text(raw);
              }}
            />
          </div>
        </div>
        <div className="text-sm space-y-1">
          <div>
            Sections: <b>{sections} {sections === 1 ? "Section" : "Sections"}</b>
          </div>
          <div>
            Section Width: <b>{sectionWidth.toFixed(2)} ft</b>
          </div>
          <div>
            Section Area: <b>{sectionArea.toFixed(2)} sq ft</b>
          </div>
          <div>
            Total Area: <b>{awningArea.toFixed(2)} sq ft</b>
          </div>
        </div>
      </Section>

      <Section title="Walls (4 Sections)">
        <div>
          <label className="text-sm">Shared Height (ft)</label>
          <TextInput value={heightText} onChange={setHeightText} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm">Wall 1</label>
            <TextInput value={wall1Text} onChange={setWall1Text} />
          </div>
          <div>
            <label className="text-sm">Wall 2</label>
            <TextInput value={wall2Text} onChange={setWall2Text} />
          </div>
          <div>
            <label className="text-sm">Wall 3</label>
            <TextInput value={wall3Text} onChange={setWall3Text} />
          </div>
          <div>
            <label className="text-sm">Wall 4</label>
            <TextInput value={wall4Text} onChange={setWall4Text} />
          </div>
        </div>

        <div className="text-sm">
          Total Wall Area: <b>{wallArea.toFixed(2)} sq ft</b>
        </div>
      </Section>

      <Section title="Pricing">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <label className="text-sm pt-2">Awning Rate ($/sq ft)</label>
              <div className="flex w-full sm:w-auto rounded-lg overflow-hidden border shrink-0">
                <button
                  type="button"
                  onClick={() => setAwningRateMode("auto")}
                  className={`flex-1 sm:flex-none px-3 py-1 text-sm ${awningRateMode === "auto" ? "bg-green-500 text-white" : "bg-white"}`}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setAwningRateMode("manual")}
                  className={`flex-1 sm:flex-none px-3 py-1 text-sm ${awningRateMode === "manual" ? "bg-green-500 text-white" : "bg-white"}`}
                >
                  Manual
                </button>
              </div>
            </div>
            <TextInput
              value={awningRateMode === "auto" ? String(awningRate) : manualAwningRateText}
              onChange={(raw) => {
                setManualAwningRateText(raw);
              }}
              readOnly={awningRateMode === "auto"}
            />
            <div className="text-sm">
              Selected Awning Bracket: <b>{activeBracket.max === "" || activeBracket.max == null ? `${activeBracket.min}+ sq ft` : `${activeBracket.min}–${activeBracket.max} sq ft`}</b>{" "}
              <span className="text-gray-500">(based on {sectionArea.toFixed(2)} sq ft per section)</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm pt-2 block">Wall Rate ($/sq ft)</label>
            <TextInput value={wallRateText} onChange={setWallRateText} />
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowBracketEditor((prev) => !prev)}
            className="px-4 py-2 rounded-lg border bg-white text-sm font-medium"
          >
            {showBracketEditor ? "Hide Awning Pricing Brackets" : "Edit Awning Pricing Brackets"}
          </button>

          {showBracketEditor && (
            <div className="bg-white border rounded-xl p-4 space-y-3 overflow-x-auto">
              <div className="font-medium">Awning Pricing Brackets</div>
              <div className="grid min-w-[520px] grid-cols-4 gap-3 text-sm font-medium text-gray-600">
                <div>Min Area</div>
                <div>Max Area</div>
                <div>Rate ($/sq ft)</div>
                <div>Status</div>
              </div>
              {awningBrackets.map((bracket, index) => {
                const isActive = index === activeBracketIndex;
                const maxLabel = bracket.max === "" || bracket.max == null ? "No max" : String(bracket.max);
                return (
                  <div key={index} className={`grid min-w-[520px] grid-cols-4 gap-3 items-center rounded-lg p-2 ${isActive ? "bg-green-50 border border-green-300" : ""}`}>
                    <div className="w-full border rounded-lg p-2 bg-gray-50 text-gray-600">{String(bracket.min)}</div>
                    <div className="w-full border rounded-lg p-2 bg-gray-50 text-gray-600">{maxLabel}</div>
                    <TextInput
                      value={String(bracket.rate)}
                      onChange={(raw) => {
                        setAwningBrackets((prev) => prev.map((item, i) => (i === index ? { ...item, rate: raw } : item)));
                      }}
                    />
                    <div className={`text-sm font-medium ${isActive ? "text-green-700" : "text-gray-500"}`}>{isActive ? "Selected" : ""}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-sm">
          Total Cost: <b>${materialSubtotal.toFixed(2)}</b>
        </div>

        <div>
          <label className="text-sm">Markup (%)</label>
          <TextInput value={String(markup)} onChange={(raw) => setMarkup(parseNum(raw) ?? 0)} />
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm block mb-2">Installation Location</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={locationSurcharge === 2000}
                  onChange={(e) => setLocationSurcharge(e.target.checked ? 2000 : 0)}
                />
                Brooklyn (+$2,000)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={locationSurcharge === 3000}
                  onChange={(e) => setLocationSurcharge(e.target.checked ? 3000 : 0)}
                />
                Monsey (+$3,000)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={locationSurcharge === 4000}
                  onChange={(e) => setLocationSurcharge(e.target.checked ? 4000 : 0)}
                />
                Upstate (+$4,000)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm">
                Labor ($)
                <span className="font-medium"> ({sections} {sections === 1 ? "Section" : "Sections"})</span>
                <span className="block sm:inline text-[10px] text-gray-500 sm:ml-2">+ $500 each additional section</span>
              </label>
              <TextInput
                value={laborText}
                onChange={(raw) => {
                  setLaborText(raw);
                  if (raw === "") return;
                  const entered = parseNum(raw);
                  if (entered === null) return;
                  const extraSectionLabor = (sections - 1) * 500 + locationSurcharge;
                  setLaborBase(Math.max(0, entered - extraSectionLabor));
                }}
              />
            </div>

            <div>
              <label className="text-sm">Acrylic ($)</label>
              <TextInput value={String(acrylic)} onChange={(raw) => setAcrylic(parseNum(raw) ?? 0)} />
            </div>
            <div>
              <label className="text-sm">Manual Override ($)</label>
              <TextInput value={String(manualOverride)} onChange={(raw) => setManualOverride(parseNum(raw) ?? 0)} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Output">
        <div className="bg-black text-white rounded-lg p-4 text-base sm:text-lg break-words">Total: ${total.toFixed(2)}</div>
      </Section>
    </div>
  );
}
