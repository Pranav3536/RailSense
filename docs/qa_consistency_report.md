# RailSense — Independent Data-Consistency QA Report

> **Execution Date:** 2026-10-30T21:40:54.453432  
> **Methodology:** Complete ground-up recomputation from raw Parquet cache (`backend/data_cache/`, 19 days, 2,805,574 rows).  
> **Zero Function Reuse:** Code in `backend/scripts/qa_consistency.py` does not import or share code with `build_serving_data.py`.  
> **Total Checks:** 211 | **Passed:** 211 | **Failed:** 0

---

## 1. Executive Summary

| Verification Section | Total Checks | Passed | Failed | Status |
| :--- | :---: | :---: | :---: | :---: |
| `overview_kpis` | 9 | 9 | 0 | **PASS** |
| `delay_distribution_8tiers` | 8 | 8 | 0 | **PASS** |
| `patterns_hourly` | 72 | 72 | 0 | **PASS** |
| `patterns_dow` | 14 | 14 | 0 | **PASS** |
| `patterns_position` | 10 | 10 | 0 | **PASS** |
| `hotspots_stations` | 2 | 2 | 0 | **PASS** |
| `train_consistency` | 20 | 20 | 0 | **PASS** |
| `station_consistency` | 25 | 25 | 0 | **PASS** |
| `model_lab_benchmarks` | 5 | 5 | 0 | **PASS** |
| `predict_offline` | 40 | 40 | 0 | **PASS** |
| `stale_values_frontend_src` | 6 | 6 | 0 | **PASS** |

---

## 2. Detailed Verification Tables

### Section: `overview_kpis`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `total_records` | **PASS** | `2805574` | `2805574` | `exact` |
| `distinct_train_numbers` | **PASS** | `10743` | `10743` | `exact` |
| `distinct_stations` | **PASS** | `8584` | `8584` | `exact` |
| `total_runs` | **PASS** | `147367` | `147367` | `exact` |
| `eligible_stops_count` | **PASS** | `1773068` | `1773068` | `exact` |
| `fleet_delayed_rate` | **PASS** | `49.91` | `49.91` | `0.1` |
| `fleet_mean_delay_min` | **PASS** | `38.1` | `38.1` | `0.2` |
| `fleet_median_delay_min` | **PASS** | `15.0` | `15.0` | `0.1` |
| `fleet_early_arrival_pct` | **PASS** | `8.56` | `8.56` | `0.1` |

### Section: `delay_distribution_8tiers`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `tier_<-30_count` | **PASS** | `7010` | `7010` | `exact` |
| `tier_-30..-5_count` | **PASS** | `69678` | `69678` | `exact` |
| `tier_-5..5_count` | **PASS** | `404190` | `404190` | `exact` |
| `tier_5..15_count` | **PASS** | `407232` | `407232` | `exact` |
| `tier_15..30_count` | **PASS** | `323363` | `323363` | `exact` |
| `tier_30..60_count` | **PASS** | `263620` | `263620` | `exact` |
| `tier_60..180_count` | **PASS** | `226138` | `226138` | `exact` |
| `tier_>180_count` | **PASS** | `71837` | `71837` | `exact` |

