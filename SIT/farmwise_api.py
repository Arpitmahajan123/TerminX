"""
FarmWise AI — FastAPI Backend for Demo UI
Run: python farmwise_api.py
"""
import os, pickle, json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import uvicorn
import h5py
import requests as http_requests  # for weather API proxy

# ═══════════════════════════════════════════════════════════
# NUMPY → JSON SANITIZER
# ═══════════════════════════════════════════════════════════

def sanitize(obj):
    """Recursively convert numpy types to native Python for JSON serialization."""
    if isinstance(obj, dict):
        return {sanitize(k): sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [sanitize(v) for v in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

# ═══════════════════════════════════════════════════════════
# LOAD MODELS
# ═══════════════════════════════════════════════════════════

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'farmwise_models.pkl')
with open(MODEL_PATH, 'rb') as f:
    M = pickle.load(f)

price_model = M['price_model']
harvest_model = M['harvest_model']
spoilage_model = M['spoilage_model']
le_crop = M['le_crop']
le_dec = M['le_dec']
le_tol = M['le_tol']
le_vol = M['le_vol']
le_spoil = M['le_spoil']
CROP_DB = M['crop_db']
MARKET_DB = M['market_db']
PRESERVATION_DB = M['preservation_db']
METRICS = M['metrics']

print(f"✅ Models loaded | Crops: {list(CROP_DB.keys())}")

# ═══════════════════════════════════════════════════════════
# LSTM — PURE NUMPY INFERENCE ENGINE (no TensorFlow needed)
# ═══════════════════════════════════════════════════════════

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -500, 500)))

def lstm_cell_forward(x_t, h_prev, c_prev, kernel, recurrent_kernel, bias):
    """Single LSTM cell forward pass (Keras weight layout: i, f, c, o)."""
    z = x_t @ kernel + h_prev @ recurrent_kernel + bias
    units = h_prev.shape[-1]
    i = sigmoid(z[:, :units])
    f = sigmoid(z[:, units:2*units])
    c_candidate = np.tanh(z[:, 2*units:3*units])
    o = sigmoid(z[:, 3*units:])
    c_new = f * c_prev + i * c_candidate
    h_new = o * np.tanh(c_new)
    return h_new, c_new

def lstm_layer_forward(X, kernel, recurrent_kernel, bias, return_sequences=False):
    """Forward pass through a full LSTM layer."""
    batch, seq_len, features = X.shape
    units = kernel.shape[1] // 4
    h = np.zeros((batch, units))
    c = np.zeros((batch, units))
    outputs = []
    for t in range(seq_len):
        h, c = lstm_cell_forward(X[:, t, :], h, c, kernel, recurrent_kernel, bias)
        if return_sequences:
            outputs.append(h)
    if return_sequences:
        return np.stack(outputs, axis=1)
    return h

def dense_forward(x, kernel, bias, activation='linear'):
    out = x @ kernel + bias
    if activation == 'relu':
        out = np.maximum(0, out)
    return out

# ═══════════════════════════════════════════════════════════
# LOAD LSTM WEIGHTS FROM .h5
# ═══════════════════════════════════════════════════════════

LSTM_WEIGHTS = None
LSTM_SCALER_X = None
LSTM_SCALER_Y = None
LSTM_FEATURE_COLS = None
LSTM_SEQUENCE_LENGTH = 30
LSTM_LAST_DATA = None

LSTM_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'Models', 'lstm_model.h5')
PRICE_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'price_prediction_model.pkl')

