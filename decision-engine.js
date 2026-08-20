(() => {
  const normalize = (value) => Math.max(0, Math.min(100, Number(value)));
  const rank = ({ items, targetProfile, selectedSoftPreferences = [], hardConstraints = [], limit = 3 }) => {
    const selected = [...selectedSoftPreferences].sort((left, right) => left.id.localeCompare(right.id));
    const dimensions = new Set([...Object.keys(targetProfile), ...selected.flatMap((preference) => Object.keys(preference.target || {}))]);
    const profile = {};
    const effectsByPreference = new Map(selected.map((preference) => [preference.id, { id: preference.id, dimensions: [] }]));
    dimensions.forEach((dimension) => {
      const baseline = targetProfile[dimension] || { value: 50, weight: 0 };
      const contributions = selected
        .filter((preference) => Object.hasOwn(preference.target || {}, dimension))
        .map((preference) => ({ preference, target: preference.target[dimension], weight: preference.weight * (preference.weights?.[dimension] || 1) }));
      const totalWeight = baseline.weight + contributions.reduce((sum, contribution) => sum + contribution.weight, 0);
      const value = totalWeight ? (baseline.value * baseline.weight + contributions.reduce((sum, contribution) => sum + contribution.target * contribution.weight, 0)) / totalWeight : baseline.value;
      profile[dimension] = { value, weight: totalWeight };
      contributions.forEach((contribution) => effectsByPreference.get(contribution.preference.id).dimensions.push({
        dimension, contributionWeight: Number(contribution.weight.toFixed(3)), weightedNumerator: Number((contribution.target * contribution.weight).toFixed(3)), baselineTarget: baseline.value, finalTarget: Number(value.toFixed(3)), targetDelta: Number((contribution.weight * (contribution.target - baseline.value) / totalWeight).toFixed(6)),
      }));
    });
    const effects = [...effectsByPreference.values()];
    const ranked = items.map((item) => {
      const failedConstraints = hardConstraints.filter((constraint) => !constraint.test(item));
      const components = Object.entries(profile).map(([dimension, config]) => ({ dimension, target: Number(config.value.toFixed(1)), weight: Number(config.weight.toFixed(2)), distance: Math.abs(normalize(item.attributes[dimension]) - normalize(config.value)), score: Number((Math.abs(normalize(item.attributes[dimension]) - normalize(config.value)) * config.weight).toFixed(2)) }));
      return { item, eligible: failedConstraints.length === 0, failedConstraints: failedConstraints.map((constraint) => constraint.id), totalScore: Number(components.reduce((sum, component) => sum + component.score, 0).toFixed(2)), components, effects };
    }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.totalScore - b.totalScore || a.item.name.localeCompare(b.item.name));
    return { profile, effects, all: ranked, results: ranked.filter((entry) => entry.eligible).slice(0, limit) };
  };
  globalThis.DecisionEngine = Object.freeze({ rank });
})();