### Section: `patterns_hourly`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `hour_0_count` | **PASS** | `39906` | `39906` | `exact` |
| `hour_0_delayed_rate` | **PASS** | `57.7` | `57.7` | `0.2` |
| `hour_0_mean_delay` | **PASS** | `49.1` | `49.1` | `0.5` |
| `hour_1_count` | **PASS** | `33417` | `33417` | `exact` |
| `hour_1_delayed_rate` | **PASS** | `60.6` | `60.6` | `0.2` |
| `hour_1_mean_delay` | **PASS** | `53.0` | `53.0` | `0.5` |
| `hour_2_count` | **PASS** | `33340` | `33340` | `exact` |
| `hour_2_delayed_rate` | **PASS** | `62.2` | `62.2` | `0.2` |
| `hour_2_mean_delay` | **PASS** | `56.7` | `56.7` | `0.5` |
| `hour_3_count` | **PASS** | `37071` | `37071` | `exact` |
| `hour_3_delayed_rate` | **PASS** | `56.4` | `56.5` | `0.2` |
| `hour_3_mean_delay` | **PASS** | `50.4` | `50.4` | `0.5` |
| `hour_4_count` | **PASS** | `50636` | `50636` | `exact` |
| `hour_4_delayed_rate` | **PASS** | `47.2` | `47.2` | `0.2` |
| `hour_4_mean_delay` | **PASS** | `41.6` | `41.6` | `0.5` |
| `hour_5_count` | **PASS** | `73244` | `73244` | `exact` |
| `hour_5_delayed_rate` | **PASS** | `41.8` | `41.8` | `0.2` |
| `hour_5_mean_delay` | **PASS** | `33.4` | `33.4` | `0.5` |
| `hour_6_count` | **PASS** | `91762` | `91762` | `exact` |
| `hour_6_delayed_rate` | **PASS** | `42.2` | `42.2` | `0.2` |
| `hour_6_mean_delay` | **PASS** | `30.8` | `30.8` | `0.5` |
| `hour_7_count` | **PASS** | `107943` | `107943` | `exact` |
| `hour_7_delayed_rate` | **PASS** | `44.4` | `44.4` | `0.2` |
| `hour_7_mean_delay` | **PASS** | `29.9` | `29.9` | `0.5` |
| `hour_8_count` | **PASS** | `108445` | `108445` | `exact` |
| `hour_8_delayed_rate` | **PASS** | `46.8` | `46.8` | `0.2` |
| `hour_8_mean_delay` | **PASS** | `31.1` | `31.1` | `0.5` |
| `hour_9_count` | **PASS** | `99283` | `99283` | `exact` |
| `hour_9_delayed_rate` | **PASS** | `47.9` | `47.9` | `0.2` |
| `hour_9_mean_delay` | **PASS** | `33.1` | `33.0` | `0.5` |
| `hour_10_count` | **PASS** | `88365` | `88365` | `exact` |
| `hour_10_delayed_rate` | **PASS** | `50.3` | `50.3` | `0.2` |
| `hour_10_mean_delay` | **PASS** | `36.5` | `36.5` | `0.5` |
| `hour_11_count` | **PASS** | `76290` | `76290` | `exact` |
| `hour_11_delayed_rate` | **PASS** | `51.0` | `51.0` | `0.2` |
| `hour_11_mean_delay` | **PASS** | `37.7` | `37.7` | `0.5` |
| `hour_12_count` | **PASS** | `68041` | `68041` | `exact` |
| `hour_12_delayed_rate` | **PASS** | `49.2` | `49.1` | `0.2` |
| `hour_12_mean_delay` | **PASS** | `39.2` | `39.2` | `0.5` |
| `hour_13_count` | **PASS** | `63944` | `63944` | `exact` |
| `hour_13_delayed_rate` | **PASS** | `49.0` | `49.0` | `0.2` |
| `hour_13_mean_delay` | **PASS** | `39.3` | `39.3` | `0.5` |
| `hour_14_count` | **PASS** | `66573` | `66573` | `exact` |
| `hour_14_delayed_rate` | **PASS** | `49.6` | `49.6` | `0.2` |
| `hour_14_mean_delay` | **PASS** | `39.5` | `39.5` | `0.5` |
| `hour_15_count` | **PASS** | `76106` | `76106` | `exact` |
| `hour_15_delayed_rate` | **PASS** | `49.6` | `49.6` | `0.2` |
| `hour_15_mean_delay` | **PASS** | `39.1` | `39.1` | `0.5` |
| `hour_16_count` | **PASS** | `82291` | `82291` | `exact` |
| `hour_16_delayed_rate` | **PASS** | `48.4` | `48.4` | `0.2` |
| `hour_16_mean_delay` | **PASS** | `38.8` | `38.8` | `0.5` |
| `hour_17_count` | **PASS** | `88379` | `88379` | `exact` |
| `hour_17_delayed_rate` | **PASS** | `48.8` | `48.8` | `0.2` |
| `hour_17_mean_delay` | **PASS** | `37.3` | `37.3` | `0.5` |
| `hour_18_count` | **PASS** | `101443` | `101443` | `exact` |
| `hour_18_delayed_rate` | **PASS** | `50.4` | `50.4` | `0.2` |
| `hour_18_mean_delay` | **PASS** | `37.0` | `37.0` | `0.5` |
| `hour_19_count` | **PASS** | `101988` | `101988` | `exact` |
| `hour_19_delayed_rate` | **PASS** | `54.6` | `54.6` | `0.2` |
| `hour_19_mean_delay` | **PASS** | `40.9` | `40.9` | `0.5` |
| `hour_20_count` | **PASS** | `90696` | `90696` | `exact` |
| `hour_20_delayed_rate` | **PASS** | `54.6` | `54.6` | `0.2` |
| `hour_20_mean_delay` | **PASS** | `42.6` | `42.6` | `0.5` |
| `hour_21_count` | **PASS** | `79138` | `79138` | `exact` |
| `hour_21_delayed_rate` | **PASS** | `53.0` | `53.0` | `0.2` |
| `hour_21_mean_delay` | **PASS** | `42.0` | `42.0` | `0.5` |
| `hour_22_count` | **PASS** | `64044` | `64044` | `exact` |
| `hour_22_delayed_rate` | **PASS** | `52.5` | `52.5` | `0.2` |
| `hour_22_mean_delay` | **PASS** | `43.6` | `43.6` | `0.5` |
| `hour_23_count` | **PASS** | `50723` | `50723` | `exact` |
| `hour_23_delayed_rate` | **PASS** | `53.1` | `53.1` | `0.2` |
| `hour_23_mean_delay` | **PASS** | `30.4` | `30.4` | `0.5` |