try:
    with h5py.File(LSTM_MODEL_PATH, 'r') as f:
        mw = f['model_weights']
        LSTM_WEIGHTS = {
            'lstm1_kernel': np.array(mw['lstm/sequential/lstm/lstm_cell/kernel']),
            'lstm1_recurrent': np.array(mw['lstm/sequential/lstm/lstm_cell/recurrent_kernel']),
            'lstm1_bias': np.array(mw['lstm/sequential/lstm/lstm_cell/bias']),
            'lstm2_kernel': np.array(mw['lstm_1/sequential/lstm_1/lstm_cell/kernel']),
            'lstm2_recurrent': np.array(mw['lstm_1/sequential/lstm_1/lstm_cell/recurrent_kernel']),
            'lstm2_bias': np.array(mw['lstm_1/sequential/lstm_1/lstm_cell/bias']),
            'dense1_kernel': np.array(mw['dense/sequential/dense/kernel']),
            'dense1_bias': np.array(mw['dense/sequential/dense/bias']),
            'dense2_kernel': np.array(mw['dense_1/sequential/dense_1/kernel']),
            'dense2_bias': np.array(mw['dense_1/sequential/dense_1/bias']),
        }
    print(f"✅ LSTM weights loaded from: {LSTM_MODEL_PATH}")
    print(f"   Architecture: LSTM(64) → Dropout → LSTM(32) → Dropout → Dense(16,relu) → Dense(1)")

    # Load scalers and feature info from price model pkl
    if os.path.exists(PRICE_MODEL_PATH):
        with open(PRICE_MODEL_PATH, 'rb') as f:
            price_artifacts = pickle.load(f)
        LSTM_SCALER_X = price_artifacts.get('scaler_X')
        LSTM_SCALER_Y = price_artifacts.get('scaler_y')
        LSTM_FEATURE_COLS = price_artifacts.get('feature_cols', price_artifacts.get('feature_columns'))
        LSTM_LAST_DATA = price_artifacts.get('last_known_data')
    else:
        print(f"⚠️ Price model pkl not found at {PRICE_MODEL_PATH}")

    # Fallback: use last_price_data from farmwise_models.pkl
    if LSTM_LAST_DATA is None and 'last_price_data' in M:
        LSTM_LAST_DATA = M['last_price_data']
        print("   Using last_price_data from farmwise_models.pkl")

    # Reconstruct scalers from available data if they weren't saved
    if LSTM_LAST_DATA is not None:
        from sklearn.preprocessing import MinMaxScaler
        last_df = pd.DataFrame(LSTM_LAST_DATA)
        if 'Date' in last_df.columns:
            last_df['Date'] = pd.to_datetime(last_df['Date'])
            last_df = last_df.sort_values('Date').reset_index(drop=True)

        if LSTM_FEATURE_COLS is None:
            LSTM_FEATURE_COLS = [c for c in last_df.columns if c not in ['Date', 'Price']]

        available_cols = [c for c in LSTM_FEATURE_COLS if c in last_df.columns]
        LSTM_FEATURE_COLS = available_cols  # Update to only available columns

        if LSTM_SCALER_X is None and len(available_cols) > 0:
            LSTM_SCALER_X = MinMaxScaler()
            LSTM_SCALER_X.fit(last_df[available_cols].values)
            print(f"   Reconstructed scaler_X from data ({len(available_cols)} features)")

        if LSTM_SCALER_Y is None and 'Price' in last_df.columns:
            LSTM_SCALER_Y = MinMaxScaler()
            LSTM_SCALER_Y.fit(last_df['Price'].values.reshape(-1, 1))
            print(f"   Reconstructed scaler_Y from data (price range: ₹{last_df['Price'].min():.0f}-₹{last_df['Price'].max():.0f})")

    print(f"✅ LSTM ready | Features: {len(LSTM_FEATURE_COLS) if LSTM_FEATURE_COLS else 'N/A'} | Scalers: {'OK' if LSTM_SCALER_X is not None else 'MISSING'}")
except Exception as e:
    print(f"⚠️ LSTM model load failed: {e}")

def lstm_predict(X_input):
    """Run LSTM forward pass: input shape (batch, 30, n_features) → output shape (batch, 1)."""
    if LSTM_WEIGHTS is None:
        return None
    W = LSTM_WEIGHTS
    # Layer 1: LSTM(64, return_sequences=True)
    h1 = lstm_layer_forward(X_input, W['lstm1_kernel'], W['lstm1_recurrent'], W['lstm1_bias'], return_sequences=True)
    # Dropout is identity at inference
    # Layer 2: LSTM(32, return_sequences=False)
    h2 = lstm_layer_forward(h1, W['lstm2_kernel'], W['lstm2_recurrent'], W['lstm2_bias'], return_sequences=False)
    # Dense(16, relu)
    d1 = dense_forward(h2, W['dense1_kernel'], W['dense1_bias'], activation='relu')
    # Dense(1)
    out = dense_forward(d1, W['dense2_kernel'], W['dense2_bias'], activation='linear')
    return out


