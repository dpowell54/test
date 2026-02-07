function groupBy(list, keyFn) {
  return list.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

async function getDecisionsInRange(days) {
  const end = Date.now();
  const start = end - days * 24 * 60 * 60 * 1000;
  return dbApi.listDecisions({ start, end });
}

function computeRegretRates(decisions) {
  const totals = decisions.length;
  const regrets = decisions.filter((d) => d.outcome === "Regret").length;
  const byType = groupBy(decisions, (d) => d.type);
  const byTypeStats = Object.entries(byType).map(([type, list]) => ({
    type,
    total: list.length,
    regrets: list.filter((d) => d.outcome === "Regret").length,
    regretRate: percent(list.filter((d) => d.outcome === "Regret").length, list.length),
  }));
  return {
    total: totals,
    regrets,
    regretRate: percent(regrets, totals),
    byType: byTypeStats,
  };
}

function computeRiskWindows(decisions, { minSamples = 6, regretThreshold = 60 } = {}) {
  const hourBuckets = Array.from({ length: 24 }, () => ({ total: 0, regrets: 0 }));
  decisions.forEach((d) => {
    if (d.hour !== undefined) {
      hourBuckets[d.hour].total += 1;
      if (d.outcome === "Regret") {
        hourBuckets[d.hour].regrets += 1;
      }
    }
  });

  const riskyHours = hourBuckets
    .map((bucket, hour) => ({
      hour,
      total: bucket.total,
      regretRate: percent(bucket.regrets, bucket.total),
      isRisky: bucket.total >= minSamples && percent(bucket.regrets, bucket.total) >= regretThreshold,
    }))
    .filter((item) => item.isRisky);

  const windows = [];
  riskyHours.sort((a, b) => a.hour - b.hour);
  riskyHours.forEach((item) => {
    const last = windows[windows.length - 1];
    if (!last || item.hour !== last.end + 1) {
      windows.push({ start: item.hour, end: item.hour, total: item.total, regretRate: item.regretRate });
    } else {
      last.end = item.hour;
    }
  });

  return { hourBuckets, windows };
}

function computeMoodEnergyPatterns(decisions) {
  const buckets = {};
  decisions.forEach((d) => {
    const mood = d.mood || 0;
    const energy = d.energy || 0;
    if (!mood || !energy) return;
    const key = `${mood}-${energy}`;
    if (!buckets[key]) {
      buckets[key] = { mood, energy, total: 0, regrets: 0 };
    }
    buckets[key].total += 1;
    if (d.outcome === "Regret") buckets[key].regrets += 1;
  });
  return Object.values(buckets)
    .filter((item) => item.total >= 3)
    .map((item) => ({
      ...item,
      regretRate: percent(item.regrets, item.total),
    }))
    .sort((a, b) => b.regretRate - a.regretRate);
}

function computeNextDayCorrelation(decisions, checkins) {
  const checkinMap = new Map(checkins.map((c) => [c.date, c]));
  const byDate = groupBy(decisions, (d) => d.date);
  const results = [];

  Object.entries(byDate).forEach(([date, list]) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const key = nextDate.toISOString().slice(0, 10);
    const nextCheckin = checkinMap.get(key);
    if (!nextCheckin) return;
    const goodTypes = list.filter((d) => d.outcome === "Good");
    if (!goodTypes.length) return;
    goodTypes.forEach((item) => {
      results.push({
        type: item.type,
        nextMood: nextCheckin.mood,
        nextEnergy: nextCheckin.energy,
      });
    });
  });

  const grouped = groupBy(results, (item) => item.type);
  return Object.entries(grouped).map(([type, list]) => ({
    type,
    avgMood: Math.round(list.reduce((sum, item) => sum + (item.nextMood || 0), 0) / list.length),
    avgEnergy: Math.round(list.reduce((sum, item) => sum + (item.nextEnergy || 0), 0) / list.length),
  }));
}

window.insightsApi = {
  getDecisionsInRange,
  computeRegretRates,
  computeRiskWindows,
  computeMoodEnergyPatterns,
  computeNextDayCorrelation,
};
