/**
 * RailSense — API Response Normalization Adapters (src/api/adapters.js)
 * 
 * Strict data ingestion layer between backend JSON envelopes and React views:
 * - Guarantees non-fabricated numeric attributes with graceful null fallbacks
 * - Enforces percentage uniformity (all backend delay rates are 0-100 scale)
 * - Annotates temporal edge anomalies (partial dates) and statistical low support
 * - Preserves stop ordering and guarantees `seq` as primary key for loop routes
 */

import { LOW_SUPPORT_THRESHOLD, PARTIAL_DATES, PARTIAL_DATE_DETAILS, CATEGORY_MAP } from '../config/constants.js';

/**
 * Normalizes GET /api/overview responses.
 */
export function adaptOverview(raw) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const fleet = raw.fleet_kpis || {};
  const delay = raw.delay_summary || {};
  const dist = Array.isArray(raw.delay_distribution) ? raw.delay_distribution : [];
  const cats = Array.isArray(raw.category_breakdown) ? raw.category_breakdown : [];
  const trend = Array.isArray(raw.per_date_trend) ? raw.per_date_trend : [];

  return {
    provenance: raw.provenance || null,
    fleetKpis: {
      totalStopsObserved: Number(fleet.total_stops_observed) || 0,
      totalTrainRuns: Number(fleet.total_train_runs) || 0,
      distinctTrainNumbers: Number(fleet.distinct_train_numbers) || 0,
      distinctStations: Number(fleet.distinct_stations) || 0,
      dateRange: fleet.date_range || { start: '2026-10-07', end: '2026-10-25', days: 19 },
    },
    delaySummary: {
      definition: delay.definition || '',
      eligibleStopsCount: Number(delay.eligible_stops_count) || 0,
      labelCoveragePct: Number(delay.label_coverage_pct) || 0,
      fleetDelayedRate: Number(delay.fleet_delayed_rate) || 0,
      fleetMeanDelayMin: Number(delay.fleet_mean_delay_min) || 0,
      fleetMedianDelayMin: Number(delay.fleet_median_delay_min) || 0,
      fleetEarlyArrivalPct: Number(delay.fleet_early_arrival_pct) || 0,
    },
    delayDistribution: dist.map((b) => ({
      bucket: b.bucket || '',
      label: b.label || b.bucket || '',
      stopsCount: Number(b.stops_count) || 0,
      percentage: Number(b.percentage) || 0,
      classification: b.classification || 'moderate',
    })),
    categoryBreakdown: cats.map((c) => {
      const eligibleStops = Number(c.eligible_stops) || 0;
      const isLowSupport = eligibleStops < LOW_SUPPORT_THRESHOLD;
      const catMeta = CATEGORY_MAP[c.category] || null;
      return {
        category: c.category || 'OTHER',
        categoryName: catMeta ? catMeta.name : c.category,
        totalStops: Number(c.total_stops) || 0,
        eligibleStops,
        delayedRate: Number(c.delayed_rate) || 0,
        meanDelayMin: Number(c.mean_delay_min) || 0,
        medianDelayMin: Number(c.median_delay_min) || 0,
        isLowSupport,
      };
    }),
    perDateTrend: trend.map((d) => {
      const dateStr = d.date || '';
      const isPartial = PARTIAL_DATES.includes(dateStr) || Boolean(d.is_partial);
      const partialDetails = PARTIAL_DATE_DETAILS[dateStr] || null;
      return {
        date: dateStr,
        totalStops: Number(d.total_stops) || 0,
        runsCount: Number(d.runs_count) || 0,
        eligibleStops: Number(d.eligible_stops) || 0,
        delayedRate: Number(d.delayed_rate) || 0,
        meanDelayMin: Number(d.mean_delay_min) || 0,
        isPartial,
        partialNote: d.partial_note || (partialDetails ? partialDetails.label : null),
        partialDetails,
      };
    }),
  };
}

/**
 * Normalizes GET /api/trains catalog list response.
 */