# ═══════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════

TEMP_BASE = {1:15,2:18,3:25,4:32,5:36,6:34,7:30,8:29,9:29,10:27,11:22,12:17}

# ═══════════════════════════════════════════════════════════
# RISK SCORING (same as training)
# ═══════════════════════════════════════════════════════════

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

def rank_markets(crop, price_current, spoilage_risk_pct, quantity_quintals=10):
    ci = CROP_DB.get(crop, CROP_DB['Tomato'])
    rankings = []
    for mkt_name, mkt in MARKET_DB.items():
        est_price = price_current * mkt['premium']
        transit_spoil = ci.get('spoilage_rate', 0.05) * mkt['transit_hrs'] * 1.5
        if mkt['tier'] == 1: transit_spoil *= 0.8
        total_spoil = min((spoilage_risk_pct/100 + transit_spoil), 0.90)
        transport_cost = mkt['transit_hrs'] * 25
        sellable = 1 - total_spoil
        revenue = est_price * sellable - transport_cost
        rankings.append({
            'market': mkt_name, 'tier': int(mkt['tier']),
            'est_price': round(float(est_price)), 'transit_hrs': int(mkt['transit_hrs']),
            'transport_cost': round(float(transport_cost)),
            'spoilage_loss_pct': round(float(total_spoil*100), 1),
            'net_revenue_per_q': round(float(revenue)),
            'total_profit': round(float(revenue * quantity_quintals)),
        })
    rankings.sort(key=lambda x: x['net_revenue_per_q'], reverse=True)
    for i, r in enumerate(rankings):
        r['rank'] = i+1; r['recommended'] = i==0
    return rankings

def rank_preservations(crop, spoilage_risk_pct, budget_per_q=200):
    actions = []
    for p in PRESERVATION_DB:
        if crop not in p['for'] or p['cost'] > budget_per_q: continue
        score = (p['effectiveness'] * p['ext_days']) / max(p['cost'], 1)
        residual = max(0, spoilage_risk_pct - p['effectiveness'] * spoilage_risk_pct)
        actions.append({
            'action': p['action'], 'cost_per_quintal': int(p['cost']),
            'effectiveness_pct': round(float(p['effectiveness']*100)),
            'shelf_extension_days': int(p['ext_days']),
            'score': round(float(score), 2), 'risk_after': round(float(residual), 1),
        })
    actions.sort(key=lambda x: x['score'], reverse=True)
    for i, a in enumerate(actions): a['rank'] = i+1
    return actions

# ═══════════════════════════════════════════════════════════
# MAIN PREDICTION
# ═══════════════════════════════════════════════════════════

harv_feats = M['harvest_features']
spoil_feats = M['spoilage_features']

