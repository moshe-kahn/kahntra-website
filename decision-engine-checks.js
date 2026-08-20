const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync("decision-engine.js", "utf8");
const context = {};
context.globalThis = context;
vm.runInNewContext(source, context);
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
console.log("decision engine checks passed");
