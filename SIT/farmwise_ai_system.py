#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
================================================================================
🌾 FARMWISE AI — Complete Training & Inference Pipeline
================================================================================
Kaggle-compatible notebook: Train all 4 models, build decision engine,
add SHAP explainability, generate farmer-friendly recommendations.

Upload to Kaggle with dataset: vandeetshah/india-commodity-wise-mandi-dataset
================================================================================
"""

# ═════════════════════════════════════════════════════════════════════
# CELL 1: IMPORTS
# ═════════════════════════════════════════════════════════════════════

import os, json, pickle, warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (mean_absolute_error, mean_squared_error,
                             classification_report, accuracy_score, confusion_matrix)
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.model_selection import train_test_split
import xgboost as xgb

warnings.filterwarnings('ignore')
plt.style.use('seaborn-v0_8-whitegrid')
print("✅ Imports OK")

# ═════════════════════════════════════════════════════════════════════
# CELL 2: CONFIGURATION (inline — no external imports on Kaggle)
# ═════════════════════════════════════════════════════════════════════

CROP_DB = {
    'Tomato': {'maturity_days':(60,85), 'optimal_temp':(20,30), 'critical_humidity':80,
               'rain_tolerance':'low', 'price_volatility':'high', 'shelf_life_days':7,
               'spoilage_rate':0.08, 'harvest_season':['Oct','Nov','Dec','Jan','Feb','Mar'],
               'base_price':2000},
    'Wheat':  {'maturity_days':(120,150), 'optimal_temp':(15,25), 'critical_humidity':70,
               'rain_tolerance':'medium', 'price_volatility':'low', 'shelf_life_days':180,
               'spoilage_rate':0.002, 'harvest_season':['Mar','Apr','May'], 'base_price':2200},
    'Rice':   {'maturity_days':(90,150), 'optimal_temp':(20,35), 'critical_humidity':85,
               'rain_tolerance':'high', 'price_volatility':'medium', 'shelf_life_days':365,
               'spoilage_rate':0.001, 'harvest_season':['Oct','Nov','Dec'], 'base_price':2500},
    'Onion':  {'maturity_days':(100,150), 'optimal_temp':(15,30), 'critical_humidity':75,
               'rain_tolerance':'low', 'price_volatility':'very_high', 'shelf_life_days':30,
               'spoilage_rate':0.03, 'harvest_season':['Mar','Apr','May','Nov','Dec'], 'base_price':1500},
    'Potato': {'maturity_days':(75,120), 'optimal_temp':(15,25), 'critical_humidity':80,
               'rain_tolerance':'low', 'price_volatility':'medium', 'shelf_life_days':60,
               'spoilage_rate':0.015, 'harvest_season':['Jan','Feb','Mar'], 'base_price':1200},
}

PRESERVATION_DB = [
    {'action':'Cold Storage','cost':150,'effectiveness':0.90,'ext_days':30,'for':['Tomato','Potato','Onion']},
    {'action':'Solar Drying','cost':30,'effectiveness':0.70,'ext_days':90,'for':['Tomato','Onion']},
    {'action':'Hermetic Bags','cost':50,'effectiveness':0.85,'ext_days':120,'for':['Wheat','Rice']},
    {'action':'Ventilated Storage','cost':20,'effectiveness':0.60,'ext_days':15,'for':['Potato','Onion']},
    {'action':'Cool Chamber','cost':80,'effectiveness':0.75,'ext_days':10,'for':['Tomato','Potato']},
    {'action':'Jute Bags (improved)','cost':10,'effectiveness':0.40,'ext_days':20,'for':['Wheat','Rice','Onion','Potato']},
]

MARKET_DB = {
    'Azadpur_Delhi':   {'tier':1,'volume':5000,'transit_hrs':8,'premium':1.15},
    'Vashi_Mumbai':    {'tier':1,'volume':4500,'transit_hrs':12,'premium':1.12},
    'Madanapalli':     {'tier':2,'volume':2000,'transit_hrs':4,'premium':1.05},
    'Kolar':           {'tier':2,'volume':1800,'transit_hrs':3,'premium':1.03},
    'Lasalgaon':       {'tier':2,'volume':3000,'transit_hrs':6,'premium':1.08},
    'Local_Mandi':     {'tier':3,'volume':500,'transit_hrs':1,'premium':1.00},
}

RAIN_PROB = {1:0.05,2:0.08,3:0.10,4:0.12,5:0.15,6:0.45,7:0.65,8:0.60,9:0.50,10:0.25,11:0.10,12:0.05}
HUM_RANGE = {1:(50,70),2:(45,65),3:(40,60),4:(35,55),5:(40,65),6:(60,85),7:(70,95),8:(75,95),9:(65,90),10:(55,80),11:(50,75),12:(50,70)}
TEMP_BASE = {1:15,2:18,3:25,4:32,5:36,6:34,7:30,8:29,9:29,10:27,11:22,12:17}

print("✅ Config loaded | Crops:", list(CROP_DB.keys()))


# ═════════════════════════════════════════════════════════════════════
# CELL 3: DATA LOADING — MANDI PRICES
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("📂 STEP 1: LOAD MANDI PRICE DATA")
print("="*65)

import kagglehub
DATA_DIR = kagglehub.dataset_download("vandeetshah/india-commodity-wise-mandi-dataset")
print(f"📂 Dataset path: {DATA_DIR}")
COMMODITY = 'Tomato'

commodity_file = os.path.join(DATA_DIR, f'{COMMODITY}.csv')
# Case-insensitive fallback
if not os.path.exists(commodity_file):
    for f in os.listdir(DATA_DIR):
        if f.lower() == f'{COMMODITY.lower()}.csv':
            commodity_file = os.path.join(DATA_DIR, f); break

df_raw = pd.read_csv(commodity_file)
print(f"✅ Loaded {COMMODITY}: {df_raw.shape[0]:,} rows")

# Preprocessing
df = df_raw.copy()
date_col = [c for c in df.columns if 'date' in c.lower()][0]
df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')
df = df.dropna(subset=[date_col]).rename(columns={date_col:'Date'})

# Pick market with most data
market_counts = df['Market Name'].value_counts()
SELECTED_MARKET = market_counts.index[0]
df = df[df['Market Name'] == SELECTED_MARKET].sort_values('Date').reset_index(drop=True)

# Target
TARGET = 'Modal Price (Rs./Quintal)'
df = df.dropna(subset=[TARGET])
for c in ['Min Price (Rs./Quintal)','Max Price (Rs./Quintal)',TARGET]:
    if c in df.columns: df[c] = df[c].ffill().bfill()

# Remove outliers & aggregate daily
df = df[(df[TARGET] > 0) & (df[TARGET] <= df[TARGET].quantile(0.99))]
num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
df_daily = df.groupby('Date')[num_cols].mean().reset_index().sort_values('Date').reset_index(drop=True)

print(f"✅ Market: {SELECTED_MARKET} | {len(df_daily):,} daily records")
print(f"   Date range: {df_daily['Date'].min().date()} → {df_daily['Date'].max().date()}")


# ═════════════════════════════════════════════════════════════════════
# CELL 4: FEATURE ENGINEERING — PRICE MODEL
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("⚙️ STEP 2: FEATURE ENGINEERING")
print("="*65)

df_f = df_daily[['Date', TARGET]].rename(columns={TARGET:'Price'}).copy()
if 'Arrivals (Tonnes)' in df_daily.columns:
    df_f['Arrivals'] = df_daily['Arrivals (Tonnes)'].values
if 'Min Price (Rs./Quintal)' in df_daily.columns:
    df_f['Min_Price'] = df_daily['Min Price (Rs./Quintal)'].values
if 'Max Price (Rs./Quintal)' in df_daily.columns:
    df_f['Max_Price'] = df_daily['Max Price (Rs./Quintal)'].values

# Lag features
for lag in [1,2,3,5,7,14,21,30]:
    df_f[f'lag_{lag}'] = df_f['Price'].shift(lag)

# Rolling stats (shifted to prevent leakage)
for w in [7,14,30]:
    s = df_f['Price'].shift(1)
    df_f[f'rmean_{w}'] = s.rolling(w).mean()
    df_f[f'rstd_{w}']  = s.rolling(w).std()
    df_f[f'rmin_{w}']  = s.rolling(w).min()
    df_f[f'rmax_{w}']  = s.rolling(w).max()

# Momentum & EMA
df_f['pct_1d'] = df_f['Price'].pct_change(1)
df_f['pct_7d'] = df_f['Price'].pct_change(7)
df_f['momentum'] = df_f['Price'] - df_f['Price'].shift(7)
df_f['ema_7']  = df_f['Price'].shift(1).ewm(span=7).mean()
df_f['ema_21'] = df_f['Price'].shift(1).ewm(span=21).mean()

# Spread
if 'Min_Price' in df_f.columns and 'Max_Price' in df_f.columns:
    df_f['spread'] = df_f['Max_Price'] - df_f['Min_Price']

# Calendar features
df_f['month'] = df_f['Date'].dt.month
df_f['quarter'] = df_f['Date'].dt.quarter
df_f['dow'] = df_f['Date'].dt.dayofweek
df_f['dom'] = df_f['Date'].dt.day
df_f['doy'] = df_f['Date'].dt.dayofyear
df_f['woy'] = df_f['Date'].dt.isocalendar().week.astype(int)
df_f['is_wknd'] = (df_f['dow'] >= 5).astype(int)
df_f['month_sin'] = np.sin(2*np.pi*df_f['month']/12)
df_f['month_cos'] = np.cos(2*np.pi*df_f['month']/12)
df_f['dow_sin'] = np.sin(2*np.pi*df_f['dow']/7)
df_f['dow_cos'] = np.cos(2*np.pi*df_f['dow']/7)

df_f = df_f.dropna().reset_index(drop=True)
feat_cols = [c for c in df_f.columns if c not in ['Date','Price']]
print(f"✅ Features: {len(feat_cols)} | Rows: {len(df_f):,}")


# ═════════════════════════════════════════════════════════════════════
# CELL 5: MODEL 1 — PRICE PREDICTION (XGBoost)
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🚀 STEP 3: PRICE PREDICTION MODEL (XGBoost)")
print("="*65)

split = int(len(df_f) * 0.85)
X_tr, X_va = df_f[feat_cols].iloc[:split], df_f[feat_cols].iloc[split:]
y_tr, y_va = df_f['Price'].iloc[:split], df_f['Price'].iloc[split:]

price_model = xgb.XGBRegressor(
    n_estimators=1000, max_depth=7, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8, min_child_weight=5,
    reg_alpha=0.1, reg_lambda=1.0, random_state=42,
    n_jobs=-1, early_stopping_rounds=50
)
price_model.fit(X_tr, y_tr, eval_set=[(X_va, y_va)], verbose=100)

yp_tr = price_model.predict(X_tr)
yp_va = price_model.predict(X_va)
price_mae = mean_absolute_error(y_va, yp_va)
price_rmse = np.sqrt(mean_squared_error(y_va, yp_va))
price_mape = np.mean(np.abs((y_va - yp_va)/y_va))*100

print(f"\n📊 Price Model Results:")
print(f"   Val MAE:  ₹{price_mae:.2f}")
print(f"   Val RMSE: ₹{price_rmse:.2f}")
print(f"   Val MAPE: {price_mape:.2f}%")


# ═════════════════════════════════════════════════════════════════════
# CELL 6: GENERATE MULTI-MODEL TRAINING DATA
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("📊 STEP 4: GENERATE TRAINING DATA FOR HARVEST + SPOILAGE MODELS")
print("="*65)

def gen_scenarios(n=6000, seed=42):
    np.random.seed(seed)
    rows = []
    crops = list(CROP_DB.keys())
    for _ in range(n):
        crop = np.random.choice(crops)
        ci = CROP_DB[crop]
        month = np.random.choice([datetime.strptime(m,'%b').month for m in ci['harvest_season']])
        day = np.random.randint(1,29)
        year = np.random.randint(2018,2025)

        rain_p = np.clip(RAIN_PROB[month]*100 + np.random.normal(0,15), 0, 100)
        rain_mm = max(0, np.random.exponential(RAIN_PROB[month]*30))
        hr = HUM_RANGE[month]
        hum = np.clip(np.random.uniform(hr[0],hr[1]) + np.random.normal(0,5), 20, 100)
        hum_max = min(100, hum + np.random.uniform(5,20))
        temp = TEMP_BASE[month] + np.random.normal(0,3)
        dry_days = max(0, int(7 - rain_p/15))

        m_min, m_max = ci['maturity_days']
        crop_age = np.random.randint(m_min-15, m_max+10)
        mat_pct = np.clip(crop_age/m_max*100, 50, 120)
        overripe = 1 if crop_age > m_max else 0

        vol = {'low':0.05,'medium':0.10,'high':0.15,'very_high':0.25}[ci['price_volatility']]
        p_cur = ci['base_price'] * (1 + np.random.uniform(-0.3,0.3))
        p_trend = np.random.normal(0, vol)
        p_7d = p_cur*(1+p_trend)
        p_chg = ((p_7d - p_cur)/p_cur)*100

        # Storage & transit features for spoilage
        storage_temp = np.random.uniform(5, 40)
        storage_humidity = np.clip(hum + np.random.normal(0,10), 30, 100)
        transit_hrs = np.random.choice([1,3,4,6,8,12])
        has_cold_chain = 1 if np.random.random() < 0.3 else 0

        # Spoilage probability
        temp_factor = max(0, (storage_temp - ci['optimal_temp'][1])) / 20
        hum_factor = max(0, (storage_humidity - ci['critical_humidity'])) / 30
        time_factor = transit_hrs / 24
        base_spoil = ci['spoilage_rate'] * (1 + temp_factor + hum_factor + time_factor)
        if has_cold_chain: base_spoil *= 0.3
        spoilage_pct = np.clip(base_spoil*100 + np.random.normal(0,5), 0, 100)
        spoilage_class = 'LOW' if spoilage_pct < 20 else ('MEDIUM' if spoilage_pct < 50 else 'HIGH')

        # Harvest decision
        rain_risk = rain_p/100
        hum_risk = max(0,(hum - ci['critical_humidity']))/30
        price_opp = np.clip(p_chg/10,-1,1)
        mat_ready = np.clip((crop_age-m_min)/10,-1,1)
        score = (1-rain_risk)*0.30 + (1-hum_risk)*0.15 + (0.5-price_opp)*0.25 + mat_ready*0.20 + (1-overripe*0.5)*0.10

        if overripe or (score>0.55 and rain_p<40): decision = 'HARVEST_NOW'
        elif p_chg>8 and rain_p<30 and not overripe: decision = 'WAIT'
        elif rain_p>60 or hum>ci['critical_humidity']+10: decision = 'DELAY'
        elif score>0.45: decision = 'HARVEST_NOW'
        elif p_chg>3: decision = 'WAIT'
        else: decision = 'DELAY'
        if np.random.random()<0.05: decision = np.random.choice(['HARVEST_NOW','WAIT','DELAY'])

        rows.append({
            'crop':crop, 'month':month, 'doy':datetime(year,month,day).timetuple().tm_yday,
            'rain_pct':round(rain_p,1), 'rain_mm':round(rain_mm,1),
            'humidity':round(hum,1), 'hum_max':round(hum_max,1),
            'temperature':round(temp,1), 'dry_days':dry_days,
            'crop_age':crop_age, 'maturity_pct':round(mat_pct,1),
            'days_since_mat':crop_age-m_min, 'overripe':overripe,
            'shelf_life':ci['shelf_life_days'],
            'price_cur':round(p_cur,2), 'price_7d':round(p_7d,2), 'price_chg':round(p_chg,2),
            'storage_temp':round(storage_temp,1), 'storage_hum':round(storage_humidity,1),
            'transit_hrs':transit_hrs, 'has_cold_chain':has_cold_chain,
            'spoilage_pct':round(spoilage_pct,1), 'spoilage_class':spoilage_class,
            'decision':decision,
        })
    return pd.DataFrame(rows)

df_sc = gen_scenarios(6000)
print(f"✅ Generated {len(df_sc):,} scenarios")
print(f"   Decisions: {dict(df_sc['decision'].value_counts())}")
print(f"   Spoilage:  {dict(df_sc['spoilage_class'].value_counts())}")


# ═════════════════════════════════════════════════════════════════════
# CELL 7: RISK SCORING ENGINE
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("⚠️ STEP 5: RISK SCORING ENGINE")
print("="*65)

def calc_weather_risk(rain_pct, rain_mm, dry_days, tolerance):
    mult = {'low':1.3,'medium':1.0,'high':0.7}.get(tolerance,1.0)
    r = rain_pct*0.6 + min(100,(rain_mm/50)**1.5*100)*0.25 - max(0,dry_days*5)*0.15
    return np.clip(r*mult, 0, 100)

def calc_humidity_risk(hum, hum_max, threshold):
    if hum <= threshold: ar = (hum/threshold)*30
    else: ar = 30 + (hum-threshold)**1.5*2
    sr = max(0, hum_max-85)*2
    return np.clip(ar*0.7+sr*0.3, 0, 100)

def calc_price_risk(pchg, vol):
    if pchg>5: dr = min(80, pchg*5)
    elif pchg<-5: dr = max(0, 20+pchg*2)
    else: dr = 25
    vp = {'low':0,'medium':10,'high':20,'very_high':35}.get(vol,10)
    return np.clip(dr+vp, 0, 100)

def calc_maturity_risk(mat_pct, overripe, shelf_life):
    if mat_pct<85: r = (85-mat_pct)*3
    elif mat_pct<=110: r = abs(100-mat_pct)*0.5
    else: r = 15+(mat_pct-110)*4
    if overripe: r += 25
    if shelf_life<14: r *= 1.3
    elif shelf_life>180: r *= 0.8
    return np.clip(r, 0, 100)

def composite_risk(row):
    ci = CROP_DB.get(row['crop'], CROP_DB['Tomato'])
    wr = calc_weather_risk(row['rain_pct'], row['rain_mm'], row['dry_days'], ci['rain_tolerance'])
    hr = calc_humidity_risk(row['humidity'], row['hum_max'], ci['critical_humidity'])
    pr = calc_price_risk(row['price_chg'], ci['price_volatility'])
    mr = calc_maturity_risk(row['maturity_pct'], row['overripe'], ci['shelf_life_days'])
    comp = wr*0.35 + hr*0.15 + pr*0.25 + mr*0.25
    return pd.Series({'w_risk':round(wr,1),'h_risk':round(hr,1),'p_risk':round(pr,1),
                      'm_risk':round(mr,1),'comp_risk':round(comp,1)})

risk_scores = df_sc.apply(composite_risk, axis=1)
df_sc = pd.concat([df_sc, risk_scores], axis=1)
print(f"✅ Risk scores computed | Mean risk: {df_sc['comp_risk'].mean():.1f}")


# ═════════════════════════════════════════════════════════════════════
# CELL 8: MODEL 2 — HARVEST DECISION (RandomForest)
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🌾 STEP 6: HARVEST DECISION MODEL (RandomForest)")
print("="*65)

le_crop = LabelEncoder(); df_sc['crop_enc'] = le_crop.fit_transform(df_sc['crop'])
le_tol = LabelEncoder()
df_sc['tol_enc'] = le_tol.fit_transform(df_sc['crop'].map(lambda c: CROP_DB[c]['rain_tolerance']))
le_vol = LabelEncoder()
df_sc['vol_enc'] = le_vol.fit_transform(df_sc['crop'].map(lambda c: CROP_DB[c]['price_volatility']))
le_dec = LabelEncoder(); df_sc['dec_enc'] = le_dec.fit_transform(df_sc['decision'])

harv_feats = ['rain_pct','rain_mm','humidity','hum_max','temperature','dry_days',
              'crop_age','maturity_pct','days_since_mat','overripe','shelf_life',
              'price_cur','price_7d','price_chg','month','doy',
              'comp_risk','w_risk','h_risk','p_risk','m_risk',
              'crop_enc','tol_enc','vol_enc']

Xh_tr, Xh_te, yh_tr, yh_te = train_test_split(
    df_sc[harv_feats], df_sc['dec_enc'], test_size=0.2, random_state=42, stratify=df_sc['dec_enc'])

harvest_model = RandomForestClassifier(n_estimators=300, max_depth=15, min_samples_split=10,
                                        min_samples_leaf=5, class_weight='balanced',
                                        random_state=42, n_jobs=-1)
harvest_model.fit(Xh_tr, yh_tr)
yh_pred = harvest_model.predict(Xh_te)
harv_acc = accuracy_score(yh_te, yh_pred)
print(f"✅ Harvest Model Accuracy: {harv_acc*100:.1f}%")
print(classification_report(yh_te, yh_pred, target_names=le_dec.classes_))


# ═════════════════════════════════════════════════════════════════════
# CELL 9: MODEL 3 — SPOILAGE RISK (GradientBoosting)
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🧪 STEP 7: SPOILAGE RISK MODEL (GradientBoosting)")
print("="*65)

le_spoil = LabelEncoder(); df_sc['spoil_enc'] = le_spoil.fit_transform(df_sc['spoilage_class'])

spoil_feats = ['temperature','humidity','hum_max','storage_temp','storage_hum',
               'transit_hrs','has_cold_chain','shelf_life','overripe','maturity_pct',
               'rain_pct','crop_enc']

Xs_tr, Xs_te, ys_tr, ys_te = train_test_split(
    df_sc[spoil_feats], df_sc['spoil_enc'], test_size=0.2, random_state=42, stratify=df_sc['spoil_enc'])

spoilage_model = GradientBoostingClassifier(n_estimators=200, max_depth=8, learning_rate=0.1,
                                             min_samples_split=10, random_state=42)
spoilage_model.fit(Xs_tr, ys_tr)
ys_pred = spoilage_model.predict(Xs_te)
spoil_acc = accuracy_score(ys_te, ys_pred)
print(f"✅ Spoilage Model Accuracy: {spoil_acc*100:.1f}%")
print(classification_report(ys_te, ys_pred, target_names=le_spoil.classes_))


# ═════════════════════════════════════════════════════════════════════
# CELL 10: MODEL 4 — MARKET RECOMMENDATION ENGINE
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🏪 STEP 8: MARKET RECOMMENDATION ENGINE")
print("="*65)

def rank_markets(crop, price_current, spoilage_risk_pct, quantity_quintals=10):
    """
    Rank markets by NET EXPECTED PROFIT:
      Profit = (market_price × (1 - spoilage_loss) - transport_cost) × quantity
    
    Spoilage loss increases with transit time.
    """
    ci = CROP_DB.get(crop, CROP_DB['Tomato'])
    rankings = []

    for mkt_name, mkt in MARKET_DB.items():
        # Market price estimate (premium over current price)
        est_price = price_current * mkt['premium']

        # Transit spoilage: base_rate × transit_hours × temperature_factor
        transit_spoil = ci['spoilage_rate'] * mkt['transit_hrs'] * 1.5
        if mkt['tier'] == 1: transit_spoil *= 0.8  # Better logistics for tier-1

        total_spoil = (spoilage_risk_pct/100 + transit_spoil)
        total_spoil = min(total_spoil, 0.90)  # Cap at 90%

        # Transport cost (₹/quintal, increases with distance)
        transport_cost = mkt['transit_hrs'] * 25

        # Net revenue per quintal
        sellable = 1 - total_spoil
        revenue = est_price * sellable - transport_cost
        total_profit = revenue * quantity_quintals

        rankings.append({
            'market': mkt_name,
            'tier': mkt['tier'],
            'est_price': round(est_price, 0),
            'transit_hrs': mkt['transit_hrs'],
            'transport_cost': round(transport_cost, 0),
            'spoilage_loss_pct': round(total_spoil*100, 1),
            'net_revenue_per_q': round(revenue, 0),
            'total_profit': round(total_profit, 0),
        })

    rankings.sort(key=lambda x: x['net_revenue_per_q'], reverse=True)

    # Add rank
    for i, r in enumerate(rankings):
        r['rank'] = i + 1
        r['recommended'] = i == 0

    return rankings

# Test
test_rankings = rank_markets('Tomato', 2200, 15, 10)
print("\n📊 Market Rankings for Tomato (₹2200, 15% spoilage risk):")
for r in test_rankings:
    flag = "⭐" if r['recommended'] else "  "
    print(f"   {flag} #{r['rank']} {r['market']:<20} Net ₹{r['net_revenue_per_q']:>6}/q "
          f"| Spoil: {r['spoilage_loss_pct']:>5.1f}% | Transit: {r['transit_hrs']}h")


# ═════════════════════════════════════════════════════════════════════
# CELL 11: PRESERVATION ACTION RANKER
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🛡️ STEP 9: PRESERVATION ACTION RANKER")
print("="*65)

def rank_preservations(crop, spoilage_risk_pct, budget_per_q=200):
    """
    Rank preservation actions by:
      Score = (effectiveness × shelf_extension) / cost
    Filter by crop applicability and budget.
    """
    actions = []
    for p in PRESERVATION_DB:
        if crop not in p['for']: continue
        if p['cost'] > budget_per_q: continue

        score = (p['effectiveness'] * p['ext_days']) / max(p['cost'], 1)
        risk_reduction = p['effectiveness'] * spoilage_risk_pct
        residual_risk = max(0, spoilage_risk_pct - risk_reduction)

        actions.append({
            'action': p['action'],
            'cost_per_quintal': p['cost'],
            'effectiveness_pct': round(p['effectiveness']*100),
            'shelf_extension_days': p['ext_days'],
            'cost_effectiveness_score': round(score, 2),
            'risk_after_action': round(residual_risk, 1),
        })

    actions.sort(key=lambda x: x['cost_effectiveness_score'], reverse=True)
    for i, a in enumerate(actions): a['rank'] = i+1
    return actions

test_pres = rank_preservations('Tomato', 35, 200)
print("\n📊 Preservation Ranking for Tomato (35% spoilage risk):")
for a in test_pres:
    print(f"   #{a['rank']} {a['action']:<25} Score:{a['cost_effectiveness_score']:>6} "
          f"| ₹{a['cost_per_quintal']}/q | Risk→{a['risk_after_action']}%")


# ═════════════════════════════════════════════════════════════════════
# CELL 12: SHAP EXPLAINABILITY LAYER
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🔍 STEP 10: SHAP EXPLAINABILITY")
print("="*65)

try:
    import shap
    HAS_SHAP = True
    print("✅ SHAP available")
except ImportError:
    HAS_SHAP = False
    print("⚠️ SHAP not installed — using feature importance fallback")

def explain_decision(model, features, feat_names, top_n=3):
    """Generate top-N factor explanations using SHAP or feature importance."""
    try:
        if HAS_SHAP:
            explainer = shap.TreeExplainer(model)
            sv = explainer.shap_values(features)
            # Multi-class: sv is list of arrays or 3D array
            if isinstance(sv, list):
                # Average absolute SHAP across classes for a single sample
                sv = np.mean([np.abs(s) for s in sv], axis=0).flatten()
            elif sv.ndim == 3:
                # Shape (1, n_features, n_classes) — average across classes
                sv = np.mean(np.abs(sv[0]), axis=1)
            else:
                sv = sv.flatten()
            n_feats = len(feat_names)
            sv = sv[:n_feats]  # Safety: trim to feature count
            top_idx = np.argsort(np.abs(sv))[-top_n:][::-1]
            factors = []
            for i in top_idx:
                factors.append({
                    'factor': feat_names[i],
                    'impact': round(float(sv[i]), 3),
                    'direction': 'contributes',
                    'importance': round(float(sv[i]), 3),
                })
            return factors
        else:
            raise ImportError("No SHAP")
    except Exception:
        # Fallback: use feature importance
        imp = model.feature_importances_
        top_idx = np.argsort(imp)[-top_n:][::-1]
        return [{'factor': feat_names[i], 'importance': round(float(imp[i]),3),
                 'direction':'contributes', 'impact': round(float(imp[i]),3)}
                for i in top_idx]


# ═════════════════════════════════════════════════════════════════════
# CELL 13: FARMER-FRIENDLY TEXT GENERATOR
# ═════════════════════════════════════════════════════════════════════

TEMPLATES = {
    'en': {
        'harvest_now': "🟢 HARVEST NOW — Best window: {start} to {end}",
        'wait': "🟡 WAIT {days} more days — Price may rise ₹{gain}",
        'delay': "🔴 DELAY harvest — {reason}",
        'risk': "Risk Level: {icon} {level} ({score}/100)",
        'market': "📍 Best market: {market} — ₹{price}/quintal (after {transit}h transport)",
        'spoilage': "⚠️ Spoilage risk: {level} — Use {action} (₹{cost}/quintal)",
        'why_weather': "Weather: {cond} (rain {rain}%, humidity {hum}%)",
        'why_price': "Price trend: {dir} {pct}% this week",
        'why_crop': "Crop: {pct}% mature ({status})",
    },
    'hi': {
        'harvest_now': "🟢 अभी काटें — सर्वोत्तम समय: {start} से {end}",
        'wait': "🟡 {days} दिन और रुकें — कीमत ₹{gain} बढ़ सकती है",
        'delay': "🔴 कटाई रोकें — {reason}",
        'risk': "जोखिम स्तर: {icon} {level} ({score}/100)",
        'market': "📍 सबसे अच्छा बाजार: {market} — ₹{price}/क्विंटल ({transit} घंटे दूर)",
        'spoilage': "⚠️ खराबी का खतरा: {level} — {action} करें (₹{cost}/क्विंटल)",
        'why_weather': "मौसम: {cond} (बारिश {rain}%, नमी {hum}%)",
        'why_price': "कीमत: इस हफ्ते {pct}% {dir}",
        'why_crop': "फसल: {pct}% पकी ({status})",
    },
}

def gen_farmer_text(result, lang='en'):
    """Generate simple farmer-friendly text from recommendation result."""
    T = TEMPLATES.get(lang, TEMPLATES['en'])
    rec = result['recommendation']
    risk = result['risk_analysis']
    lines = []

    # Decision
    dec = rec['final_decision']
    w = rec['optimal_harvest_window']
    if dec == 'HARVEST_NOW':
        lines.append(T['harvest_now'].format(start=w['start_date'], end=w['end_date']))
    elif dec == 'WAIT':
        lines.append(T['wait'].format(days=w.get('window_days',5),
                     gain=abs(result.get('input',{}).get('price_change',0)*20)))
    else:
        lines.append(T['delay'].format(reason=risk.get('advice','Bad weather expected')))

    # Risk
    icons = {'LOW':'🟢','MEDIUM':'🟡','HIGH':'🟠','CRITICAL':'🔴'}
    lines.append(T['risk'].format(icon=icons.get(risk['risk_level'],'⚪'),
                 level=risk['risk_level'], score=risk['composite_score']))

    # Market
    if 'best_market' in result:
        bm = result['best_market']
        lines.append(T['market'].format(market=bm['market'], price=int(bm['est_price']),
                     transit=bm['transit_hrs']))

    # Spoilage
    if 'spoilage' in result and result['spoilage'].get('actions'):
        top = result['spoilage']['actions'][0]
        lines.append(T['spoilage'].format(level=result['spoilage']['risk_level'],
                     action=top['action'], cost=top['cost_per_quintal']))

    # Why (explainability)
    inp = result.get('input', {})
    w_cond = "favorable" if inp.get('rain_pct',50) < 30 else "risky"
    lines.append(T['why_weather'].format(cond=w_cond, rain=inp.get('rain_pct','?'),
                 hum=inp.get('humidity','?')))
    p_dir = "up" if inp.get('price_chg',0) > 0 else "down"
    lines.append(T['why_price'].format(dir=p_dir, pct=abs(round(inp.get('price_chg',0),1))))
    mat = inp.get('maturity_pct',100)
    status = "ready" if 90<=mat<=110 else ("overripe" if mat>110 else "not ready")
    lines.append(T['why_crop'].format(pct=round(mat), status=status))

    return '\n'.join(lines)


# ═════════════════════════════════════════════════════════════════════
# CELL 14: MAIN INFERENCE PIPELINE
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🔮 STEP 11: COMPLETE INFERENCE PIPELINE")
print("="*65)

def farmwise_predict(crop, crop_age_days, rain_pct, humidity, price_current,
                     price_predicted_7d, date=None, storage_temp=30, transit_hrs=4,
                     has_cold_chain=False, quantity_quintals=10, budget_per_q=200, lang='en'):
    """
    🌾 FarmWise AI — Complete Recommendation Engine

    Combines price model output with harvest optimization, spoilage risk,
    market ranking, and preservation actions into one explainable result.
    """
    if date is None: date = datetime.now().strftime('%Y-%m-%d')
    ci = CROP_DB.get(crop)
    if not ci: return {'error': f"Unknown crop. Choose from: {list(CROP_DB.keys())}"}

    dt = datetime.strptime(date, '%Y-%m-%d')
    m_min, m_max = ci['maturity_days']
    mat_pct = (crop_age_days/m_max)*100
    overripe = 1 if crop_age_days > m_max else 0
    p_chg = ((price_predicted_7d - price_current)/price_current)*100
    dry_days = max(0, int(7-rain_pct/15))
    rain_mm = rain_pct*0.5
    hum_max = min(100, humidity+12)
    is_season = 1 if dt.strftime('%b') in ci['harvest_season'] else 0

    # ── Risk Scores ──
    wr = calc_weather_risk(rain_pct, rain_mm, dry_days, ci['rain_tolerance'])
    hr = calc_humidity_risk(humidity, hum_max, ci['critical_humidity'])
    pr = calc_price_risk(p_chg, ci['price_volatility'])
    mr = calc_maturity_risk(mat_pct, overripe, ci['shelf_life_days'])
    comp = wr*0.35 + hr*0.15 + pr*0.25 + mr*0.25
    r_level = 'LOW' if comp<=25 else ('MEDIUM' if comp<=50 else ('HIGH' if comp<=75 else 'CRITICAL'))

    # ── Harvest Decision (ML) ──
    ml_row = pd.DataFrame([{
        'rain_pct':rain_pct,'rain_mm':rain_mm,'humidity':humidity,'hum_max':hum_max,
        'temperature':TEMP_BASE.get(dt.month,25),'dry_days':dry_days,
        'crop_age':crop_age_days,'maturity_pct':mat_pct,'days_since_mat':crop_age_days-m_min,
        'overripe':overripe,'shelf_life':ci['shelf_life_days'],
        'price_cur':price_current,'price_7d':price_predicted_7d,
        'price_chg':p_chg,'month':dt.month,'doy':dt.timetuple().tm_yday,
        'comp_risk':comp,'w_risk':wr,'h_risk':hr,'p_risk':pr,'m_risk':mr,
        'crop_enc':le_crop.transform([crop])[0],
        'tol_enc':le_tol.transform([ci['rain_tolerance']])[0],
        'vol_enc':le_vol.transform([ci['price_volatility']])[0],
    }])
    ml_dec = le_dec.inverse_transform(harvest_model.predict(ml_row))[0]
    ml_prob = harvest_model.predict_proba(ml_row)[0]
    ml_conf = max(ml_prob)*100

    # ── Rule-based override for safety ──
    if overripe: final_dec, window = 'HARVEST_NOW', (0,2)
    elif rain_pct > 70: final_dec, window = 'DELAY', (5,10)
    elif p_chg > 10 and rain_pct < 30 and not overripe: final_dec, window = 'WAIT', (5,10)
    elif ml_dec == 'HARVEST_NOW' and comp < 50: final_dec, window = 'HARVEST_NOW', (0,5)
    else: final_dec = ml_dec; window = (0,5) if ml_dec=='HARVEST_NOW' else (3,7) if ml_dec=='WAIT' else (5,14)

    w_start = (dt + timedelta(days=window[0])).strftime('%Y-%m-%d')
    w_end = (dt + timedelta(days=window[1])).strftime('%Y-%m-%d')

    # ── Spoilage Risk (ML) ──
    sp_row = pd.DataFrame([{
        'temperature':TEMP_BASE.get(dt.month,25),'humidity':humidity,'hum_max':hum_max,
        'storage_temp':storage_temp,'storage_hum':min(100,humidity+5),
        'transit_hrs':transit_hrs,'has_cold_chain':int(has_cold_chain),
        'shelf_life':ci['shelf_life_days'],'overripe':overripe,
        'maturity_pct':mat_pct,'rain_pct':rain_pct,
        'crop_enc':le_crop.transform([crop])[0],
    }])
    sp_pred = le_spoil.inverse_transform(spoilage_model.predict(sp_row))[0]
    sp_prob = spoilage_model.predict_proba(sp_row)[0]
    sp_pct = {'LOW':10,'MEDIUM':35,'HIGH':70}.get(sp_pred, 30)

    # ── SHAP Explanations ──
    harv_explain = explain_decision(harvest_model, ml_row[harv_feats], harv_feats, top_n=3)
    spoil_explain = explain_decision(spoilage_model, sp_row[spoil_feats], spoil_feats, top_n=3)

    # ── Market Ranking ──
    markets = rank_markets(crop, price_current, sp_pct, quantity_quintals)
    best_mkt = markets[0] if markets else {}

    # ── Preservation Actions ──
    preservations = rank_preservations(crop, sp_pct, budget_per_q)

    # ── Build Result ──
    result = {
        'status': 'success',
        'timestamp': datetime.now().isoformat(),
        'input': {
            'crop': crop, 'crop_age_days': crop_age_days, 'date': date,
            'rain_pct': rain_pct, 'humidity': humidity,
            'price_current': price_current, 'price_predicted_7d': price_predicted_7d,
            'price_chg': round(p_chg,1), 'maturity_pct': round(mat_pct,1),
        },
        'recommendation': {
            'final_decision': final_dec,
            'confidence_pct': round(ml_conf, 1),
            'optimal_harvest_window': {'start_date':w_start,'end_date':w_end,'window_days':window[1]-window[0]},
        },
        'risk_analysis': {
            'composite_score': round(comp,1), 'risk_level': r_level,
            'advice': 'Good conditions' if comp<35 else ('Monitor weather' if comp<55 else 'Caution advised'),
            'breakdown': {'weather':round(wr,1),'humidity':round(hr,1),'price':round(pr,1),'maturity':round(mr,1)},
        },
        'best_market': best_mkt,
        'all_markets': markets,
        'spoilage': {
            'risk_level': sp_pred,
            'estimated_loss_pct': sp_pct,
            'class_probabilities': {c:round(p*100,1) for c,p in zip(le_spoil.classes_, sp_prob)},
            'actions': preservations,
        },
        'explainability': {
            'harvest_factors': harv_explain,
            'spoilage_factors': spoil_explain,
            'methodology': 'SHAP TreeExplainer' if HAS_SHAP else 'Feature Importance',
        },
        'model_info': {
            'harvest_model': 'RandomForest', 'harvest_accuracy': round(harv_acc*100,1),
            'spoilage_model': 'GradientBoosting', 'spoilage_accuracy': round(spoil_acc*100,1),
            'price_model': 'XGBoost', 'price_mae': round(price_mae,2),
            'ml_decision': ml_dec, 'ml_confidence': round(ml_conf,1),
        },
    }

    # ── Farmer Text ──
    result['farmer_text'] = {
        'en': gen_farmer_text(result, 'en'),
        'hi': gen_farmer_text(result, 'hi'),
    }

    return result


# ═════════════════════════════════════════════════════════════════════
# CELL 15: RUN EXAMPLES
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🔮 STEP 12: LIVE PREDICTIONS")
print("="*65)

# Example 1: Ripe Tomato, Good Weather
r1 = farmwise_predict('Tomato', 75, 10, 55, 2200, 2350, '2024-02-10')
print("\n" + "━"*55)
print("📋 EXAMPLE 1: Ripe Tomato, Clear Weather")
print("━"*55)
print(json.dumps(r1, indent=2, default=str)[:2000])
print("\n📱 Farmer Message (EN):")
print(r1['farmer_text']['en'])
print("\n📱 Farmer Message (HI):")
print(r1['farmer_text']['hi'])

# Example 2: Wheat with Rain
r2 = farmwise_predict('Wheat', 140, 80, 85, 2100, 1950, '2024-04-15')
print("\n" + "━"*55)
print("📋 EXAMPLE 2: Wheat, Heavy Rain")
print("━"*55)
print("\n📱 Farmer Message (EN):")
print(r2['farmer_text']['en'])

# Example 3: Onion Price Surge
r3 = farmwise_predict('Onion', 120, 5, 40, 1500, 2100, '2024-03-25')
print("\n" + "━"*55)
print("📋 EXAMPLE 3: Onion, Price Surge")
print("━"*55)
print("\n📱 Farmer Message (EN):")
print(r3['farmer_text']['en'])


# ═════════════════════════════════════════════════════════════════════
# CELL 16: SAVE ALL MODELS
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("💾 STEP 13: SAVE ALL MODELS")
print("="*65)

artifacts = {
    'price_model': price_model, 'price_features': feat_cols,
    'harvest_model': harvest_model, 'harvest_features': harv_feats,
    'spoilage_model': spoilage_model, 'spoilage_features': spoil_feats,
    'le_crop': le_crop, 'le_dec': le_dec, 'le_tol': le_tol,
    'le_vol': le_vol, 'le_spoil': le_spoil,
    'crop_db': CROP_DB, 'market_db': MARKET_DB, 'preservation_db': PRESERVATION_DB,
    'metrics': {'price_mae':price_mae, 'price_rmse':price_rmse,
                'harvest_acc':harv_acc, 'spoilage_acc':spoil_acc},
    'last_price_data': df_f.tail(30).to_dict(),
}

with open('farmwise_models.pkl', 'wb') as f: pickle.dump(artifacts, f)
print(f"✅ Saved: farmwise_models.pkl ({os.path.getsize('farmwise_models.pkl')/(1024*1024):.1f} MB)")

with open('sample_recommendation.json', 'w') as f: json.dump(r1, f, indent=2, default=str)
print(f"✅ Saved: sample_recommendation.json")


# ═════════════════════════════════════════════════════════════════════
# CELL 17: FASTAPI ENDPOINT DEFINITIONS
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🌐 STEP 14: FASTAPI ENDPOINT DESIGN")
print("="*65)

FASTAPI_CODE = '''
# farmwise_api.py — Run with: uvicorn farmwise_api:app --reload
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pickle, json

app = FastAPI(title="FarmWise AI", version="1.0",
              description="AI-powered harvest optimization for Indian farmers")

# Load models at startup
with open("farmwise_models.pkl", "rb") as f:
    MODELS = pickle.load(f)

class PredictRequest(BaseModel):
    crop: str
    crop_age_days: int
    rain_forecast_pct: float
    humidity_pct: float
    price_current: float
    price_predicted_7d: float
    date: str = None
    storage_temp: float = 30
    transit_hrs: int = 4
    has_cold_chain: bool = False
    quantity_quintals: int = 10
    budget_per_quintal: int = 200
    language: str = "en"

@app.post("/predict")
async def predict(req: PredictRequest):
    """Full recommendation: harvest + market + spoilage + preservation"""
    result = farmwise_predict(**req.dict())
    return result

@app.get("/crops")
async def list_crops():
    """List all supported crops with their parameters"""
    return {"crops": list(MODELS["crop_db"].keys())}

@app.get("/markets")
async def list_markets():
    """List available markets"""
    return {"markets": MODELS["market_db"]}

@app.get("/health")
async def health():
    return {"status": "healthy", "models_loaded": True,
            "metrics": MODELS["metrics"]}
'''

print(FASTAPI_CODE)
with open('farmwise_api_template.py', 'w') as f: f.write(FASTAPI_CODE)
print("✅ Saved: farmwise_api_template.py")


# ═════════════════════════════════════════════════════════════════════
# CELL 18: PRODUCTION DESIGN NOTES
# ═════════════════════════════════════════════════════════════════════

print("\n" + "="*65)
print("🏭 STEP 15: PRODUCTION DESIGN")
print("="*65)

PROD_NOTES = """
┌────────────────────────────────────────────────────────────────┐
│  🏭 PRODUCTION DEPLOYMENT DESIGN                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  RETRAINING FREQUENCY                                          │
│  • Price model:   Weekly (new mandi data daily)                │
│  • Harvest model: Monthly (seasonal patterns)                  │
│  • Spoilage model: Quarterly (stable relationships)            │
│                                                                │
│  MONITORING                                                    │
│  • Track MAE/RMSE drift weekly (alert if >20% degradation)     │
│  • Log all predictions + actuals for feedback loop              │
│  • Monitor API latency (target: <500ms P95)                    │
│                                                                │
│  DATA DRIFT HANDLING                                           │
│  • PSI (Population Stability Index) on feature distributions   │
│  • If PSI > 0.2 → trigger automatic retrain                   │
│  • Kolmogorov-Smirnov test on price distributions              │
│                                                                │
│  SCALABILITY                                                   │
│  • Stateless FastAPI → horizontal scaling on Kubernetes        │
│  • Model artifacts in S3/GCS — loaded at pod startup           │
│  • Redis cache for repeated queries (same crop+location)       │
│  • Async weather API calls with 30-min cache                   │
│                                                                │
│  ANDROID OPTIMIZATION                                          │
│  • API returns <5KB JSON per request                           │
│  • Offline: cache last 3 recommendations locally               │
│  • SMS fallback: 160-char summary for no-data areas            │
│  • Voice TTS: Android native TTS for farmer text               │
│                                                                │
│  REGIONAL CUSTOMIZATION                                        │
│  • Config-driven crop database (add crops via JSON)            │
│  • Market database per state/district                          │
│  • Language templates: add new language = 1 dict               │
│  • Soil data: plug in Soil Health Card API per district        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
"""
print(PROD_NOTES)


# ═════════════════════════════════════════════════════════════════════
# CELL 19: FINAL SUMMARY
# ═════════════════════════════════════════════════════════════════════

print("="*65)
print("📋 FARMWISE AI — COMPLETE SYSTEM SUMMARY")
print("="*65)
print(f"""
  4 ML Models Trained:
    1. Price Prediction (XGBoost)    — MAE: ₹{price_mae:.2f}, MAPE: {price_mape:.1f}%
    2. Harvest Decision (RandomForest) — Acc: {harv_acc*100:.1f}%
    3. Spoilage Risk (GradientBoosting) — Acc: {spoil_acc*100:.1f}%
    4. Market Ranking (Profit formula)  — 6 markets ranked

  Decision Engine: Rule-based + ML consensus
  Explainability:  {'SHAP' if HAS_SHAP else 'Feature Importance'}
  Languages:       English + Hindi
  API:             FastAPI (4 endpoints)

  Saved Files:
    📦 farmwise_models.pkl         — All models + encoders + config
    📋 sample_recommendation.json  — Example JSON output
    🌐 farmwise_api_template.py    — FastAPI server code

  Usage:
    result = farmwise_predict(
        crop='Tomato', crop_age_days=75,
        rain_pct=15, humidity=55,
        price_current=2200, price_predicted_7d=2400
    )
""")
print("✅ FarmWise AI system complete!")