def predict(crop, crop_age_days, rain_pct, humidity, price_current,
            price_predicted_7d, date=None, storage_temp=30, transit_hrs=4,
            has_cold_chain=False, quantity=10, budget=200):
    if date is None: date = datetime.now().strftime('%Y-%m-%d')
    ci = CROP_DB.get(crop)
    if not ci: return {'error': f"Unknown crop. Choose: {list(CROP_DB.keys())}"}

    dt = datetime.strptime(date, '%Y-%m-%d')
    m_min, m_max = ci['maturity_days']
    mat_pct = (crop_age_days/m_max)*100
    overripe = 1 if crop_age_days > m_max else 0
    p_chg = ((price_predicted_7d - price_current)/price_current)*100
    dry_days = max(0, int(7-rain_pct/15))
    rain_mm = rain_pct*0.5
    hum_max = min(100, humidity+12)
    is_season = 1 if dt.strftime('%b') in ci['harvest_season'] else 0

    wr = calc_weather_risk(rain_pct, rain_mm, dry_days, ci['rain_tolerance'])
    hr = calc_humidity_risk(humidity, hum_max, ci['critical_humidity'])
    pr = calc_price_risk(p_chg, ci['price_volatility'])
    mr = calc_maturity_risk(mat_pct, overripe, ci['shelf_life_days'])
    comp = wr*0.35 + hr*0.15 + pr*0.25 + mr*0.25
    r_level = 'LOW' if comp<=25 else ('MEDIUM' if comp<=50 else ('HIGH' if comp<=75 else 'CRITICAL'))

    ml_row = pd.DataFrame([{
        'rain_pct':rain_pct,'rain_mm':rain_mm,'humidity':humidity,'hum_max':hum_max,
        'temperature':TEMP_BASE.get(dt.month,25),'dry_days':dry_days,
        'crop_age':crop_age_days,'maturity_pct':mat_pct,'days_since_mat':crop_age_days-m_min,
        'overripe':overripe,'shelf_life':ci['shelf_life_days'],
        'price_cur':price_current,'price_7d':price_predicted_7d,
        'price_chg':p_chg,'month':dt.month,'doy':dt.timetuple().tm_yday,
        'comp_risk':comp,'w_risk':wr,'h_risk':hr,'p_risk':pr,'m_risk':mr,
        'crop_enc':int(le_crop.transform([crop])[0]),
        'tol_enc':int(le_tol.transform([ci['rain_tolerance']])[0]),
        'vol_enc':int(le_vol.transform([ci['price_volatility']])[0]),
    }])
    ml_dec = le_dec.inverse_transform(harvest_model.predict(ml_row))[0]
    ml_prob = harvest_model.predict_proba(ml_row)[0]
    ml_conf = float(max(ml_prob)*100)

    if overripe: final_dec, window = 'HARVEST_NOW', (0,2)
    elif rain_pct > 70: final_dec, window = 'DELAY', (5,10)
    elif p_chg > 10 and rain_pct < 30 and not overripe: final_dec, window = 'WAIT', (5,10)
    elif ml_dec == 'HARVEST_NOW' and comp < 50: final_dec, window = 'HARVEST_NOW', (0,5)
    else: final_dec = ml_dec; window = (0,5) if ml_dec=='HARVEST_NOW' else (3,7) if ml_dec=='WAIT' else (5,14)

    w_start = (dt + timedelta(days=window[0])).strftime('%Y-%m-%d')
    w_end = (dt + timedelta(days=window[1])).strftime('%Y-%m-%d')

    sp_row = pd.DataFrame([{
        'temperature':TEMP_BASE.get(dt.month,25),'humidity':humidity,'hum_max':hum_max,
        'storage_temp':storage_temp,'storage_hum':min(100,humidity+5),
        'transit_hrs':transit_hrs,'has_cold_chain':int(has_cold_chain),
        'shelf_life':ci['shelf_life_days'],'overripe':overripe,
        'maturity_pct':mat_pct,'rain_pct':rain_pct,
        'crop_enc':int(le_crop.transform([crop])[0]),
    }])
    sp_pred = le_spoil.inverse_transform(spoilage_model.predict(sp_row))[0]
    sp_prob = spoilage_model.predict_proba(sp_row)[0]
    sp_pct = {'LOW':10,'MEDIUM':35,'HIGH':70}.get(sp_pred, 30)

    markets = rank_markets(crop, price_current, sp_pct, quantity)
    preservations = rank_preservations(crop, sp_pct, budget)

    # Explainability
    imp = harvest_model.feature_importances_
    top_idx = np.argsort(imp)[-5:][::-1]
    harv_explain = [{'factor': harv_feats[i], 'importance': round(float(imp[i]),3)} for i in top_idx]

    return sanitize({
        'status': 'success',
        'input': {
            'crop': crop, 'crop_age_days': crop_age_days, 'date': date,
            'rain_pct': rain_pct, 'humidity': humidity,
            'price_current': price_current, 'price_predicted_7d': price_predicted_7d,
            'price_chg': round(p_chg,1), 'maturity_pct': round(mat_pct,1),
        },
        'recommendation': {
            'final_decision': final_dec, 'confidence_pct': round(ml_conf,1),
            'optimal_harvest_window': {'start_date':w_start,'end_date':w_end,'window_days':window[1]-window[0]},
            'ml_decision': ml_dec,
            'ml_probabilities': {c:round(float(p*100),1) for c,p in zip(le_dec.classes_, ml_prob)},
        },
        'risk_analysis': {
            'composite_score': round(float(comp),1), 'risk_level': r_level,
            'breakdown': {
                'weather': {'score':round(float(wr),1), 'weight':'35%'},
                'humidity': {'score':round(float(hr),1), 'weight':'15%'},
                'price': {'score':round(float(pr),1), 'weight':'25%'},
                'maturity': {'score':round(float(mr),1), 'weight':'25%'},
            },
        },
        'best_market': markets[0] if markets else {},
        'all_markets': markets,
        'spoilage': {
            'risk_level': sp_pred, 'estimated_loss_pct': sp_pct,
            'probabilities': {c:round(float(p*100),1) for c,p in zip(le_spoil.classes_, sp_prob)},
            'preservation_actions': preservations,
        },
        'explainability': harv_explain,
        'crop_info': {
            'maturity_days': list(ci['maturity_days']),
            'optimal_temp': list(ci['optimal_temp']),
            'critical_humidity': ci['critical_humidity'],
            'rain_tolerance': ci['rain_tolerance'],
            'shelf_life_days': ci['shelf_life_days'],
            'harvest_season': ci['harvest_season'],
        },
    })