### Section: `patterns_dow`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `dow_Monday_count` | **PASS** | `204875` | `204875` | `exact` |
| `dow_Monday_delayed_rate` | **PASS** | `49.6` | `49.6` | `0.2` |
| `dow_Tuesday_count` | **PASS** | `202913` | `202913` | `exact` |
| `dow_Tuesday_delayed_rate` | **PASS** | `48.4` | `48.4` | `0.2` |
| `dow_Wednesday_count` | **PASS** | `212368` | `212368` | `exact` |
| `dow_Wednesday_delayed_rate` | **PASS** | `49.6` | `49.6` | `0.2` |
| `dow_Thursday_count` | **PASS** | `288063` | `288063` | `exact` |
| `dow_Thursday_delayed_rate` | **PASS** | `49.6` | `49.6` | `0.2` |
| `dow_Friday_count` | **PASS** | `300846` | `300846` | `exact` |
| `dow_Friday_delayed_rate` | **PASS** | `51.0` | `51.0` | `0.2` |
| `dow_Saturday_count` | **PASS** | `297236` | `297236` | `exact` |
| `dow_Saturday_delayed_rate` | **PASS** | `51.0` | `51.0` | `0.2` |
| `dow_Sunday_count` | **PASS** | `266767` | `266767` | `exact` |
| `dow_Sunday_delayed_rate` | **PASS** | `49.4` | `49.4` | `0.2` |

### Section: `patterns_position`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `pos_Deep (>50)_count` | **PASS** | `32197` | `32197` | `exact` |
| `pos_Deep (>50)_delayed_rate` | **PASS** | `77.3` | `77.2` | `0.2` |
| `pos_Early (2-3)_count` | **PASS** | `185293` | `185293` | `exact` |
| `pos_Early (2-3)_delayed_rate` | **PASS** | `26.3` | `26.3` | `0.2` |
| `pos_Late (26-50)_count` | **PASS** | `238778` | `238778` | `exact` |
| `pos_Late (26-50)_delayed_rate` | **PASS** | `64.8` | `64.8` | `0.2` |
| `pos_Mid (11-25)_count` | **PASS** | `719558` | `719558` | `exact` |
| `pos_Mid (11-25)_delayed_rate` | **PASS** | `54.5` | `54.5` | `0.2` |
| `pos_Mid-Early (4-10)_count` | **PASS** | `597242` | `597242` | `exact` |
| `pos_Mid-Early (4-10)_delayed_rate` | **PASS** | `44.3` | `44.3` | `0.2` |

### Section: `hotspots_stations`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `top1_station_code` | **PASS** | `BTL` | `BTL` | `exact` |
| `top1_station_stops` | **PASS** | `191` | `191` | `exact` |

### Section: `train_consistency`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `train_02542_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_02543_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_02549_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_02550_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_06173_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00112_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00131_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00132_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00432_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00434_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00461_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00462_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00909_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00910_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00961_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_00962_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_01023_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_01024_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_01143_name_present` | **PASS** | `True` | `True` | `exact` |
| `train_01144_name_present` | **PASS** | `True` | `True` | `exact` |

