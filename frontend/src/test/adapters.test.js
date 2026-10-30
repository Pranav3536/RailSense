import { describe, it, expect } from 'vitest';
import { adaptOverview, adaptTrainsList, adaptTrainDetail } from '../api/adapters.js';

describe('adapters.js unit tests', () => {
  describe('adaptOverview', () => {
    it('handles null/undefined gracefully', () => {
      expect(adaptOverview(null)).toBeNull();
      expect(adaptOverview(undefined)).toBeNull();
    });

    it('adapts a valid overview response', () => {
      const mockRaw = {
        provenance: { row_count: 2805574 },
        fleet_kpis: {
          total_stops_observed: 2805574,
          total_train_runs: 147367,
          distinct_train_numbers: 10743,
          distinct_stations: 8584,
          date_range: { start: '2026-10-07', end: '2026-10-25', days: 19 },
        },
        delay_summary: {
          definition: 'Delay test',
          eligible_stops_count: 1773068,
          label_coverage_pct: 63.2,
          fleet_delayed_rate: 49.91,
          fleet_mean_delay_min: 38.1,
          fleet_median_delay_min: 15.0,
          fleet_early_arrival_pct: 8.56,
        },
        delay_distribution: [
          { bucket: '<-30', label: 'Early (>30m)', stops_count: 7010, percentage: 0.4, classification: 'early' },
        ],
        category_breakdown: [
          { category: 'MEX', total_stops: 571895, eligible_stops: 571895, delayed_rate: 57.02, mean_delay_min: 44.5, median_delay_min: 22.0 },
          { category: 'TRST', total_stops: 40, eligible_stops: 20, delayed_rate: 60.0, mean_delay_min: 30.0, median_delay_min: 15.0 },
        ],
        per_date_trend: [
          { date: '2026-10-07', total_stops: 1000, runs_count: 50, eligible_stops: 800, delayed_rate: 45.0, mean_delay_min: 30.0, is_partial: true },
          { date: '2026-10-10', total_stops: 2000, runs_count: 100, eligible_stops: 1600, delayed_rate: 48.0, mean_delay_min: 32.0, is_partial: false },
        ],
      };

      const result = adaptOverview(mockRaw);
      expect(result).not.toBeNull();
      expect(result.fleetKpis.totalStopsObserved).toBe(2805574);
      expect(result.fleetKpis.distinctStations).toBe(8584);
      expect(result.delaySummary.fleetMedianDelayMin).toBe(15.0);
      expect(result.delayDistribution).toHaveLength(1);

      // Low support check
      expect(result.categoryBreakdown[0].isLowSupport).toBe(false);
      expect(result.categoryBreakdown[1].isLowSupport).toBe(true); // 20 < 30

      // Partial date check
      expect(result.perDateTrend[0].isPartial).toBe(true);
      expect(result.perDateTrend[1].isPartial).toBe(false);
    });
  });

  describe('adaptTrainsList', () => {
    it('handles empty input gracefully', () => {
      const res = adaptTrainsList(null);
      expect(res.items).toEqual([]);
      expect(res.pagination).toBeNull();
    });

    it('adapts items and pagination correctly', () => {
      const mockRaw = {
        items: [
          {
            train_number: '12951',
            train_name: 'NDLS TEJAS RAJ',
            category: 'RAJ',
            runs_count: 18,
            days_observed: 18,
            stops_count: 8,
            origin_station_code: 'MMCT',
            terminus_station_code: 'NDLS',
            delayed_rate: 20.49,
            mean_delay: 25.4,
            eligible_stops_count: 126,
          },
          {
            train_number: '00112',
            train_name: 'SGTY-AJNI RAPID PARCEL',
            category: 'PEXP',
            runs_count: 1,
            days_observed: 1,
            stops_count: 3,
            origin_station_code: 'SGTY',
            terminus_station_code: 'AJNI',
            delayed_rate: 0.0,
            mean_delay: 0.0,
            eligible_stops_count: 0,
          },
        ],
        pagination: {
          page: 1,
          page_size: 20,
          total: 10743,
          total_pages: 538,
          has_next: true,
          has_prev: false,
        },
      };

      const res = adaptTrainsList(mockRaw);
      expect(res.items).toHaveLength(2);
      expect(res.items[0].trainNumber).toBe('12951');
      expect(res.items[0].categoryName).toBe('Rajdhani Express');
      expect(res.items[0].isLowSupport).toBe(false);

      expect(res.items[1].isLowSupport).toBe(true); // 0 < 30
      expect(res.pagination.total).toBe(10743);
      expect(res.pagination.hasNext).toBe(true);
    });
  });

  describe('adaptTrainDetail', () => {
    it('returns null for invalid train data', () => {
      expect(adaptTrainDetail(null)).toBeNull();
      expect(adaptTrainDetail({})).toBeNull();
    });

    it('adapts train detail with stops and date history', () => {
      const mockDetail = {
        train_number: '12951',
        train_name: 'NDLS TEJAS RAJ',
        category: 'RAJ',
        runs_count: 18,
        days_observed: 18,
        stops_count: 2,
        origin_station_code: 'MMCT',
        terminus_station_code: 'NDLS',
        delayed_rate: 22.22,
        mean_delay: 31.5,
        eligible_stops_count: 36,
        stops: [
          {
            seq: 1,
            station_code: 'MMCT',
            scheduled_arrival_time: null,
            scheduled_departure_time: '17:00',
            arrival_day_offset: 0,
            departure_day_offset: 0,
            is_origin: 1,
            is_terminus: 0,
            observed_stops_count: 0,
            observed_delayed_rate: null,
            observed_mean_delay_min: null,
          },
          {
            seq: 2,
            station_code: 'BVI',
            scheduled_arrival_time: '17:20',
            scheduled_departure_time: '17:22',
            arrival_day_offset: 0,
            departure_day_offset: 0,
            is_origin: 0,
            is_terminus: 0,
            observed_stops_count: 18,
            observed_delayed_rate: 27.78,
            observed_mean_delay_min: 34.9,
          },
        ],
        history_by_date: [
          {
            start_date: '2026-10-07',
            stops_count: 7,
            delayed_rate: 0.0,
            mean_delay: 5.86,
          },
          {
            start_date: '2026-10-08',
            stops_count: 8,
            delayed_rate: 12.5,
            mean_delay: 15.2,
          },
        ],
      };

      const res = adaptTrainDetail(mockDetail);
      expect(res).not.toBeNull();
      expect(res.trainNumber).toBe('12951');
      expect(res.stops).toHaveLength(2);
      expect(res.stops[0].seq).toBe(1);
      expect(res.stops[0].observedDelayedRate).toBeNull();
      expect(res.stops[0].isLowSupport).toBe(true);

      expect(res.stops[1].seq).toBe(2);
      expect(res.stops[1].observedDelayedRate).toBe(27.78);
      expect(res.stops[1].isLowSupport).toBe(true); // 18 < 30

      expect(res.historyByDate[0].isPartial).toBe(true); // 2026-10-07
      expect(res.historyByDate[1].isPartial).toBe(false);
    });
  });
});