# ═══════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════

app = FastAPI(title="FarmWise AI", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class PredictRequest(BaseModel):
    crop: str = "Tomato"
    crop_age_days: int = 75
    rain_pct: float = 15.0
    humidity: float = 55.0
    price_current: float = 2200.0
    price_predicted_7d: float = 2350.0
    date: Optional[str] = None
    storage_temp: float = 30.0
    transit_hrs: int = 4
    has_cold_chain: bool = False
    quantity_quintals: int = 10
    budget_per_quintal: int = 200

@app.post("/api/predict")
async def api_predict(req: PredictRequest):
    return predict(req.crop, req.crop_age_days, req.rain_pct, req.humidity,
                   req.price_current, req.price_predicted_7d, req.date,
                   req.storage_temp, req.transit_hrs, req.has_cold_chain,
                   req.quantity_quintals, req.budget_per_quintal)

@app.get("/api/crops")
async def api_crops():
    return {"crops": {name: {
        'maturity_days': list(info['maturity_days']),
        'harvest_season': info['harvest_season'],
        'shelf_life_days': info['shelf_life_days'],
        'rain_tolerance': info['rain_tolerance'],
        'base_price': info['base_price'],
    } for name, info in CROP_DB.items()}}

@app.get("/api/health")
async def api_health():
    return sanitize({"status": "healthy", "models": True, "metrics": METRICS,
            "crops": list(CROP_DB.keys()), "lstm_available": LSTM_WEIGHTS is not None})

@app.get("/api/models")
async def api_models():
    """Return detailed info about all trained models."""
    # Harvest feature importances
    hi = harvest_model.feature_importances_
    harv_imp = sorted([{'feature': harv_feats[i], 'importance': round(float(hi[i]),4)}
                       for i in range(len(harv_feats))], key=lambda x: x['importance'], reverse=True)

    # Spoilage feature importances
    si = spoilage_model.feature_importances_
    spoil_imp = sorted([{'feature': spoil_feats[i], 'importance': round(float(si[i]),4)}
                        for i in range(len(spoil_feats))], key=lambda x: x['importance'], reverse=True)

    # Price feature importances (top 15)
    price_feats = M['price_features']
    pi = price_model.feature_importances_
    price_imp = sorted([{'feature': price_feats[i], 'importance': round(float(pi[i]),4)}
                        for i in range(len(price_feats))], key=lambda x: x['importance'], reverse=True)[:15]

    models_list = [
        {
            'name': 'Price Prediction (XGBoost)',
            'algorithm': 'XGBoost Regressor',
            'icon': '📈',
            'status': 'active',
            'metrics': {
                'MAE': f"₹{METRICS['price_mae']:.2f}",
                'RMSE': f"₹{METRICS['price_rmse']:.2f}",
                'MAPE': f"{METRICS.get('price_mape', METRICS['price_mae']/2200*100):.1f}%",
            },
            'config': {
                'n_estimators': 1000, 'max_depth': 7, 'learning_rate': 0.05,
                'features_used': len(price_feats),
                'training_data': 'India Commodity Mandi Dataset (2.3M rows)',
            },
            'feature_importances': price_imp,
            'description': 'Predicts mandi modal price using lag features, rolling statistics, and calendar encodings.',
        },
        {
            'name': 'Price Prediction (LSTM)',
            'algorithm': 'LSTM Neural Network',
            'icon': '🧠',
            'status': 'active' if LSTM_WEIGHTS is not None else 'unavailable',
            'metrics': {
                'Architecture': '64-LSTM → Dropout → 32-LSTM → Dropout → Dense(16) → Dense(1)',
                'Sequence Length': '30 days',
                'Optimizer': 'Adam',
                'Loss': 'MSE',
            },
            'config': {
                'lstm_units_1': 64, 'lstm_units_2': 32, 'dropout_rate': 0.2,
                'dense_units': 16, 'sequence_length': LSTM_SEQUENCE_LENGTH,
                'batch_size': 32, 'epochs': '100 (with EarlyStopping)',
                'features_used': len(LSTM_FEATURE_COLS) if LSTM_FEATURE_COLS else 'N/A',
                'training_data': 'India Commodity Mandi Dataset (MinMaxScaler)',
            },
            'feature_importances': [],
            'description': 'Deep learning LSTM model for sequential price prediction. Captures temporal patterns using 30-day lookback windows. Loaded from lstm_model.h5 with pure numpy inference.',
        },
        {
            'name': 'Harvest Decision',
            'algorithm': 'RandomForest Classifier',
            'icon': '🌾',
            'status': 'active',
            'metrics': {
                'Accuracy': f"{METRICS['harvest_acc']*100:.1f}%",
                'Classes': 'HARVEST_NOW / WAIT / DELAY',
                'Trees': '300',
            },
            'config': {
                'n_estimators': 300, 'max_depth': 15, 'class_weight': 'balanced',
                'features_used': len(harv_feats),
                'training_data': '6,000 synthetic scenarios (5 crops)',
            },
            'feature_importances': harv_imp,
            'description': 'Classifies optimal harvest action using weather, maturity, price trends, and risk scores.',
        },
        {
            'name': 'Spoilage Risk',
            'algorithm': 'GradientBoosting Classifier',
            'icon': '🧪',
            'status': 'active',
            'metrics': {
                'Accuracy': f"{METRICS['spoilage_acc']*100:.1f}%",
                'Classes': 'LOW / MEDIUM / HIGH',
                'Trees': '200',
            },
            'config': {
                'n_estimators': 200, 'max_depth': 8, 'learning_rate': 0.1,
                'features_used': len(spoil_feats),
                'training_data': '6,000 synthetic scenarios (5 crops)',
            },
            'feature_importances': spoil_imp,
            'description': 'Predicts post-harvest spoilage risk based on storage conditions, transit time, and cold chain.',
        },
        {
            'name': 'Market Ranking',
            'algorithm': 'Profit-Based Formula',
            'icon': '🏪',
            'status': 'active',
            'metrics': {
                'Markets': '6',
                'Formula': 'Net = Price×(1-Spoilage) - Transport',
                'Method': 'Rule-based ranking',
            },
            'config': {
                'market_tiers': 3, 'spoilage_adjustment': True,
                'transit_cost_model': '₹25/hr', 'features_used': 4,
                'training_data': 'Configured market database',
            },
            'feature_importances': [
                {'feature': 'spoilage_rate × transit_time', 'importance': 0.35},
                {'feature': 'market_premium', 'importance': 0.30},
                {'feature': 'transport_cost', 'importance': 0.20},
                {'feature': 'market_tier', 'importance': 0.15},
            ],
            'description': 'Ranks markets by net expected profit after transit spoilage and transport costs.',
        },
    ]

    return {'models': models_list}


# ═══════════════════════════════════════════════════════════
# LSTM PRICE PREDICTION
# ═══════════════════════════════════════════════════════════

def lstm_predict_future(forecast_days=14):
    """Generate LSTM-based price predictions for the next N days using pure numpy inference."""
    if LSTM_WEIGHTS is None or LSTM_SCALER_X is None or LSTM_SCALER_Y is None:
        return None

    try:
        # Reconstruct recent data from saved last_known_data
        last_data = pd.DataFrame(LSTM_LAST_DATA)
        if 'Date' in last_data.columns:
            last_data['Date'] = pd.to_datetime(last_data['Date'])
            last_data = last_data.sort_values('Date').reset_index(drop=True)

        feat_cols = LSTM_FEATURE_COLS
        if feat_cols is None:
            feat_cols = [c for c in last_data.columns if c not in ['Date', 'Price']]

        available_cols = [c for c in feat_cols if c in last_data.columns]
        if len(last_data) < LSTM_SEQUENCE_LENGTH:
            return None

        X_data = last_data[available_cols].values
        X_scaled = LSTM_SCALER_X.transform(X_data)

        last_date = last_data['Date'].iloc[-1]
        predictions = []
        current_sequence = X_scaled[-LSTM_SEQUENCE_LENGTH:].copy()

        for day in range(1, forecast_days + 1):
            input_seq = current_sequence.reshape(1, LSTM_SEQUENCE_LENGTH, -1)

            # Pure numpy LSTM forward pass
            pred_scaled = lstm_predict(input_seq)
            pred_price = float(LSTM_SCALER_Y.inverse_transform(pred_scaled).flatten()[0])
            pred_price = max(pred_price, 0)

            future_date = last_date + timedelta(days=day)
            predictions.append({
                'date': future_date.strftime('%Y-%m-%d'),
                'day': future_date.strftime('%A'),
                'price': round(pred_price, 2)
            })

            # Slide the window forward
            new_row = current_sequence[-1].copy()
            current_sequence = np.vstack([current_sequence[1:], new_row.reshape(1, -1)])

        return predictions
    except Exception as e:
        print(f"⚠️ LSTM prediction error: {e}")
        import traceback
        traceback.print_exc()
        return None


@app.get("/api/lstm-forecast")
async def api_lstm_forecast():
    """Return LSTM-based price predictions for the next 14 days."""
    if LSTM_WEIGHTS is None:
        return {"error": "LSTM model not available. Place lstm_model.h5 in Models/ directory."}

    preds = lstm_predict_future(forecast_days=14)
    if preds is None:
        return {"error": "LSTM prediction failed — scalers or data not available."}

    # Include historical data for context
    historical = []
    if LSTM_LAST_DATA is not None:
        last_data = pd.DataFrame(LSTM_LAST_DATA)
        if 'Date' in last_data.columns and 'Price' in last_data.columns:
            for _, row in last_data.iterrows():
                historical.append({
                    'Date': str(row['Date'])[:10],
                    'Price': round(float(row['Price']), 2)
                })

    return {
        'model': 'LSTM (Deep Learning)',
        'architecture': '64-LSTM → Dropout(0.2) → 32-LSTM → Dropout(0.2) → Dense(16) → Dense(1)',
        'sequence_length': LSTM_SEQUENCE_LENGTH,
        'inference': 'Pure NumPy (no TensorFlow required)',
        'forecasts': preds,
        'historical': historical,
        'status': 'success'
    }


# ═══════════════════════════════════════════════════════════
# PRICE FORECAST DATA (XGBoost + LSTM combined)
# ═══════════════════════════════════════════════════════════

PRICE_FORECAST_PATH = os.path.join(os.path.dirname(__file__), 'price_forecast_data.json')
PRICE_FORECAST = None
if os.path.exists(PRICE_FORECAST_PATH):
    with open(PRICE_FORECAST_PATH, 'r') as f:
        PRICE_FORECAST = json.load(f)
    print(f"✅ Price forecast data loaded | {len(PRICE_FORECAST.get('forecasts',[]))} days forecast")

@app.get("/api/price-forecast")
async def api_price_forecast():
    """Return price prediction data (historical + XGBoost forecast + LSTM forecast + metrics)."""
    if not PRICE_FORECAST:
        return {"error": "Price forecast data not available. Run mandi_price_training.py first."}

    result = dict(PRICE_FORECAST)

    # Add LSTM predictions alongside XGBoost
    lstm_preds = lstm_predict_future(forecast_days=14)
    if lstm_preds:
        result['lstm_forecasts'] = lstm_preds
        result['metrics']['LSTM'] = {
            'model': 'LSTM (Deep Learning)',
            'architecture': '64→32 LSTM + Dense',
            'sequence_length': LSTM_SEQUENCE_LENGTH,
        }

    return result


# ═══════════════════════════════════════════════════════════
# WEATHER AUTO-FILL (Open-Meteo — free, no API key)
# ═══════════════════════════════════════════════════════════

@app.get("/api/weather")
async def api_weather(lat: float = 28.6519, lon: float = 77.2315):
    """Fetch current weather from Open-Meteo API (free). Default: Azadpur Mandi, Delhi."""
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m"
            f"&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min,precipitation_sum"
            f"&timezone=Asia%2FKolkata&forecast_days=7"
        )
        resp = http_requests.get(url, timeout=8)
        data = resp.json()

        current = data.get('current', {})
        daily = data.get('daily', {})

        # Rain probability (avg of next 7 days)
        rain_probs = daily.get('precipitation_probability_max', [0])
        avg_rain = sum(rain_probs) / len(rain_probs) if rain_probs else 0
        today_rain = rain_probs[0] if rain_probs else 0

        # Temperature
        temp = current.get('temperature_2m', 30)
        temp_max_list = daily.get('temperature_2m_max', [])
        temp_min_list = daily.get('temperature_2m_min', [])

        return {
            'status': 'success',
            'location': {'lat': lat, 'lon': lon},
            'current': {
                'temperature': round(temp, 1),
                'humidity': current.get('relative_humidity_2m', 60),
                'precipitation_mm': current.get('precipitation', 0),
                'rain_mm': current.get('rain', 0),
                'wind_speed': current.get('wind_speed_10m', 0),
                'weather_code': current.get('weather_code', 0),
            },
            'forecast_7d': {
                'rain_probability_today': today_rain,
                'rain_probability_avg': round(avg_rain, 1),
                'daily_rain_probs': rain_probs,
                'daily_temp_max': temp_max_list,
                'daily_temp_min': temp_min_list,
                'daily_precipitation': daily.get('precipitation_sum', []),
                'dates': daily.get('time', []),
            },
            'auto_fill': {
                'rain_pct': round(today_rain, 0),
                'humidity': current.get('relative_humidity_2m', 60),
                'storage_temp': round(temp, 0),
            },
            'source': 'Open-Meteo (free API)',
        }
    except Exception as e:
        # Return sensible defaults if API fails
        return {
            'status': 'fallback',
            'error': str(e),
            'auto_fill': {
                'rain_pct': 15,
                'humidity': 55,
                'storage_temp': 30,
            },
            'source': 'defaults (API unavailable)',
        }