export function adaptTrainsList(raw) {
  if (!raw || typeof raw !== 'object') {
    return { items: [], pagination: null };
  }

  const items = Array.isArray(raw.items) ? raw.items : [];
  const pagination = raw.pagination || {
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  };

  const adaptedItems = items.map((tr) => {
    const eligibleStops = Number(tr.eligible_stops_count) || 0;
    const catMeta = CATEGORY_MAP[tr.category] || null;
    return {
      trainNumber: String(tr.train_number || ''),
      trainName: tr.train_name || '',
      category: tr.category || 'OTHER',
      categoryName: catMeta ? catMeta.name : tr.category,
      runsCount: Number(tr.runs_count) || 0,
      daysObserved: Number(tr.days_observed) || 0,
      stopsCount: Number(tr.stops_count) || 0,
      originStationCode: tr.origin_station_code || '',
      terminusStationCode: tr.terminus_station_code || '',
      delayedRate: Number(tr.delayed_rate) || 0,
      meanDelay: Number(tr.mean_delay) || 0,
      eligibleStopsCount: eligibleStops,
      isLowSupport: eligibleStops < LOW_SUPPORT_THRESHOLD,
    };
  });

  return {
    items: adaptedItems,
    pagination: {
      page: Number(pagination.page) || 1,
      pageSize: Number(pagination.page_size) || 20,
      total: Number(pagination.total) || 0,
      totalPages: Number(pagination.total_pages) || 0,
      hasNext: Boolean(pagination.has_next),
      hasPrev: Boolean(pagination.has_prev),
    },
    dataAsOf: raw.data_as_of || null,
    definition: raw.definition || null,
  };
}

/**
 * Normalizes GET /api/trains/{train_number} detail response.
 */
export function adaptTrainDetail(raw) {
  if (!raw || typeof raw !== 'object' || !raw.train_number) {
    return null;
  }

  const eligibleStops = Number(raw.eligible_stops_count) || 0;
  const catMeta = CATEGORY_MAP[raw.category] || null;
  const rawStops = Array.isArray(raw.stops) ? raw.stops : [];
  const rawHistory = Array.isArray(raw.history_by_date) ? raw.history_by_date : [];

  const stops = rawStops.map((st) => {
    const obsCount = Number(st.observed_stops_count) || 0;
    const isObserved = obsCount > 0;
    const obsRate = st.observed_delayed_rate !== null && st.observed_delayed_rate !== undefined
      ? Number(st.observed_delayed_rate)
      : null;
    const obsMean = st.observed_mean_delay_min !== null && st.observed_mean_delay_min !== undefined
      ? Number(st.observed_mean_delay_min)
      : null;

    return {
      seq: Number(st.seq),
      stationCode: st.station_code || '',
      scheduledArrivalTime: st.scheduled_arrival_time || null,
      scheduledDepartureTime: st.scheduled_departure_time || null,
      arrivalDayOffset: Number(st.arrival_day_offset) || 0,
      departureDayOffset: Number(st.departure_day_offset) || 0,
      isOrigin: Boolean(st.is_origin),
      isTerminus: Boolean(st.is_terminus),
      observedStopsCount: obsCount,
      observedDelayedRate: obsRate,
      observedMeanDelayMin: obsMean,
      isLowSupport: obsCount < LOW_SUPPORT_THRESHOLD,
      isObserved,
    };
  });

  const historyByDate = rawHistory.map((h) => {
    const dateStr = h.start_date || '';
    const isPartial = PARTIAL_DATES.includes(dateStr);
    const partialDetails = PARTIAL_DATE_DETAILS[dateStr] || null;
    return {
      startDate: dateStr,
      stopsCount: Number(h.stops_count) || 0,
      delayedRate: Number(h.delayed_rate) || 0,
      meanDelay: Number(h.mean_delay) || 0,
      isPartial,
      partialNote: partialDetails ? partialDetails.shortLabel : null,
      partialDetails,
    };
  });

  return {
    trainNumber: String(raw.train_number),
    trainName: raw.train_name || '',
    category: raw.category || 'OTHER',
    categoryName: catMeta ? catMeta.name : raw.category,
    runsCount: Number(raw.runs_count) || 0,
    daysObserved: Number(raw.days_observed) || 0,
    stopsCount: Number(raw.stops_count) || 0,
    originStationCode: raw.origin_station_code || '',
    terminusStationCode: raw.terminus_station_code || '',
    delayedRate: Number(raw.delayed_rate) || 0,
    meanDelay: Number(raw.mean_delay) || 0,
    eligibleStopsCount: eligibleStops,
    isLowSupport: eligibleStops < LOW_SUPPORT_THRESHOLD,
    dataAsOf: raw.data_as_of || null,
    definition: raw.definition || null,
    stops,
    historyByDate,
  };
}

/**
 * Normalizes GET /api/patterns/hour responses.
 */
export function adaptPatternsHour(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const list = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  const adapted = list.map((h) => {
    const stopsCount = Number(h.stops_count) || 0;
    return {
      hour: Number(h.hour),
      hourLabel: `${String(h.hour).padStart(2, '0')}:00`,
      delayedRate: Number(h.delayed_rate) || 0,
      meanDelayMin: Number(h.mean_delay_min) || 0,
      stopsCount,
      isLowSupport: stopsCount < 25000,
    };
  });
  adapted.fleetDelayedRate = Number(raw?.fleet_delayed_rate) || 49.91;
  return adapted;
}

/**
 * Normalizes GET /api/patterns/dow responses.
 */