### Section: `station_consistency`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `station_DDJ_delayed_rate` | **PASS** | `14.6` | `14.6` | `0.5` |
| `station_SDAH_delayed_rate` | **PASS** | `5.8` | `5.8` | `0.5` |
| `station_KYN_delayed_rate` | **PASS** | `55.8` | `55.8` | `0.5` |
| `station_HWH_delayed_rate` | **PASS** | `15.6` | `15.6` | `0.5` |
| `station_LLH_delayed_rate` | **PASS** | `20.0` | `20.0` | `0.5` |
| `station_BEQ_delayed_rate` | **PASS** | `18.8` | `18.8` | `0.5` |
| `station_SRP_delayed_rate` | **PASS** | `18.3` | `18.3` | `0.5` |
| `station_SHE_delayed_rate` | **PASS** | `16.5` | `16.5` | `0.5` |
| `station_MS_delayed_rate` | **PASS** | `4.9` | `4.9` | `0.5` |
| `station_BDC_delayed_rate` | **PASS** | `15.7` | `15.8` | `0.5` |
| `station_UPA_delayed_rate` | **PASS** | `14.4` | `14.4` | `0.5` |
| `station_KOG_delayed_rate` | **PASS** | `14.8` | `14.8` | `0.5` |
| `station_RIS_delayed_rate` | **PASS** | `16.2` | `16.2` | `0.5` |
| `station_BLY_delayed_rate` | **PASS** | `16.4` | `16.4` | `0.5` |
| `station_TBM_delayed_rate` | **PASS** | `12.7` | `12.7` | `0.5` |
| `station_SPR_delayed_rate` | **PASS** | `1.3` | `1.3` | `0.5` |
| `station_SEP_delayed_rate` | **PASS** | `21.2` | `21.2` | `0.5` |
| `station_BLH_delayed_rate` | **PASS** | `23.6` | `23.6` | `0.5` |
| `station_MPK_delayed_rate` | **PASS** | `2.6` | `2.6` | `0.5` |
| `station_AVD_delayed_rate` | **PASS** | `16.4` | `16.4` | `0.5` |
| `station_STM_delayed_rate` | **PASS** | `1.3` | `1.3` | `0.5` |
| `station_PV_delayed_rate` | **PASS** | `1.1` | `1.1` | `0.5` |
| `station_MKK_delayed_rate` | **PASS** | `1.0` | `0.9` | `0.5` |
| `station_CNB_delayed_rate` | **PASS** | `54.3` | `54.3` | `0.5` |
| `station_TGH_delayed_rate` | **PASS** | `21.2` | `21.2` | `0.5` |

### Section: `model_lab_benchmarks`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `majority_test_ap` | **PASS** | `0.492` | `0.492` | `0.001` |
| `category_prior_test_ap` | **PASS** | `0.5972` | `0.5972` | `0.001` |
| `train_history_test_ap` | **PASS** | `0.8082` | `0.8082` | `0.001` |
| `lightgbm_test_ap` | **PASS** | `0.8482` | `0.8482` | `0.001` |
| `en_route_test_ap` | **PASS** | `0.9289` | `0.9289` | `0.001` |

### Section: `predict_offline`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `predict_71405_KDG_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_71405_KDG_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_12968_BPQ_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_12968_BPQ_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_77213_PKD_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_77213_PKD_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_12809_NN_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_12809_NN_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_69212_BLDK_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_69212_BLDK_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_18236_DMO_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_18236_DMO_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_12036_BRY_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_12036_BRY_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_19343_RCJ_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_19343_RCJ_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_03288_BXR_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_03288_BXR_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_74603_TTO_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_74603_TTO_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_22651_POY_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_22651_POY_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_14733_BNW_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_14733_BNW_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_64171_CPA_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_64171_CPA_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_12498_JUC_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_12498_JUC_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_37257_RIS_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_37257_RIS_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_19207_PLM_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_19207_PLM_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_15910_MNE_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_15910_MNE_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_20676_MYA_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_20676_MYA_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_18420_VSU_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_18420_VSU_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |
| `predict_64074_PWL_prob_valid` | **PASS** | `True` | `True` | `exact` |
| `predict_64074_PWL_threshold` | **PASS** | `0.41` | `0.41` | `0.001` |

### Section: `stale_values_frontend_src`

| Check Name | Status | Expected | Actual | Tolerance |
| :--- | :---: | :--- | :--- | :---: |
| `stale_threshold_0.420_absent` | **PASS** | `True` | `True` | `exact` |
| `stale_ap_0.8525_absent` | **PASS** | `True` | `True` | `exact` |
| `stale_confusion_tn_absent` | **PASS** | `True` | `True` | `exact` |
| `stale_confusion_tp_absent` | **PASS** | `True` | `True` | `exact` |
| `stale_rss_4.20mb_absent` | **PASS** | `True` | `True` | `exact` |
| `stale_tab_label_absent` | **PASS** | `True` | `True` | `exact` |

