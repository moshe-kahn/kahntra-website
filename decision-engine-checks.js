const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync("decision-engine.js", "utf8");
const demoSource = fs.readFileSync("decision-demo.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const context = {};
context.globalThis = context;
vm.runInNewContext(source, context);
vm.runInNewContext(demoSource, context);
const items = [
  { id: "near", name: "Near", attributes: { stimulation: 50, contrast: 90 }, allowed: true },
  { id: "far", name: "Far", attributes: { stimulation: 90, contrast: 40 }, allowed: true },
  { id: "blocked", name: "Blocked", attributes: { stimulation: 51, contrast: 90 }, allowed: false },
];
const base = {
  items,
  targetProfile: { stimulation: { value: 50, weight: 1 }, contrast: { value: 80, weight: 0.5 } },
  hardConstraints: [{ id: "allowed", test: (item) => item.allowed }],
  limit: 2,
};
const clarity = { id: "clarity", target: { contrast: 100, stimulation: 62 }, weights: { contrast: 2, stimulation: 0.5 }, weight: 1 };
const energy = { id: "energy", target: { stimulation: 72 }, weights: { stimulation: 1.5 }, weight: 1.25 };
const result = context.DecisionEngine.rank({ ...base, selectedSoftPreferences: [clarity] });
if (result.results.map((entry) => entry.item.id).join(",") !== "near,far") throw new Error("ranking order is not deterministic");
if (result.all.find((entry) => entry.item.id === "blocked").eligible) throw new Error("hard constraint was not retained");
if (!result.results[0].components.length || !result.results[0].effects.length) throw new Error("explanation components were not retained");
const forward = context.DecisionEngine.rank({ ...base, selectedSoftPreferences: [clarity, energy] });
const reversed = context.DecisionEngine.rank({ ...base, selectedSoftPreferences: [energy, clarity] });
if (JSON.stringify(forward.profile) !== JSON.stringify(reversed.profile)) throw new Error("profile changes with preference order");
if (forward.results.map((entry) => entry.item.id).join(",") !== reversed.results.map((entry) => entry.item.id).join(",")) throw new Error("ranking changes with preference order");
if (JSON.stringify(forward.all.map((entry) => entry.components)) !== JSON.stringify(reversed.all.map((entry) => entry.components))) throw new Error("component scores change with preference order");
if (JSON.stringify(forward.effects) !== JSON.stringify(reversed.effects)) throw new Error("effects change with preference order");
const stimulationEffects = forward.effects.flatMap((effect) => effect.dimensions).filter((effect) => effect.dimension === "stimulation");
if (stimulationEffects.length !== 2 || stimulationEffects.some((effect) => effect.targetDelta === 0 || effect.contributionWeight <= 0)) throw new Error("overlapping preference effects are not calculated");
for (const dimension of ["stimulation", "contrast"]) {
  const baseline = base.targetProfile[dimension];
  const individual = forward.effects.flatMap((effect) => effect.dimensions).filter((effect) => effect.dimension === dimension);
  const summedDelta = individual.reduce((sum, effect) => sum + effect.targetDelta, 0);
  if (Math.abs(summedDelta - (forward.profile[dimension].value - baseline.value)) > 0.00001) throw new Error(`individual ${dimension} effects do not sum to final delta`);
}
const single = context.DecisionEngine.rank({ ...base, selectedSoftPreferences: [clarity] });
const singleContrast = single.effects[0].dimensions.find((effect) => effect.dimension === "contrast");
if (!(singleContrast.targetDelta > 0)) throw new Error("single preference contribution is not positive");
const negative = context.DecisionEngine.rank({ ...base, selectedSoftPreferences: [{ id: "lower", target: { stimulation: 20 }, weights: { stimulation: 1 }, weight: 1 }] });
if (!(negative.effects[0].dimensions[0].targetDelta < 0)) throw new Error("negative contribution is not preserved");

const model = context.DecisionDemoModel;
if (!model || model.items.length !== 108) throw new Error("demo must expose exactly 108 model records");
if (new Set(model.items.map((item) => item.profileId)).size !== 27) throw new Error("demo must cover all 27 sampling profiles");
const profileCounts = Object.values(model.items.reduce((counts, item) => ({ ...counts, [item.profileId]: (counts[item.profileId] || 0) + 1 }), {}));
if (profileCounts.some((count) => count !== 4)) throw new Error("every profile must have four realizations");
const signalIds = model.signalDefinitions.map(([id]) => id);
for (const item of model.items) {
  if (Object.keys(item.signals).sort().join(",") !== [...signalIds].sort().join(",")) throw new Error(`${item.id} does not have the authoritative nine-signal schema`);
  const derived = model.deriveAttributes(item.signals);
  for (const dimension of ["boldness", "activity", "colorIntensity", "stimulation"]) {
    if (Math.abs(derived[dimension] - item.attributes[dimension]) > 0.00001) throw new Error(`${item.id} has a stale derived ${dimension}`);
  }
  if (["noise", "contrast", "warmth", "hierarchy", "temperature"].some((key) => Object.hasOwn(item.attributes, key))) throw new Error(`${item.id} retains an obsolete attribute`);
}
const textConstraint = model.constraints.find((constraint) => constraint.id === "text-ready");
const kahntraConstraint = model.constraints.find((constraint) => constraint.id === "fits-kahntra");
const paletteConstraints = model.constraints.filter((constraint) => constraint.group === "palette");
if (!textConstraint || !kahntraConstraint) throw new Error("the text and Kahntra limitations must be available");
for (const requiresText of [false, true]) for (const requiresKahntra of [false, true]) for (const palette of [null, ...paletteConstraints]) {
  const selectedConstraints = [requiresText ? textConstraint : null, requiresKahntra ? kahntraConstraint : null, palette].filter(Boolean);
  const constrained = context.DecisionEngine.rank({ items: model.items, targetProfile: model.targetProfileFor(50), hardConstraints: selectedConstraints, limit: model.items.length });
  if (constrained.results.length < 12) throw new Error("supported limitation combination leaves too few ranking alternatives");
}
const defaultDemo = context.DecisionEngine.rank({ items: model.items, targetProfile: model.targetProfileFor(50), limit: 12 });
const defaultNames = defaultDemo.results.map((entry) => entry.item.name);
const fallbackNames = [...html.matchAll(/aria-label="Static example, (Image \d{3})"/g)].map((match) => match[1]);
if (defaultNames.join(",") !== "Image 054,Image 053,Image 055,Image 056,Image 052,Image 024,Image 028,Image 083,Image 026,Image 081,Image 050,Image 080" || fallbackNames.join(",") !== defaultNames.join(",")) throw new Error("static fallback no longer matches the default model ranking");
if (!/data-decision-feeling[^>]+disabled/.test(html) || [...html.matchAll(/data-decision-constraint="[^"]+"[^>]+disabled/g)].length !== 5) throw new Error("no-JavaScript controls must remain disabled");
if (html.includes(">View data<") || !html.includes("data-decision-method")) throw new Error("the optional full method must replace the old View data disclosure");
if (new Set(model.items.map(model.svgData)).size !== model.items.length) throw new Error("every model record must render a distinct local image");
if (model.tagRecipes.some((recipe) => !recipe.exclusionLabel || !Number.isFinite(recipe.stimulationCenter) || recipe.categories.some((category) => !model.categoryDefinitions.some(([id]) => id === category)))) throw new Error("tag recipes must use valid categories, exclusion labels, and stimulation relevance centers");
if (model.constraints.some((constraint) => !constraint.exclusionLabel)) throw new Error("hard limitations must expose an exclusion reason");
if (!html.includes("data-decision-exclusions") || !html.includes("data-decision-excluded-count") || html.includes("data-gallery-category")) throw new Error("excluded images must be presented as supporting grouped context, not a competing result tab");
console.log("decision engine checks passed");