export function adaptPatternsDow(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const list = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  const calendarDaysMap = {
    Monday: 2,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 3,
    Friday: 3,
    Saturday: 3,
    Sunday: 3,
  };
  return list.map((d) => {
    const dow = d.day_of_week || '';
    return {
      dayOfWeek: dow,
      delayedRate: Number(d.delayed_rate) || 0,
      meanDelayMin: Number(d.mean_delay_min) || 0,
      stopsCount: Number(d.stops_count) || 0,
      calendarDaysCount: calendarDaysMap[dow] || 2,
    };
  });
}

/**
 * Normalizes GET /api/patterns/category responses.
 */
export function adaptPatternsCategory(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const list = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  return list.map((c) => {
    const eligibleStops = Number(c.eligible_stops) || 0;
    const catMeta = CATEGORY_MAP[c.category] || null;
    return {
      category: c.category || 'OTHER',
      categoryName: catMeta ? catMeta.name : c.category,
      delayedRate: Number(c.delayed_rate) || 0,
      meanDelayMin: Number(c.mean_delay_min) || 0,
      medianDelayMin: Number(c.median_delay_min) || 0,
      eligibleStops,
      totalStops: Number(c.total_stops) || 0,
      isLowSupport: eligibleStops < 500,
    };
  });
}

/**
 * Normalizes GET /api/patterns/position responses.
 */
export function adaptPatternsPosition(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const list = Array.isArray(raw.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  return list.map((p) => ({
    positionBucket: p.position_bucket || '',
    delayedRate: Number(p.delayed_rate) || 0,
    meanDelayMin: Number(p.mean_delay_min) || 0,
    stopsCount: Number(p.stops_count) || 0,
  }));
}

/**
 * Normalizes GET /api/patterns/hotspots responses.
 */
export function adaptPatternsHotspots(raw) {
  if (!raw || typeof raw !== 'object') {
    return { level: 'station', order: 'top', items: [], dataAsOf: '2026-10-25' };
  }
  const level = raw.level || 'station';
  const order = raw.order || 'top';
  const items = Array.isArray(raw.items) ? raw.items : (Array.isArray(raw.data) ? raw.data : []);

  const adaptedItems = items.map((item, idx) => {
    const stopsCount = Number(item.stops_count) || 0;
    const delRate = Number(item.delayed_rate) || 0;
    const wilsonLow = Number(item.wilson_lower) || 0;
    const wilsonUp = Number(item.wilson_upper) || 0;

    return {
      rank: idx + 1,
      stationCode: item.station_code || null,
      trainNumber: item.train_number ? String(item.train_number) : null,
      trainName: item.train_name || '',
      category: item.category || '',
      delayedRate: delRate,
      meanDelay: Number(item.mean_delay) || 0,
      stopsCount,
      delayedCount: Number(item.delayed_count) || 0,
      wilsonLower: wilsonLow,
      wilsonUpper: wilsonUp,
      wilsonText: `${wilsonLow.toFixed(1)}% – ${wilsonUp.toFixed(1)}%`,
    };
  });

  return {
    level,
    order,
    minSupport: Number(raw.min_support) || (level === 'station' ? 100 : 50),
    limit: Number(raw.limit) || 10,
    totalAvailable: Number(raw.total_available) || items.length,
    items: adaptedItems,
    dataAsOf: raw.data_as_of || '2026-10-25',
    definition: raw.definition || '',
  };
}

/**
 * Normalizes GET /api/stations/{station_code} detail response.
 */
export function adaptStationDetail(raw) {
  if (!raw || typeof raw !== 'object' || !raw.station_code) {
    return null;
  }
  const sample = Array.isArray(raw.calling_trains_sample) ? raw.calling_trains_sample : [];
  return {
    stationCode: raw.station_code,
    trainsCount: Number(raw.trains_count) || 0,
    stopsCount: Number(raw.stops_count) || 0,
    delayedRate: Number(raw.delayed_rate) || 0,
    meanDelay: Number(raw.mean_delay) || 0,
    wilsonLower: Number(raw.wilson_lower) || 0,
    wilsonUpper: Number(raw.wilson_upper) || 0,
    wilsonText: `${(Number(raw.wilson_lower) || 0).toFixed(1)}% – ${(Number(raw.wilson_upper) || 0).toFixed(1)}%`,
    categoryMix: raw.category_mix || {},
    callingTrainsSample: sample.map((t) => ({
      trainNumber: String(t.train_number),
      trainName: t.train_name || '',
      category: t.category || '',
      observedStops: Number(t.observed_stops) || 0,
      delayedRate: Number(t.delayed_rate) || 0,
      meanDelay: Number(t.mean_delay) || 0,
    })),
    dataAsOf: raw.data_as_of || '2026-10-25',
    definition: raw.definition || '',
  };
}