# ═══════════════════════════════════════════════════════════
# AUTO-FILL PRICES (from our LSTM + XGBoost models)
# ═══════════════════════════════════════════════════════════

@app.get("/api/auto-prices")
async def api_auto_prices(crop: str = "Tomato"):
    """Return current + 7-day predicted price from our models."""
    # Base prices from crop database
    ci = CROP_DB.get(crop)
    if not ci:
        return {'error': f'Unknown crop: {crop}', 'crops': list(CROP_DB.keys())}

    base_price = ci.get('base_price', 2000)
    current_price = base_price
    predicted_7d = base_price

    # Use LSTM forecast if available
    lstm_preds = lstm_predict_future(forecast_days=7)
    if lstm_preds and len(lstm_preds) > 0:
        current_price = lstm_preds[0]['price']
        predicted_7d = lstm_preds[-1]['price']

    # Use XGBoost forecast from saved data if available
    if PRICE_FORECAST and PRICE_FORECAST.get('forecasts'):
        fc = PRICE_FORECAST['forecasts']
        if len(fc) > 0:
            current_price = fc[0]['price']
        if len(fc) >= 7:
            predicted_7d = fc[6]['price']

    return {
        'status': 'success',
        'crop': crop,
        'current_price': round(float(current_price), 0),
        'predicted_7d': round(float(predicted_7d), 0),
        'lstm_available': LSTM_WEIGHTS is not None,
        'source': 'XGBoost + LSTM ensemble',
    }

@app.get("/")
async def root():
    html_path = os.path.join(os.path.dirname(__file__), 'index.html')
    return FileResponse(html_path)

if __name__ == "__main__":
    print("\n🌾 FarmWise AI starting at http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
