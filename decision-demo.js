(() => {
  "use strict";

  const clamp = value => Math.max(0, Math.min(100, Number(value)));
  const round = value => Number(value.toFixed(2));
  const weighted = (values, weights) => round(values.reduce((sum, value, index) => sum + value * weights[index], 0));
  const esc = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

  const signalDefinitions = Object.freeze([
    ["focalDominance", "Focal dominance"], ["contrastSeparation", "Contrast separation"], ["formWeight", "Form weight"],
    ["elementDensity", "Element density"], ["directionalEnergy", "Directional energy"], ["rhythmicVariation", "Rhythmic variation"],
    ["chroma", "Chroma"], ["paletteSeparation", "Palette separation"], ["colorCoverage", "Color coverage"]
  ]);
  const categoryDefinitions = Object.freeze([
    ["open", "Open"], ["layered", "Layered"], ["intricate", "Intricate"], ["textural", "Textural"],
    ["organic", "Organic"], ["structured", "Structured"], ["graphic", "Graphic"], ["fluid", "Fluid"],
    ["atmospheric", "Atmospheric"], ["kinetic", "Kinetic"], ["chromatic", "Chromatic"], ["forceful", "Forceful"]
  ]);
  const familyProfiles = Object.freeze([
    { id: "open-field", label: "Open field", hue: 188, temperature: "cool", form: "organic", depth: "open", categories: { open: 92, layered: 42, intricate: 18, textural: 28, organic: 72, structured: 20, graphic: 24, fluid: 80, atmospheric: 88, kinetic: 34, chromatic: 34, forceful: 14 } },
    { id: "measured-planes", label: "Measured planes", hue: 202, temperature: "neutral", form: "geometric", depth: "shallow", categories: { open: 44, layered: 50, intricate: 34, textural: 20, organic: 12, structured: 91, graphic: 88, fluid: 16, atmospheric: 24, kinetic: 38, chromatic: 48, forceful: 54 } },
    { id: "tactile-layers", label: "Tactile layers", hue: 28, temperature: "warm", form: "organic", depth: "layered", categories: { open: 36, layered: 91, intricate: 66, textural: 94, organic: 82, structured: 34, graphic: 28, fluid: 58, atmospheric: 62, kinetic: 36, chromatic: 52, forceful: 38 } },
    { id: "driven-shapes", label: "Driven shapes", hue: 8, temperature: "warm", form: "graphic", depth: "compressed", categories: { open: 24, layered: 48, intricate: 46, textural: 38, organic: 28, structured: 72, graphic: 94, fluid: 44, atmospheric: 22, kinetic: 94, chromatic: 88, forceful: 92 } },
    { id: "horizon-bands", label: "Horizon bands", hue: 48, temperature: "warm", form: "atmospheric", depth: "layered", categories: { open: 78, layered: 68, intricate: 26, textural: 42, organic: 58, structured: 32, graphic: 46, fluid: 70, atmospheric: 82, kinetic: 30, chromatic: 62, forceful: 22 } },
    { id: "radial-orbit", label: "Radial orbit", hue: 266, temperature: "cool", form: "graphic", depth: "focused", categories: { open: 52, layered: 54, intricate: 58, textural: 32, organic: 38, structured: 64, graphic: 76, fluid: 46, atmospheric: 38, kinetic: 66, chromatic: 72, forceful: 62 } },
    { id: "modular-grid", label: "Modular grid", hue: 154, temperature: "neutral", form: "geometric", depth: "structured", categories: { open: 30, layered: 62, intricate: 72, textural: 34, organic: 16, structured: 94, graphic: 78, fluid: 18, atmospheric: 20, kinetic: 42, chromatic: 56, forceful: 56 } },
    { id: "framed-void", label: "Framed void", hue: 214, temperature: "cool", form: "architectural", depth: "open", categories: { open: 88, layered: 34, intricate: 24, textural: 18, organic: 20, structured: 78, graphic: 64, fluid: 22, atmospheric: 60, kinetic: 22, chromatic: 38, forceful: 42 } },
    { id: "folded-paper", label: "Folded paper", hue: 18, temperature: "warm", form: "sculptural", depth: "layered", categories: { open: 46, layered: 74, intricate: 54, textural: 72, organic: 42, structured: 70, graphic: 56, fluid: 30, atmospheric: 36, kinetic: 48, chromatic: 48, forceful: 58 } },
    { id: "contour-map", label: "Contour map", hue: 174, temperature: "cool", form: "organic", depth: "deep", categories: { open: 64, layered: 82, intricate: 78, textural: 64, organic: 84, structured: 36, graphic: 42, fluid: 74, atmospheric: 68, kinetic: 52, chromatic: 54, forceful: 30 } },
    { id: "editorial-blocks", label: "Editorial blocks", hue: 330, temperature: "neutral", form: "graphic", depth: "shallow", categories: { open: 42, layered: 44, intricate: 38, textural: 20, organic: 14, structured: 86, graphic: 92, fluid: 20, atmospheric: 26, kinetic: 44, chromatic: 74, forceful: 72 } },
    { id: "constellation", label: "Constellation", hue: 238, temperature: "cool", form: "pointillist", depth: "open", categories: { open: 82, layered: 52, intricate: 82, textural: 58, organic: 52, structured: 48, graphic: 44, fluid: 52, atmospheric: 88, kinetic: 50, chromatic: 48, forceful: 20 } }
  ]);
  const realizationProfiles = Object.freeze([
    { shifts: [-5, 4, -3], boldPattern: [4, -3, -2.2], activityPattern: [4, -3, -2.2], colorPattern: [4, -3, -3.6] },
    { shifts: [5, -4, 4], boldPattern: [-4, 3, 2.2], activityPattern: [-4, 3, 2.2], colorPattern: [-4, 3, 3.6] },
    { shifts: [-2, 2, -6], boldPattern: [2, 4, -8.8], activityPattern: [2, 4, -8.8], colorPattern: [2, 4, -8.4] },
    { shifts: [6, -1, 6], boldPattern: [-2, -4, 8.8], activityPattern: [-2, -4, 8.8], colorPattern: [-2, -4, 8.4] }
  ]);

  const boldnessWord = value => value < 34 ? "Soft" : value < 67 ? "Defined" : "Bold";
  const activityWord = value => value < 34 ? "Calm" : value < 67 ? "Active" : "Dynamic";
  const colorWord = value => value < 34 ? "Subdued" : value < 67 ? "Expressive" : "Vibrant";
  const deriveAttributes = signals => {
    const boldness = weighted([signals.focalDominance, signals.contrastSeparation, signals.formWeight], [0.4, 0.35, 0.25]);
    const activity = weighted([signals.elementDensity, signals.directionalEnergy, signals.rhythmicVariation], [0.4, 0.35, 0.25]);
    const colorIntensity = weighted([signals.chroma, signals.paletteSeparation, signals.colorCoverage], [0.45, 0.3, 0.25]);
    return { boldness, activity, colorIntensity, stimulation: weighted([activity, boldness, colorIntensity], [0.45, 0.35, 0.2]) };
  };
  const deriveCategories = (signals, attributes, family) => {
    const base = family.categories;
    const blend = (key, observed) => round(clamp(base[key] * 0.65 + observed * 0.35));
    const openness = 100 - weighted([signals.elementDensity, signals.focalDominance, signals.formWeight], [0.45, 0.3, 0.25]);
    const layered = weighted([signals.elementDensity, signals.rhythmicVariation, signals.formWeight], [0.35, 0.35, 0.3]);
    const intricate = weighted([signals.elementDensity, signals.rhythmicVariation, signals.focalDominance], [0.45, 0.35, 0.2]);
    const graphic = weighted([signals.contrastSeparation, signals.formWeight, signals.focalDominance], [0.4, 0.35, 0.25]);
    return {
      open: blend("open", openness), layered: blend("layered", layered), intricate: blend("intricate", intricate),
      textural: blend("textural", weighted([signals.elementDensity, signals.rhythmicVariation, base.textural], [0.25, 0.2, 0.55])),
      organic: blend("organic", weighted([base.organic, 100 - signals.formWeight, signals.rhythmicVariation], [0.55, 0.25, 0.2])),
      structured: blend("structured", weighted([base.structured, signals.formWeight, 100 - signals.rhythmicVariation], [0.55, 0.25, 0.2])),
      graphic: blend("graphic", graphic),
      fluid: blend("fluid", weighted([signals.directionalEnergy, signals.rhythmicVariation, base.fluid], [0.3, 0.25, 0.45])),
      atmospheric: blend("atmospheric", weighted([openness, 100 - signals.contrastSeparation, base.atmospheric], [0.3, 0.25, 0.45])),
      kinetic: blend("kinetic", weighted([signals.directionalEnergy, attributes.activity, base.kinetic], [0.35, 0.3, 0.35])),
      chromatic: blend("chromatic", weighted([attributes.colorIntensity, signals.paletteSeparation, base.chromatic], [0.35, 0.3, 0.35])),
      forceful: blend("forceful", weighted([signals.formWeight, signals.focalDominance, signals.contrastSeparation, base.forceful], [0.25, 0.2, 0.2, 0.35]))
    };
  };
  const trio = (target, pattern) => pattern.map(offset => round(clamp(target + offset)));
  const makeItem = ({ profileIndex, realizationIndex, boldness, activity, colorIntensity }) => {
    const realization = realizationProfiles[realizationIndex];
    const serial = profileIndex * 4 + realizationIndex + 1;
    const family = familyProfiles[(serial - 1) % familyProfiles.length];
    const bold = trio(boldness + realization.shifts[0], realization.boldPattern);
    const active = trio(activity + realization.shifts[1], realization.activityPattern);
    const color = trio(colorIntensity + realization.shifts[2], realization.colorPattern);
    const signals = { focalDominance: bold[0], contrastSeparation: bold[1], formWeight: bold[2], elementDensity: active[0], directionalEnergy: active[1], rhythmicVariation: active[2], chroma: color[0], paletteSeparation: color[1], colorCoverage: color[2] };
    const derived = deriveAttributes(signals);
    const categories = deriveCategories(signals, derived, family);
    return {
      id: `image-${String(serial).padStart(3, "0")}`, name: `Image ${String(serial).padStart(3, "0")}`,
      profileId: `P${String(profileIndex + 1).padStart(2, "0")}`, realization: realizationIndex + 1,
      signals, attributes: { ...derived, ...categories }, categories,
      artDirection: { family: family.id, temperature: family.temperature, form: family.form, depth: family.depth, hue: (family.hue + profileIndex * 7) % 360 },
      metadata: {
        openTextArea: categories.open >= 32 || realizationIndex === 1,
        strongTextContrast: signals.contrastSeparation >= 45 || categories.graphic >= 62,
        kahntraFit: family.id !== "editorial-blocks" && (family.id !== "driven-shapes" || categories.forceful < 80) && (categories.open >= 32 || categories.textural >= 30 || categories.structured >= 45)
      },
      description: `${activityWord(derived.activity)} · ${boldnessWord(derived.boldness)} · ${colorWord(derived.colorIntensity)}`
    };
  };
  const items = [];
  let profileIndex = 0;
  [18, 50, 82].forEach(boldness => [16, 51, 84].forEach(activity => [20, 48, 80].forEach(colorIntensity => {
    for (let realizationIndex = 0; realizationIndex < 4; realizationIndex += 1) items.push(makeItem({ profileIndex, realizationIndex, boldness, activity, colorIntensity }));
    profileIndex += 1;
  })));

  // This is the complete, reviewed live collection. Synthetic studies above only
  // provide an internal record shape; they are removed below and are never ranked
  // or rendered. Keep regions with few or no approved studies empty: that is useful
  // feedback for the next generation pass.
  const renderedArtwork = Object.freeze({
    "image-002": "assets/images/decision-studies/turbo-026.png",
    "image-003": "assets/images/decision-studies/turbo-027.png",
    "image-004": "assets/images/decision-studies/turbo-004.png",
    "image-007": "assets/images/decision-studies/turbo-030.png",
    "image-016": "assets/images/decision-studies/turbo-023.png",
    "image-018": "assets/images/decision-studies/turbo-024.png",
    "image-020": "assets/images/decision-studies/turbo-008.png",
    "image-024": "assets/images/decision-studies/turbo-012.png",
    "image-026": "assets/images/decision-studies/turbo-025.png",
    "image-028": "assets/images/decision-studies/turbo-018.png",
    "image-037": "assets/images/decision-studies/turbo-014.png",
    "image-041": "assets/images/decision-studies/turbo-028.png",
    "image-050": "assets/images/decision-studies/turbo-005.png",
    "image-052": "assets/images/decision-studies/turbo-017.png",
    "image-053": "assets/images/decision-studies/turbo-015.png",
    "image-054": "assets/images/decision-studies/turbo-016.png",
    "image-055": "assets/images/decision-studies/turbo-021.png",
    "image-056": "assets/images/decision-studies/turbo-010.png",
    "image-058": "assets/images/decision-studies/turbo-022.png",
    "image-080": "assets/images/decision-studies/turbo-019.png",
    "image-081": "assets/images/decision-studies/turbo-007.png",
    "image-083": "assets/images/decision-studies/turbo-020.png",
    "image-085": "assets/images/decision-studies/turbo-009.png",
    "image-087": "assets/images/decision-studies/turbo-011.png"
  });
  const generatedStudyRecords = Object.freeze({
    "image-002": { source: "turbo-026", signals: [22, 22, 22, 15, 15, 18, 18, 18, 18], qualities: ["open", "atmospheric", "organic"], palette: "neutral", kahntraFit: true, textReady: true, reviewNote: "A genuinely quiet, low-contrast paper study with a large uninterrupted text field." },
    "image-003": { source: "turbo-027", signals: [16, 16, 16, 18, 18, 18, 8, 8, 8], qualities: ["open", "structured", "atmospheric"], palette: "neutral", kahntraFit: true, textReady: true, reviewNote: "Soft layered bands create a calm structured route without introducing a hard tonal split." },
    "image-004": { source: "turbo-004", signals: [24, 20, 35, 30, 22, 45, 24, 45, 35], qualities: ["open", "atmospheric", "fluid"], palette: "neutral", kahntraFit: true, textReady: true, reviewNote: "A quiet open study that keeps the center calm while remaining visibly fluid." },
    "image-007": { source: "turbo-030", signals: [43, 43, 43, 38, 38, 38, 38, 38, 38], qualities: ["structured", "layered", "textural", "open"], palette: "warm", kahntraFit: true, textReady: true, reviewNote: "Medium-energy Kahntra study: layered tactile forms with a clear hierarchy and open field, without a hard left/right split." },
    "image-016": { source: "turbo-023", signals: [38, 40, 42, 28, 48, 62, 32, 38, 28], qualities: ["atmospheric", "organic", "textural", "open"], palette: "cool", kahntraFit: true, textReady: true, reviewNote: "Cool ink-and-wash material route with a contiguous quiet field for text." },
    "image-018": { source: "turbo-024", signals: [26, 28, 35, 25, 38, 42, 58, 55, 52], qualities: ["chromatic", "atmospheric", "organic", "open"], palette: "warm", kahntraFit: true, textReady: true, reviewNote: "Warm chromatic route with low form pressure and a clear text field." },
    "image-020": { source: "turbo-008", signals: [32, 28, 45, 40, 38, 65, 50, 62, 60], qualities: ["chromatic", "atmospheric", "open"], palette: "mixed", kahntraFit: true, textReady: false, reviewNote: "Translucent colored forms make a color-led atmosphere, but do not leave one reliably calm text field." },
    "image-024": { source: "turbo-012", signals: [55, 58, 60, 75, 72, 82, 42, 45, 68], qualities: ["intricate", "textural", "kinetic"], palette: "cool", kahntraFit: true, textReady: true, reviewNote: "Recalibrated upward: the dense dispersal, marks, and irregular rhythm make this materially more stimulating than an average midrange study." },
    "image-026": { source: "turbo-025", signals: [75, 68, 70, 70, 60, 64, 72, 70, 68], qualities: ["fluid", "layered", "kinetic", "chromatic"], palette: "warm", kahntraFit: true, textReady: true, reviewNote: "Recalibrated upward: multiple strong color bands and directional movement make this a high-energy route, despite its calm paper palette." },
    "image-028": { source: "turbo-018", signals: [75, 68, 74, 82, 70, 82, 62, 65, 62], qualities: ["layered", "textural", "intricate", "kinetic"], palette: "warm", kahntraFit: true, textReady: true, reviewNote: "Recalibrated upward: fragmented forms, dense layering, and directional instability place it firmly on the stimulating side." },
    "image-037": { source: "turbo-014", signals: [62, 75, 80, 40, 36, 30, 20, 40, 20], qualities: ["structured", "open"], palette: "neutral", kahntraFit: true, textReady: true, reviewNote: "Recalibrated after visual review: its large left/right tonal split and strong stacked forms give it substantially more visual force than a low-stimulation reading suggested." },
    "image-041": { source: "turbo-028", signals: [28, 28, 28, 30, 30, 30, 42, 42, 42], qualities: ["organic", "layered", "chromatic", "atmospheric", "open"], palette: "warm", kahntraFit: true, textReady: true, reviewNote: "Warm translucent forms make a gentle color-led atmosphere while preserving a calm text field." },
    "image-050": { source: "turbo-005", signals: [52, 60, 58, 35, 38, 42, 24, 22, 20], qualities: ["structured", "graphic", "open"], palette: "warm", kahntraFit: true, textReady: true, reviewNote: "Recalibrated after visual review: repeated measured marks read as clinical or stitched rather than comforting, so it should not sit at the calm end." },
    "image-052": { source: "turbo-017", signals: [95, 90, 85, 95, 80, 90, 90, 88, 90], qualities: ["kinetic", "graphic", "forceful", "chromatic"], palette: "warm", kahntraFit: true, textReady: true, reviewNote: "Recalibrated upward: the twisting high-chroma ribbons have strong directional force and belong near the stimulating end." },
    "image-053": { source: "turbo-015", signals: [50, 51, 50, 53, 52, 52, 48, 50, 44], attributes: [50.2, 52.7, 48, 51.5], qualities: ["fluid", "layered", "textural", "open"], palette: "neutral", kahntraFit: true, textReady: true },
    "image-054": { source: "turbo-016", signals: [37, 36, 40, 51, 52, 50, 67, 62, 72], attributes: [37.1, 51.2, 67.1, 49.7], qualities: ["chromatic", "atmospheric", "fluid", "open"], palette: "neutral", kahntraFit: true, textReady: true },
    "image-055": { source: "turbo-021", signals: [58, 58, 60, 64, 60, 62, 66, 66, 70], qualities: ["layered", "structured", "textural", "chromatic"], palette: "neutral", kahntraFit: true, textReady: false, reviewNote: "Recalibrated upward: the busy overlapping fields have more density, rhythm, and chromatic pressure than a midpoint reading." },
    "image-056": { source: "turbo-010", signals: [32, 30, 36, 42, 42, 40, 38, 40, 36], attributes: [32.2, 41.5, 38.4, 37.6], qualities: ["fluid", "organic", "atmospheric"], palette: "warm", kahntraFit: true, textReady: true },
    "image-058": { source: "turbo-022", signals: [50, 48, 55, 38, 42, 35, 95, 75, 90], qualities: ["chromatic", "graphic", "open"], palette: "cool", kahntraFit: false, textReady: true, reviewNote: "A deliberately polished digital counterexample: technically usable, but outside the Kahntra material language." },
    "image-080": { source: "turbo-019", signals: [69, 66, 73, 23, 23, 20, 39, 42, 33], attributes: [69.1, 22.5, 38.8, 37.2], qualities: ["structured", "graphic", "open"], palette: "warm", kahntraFit: true, textReady: true },
    "image-081": { source: "turbo-007", signals: [35, 34, 35, 48, 48, 47, 31, 32, 30], attributes: [34.6, 47.8, 31.3, 39.9], qualities: ["layered", "textural", "open"], palette: "neutral", kahntraFit: true, textReady: true },
    "image-083": { source: "turbo-020", signals: [28, 27, 31, 31, 31, 30, 42, 44, 38], attributes: [28.2, 30.5, 41.6, 31.3], qualities: ["organic", "textural", "atmospheric", "open"], palette: "neutral", kahntraFit: true, textReady: true },
    "image-085": { source: "turbo-009", signals: [92, 90, 90, 95, 65, 85, 65, 60, 70], qualities: ["kinetic", "graphic", "forceful"], palette: "neutral", kahntraFit: false, textReady: true, reviewNote: "Sharp arrow forms make this a useful contextual mismatch rather than a Kahntra-fit recommendation; its points and directional force place it on the stimulating side." },
    "image-087": { source: "turbo-011", signals: [78, 86, 65, 34, 72, 40, 15, 25, 18], qualities: ["structured", "graphic", "forceful"], palette: "neutral", kahntraFit: false, textReady: false, reviewNote: "A hard-edged architectural counterexample: strong structural contrast, but not an open or materially warm option." }
  });
  const applyGeneratedStudyData = (item, record) => {
    const [formWeight, contrastSeparation, focalDominance, directionalEnergy, elementDensity, rhythmicVariation, chroma, colorCoverage, paletteSeparation] = record.signals;
    const signals = { focalDominance, contrastSeparation, formWeight, elementDensity, directionalEnergy, rhythmicVariation, chroma, paletteSeparation, colorCoverage };
    const categories = Object.fromEntries(categoryDefinitions.map(([id]) => [id, record.qualities.includes(id) ? 88 : 16]));
    const calculated = deriveAttributes(signals);
    const [boldness, activity, colorIntensity, stimulation] = record.attributes || [calculated.boldness, calculated.activity, calculated.colorIntensity, calculated.stimulation];
    const attributes = { boldness, activity, colorIntensity, stimulation };
    item.signals = signals;
    item.categories = categories;
    item.attributes = { ...attributes, ...categories };
    item.description = `${activityWord(attributes.activity)} · ${boldnessWord(attributes.boldness)} · ${colorWord(attributes.colorIntensity)}`;
    item.artDirection = { ...item.artDirection, temperature: record.palette };
    item.metadata = { ...item.metadata, source: record.source, kahntraFit: record.kahntraFit, openTextArea: record.textReady, strongTextContrast: record.textReady, reviewNote: record.reviewNote || "" };
  };
  Object.entries(generatedStudyRecords).forEach(([id, record]) => applyGeneratedStudyData(items.find(item => item.id === id), record));
  items.splice(0, items.length, ...Object.keys(generatedStudyRecords).map(id => items.find(item => item.id === id)));

  const tagRecipes = Object.freeze([
    ["spacious-atmosphere", "Spacious atmosphere", "Not spacious or atmospheric enough", ["open", "atmospheric"], { open: 86, atmospheric: 84 }, 16],
    ["organic-flow", "Organic flow", "Not organic or fluid enough", ["organic", "fluid"], { organic: 88, fluid: 78 }, 28],
    ["tactile-layers", "Tactile layers", "Not tactile or layered enough", ["layered", "textural", "intricate"], { layered: 82, textural: 88, intricate: 72 }, 46],
    ["structured-clarity", "Structured clarity", "Not structured or graphic enough", ["structured", "graphic"], { structured: 88, graphic: 86 }, 52],
    ["color-led-atmosphere", "Color-led atmosphere", "Not color-led or atmospheric enough", ["chromatic", "atmospheric", "open"], { chromatic: 88, atmospheric: 72, open: 68 }, 62],
    ["natural-movement", "Natural movement", "Not naturally dynamic enough", ["kinetic", "fluid", "organic"], { kinetic: 76, fluid: 86, organic: 78 }, 64],
    ["graphic-momentum", "Graphic momentum", "Not graphic or kinetic enough", ["kinetic", "structured", "graphic"], { kinetic: 86, structured: 72, graphic: 78 }, 77],
    ["bold-focal-form", "Bold focal form", "Not bold or focal enough", ["forceful", "graphic", "structured"], { forceful: 90, graphic: 86, structured: 74 }, 88]
  ].map(([id, label, exclusionLabel, categories, target, stimulationCenter]) => ({ id, label, exclusionLabel, categories, target, stimulationCenter, weight: 1, weights: Object.fromEntries(categories.map(category => [category, 0.75])) })));
  const constraints = Object.freeze([
    { id: "text-ready", label: "needs space for text", exclusionLabel: "Does not accommodate text", test: item => item.metadata.openTextArea && item.metadata.strongTextContrast },
    { id: "fits-kahntra", label: "fits Kahntra", exclusionLabel: "Does not fit Kahntra", test: item => item.metadata.kahntraFit },
    { id: "palette-cool", group: "palette", label: "cool palette", exclusionLabel: "Not a cool palette", test: item => item.artDirection.temperature === "cool" },
    { id: "palette-neutral", group: "palette", label: "neutral palette", exclusionLabel: "Not a neutral palette", test: item => item.artDirection.temperature === "neutral" },
    { id: "palette-warm", group: "palette", label: "warm palette", exclusionLabel: "Not a warm palette", test: item => item.artDirection.temperature === "warm" }
  ]);
  const targetProfileFor = stimulation => ({ stimulation: { value: stimulation, weight: 1.75 }, boldness: { value: 18 + stimulation * 0.64, weight: 0.12 }, activity: { value: 16 + stimulation * 0.68, weight: 0.12 }, colorIntensity: { value: 20 + stimulation * 0.6, weight: 0.1 } });

  const svgData = item => {
    const s = item.signals;
    const recipe = item.artDirection;
    const hue = recipe.hue;
    const saturation = 12 + s.chroma * 0.68;
    const accentHue = (hue + 35 + s.paletteSeparation * 0.9) % 360;
    const background = `hsl(${hue} ${Math.max(8, saturation - 35)}% ${Math.min(96, 82 + (100 - s.colorCoverage) * 0.1)}%)`;
    const primary = `hsl(${hue} ${saturation}% ${Math.max(22, 76 - s.contrastSeparation * 0.42)}%)`;
    const accent = `hsl(${accentHue} ${Math.min(92, saturation + 10)}% ${Math.max(30, 78 - s.contrastSeparation * 0.34)}%)`;
    const opacity = (0.24 + s.formWeight / 155).toFixed(2);
    let forms = "";
    if (recipe.family === "open-field") {
      const rise = 290 - s.directionalEnergy * 1.4;
      forms = `<path d="M-80 330 C220 ${rise},390 ${rise + 90},650 ${rise + 10} S1040 ${rise - 80},1280 ${rise + 5} L1280 460 L-80 460Z" fill="${primary}" opacity="${opacity}"/><path d="M-60 365 C260 ${rise + 35},520 ${rise - 45},790 ${rise + 30} S1100 ${rise + 70},1280 ${rise - 20}" fill="none" stroke="${accent}" stroke-width="${12 + s.formWeight * 0.22}" opacity="0.42"/>`;
    } else if (recipe.family === "measured-planes") {
      const width = 150 + s.focalDominance * 3.2;
      forms = `<rect x="${90 + s.rhythmicVariation}" y="46" width="${width}" height="280" fill="${primary}" opacity="${opacity}"/><rect x="${520 - s.elementDensity}" y="95" width="${210 + s.formWeight * 1.8}" height="215" fill="${accent}" opacity="0.72"/><path d="M780 400 L${840 + s.directionalEnergy * 2} 90 L1200 90 L1200 400Z" fill="${primary}" opacity="0.44"/>`;
    } else if (recipe.family === "tactile-layers") {
      const count = 3 + Math.round(s.elementDensity / 28);
      forms = Array.from({ length: count }, (_, index) => { const x = -80 + index * (1180 / Math.max(1, count - 1)); const y = 115 + ((index * 67 + s.rhythmicVariation) % 150); const rx = 210 + ((s.focalDominance + index * 23) % 130); return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${105 + s.formWeight}" fill="${index % 2 ? accent : primary}" opacity="${(0.22 + index * 0.06).toFixed(2)}" transform="rotate(${index % 2 ? -12 : 10} ${x} ${y})"/>`; }).join("");
      forms += `<filter id="grain"><feTurbulence baseFrequency="0.7" numOctaves="2" seed="${item.realization + Number(item.profileId.slice(1))}"/><feBlend mode="multiply" in2="SourceGraphic"/></filter><rect width="1200" height="400" filter="url(#grain)" opacity="0.08"/>`;
    } else if (recipe.family === "driven-shapes") {
      const thrust = 220 + s.directionalEnergy * 3.4;
      forms = `<polygon points="-40,380 ${thrust},25 ${thrust + 190},25 250,400" fill="${primary}" opacity="0.94"/><polygon points="240,400 ${thrust + 250},0 ${thrust + 430},0 520,400" fill="${accent}" opacity="0.9"/><polygon points="610,400 ${780 + s.focalDominance * 2},25 1220,25 1220,400" fill="hsl(${(accentHue + 55) % 360} ${saturation}% 22%)" opacity="${opacity}"/>`;
    } else if (recipe.family === "horizon-bands") {
      const horizon = 220 + (s.formWeight - 50) * 0.7;
      forms = `<rect y="${horizon}" width="1200" height="${400 - horizon}" fill="${primary}" opacity="0.72"/><path d="M-30 ${horizon - 14} C260 ${horizon - 75},470 ${horizon + 25},760 ${horizon - 34} S1060 ${horizon - 2},1230 ${horizon - 72}" fill="none" stroke="${accent}" stroke-width="${16 + s.paletteSeparation * 0.22}" opacity="0.58"/><path d="M-30 ${horizon + 64} C250 ${horizon + 8},510 ${horizon + 104},810 ${horizon + 33} S1080 ${horizon + 80},1230 ${horizon + 14}" fill="none" stroke="hsl(${(accentHue + 40) % 360} ${saturation}% 74%)" stroke-width="${8 + s.rhythmicVariation * 0.15}" opacity="0.56"/>`;
    } else if (recipe.family === "radial-orbit") {
      const radius = 70 + s.focalDominance * 1.2;
      const cx = 600 + (s.directionalEnergy - 50) * 4;
      const cy = 205 + (s.rhythmicVariation - 50) * 1.5;
      forms = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${primary}" opacity="0.72"/><circle cx="${cx}" cy="${cy}" r="${radius + 48 + s.paletteSeparation}" fill="none" stroke="${accent}" stroke-width="${10 + s.contrastSeparation * 0.12}" opacity="0.55"/><path d="M80 345 C250 40,920 40,1120 320" fill="none" stroke="hsl(${(accentHue + 75) % 360} ${saturation}% 46%)" stroke-width="${7 + s.directionalEnergy * 0.13}" opacity="0.48"/>`;
    } else if (recipe.family === "modular-grid") {
      const columns = 4 + Math.round(s.elementDensity / 28);
      const rows = 2 + Math.round(s.rhythmicVariation / 42);
      const cells = Array.from({ length: columns * rows }, (_, index) => { const column = index % columns; const row = Math.floor(index / columns); const x = 52 + column * (1090 / columns); const y = 36 + row * (320 / rows); const active = (index + Math.round(s.focalDominance / 20)) % 3 === 0; return `<rect x="${x}" y="${y}" width="${(1030 / columns).toFixed(1)}" height="${(265 / rows).toFixed(1)}" fill="${active ? accent : primary}" opacity="${active ? "0.72" : "0.28"}"/>`; }).join("");
      forms = `${cells}<path d="M48 352 L1150 352" stroke="hsl(${(accentHue + 40) % 360} ${saturation}% 42%)" stroke-width="7" opacity="0.42"/>`;
    } else if (recipe.family === "framed-void") {
      const inset = 65 + s.elementDensity * 0.7;
      const blockWidth = 140 + s.focalDominance * 2.5;
      forms = `<rect x="${inset}" y="${inset * 0.58}" width="${1200 - inset * 2}" height="${400 - inset * 1.16}" fill="none" stroke="${primary}" stroke-width="${10 + s.formWeight * 0.12}" opacity="0.64"/><rect x="${100 + s.directionalEnergy * 2}" y="${115 + s.rhythmicVariation}" width="${blockWidth}" height="${95 + s.formWeight}" fill="${accent}" opacity="0.62"/><path d="M850 40 L1120 40 L1120 315" fill="none" stroke="hsl(${(accentHue + 56) % 360} ${saturation}% 40%)" stroke-width="16" opacity="0.36"/>`;
    } else if (recipe.family === "folded-paper") {
      const fold = 260 + s.directionalEnergy * 4;
      forms = `<polygon points="0,0 ${fold},0 560,400 0,400" fill="${primary}" opacity="0.5"/><polygon points="${fold},0 830,0 560,400" fill="${accent}" opacity="0.72"/><polygon points="830,0 1200,0 1200,400 560,400" fill="hsl(${(accentHue + 70) % 360} ${saturation}% 34%)" opacity="0.48"/><path d="M${fold} 0 L560 400 L830 0" fill="none" stroke="hsl(${hue} ${Math.max(12, saturation - 30)}% 92%)" stroke-width="${7 + s.contrastSeparation * 0.12}" opacity="0.78"/>`;
    } else if (recipe.family === "contour-map") {
      const rings = 3 + Math.round(s.elementDensity / 24);
      forms = Array.from({ length: rings }, (_, index) => { const rx = 150 + index * 82 + s.focalDominance * 0.6; const ry = 52 + index * 26 + s.formWeight * 0.25; const x = 330 + ((index * 169 + s.directionalEnergy * 3) % 520); const y = 208 + ((index % 2 ? -1 : 1) * (20 + s.rhythmicVariation * 0.4)); return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="none" stroke="${index % 2 ? accent : primary}" stroke-width="${4 + index * 2}" opacity="${(0.28 + index * 0.08).toFixed(2)}" transform="rotate(${index % 2 ? -14 : 11} ${x} ${y})"/>`; }).join("");
    } else if (recipe.family === "editorial-blocks") {
      const width = 220 + s.focalDominance * 3;
      forms = `<rect x="80" y="68" width="${width}" height="${190 + s.formWeight}" fill="${primary}" opacity="0.78"/><rect x="${390 + s.directionalEnergy * 2}" y="${110 + s.rhythmicVariation}" width="${230 + s.elementDensity * 1.6}" height="${100 + s.paletteSeparation}" fill="${accent}" opacity="0.62"/><path d="M980 0 L1200 0 L1200 400 L${960 - s.directionalEnergy} 400Z" fill="hsl(${(accentHue + 38) % 360} ${saturation}% 40%)" opacity="0.46"/>`;
    } else {
      const count = 10 + Math.round(s.elementDensity / 8);
      forms = Array.from({ length: count }, (_, index) => { const x = 90 + ((index * 89 + s.directionalEnergy * 5) % 1010); const y = 60 + ((index * 53 + s.rhythmicVariation * 3) % 280); const r = 3 + ((index + s.focalDominance) % 11); return `<circle cx="${x}" cy="${y}" r="${r}" fill="${index % 3 ? primary : accent}" opacity="${(0.28 + (index % 4) * 0.12).toFixed(2)}"/>`; }).join("");
      forms += `<path d="M100 300 L${360 + s.directionalEnergy * 2} ${110 + s.rhythmicVariation} L${710 + s.focalDominance * 2} 265 L1100 85" fill="none" stroke="${accent}" stroke-width="3" opacity="0.4"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="400" fill="${background}"/>${forms}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  };

  globalThis.DecisionDemoModel = Object.freeze({ items, renderedArtwork, generatedStudyRecords, signalDefinitions, categoryDefinitions, tagRecipes, constraints, deriveAttributes, targetProfileFor, svgData });
  if (typeof document === "undefined") return;

  const init = () => {
    const root = document.querySelector("[data-tech-demo]");
    if (!root || !globalThis.DecisionEngine) return;
    const label = document.querySelector("[data-tech-demo-label]");
    const banner = document.querySelector("[data-tech-demo-banner]");
    const method = root.querySelector("[data-decision-method]");
    const input = root.querySelector("[data-decision-feeling]");
    const form = root.querySelector("[data-decision-controls]");
    const refinements = root.querySelector(".decision-demo__refinements");
    const intro = root.querySelector("[data-decision-intro]");
    const workspace = root.querySelector("[data-decision-workspace]");
    const prompt = root.querySelector("[data-decision-prompt]");
    const choiceButtons = [...root.querySelectorAll("[data-decision-choice]")];
    const tagContainer = root.querySelector("[data-decision-soft-tags]");
    const results = root.querySelector("[data-decision-results]");
    const resultsHeading = root.querySelector(".decision-demo__results-heading");
    const summary = root.querySelector("[data-decision-summary]");
    const exclusionsPanel = root.querySelector("[data-decision-exclusions-panel]");
    const exclusions = root.querySelector("[data-decision-exclusions]");
    const excludedCount = root.querySelector("[data-decision-excluded-count]");
    const goodCount = root.querySelector("[data-decision-good-count]");
    const wedge = root.querySelector("[data-decision-wedge]");
    const methodButtons = [...root.querySelectorAll("[data-method-step-button]")];
    const methodPanels = [...root.querySelectorAll("[data-method-step]")];
    const methodSignalBody = root.querySelector("[data-method-signal-body]");
    const methodAttributeBody = root.querySelector("[data-method-attribute-body]");
    const methodCategoryList = root.querySelector("[data-method-category-list]");
    const note = root.querySelector("[data-decision-tech-note]");
    const refineNote = root.querySelector("[data-decision-refine-note]");
    const constraintNote = root.querySelector("[data-decision-constraint-note]");
    const externalBanner = banner?.querySelector("[data-decision-external-banner]");
    const selectedSample = root.querySelector("[data-decision-selected-sample]");
    const choicePreviews = [...root.querySelectorAll("[data-decision-choice-preview]")];
    const selectedIds = new Set();
    const suppressedIds = new Set();
    const tagButtons = new Map();
    const slots = new Map();
    const transitions = new Map();
    let currentCandidates = [];
    let lastCandidateDial = Number(input.value);
    let currentMethodStep = 0;
    let selectedImageId = null;
    let selectionRequired = false;
    let initialBannerPicked = false;
    let currentPerspective = "technical";
    let currentMatches = [];
    let currentEntries = new Map();
    let galleryPage = 0;
    let renderedMatchingPageSize = 1;
    let showingExclusions = false;
    const exclusionPages = new Map();
    const wedgeRadius = 18;
    const visibleTagLimit = 4;

    form.querySelectorAll("input,button").forEach(control => { control.disabled = false; });
    const preferenceFor = id => tagRecipes.find(recipe => recipe.id === id);
    const readState = () => ({ stimulation: Number(input.value), preferences: [...selectedIds].map(preferenceFor), hardConstraints: constraints.filter(constraint => root.querySelector(`[data-decision-constraint="${constraint.id}"]`)?.checked) });
    const freeSlot = () => { for (let slot = 0; slot < visibleTagLimit; slot += 1) if (![...slots.values()].includes(slot)) return slot; return slots.size; };
    const effectiveDuration = element => { const style = getComputedStyle(element); const durations = style.transitionDuration.split(",").map(value => parseFloat(value) * (value.includes("ms") ? 1 : 1000)); const delays = style.transitionDelay.split(",").map(value => parseFloat(value) * (value.includes("ms") ? 1 : 1000)); return Math.max(0, ...durations.map((duration, index) => duration + (delays[index] || delays[0] || 0))); };
    const cancelTransition = button => { const transition = transitions.get(button); if (!transition) return; button.removeEventListener("transitionend", transition.end); button.removeEventListener("transitioncancel", transition.cancel); clearTimeout(transition.timer); transitions.delete(button); };
    const finalizeExit = (button, version, reconcile = true) => { const transition = transitions.get(button); if (!transition || transition.version !== version) return; cancelTransition(button); const id = button.dataset.softPreference; if (selectedIds.has(id) || currentCandidates.includes(id)) { button.hidden = false; button.removeAttribute("aria-hidden"); button.tabIndex = 0; button.classList.remove("is-leaving"); requestAnimationFrame(() => button.classList.add("is-band-visible")); } else { button.hidden = true; button.setAttribute("aria-hidden", "true"); button.tabIndex = -1; button.classList.remove("is-leaving", "is-band-visible"); slots.delete(id); } if (reconcile && !root.hidden) requestAnimationFrame(reconcileTags); };
    const showTag = button => { const alreadySettled = !button.hidden && button.classList.contains("is-band-visible") && !button.classList.contains("is-leaving"); cancelTransition(button); const id = button.dataset.softPreference; if (!slots.has(id)) slots.set(id, freeSlot()); const slot = slots.get(id); button.style.gridRow = String(Math.floor(slot / 2) + 1); button.style.gridColumn = String(slot % 2 + 1); button.hidden = false; button.removeAttribute("aria-hidden"); button.tabIndex = 0; button.classList.remove("is-leaving"); if (alreadySettled) return; button.classList.remove("is-band-visible"); requestAnimationFrame(() => { if (!button.hidden && (selectedIds.has(id) || currentCandidates.includes(id))) button.classList.add("is-band-visible"); }); };
    const hideTag = button => { if (button.hidden || button.classList.contains("is-leaving")) return; cancelTransition(button); const version = Number(button.dataset.transitionVersion || 0) + 1; button.dataset.transitionVersion = String(version); button.tabIndex = -1; button.setAttribute("aria-hidden", "true"); button.classList.add("is-leaving"); button.classList.remove("is-band-visible"); const end = event => { if (event.target === button && event.propertyName === "opacity") finalizeExit(button, version); }; const cancel = event => { if (event.target === button) finalizeExit(button, version); }; const duration = effectiveDuration(button); const transition = { version, end, cancel, timer: 0 }; transitions.set(button, transition); button.addEventListener("transitionend", end); button.addEventListener("transitioncancel", cancel); if (duration === 0) requestAnimationFrame(() => finalizeExit(button, version)); else transition.timer = setTimeout(() => finalizeExit(button, version), duration + 80); };

    const ensureButtons = () => {
      tagContainer.replaceChildren();
      tagRecipes.forEach(recipe => {
        const button = document.createElement("button");
        button.type = "button"; button.dataset.softPreference = recipe.id; button.dataset.tagMotif = recipe.id; button.setAttribute("aria-pressed", "false"); button.setAttribute("aria-hidden", "true"); button.tabIndex = -1; button.hidden = true; button.disabled = false; button.innerHTML = `<span class="decision-demo__tag-mark" aria-hidden="true"></span><span class="decision-demo__tag-label">${esc(recipe.label)}</span>`;
        button.addEventListener("click", () => { if (selectedIds.has(recipe.id)) { selectedIds.delete(recipe.id); suppressedIds.add(recipe.id); } else if (selectedIds.size < visibleTagLimit) { selectedIds.add(recipe.id); suppressedIds.delete(recipe.id); } button.setAttribute("aria-pressed", String(selectedIds.has(recipe.id))); reconcileTags(); render(); });
        tagButtons.set(recipe.id, button); tagContainer.append(button);
      });
    };
    const methodItems = items.slice(0, 6);
    const renderMethod = () => {
      const signalOrder = ["focalDominance", "elementDensity", "chroma", "contrastSeparation", "directionalEnergy", "paletteSeparation", "formWeight", "rhythmicVariation", "colorCoverage"];
      methodSignalBody.replaceChildren(...methodItems.map(item => { const row = document.createElement("tr"); row.innerHTML = `<th scope="row"><span class="decision-result__thumb" aria-hidden="true"></span>${esc(item.name)}</th>${signalOrder.map(id => `<td>${item.signals[id].toFixed(0)}</td>`).join("")}`; paint(row.querySelector(".decision-result__thumb"), item); return row; }));
      methodAttributeBody.replaceChildren(...methodItems.map(item => { const row = document.createElement("tr"); row.innerHTML = `<th scope="row"><span class="decision-result__thumb" aria-hidden="true"></span>${esc(item.name)}</th><td>${item.attributes.boldness.toFixed(1)} · ${boldnessWord(item.attributes.boldness)}</td><td>${item.attributes.activity.toFixed(1)} · ${activityWord(item.attributes.activity)}</td><td>${item.attributes.colorIntensity.toFixed(1)} · ${colorWord(item.attributes.colorIntensity)}</td><td>${item.attributes.stimulation.toFixed(1)}</td>`; paint(row.querySelector(".decision-result__thumb"), item); return row; }));
      methodCategoryList.replaceChildren(...categoryDefinitions.map(([, label]) => { const item = document.createElement("li"); item.textContent = label; return item; }));
    };
    const showMethodStep = step => { currentMethodStep = step; methodButtons.forEach(button => button.setAttribute("aria-current", String(Number(button.dataset.methodStepButton) === step))); methodPanels.forEach(panel => { panel.hidden = Number(panel.dataset.methodStep) !== step; }); };
    const neighborhood = stimulation => { const nearby = items.filter(item => Math.abs(item.attributes.stimulation - stimulation) <= 15); return nearby.length >= 18 ? nearby : [...items].sort((left, right) => Math.abs(left.attributes.stimulation - stimulation) - Math.abs(right.attributes.stimulation - stimulation)).slice(0, 28); };
    const tagStrength = (item, recipe) => recipe.categories.reduce((sum, category) => sum + item.categories[category], 0) / recipe.categories.length;
    const selectedTagMatchCount = item => [...selectedIds].filter(id => tagStrength(item, preferenceFor(id)) >= 62).length;
    const matchesSelectedTags = item => !selectedIds.size || selectedTagMatchCount(item) > 0;
    const tagScore = (recipe, candidates, stimulation) => { const strengths = candidates.map(item => recipe.categories.reduce((sum, category) => sum + item.categories[category], 0) / recipe.categories.length); const chosen = strengths.filter(value => value >= 62); const rejected = strengths.filter(value => value < 62); if (!chosen.length || !rejected.length) return -Infinity; const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length; const coverage = chosen.length / strengths.length; const separation = mean(chosen) - mean(rejected); const balance = 1 - Math.min(1, Math.abs(coverage - 0.42) / 0.42); const overlapPenalty = [...selectedIds].reduce((penalty, id) => { const other = preferenceFor(id); const shared = recipe.categories.filter(category => other.categories.includes(category)).length; return penalty + shared / Math.max(recipe.categories.length, other.categories.length); }, 0); const relevance = Math.abs(stimulation - recipe.stimulationCenter) * 0.9; return separation * 0.55 + balance * 28 - overlapPenalty * 20 - relevance; };
    const chooseCandidates = (stimulation, count) => { const rankRecipes = recipes => recipes.map(recipe => ({ id: recipe.id, score: tagScore(recipe, neighborhood(stimulation), stimulation) })).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)).map(entry => entry.id); const available = tagRecipes.filter(recipe => !selectedIds.has(recipe.id)); const preferred = rankRecipes(available.filter(recipe => !suppressedIds.has(recipe.id))); const fallback = rankRecipes(available.filter(recipe => suppressedIds.has(recipe.id))); return [...preferred, ...fallback].slice(0, count); };
    function reconcileTags(force = false) { const stimulation = Number(input.value); const moved = Math.abs(stimulation - lastCandidateDial) >= 5; if (moved) suppressedIds.clear(); if (moved || !currentCandidates.length) { currentCandidates = [...selectedIds, ...chooseCandidates(stimulation, Math.max(0, visibleTagLimit - selectedIds.size))]; lastCandidateDial = stimulation; } const desired = new Set(currentCandidates); [...slots.entries()].filter(([id]) => !desired.has(id)).forEach(([id]) => slots.delete(id)); [...desired].filter(id => !slots.has(id)).forEach(id => slots.set(id, freeSlot())); tagButtons.forEach((button, id) => { if (desired.has(id)) showTag(button); else hideTag(button); }); }

    const paint = (element, item) => { if (!element || !item) return; element.style.backgroundImage = `url("${renderedArtwork[item.id]}")`; element.dataset.imageId = item.id; };
    const effectsText = rank => rank.effects.flatMap(effect => effect.dimensions.map(dimension => { const recipe = preferenceFor(effect.id); const label = categoryDefinitions.find(([id]) => id === dimension.dimension)?.[1] || dimension.dimension; return `${recipe.label}: ${label} ${dimension.targetDelta >= 0 ? "+" : ""}${dimension.targetDelta.toFixed(1)}`; }));
    const visualDescription = item => `${activityWord(item.attributes.activity)} · ${boldnessWord(item.attributes.boldness)} · ${colorWord(item.attributes.colorIntensity)}`;
    let galleryGroups = { good: [], excluded: [] };
    let exclusionGroups = [];
    let closestAvailableIds = new Set();
    const selectImage = item => { if (!item) return; selectedImageId = item.id; if (banner) banner.hidden = false; paint(externalBanner, item); paint(selectedSample, item); root.querySelectorAll("[data-gallery-image]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.galleryImage === selectedImageId))); };
    const makeGalleryButton = (item, reasonLabel = "") => { const button = document.createElement("button"); const visual = document.createElement("span"); const caption = document.createElement("span"); const description = `${closestAvailableIds.has(item.id) ? "Closest · " : ""}${visualDescription(item)}`; button.type = "button"; button.className = "decision-demo__gallery-item"; button.dataset.galleryImage = item.id; button.setAttribute("aria-label", `Select ${item.name}: ${description}${reasonLabel ? `. ${reasonLabel}` : ""}`); button.setAttribute("aria-pressed", String(item.id === selectedImageId)); visual.className = "decision-demo__gallery-visual"; visual.setAttribute("aria-hidden", "true"); caption.className = "decision-demo__gallery-caption"; caption.textContent = description; paint(visual, item); button.append(visual, caption); button.addEventListener("click", () => selectImage(item)); return button; };
    const makeExclusionReasonCard = group => { const item = group.representative; const button = document.createElement("button"); const visual = document.createElement("span"); const reason = document.createElement("span"); const caption = document.createElement("span"); const more = Math.max(0, group.items.length - 1); button.type = "button"; button.className = "decision-demo__gallery-item decision-demo__gallery-item--excluded"; button.dataset.galleryImage = item.id; button.setAttribute("aria-label", `Select ${item.name}. Ruled out for now: ${group.label}${more ? `, plus ${more} more` : ""}.`); button.setAttribute("aria-pressed", String(item.id === selectedImageId)); visual.className = "decision-demo__gallery-visual"; visual.setAttribute("aria-hidden", "true"); reason.className = "decision-demo__gallery-reason"; reason.textContent = group.label; if (more) { const count = document.createElement("span"); count.className = "decision-demo__gallery-reason-count"; count.textContent = `+${more} more`; reason.append(count); } caption.className = "decision-demo__gallery-caption"; caption.textContent = visualDescription(item); paint(visual, item); visual.append(reason); button.append(visual, caption); button.addEventListener("click", () => selectImage(item)); return button; };
    const pageSize = kind => {
      const compact = window.matchMedia("(max-width: 760px)").matches;
      return kind === "matching" ? (refinements?.open && !compact ? 6 : 4) : (compact ? 4 : 8);
    };
    const makePager = ({ page, pageCount, label, onPageChange }) => {
      if (pageCount <= 1) return null;
      const nav = document.createElement("nav");
      const previous = document.createElement("button");
      const status = document.createElement("span");
      const next = document.createElement("button");
      nav.className = "decision-demo__gallery-pager";
      nav.setAttribute("aria-label", `${label} pages`);
      previous.type = "button";
      previous.className = "decision-demo__gallery-page-button";
      previous.textContent = "← Previous";
      previous.disabled = page === 0;
      previous.addEventListener("click", () => onPageChange(page - 1));
      status.className = "decision-demo__gallery-page-status";
      status.textContent = `${page + 1} of ${pageCount}`;
      next.type = "button";
      next.className = "decision-demo__gallery-page-button";
      next.textContent = "Next →";
      next.disabled = page === pageCount - 1;
      next.addEventListener("click", () => onPageChange(page + 1));
      nav.append(previous, status, next);
      return nav;
    };
    const returnToMatches = () => { exclusionsPanel.open = false; exclusionPages.clear(); galleryPage = 0; showingExclusions = false; };
    const makeExclusionTile = () => { const button = document.createElement("button"); button.type = "button"; button.className = "decision-demo__gallery-item decision-demo__gallery-item--more"; button.innerHTML = `<span>Didn’t find what you wanted?</span><strong>See what was ruled out <span aria-hidden="true">→</span></strong>`; button.addEventListener("click", () => { showingExclusions = true; renderGallery(); }); return button; };
    const appendExclusionGroups = target => {
      const assignedIds = new Set();
      const distanceFromCurrentResults = item => Math.min(...currentMatches.map(match => Math.hypot(...["stimulation", "boldness", "activity", "colorIntensity"].map(dimension => item.attributes[dimension] - match.attributes[dimension]))));
      const groups = exclusionGroups.map(group => {
        const representative = group.items
          .filter(item => !assignedIds.has(item.id))
          .sort((left, right) => distanceFromCurrentResults(left) - distanceFromCurrentResults(right) || (currentEntries.get(left.id)?.totalScore ?? Infinity) - (currentEntries.get(right.id)?.totalScore ?? Infinity) || left.id.localeCompare(right.id))[0];
        if (!representative) return null;
        assignedIds.add(representative.id);
        return { ...group, representative };
      }).filter(Boolean);
      const cards = document.createElement("div");
      cards.className = "decision-demo__exclusion-summary";
      cards.append(...groups.map(makeExclusionReasonCard));
      target.append(cards);
    };
    const renderExclusionPage = () => {
      results.replaceChildren();
      resultsHeading.hidden = true;
      const heading = document.createElement("div");
      const title = document.createElement("p");
      const back = document.createElement("button");
      heading.className = "decision-demo__exclusion-page-heading";
      title.textContent = "Ruled out for now";
      back.type = "button";
      back.textContent = "← Back to results";
      back.addEventListener("click", () => { showingExclusions = false; galleryPage = Math.max(0, Math.ceil(galleryGroups.good.length / pageSize("matching")) - 1); renderGallery(); });
      heading.append(title, back);
      results.append(heading);
      appendExclusionGroups(results);
      summary.textContent = `${galleryGroups.excluded.length} images ruled out for the current direction.`;
    };
    const renderGallery = () => {
      exclusionsPanel.hidden = true;
      exclusionsPanel.open = false;
      if (showingExclusions) { renderExclusionPage(); return; }
      resultsHeading.hidden = false;
      results.replaceChildren();
      const size = pageSize("matching");
      renderedMatchingPageSize = size;
      const matchingPageCount = Math.max(1, Math.ceil(galleryGroups.good.length / size));
      const finalMatchingPageSize = galleryGroups.good.length - ((matchingPageCount - 1) * size);
      const hasExclusions = exclusionGroups.length > 0;
      const hasStandaloneExclusionPage = hasExclusions && finalMatchingPageSize === size;
      const pageCount = matchingPageCount + (hasStandaloneExclusionPage ? 1 : 0);
      galleryPage = Math.max(0, Math.min(galleryPage, pageCount - 1));
      const grid = document.createElement("div");
      grid.className = "decision-demo__gallery-items";
      if (hasStandaloneExclusionPage && galleryPage === matchingPageCount) {
        grid.append(makeExclusionTile());
      } else {
        grid.append(...galleryGroups.good.slice(galleryPage * size, (galleryPage + 1) * size).map(item => makeGalleryButton(item)));
        if (hasExclusions && !hasStandaloneExclusionPage && galleryPage === matchingPageCount - 1) grid.append(makeExclusionTile());
      }
      results.append(grid);
      const pager = makePager({ page: galleryPage, pageCount, label: "Matching images", onPageChange: page => { galleryPage = page; renderGallery(); } });
      if (pager) results.append(pager);
      summary.textContent = `${galleryGroups.good.length} good options. ${items.find(item => item.id === selectedImageId)?.name || "No image"} selected.`;
    };
    const render = (resetSelection = false) => {
      const state = readState();
      const rank = globalThis.DecisionEngine.rank({ items, targetProfile: targetProfileFor(state.stimulation), selectedSoftPreferences: state.preferences, hardConstraints: state.hardConstraints, limit: items.length });
      const effects = effectsText(rank);
      currentEntries = new Map(rank.all.map(entry => [entry.item.id, entry]));
      const lowerBound = state.stimulation - wedgeRadius;
      const upperBound = state.stimulation + wedgeRadius;
      const inside = rank.all.filter(entry => entry.eligible && entry.item.attributes.stimulation >= lowerBound && entry.item.attributes.stimulation <= upperBound);
      const goodEntries = inside.filter(entry => matchesSelectedTags(entry.item)).sort((left, right) => selectedTagMatchCount(right.item) - selectedTagMatchCount(left.item));
      closestAvailableIds = new Set();
      const goodIds = new Set(goodEntries.map(entry => entry.item.id));
      const excludedEntries = rank.all.filter(entry => !goodIds.has(entry.item.id));
      const excludedIds = new Set(excludedEntries.map(entry => entry.item.id));
      const groupItems = test => rank.all.filter(entry => excludedIds.has(entry.item.id) && test(entry)).map(entry => entry.item);
      exclusionGroups = [];
      const addGroup = (id, label, actionLabel, action, test) => { const grouped = groupItems(test); if (grouped.length) exclusionGroups.push({ id, label, actionLabel, action, items: grouped }); };
      addGroup("too-comforting", "Too comforting", "Nudge toward Comfort", () => { input.value = String(clamp(Number(input.value) - 8)); suppressedIds.clear(); reconcileTags(true); render(true); }, entry => entry.item.attributes.stimulation < lowerBound);
      addGroup("too-stimulating", "Too stimulating", "Nudge toward Stimulate", () => { input.value = String(clamp(Number(input.value) + 8)); suppressedIds.clear(); reconcileTags(true); render(true); }, entry => entry.item.attributes.stimulation > upperBound);
      [...selectedIds].map(preferenceFor).forEach(recipe => addGroup(`tag-${recipe.id}`, recipe.exclusionLabel, `Remove “${recipe.label}”`, () => tagButtons.get(recipe.id)?.click(), entry => tagStrength(entry.item, recipe) < 62));
      state.hardConstraints.forEach(constraint => addGroup(`constraint-${constraint.id}`, constraint.exclusionLabel, "Remove limitation", () => { const control = root.querySelector(`[data-decision-constraint="${constraint.id}"]`); if (control) control.checked = false; render(true); }, entry => entry.failedConstraints.includes(constraint.id)));
      galleryGroups = { good: goodEntries.map(entry => entry.item), excluded: excludedEntries.map(entry => entry.item) };
      currentMatches = galleryGroups.good;
      goodCount.textContent = galleryGroups.good.length;
      excludedCount.textContent = galleryGroups.excluded.length;
      if (!selectionRequired && resetSelection) { selectedImageId = currentMatches[0]?.id || null; galleryPage = 0; showingExclusions = false; exclusionPages.clear(); }
      const wedgeStart = Math.max(0, state.stimulation - wedgeRadius);
      const wedgeEnd = Math.min(100, state.stimulation + wedgeRadius);
      wedge.style.setProperty("--wedge-start", `${wedgeStart}%`);
      wedge.style.setProperty("--wedge-width", `${wedgeEnd - wedgeStart}%`);
      root.querySelectorAll("[data-scale-label]").forEach(label => label.classList.toggle("is-active", label.dataset.scaleLabel === (state.stimulation < 50 ? "comfort" : "stimulation")));
      renderGallery();
      selectImage(currentMatches.find(item => item.id === selectedImageId));
      if (effects.length) summary.textContent += ` Preferences: ${effects.join("; ")}.`;
    };
    const updateDetail = detail => { const verbose = detail === "verbose"; root.classList.toggle("is-concise", !verbose); note.textContent = verbose ? "Consolidates multiple independent attributes into one continuous direction." : "Ranks image directions across multiple dimensions."; refineNote.textContent = verbose ? "Surfaces a limited set of relevant attributes to help refine the direction." : "Choose from relevant attributes."; constraintNote.textContent = verbose ? "Applies hard constraints to remove complete results that do not meet the selected conditions." : "Remove results that do not meet your limits."; root.querySelectorAll("[data-method-verbose-only]").forEach(element => { element.hidden = !verbose; }); const numbered = root.querySelectorAll("[data-method-step-number]"); if (numbered[0]) numbered[0].textContent = verbose ? "02" : "01"; if (numbered[1]) numbered[1].textContent = verbose ? "04" : "02"; const defineHeading = root.querySelector("[data-method-define-heading]"); const guideHeading = root.querySelector("[data-method-guide-heading]"); if (defineHeading) defineHeading.textContent = `${verbose ? "Step 2" : "Step 1"} — Define visual attributes`; if (guideHeading) guideHeading.textContent = `${verbose ? "Step 4" : "Step 2"} — Guide the choice`; if (!verbose && (currentMethodStep === 0 || currentMethodStep === 2)) showMethodStep(1); };
    const choiceItems = Object.freeze({ calm: items.reduce((best, item) => Math.abs(item.attributes.stimulation - 14) < Math.abs(best.attributes.stimulation - 14) ? item : best, items[0]), middle: items.reduce((best, item) => Math.abs(item.attributes.stimulation - 50) < Math.abs(best.attributes.stimulation - 50) ? item : best, items[0]), stimulate: items.reduce((best, item) => Math.abs(item.attributes.stimulation - 86) < Math.abs(best.attributes.stimulation - 86) ? item : best, items[0]) });
    const setVisibility = perspective => { currentPerspective = perspective; const visible = perspective === "technical" || perspective === "design-philosophy"; [label, root, banner].forEach(element => { if (!element) return; element.hidden = !visible; element.inert = !visible; }); method.hidden = perspective !== "technical" || !root.classList.contains("is-interacting"); if (!visible) tagButtons.forEach(button => { const transition = transitions.get(button); if (transition) finalizeExit(button, transition.version, false); }); else { reconcileTags(true); render(); if (!initialBannerPicked && currentMatches.length) { selectImage(currentMatches[Math.floor(Math.random() * currentMatches.length)]); initialBannerPicked = true; } } };
    ensureButtons(); renderMethod(); reconcileTags(true); choicePreviews.forEach(preview => paint(preview, choiceItems[preview.dataset.decisionChoicePreview]));
    methodButtons.forEach(button => button.addEventListener("click", () => showMethodStep(Number(button.dataset.methodStepButton))));
    const preserveResultPosition = () => {
      const firstVisibleResult = galleryPage * renderedMatchingPageSize;
      galleryPage = Math.floor(firstVisibleResult / pageSize("matching"));
    };
    refinements?.addEventListener("toggle", () => { root.classList.toggle("has-extra-refinements", refinements.open); preserveResultPosition(); selectionRequired = refinements.open; selectedImageId = null; render(true); });
    choiceButtons.forEach(button => button.addEventListener("click", () => { const choiceItem = choiceItems[button.dataset.decisionChoice]; if (!choiceItem) return; root.classList.add("is-interacting"); intro.hidden = true; workspace.hidden = false; method.hidden = currentPerspective !== "technical"; input.value = String(Math.round(choiceItem.attributes.stimulation)); selectedImageId = choiceItem.id; selectionRequired = false; galleryPage = 0; reconcileTags(true); render(); const selectedIndex = currentMatches.findIndex(item => item.id === choiceItem.id); galleryPage = Math.max(0, Math.floor(Math.max(0, selectedIndex) / pageSize("matching"))); renderGallery(); selectImage(choiceItem); input.focus(); }));
    input.addEventListener("input", () => { selectedImageId = null; selectionRequired = true; reconcileTags(); render(); });
    root.querySelectorAll("[data-decision-constraint]").forEach(control => control.addEventListener("change", () => render(true)));
    const noPalettePreference = root.querySelector("[data-decision-palette-clear]");
    const paletteControls = [...root.querySelectorAll('[data-decision-constraint^="palette-"]')];
    let selectedPaletteId = paletteControls.find(control => control.checked)?.dataset.decisionConstraint || null;
    const syncPaletteUI = () => {
      paletteControls.forEach(control => control.closest("label")?.classList.toggle("is-selected", selectedPaletteId === control.dataset.decisionConstraint));
      noPalettePreference.hidden = selectedPaletteId === null;
    };
    paletteControls.forEach(control => {
      control.addEventListener("click", event => {
        event.preventDefault();
        const selectingCurrent = selectedPaletteId === control.dataset.decisionConstraint;
        selectedPaletteId = selectingCurrent ? null : control.dataset.decisionConstraint;
        paletteControls.forEach(option => { option.checked = !selectingCurrent && option === control; });
        syncPaletteUI();
        render();
      });
    });
    noPalettePreference.addEventListener("click", event => {
      event.preventDefault();
      selectedPaletteId = null;
      paletteControls.forEach(option => { option.checked = false; });
      syncPaletteUI();
      render();
    });
    syncPaletteUI();
    window.addEventListener("kahntra-perspective-change", event => setVisibility(event.detail.perspective));
    window.addEventListener("kahntra-detail-change", event => updateDetail(event.detail.detail));
    updateDetail(document.querySelector('[data-global-detail="verbose"]')?.getAttribute("aria-pressed") === "true" ? "verbose" : "concise");
    setVisibility(document.querySelector('[data-global-lens="technical"]')?.getAttribute("aria-pressed") === "true" ? "technical" : "design-philosophy");
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
