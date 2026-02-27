#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
================================================================================
🌾 INDIAN MANDI COMMODITY PRICE PREDICTION MODEL
================================================================================
Predict future mandi prices (next 7–14 days) for a selected crop and mandi
using historical prices and time-series features.

Dataset: India Commodity Wise Mandi Dataset (Kaggle)
Models:  XGBoost (Primary) | LSTM (Comparison)

Author:  ML Engineer
Date:    2026-02-26
================================================================================
"""

import os, warnings, pickle, json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import timedelta

from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import MinMaxScaler

import xgboost as xgb

warnings.filterwarnings('ignore')
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("viridis")

print("✅ All imports successful!")
print(f"   XGBoost version : {xgb.__version__}")

# Try importing TF for LSTM (optional)
HAS_TF = False
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import EarlyStopping
    HAS_TF = True
    print(f"   TensorFlow version: {tf.__version__}")
except ImportError:
    print("   ⚠️ TensorFlow not found — skipping LSTM model")

# =============================================================================
# CONFIGURATION
# =============================================================================
CONFIG = {
    'COMMODITY': 'Tomato',
    'STATE': None,
    'MARKET': None,
    'TARGET_COL': 'Modal Price (Rs./Quintal)',
    'FORECAST_DAYS': 14,
    'TRAIN_SPLIT_RATIO': 0.85,
    'LAG_DAYS': [1, 2, 3, 5, 7, 14, 21, 30],
    'ROLLING_WINDOWS': [7, 14, 30],
    'RANDOM_STATE': 42,
}

print(f"\n📋 Configuration:")
for k, v in CONFIG.items():
    print(f"   {k}: {v}")

# =============================================================================
# DATA LOADING
# =============================================================================
print("\n" + "="*70)
print("📂 STEP 1: DATA LOADING")
print("="*70)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'dATASET')
print(f"📂 Dataset path: {DATA_DIR}")

commodity_files = [f.replace('.csv', '') for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
print(f"\n📦 Total commodities available: {len(commodity_files)}")

commodity_file = os.path.join(DATA_DIR, f"{CONFIG['COMMODITY']}.csv")
if not os.path.exists(commodity_file):
    for f in os.listdir(DATA_DIR):
        if f.lower() == f"{CONFIG['COMMODITY'].lower()}.csv":
            commodity_file = os.path.join(DATA_DIR, f)
            break
    else:
        raise FileNotFoundError(f"❌ '{CONFIG['COMMODITY']}.csv' not found!")

df_raw = pd.read_csv(commodity_file)
print(f"\n✅ Loaded '{CONFIG['COMMODITY']}' data: {df_raw.shape[0]:,} rows × {df_raw.shape[1]} columns")
print(f"\n📊 Columns: {list(df_raw.columns)}")

# =============================================================================
# PREPROCESSING
# =============================================================================
print("\n" + "="*70)
print("🔧 STEP 2: PREPROCESSING")
print("="*70)

df = df_raw.copy()

date_col_candidates = ['Reported Date', 'Price Date', 'Date']
date_col = None
for col in date_col_candidates:
    if col in df.columns:
        date_col = col; break
if date_col is None:
    date_cols = [c for c in df.columns if 'date' in c.lower()]
    date_col = date_cols[0] if date_cols else None
    if not date_col:
        raise ValueError(f"❌ No date column found! Columns: {list(df.columns)}")

print(f"\n📅 Using date column: '{date_col}'")
df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')
df = df.dropna(subset=[date_col]).rename(columns={date_col: 'Date'})

if CONFIG['STATE']:
    df = df[df['State Name'] == CONFIG['STATE']]

if CONFIG['MARKET']:
    df = df[df['Market Name'] == CONFIG['MARKET']]
    selected_market = CONFIG['MARKET']
else:
    market_counts = df['Market Name'].value_counts()
    selected_market = market_counts.index[0]
    df = df[df['Market Name'] == selected_market]

print(f"   Selected Market: {selected_market} → {len(df):,} rows")
df = df.sort_values('Date').reset_index(drop=True)

price_cols = ['Min Price (Rs./Quintal)', 'Max Price (Rs./Quintal)', 'Modal Price (Rs./Quintal)']
available_price_cols = [c for c in price_cols if c in df.columns]

target_col = CONFIG['TARGET_COL']
if target_col not in df.columns:
    modal_candidates = [c for c in df.columns if 'modal' in c.lower()]
    target_col = modal_candidates[0] if modal_candidates else available_price_cols[-1]

df = df.dropna(subset=[target_col])
for col in available_price_cols:
    df[col] = df[col].ffill().bfill()
if 'Arrivals (Tonnes)' in df.columns:
    df['Arrivals (Tonnes)'] = df['Arrivals (Tonnes)'].ffill().bfill().fillna(0)

df = df[df[target_col] > 0]
q99, q01 = df[target_col].quantile(0.99), df[target_col].quantile(0.01)
df = df[(df[target_col] >= q01) & (df[target_col] <= q99)]

numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
df_daily = df.groupby('Date')[numeric_cols].mean().reset_index().sort_values('Date').reset_index(drop=True)

print(f"\n✅ Preprocessed: {len(df_daily):,} daily records")
print(f"   Date range: {df_daily['Date'].min()} to {df_daily['Date'].max()}")
print(f"   Price range: ₹{df_daily[target_col].min():.0f} – ₹{df_daily[target_col].max():.0f}")

# Save chart
fig, axes = plt.subplots(2, 1, figsize=(16, 10))
axes[0].plot(df_daily['Date'], df_daily[target_col], color='#2E86AB', linewidth=0.8)
axes[0].set_title(f'📈 {CONFIG["COMMODITY"]} — Modal Price Over Time ({selected_market})', fontsize=14, fontweight='bold')
axes[0].set_ylabel('Price (₹/Quintal)')
df_monthly = df_daily.set_index('Date').resample('M')[target_col].mean()
axes[1].bar(df_monthly.index, df_monthly.values, width=25, color='#A23B72', alpha=0.7)
axes[1].set_title('📊 Monthly Average Price', fontsize=14, fontweight='bold')
axes[1].set_ylabel('Avg Price (₹/Quintal)')
plt.tight_layout()
plt.savefig('price_overview.png', dpi=150, bbox_inches='tight')
print("💾 Saved: price_overview.png")

# =============================================================================
# FEATURE ENGINEERING
# =============================================================================
print("\n" + "="*70)
print("⚙️ STEP 3: FEATURE ENGINEERING")
print("="*70)

df_feat = df_daily[['Date', target_col]].copy()
if 'Arrivals (Tonnes)' in df_daily.columns:
    df_feat['Arrivals'] = df_daily['Arrivals (Tonnes)'].values
if 'Min Price (Rs./Quintal)' in df_daily.columns:
    df_feat['Min_Price'] = df_daily['Min Price (Rs./Quintal)'].values
if 'Max Price (Rs./Quintal)' in df_daily.columns:
    df_feat['Max_Price'] = df_daily['Max Price (Rs./Quintal)'].values
df_feat = df_feat.rename(columns={target_col: 'Price'})

for lag in CONFIG['LAG_DAYS']:
    df_feat[f'price_lag_{lag}'] = df_feat['Price'].shift(lag)

for window in CONFIG['ROLLING_WINDOWS']:
    df_feat[f'rolling_mean_{window}'] = df_feat['Price'].shift(1).rolling(window=window).mean()
    df_feat[f'rolling_std_{window}'] = df_feat['Price'].shift(1).rolling(window=window).std()
    df_feat[f'rolling_min_{window}'] = df_feat['Price'].shift(1).rolling(window=window).min()
    df_feat[f'rolling_max_{window}'] = df_feat['Price'].shift(1).rolling(window=window).max()

df_feat['price_change_1d'] = df_feat['Price'].pct_change(1)
df_feat['price_change_7d'] = df_feat['Price'].pct_change(7)
df_feat['price_momentum'] = df_feat['Price'] - df_feat['Price'].shift(7)
df_feat['ema_7'] = df_feat['Price'].shift(1).ewm(span=7, adjust=False).mean()
df_feat['ema_21'] = df_feat['Price'].shift(1).ewm(span=21, adjust=False).mean()

if 'Min_Price' in df_feat.columns and 'Max_Price' in df_feat.columns:
    df_feat['price_spread'] = df_feat['Max_Price'] - df_feat['Min_Price']

df_feat['year'] = df_feat['Date'].dt.year
df_feat['month'] = df_feat['Date'].dt.month
df_feat['quarter'] = df_feat['Date'].dt.quarter
df_feat['day_of_week'] = df_feat['Date'].dt.dayofweek
df_feat['day_of_month'] = df_feat['Date'].dt.day
df_feat['day_of_year'] = df_feat['Date'].dt.dayofyear
df_feat['week_of_year'] = df_feat['Date'].dt.isocalendar().week.astype(int)
df_feat['is_weekend'] = (df_feat['Date'].dt.dayofweek >= 5).astype(int)
df_feat['month_sin'] = np.sin(2 * np.pi * df_feat['month'] / 12)
df_feat['month_cos'] = np.cos(2 * np.pi * df_feat['month'] / 12)
df_feat['dow_sin'] = np.sin(2 * np.pi * df_feat['day_of_week'] / 7)
df_feat['dow_cos'] = np.cos(2 * np.pi * df_feat['day_of_week'] / 7)

df_feat = df_feat.dropna().reset_index(drop=True)
print(f"\n✅ Feature engineering complete: {df_feat.shape[0]:,} rows × {df_feat.shape[1]} columns")

feature_cols = [c for c in df_feat.columns if c not in ['Date', 'Price']]

# =============================================================================
# TRAIN/VAL SPLIT
# =============================================================================
print("\n" + "="*70)
print("📊 STEP 4: TRAIN/VALIDATION SPLIT")
print("="*70)

split_idx = int(len(df_feat) * CONFIG['TRAIN_SPLIT_RATIO'])
train_df = df_feat.iloc[:split_idx].copy()
val_df = df_feat.iloc[split_idx:].copy()

X_train = train_df[feature_cols]
y_train = train_df['Price']
X_val = val_df[feature_cols]
y_val = val_df['Price']

print(f"   Training:   {X_train.shape[0]:,} samples")
print(f"   Validation: {X_val.shape[0]:,} samples")

# =============================================================================
# XGBOOST MODEL
# =============================================================================
print("\n" + "="*70)
print("🚀 STEP 5: XGBOOST MODEL")
print("="*70)

xgb_model = xgb.XGBRegressor(
    n_estimators=1000, max_depth=7, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8, min_child_weight=5,
    reg_alpha=0.1, reg_lambda=1.0, random_state=42, n_jobs=-1,
    early_stopping_rounds=50,
)

xgb_model.fit(X_train, y_train, eval_set=[(X_train, y_train), (X_val, y_val)], verbose=100)

y_pred_train = xgb_model.predict(X_train)
y_pred_val = xgb_model.predict(X_val)

train_mae = mean_absolute_error(y_train, y_pred_train)
train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
val_mae = mean_absolute_error(y_val, y_pred_val)
val_rmse = np.sqrt(mean_squared_error(y_val, y_pred_val))
val_mape = np.mean(np.abs((y_val - y_pred_val) / y_val)) * 100

print(f"\n📊 XGBOOST: MAE ₹{val_mae:.2f} | RMSE ₹{val_rmse:.2f} | MAPE {val_mape:.2f}%")

# Save predictions chart
fig, ax = plt.subplots(figsize=(16, 6))
ax.plot(val_df['Date'], y_val, label='Actual', color='#2E86AB', linewidth=2)
ax.plot(val_df['Date'], y_pred_val, label='XGBoost Predicted', color='#E8451E', linewidth=2, linestyle='--')
ax.fill_between(val_df['Date'], y_val, y_pred_val, alpha=0.15, color='orange')
ax.set_title(f'XGBoost: Actual vs Predicted (MAE: ₹{val_mae:.2f})', fontsize=14, fontweight='bold')
ax.set_ylabel('Price (₹/Quintal)'); ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('xgboost_predictions.png', dpi=150, bbox_inches='tight')
print("💾 Saved: xgboost_predictions.png")

# =============================================================================
# WALK-FORWARD CV
# =============================================================================
print("\n" + "="*70)
print("🔄 STEP 6: WALK-FORWARD CV")
print("="*70)

cv_results = []
total_len = len(df_feat)
n_splits = 5
test_size = total_len // (n_splits + 1)

for fold in range(n_splits):
    train_end = total_len - (n_splits - fold) * test_size
    test_end = train_end + test_size
    tr, te = df_feat.iloc[:train_end], df_feat.iloc[train_end:test_end]
    if len(te) < 10: continue
    m = xgb.XGBRegressor(n_estimators=500, max_depth=6, learning_rate=0.05,
                          subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=-1,
                          early_stopping_rounds=30)
    m.fit(tr[feature_cols], tr['Price'], eval_set=[(te[feature_cols], te['Price'])], verbose=0)
    preds = m.predict(te[feature_cols])
    mae = mean_absolute_error(te['Price'], preds)
    rmse = np.sqrt(mean_squared_error(te['Price'], preds))
    cv_results.append({'fold': fold+1, 'mae': mae, 'rmse': rmse})
    print(f"   Fold {fold+1}: MAE ₹{mae:.2f} | RMSE ₹{rmse:.2f}")

cv_df = pd.DataFrame(cv_results)
print(f"\n   CV Mean MAE: ₹{cv_df['mae'].mean():.2f} ± ₹{cv_df['mae'].std():.2f}")

# =============================================================================
# FEATURE IMPORTANCE
# =============================================================================
print("\n" + "="*70)
print("📊 STEP 7: FEATURE IMPORTANCE")
print("="*70)

importance_df = pd.DataFrame({
    'Feature': feature_cols,
    'Importance': xgb_model.feature_importances_
}).sort_values('Importance', ascending=False)
print(importance_df.head(15).to_string(index=False))

fig, ax = plt.subplots(figsize=(12, 8))
top_n = min(20, len(importance_df))
plot_df = importance_df.head(top_n).sort_values('Importance')
ax.barh(plot_df['Feature'], plot_df['Importance'], color=plt.cm.viridis(np.linspace(0.3, 0.9, top_n)))
ax.set_xlabel('Importance'); ax.set_title(f'Top {top_n} Feature Importances — XGBoost', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('feature_importance.png', dpi=150, bbox_inches='tight')
print("💾 Saved: feature_importance.png")

# =============================================================================
# LSTM MODEL (if TensorFlow available)
# =============================================================================
lstm_mae = lstm_rmse = lstm_mape = None
if HAS_TF:
    print("\n" + "="*70)
    print("🧠 STEP 8: LSTM MODEL")
    print("="*70)

    SEQUENCE_LENGTH = 30
    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()
    X_scaled = scaler_X.fit_transform(df_feat[feature_cols].values)
    y_scaled = scaler_y.fit_transform(df_feat['Price'].values.reshape(-1, 1))

    def create_sequences(X, y, seq_len):
        Xs, ys = [], []
        for i in range(len(X) - seq_len):
            Xs.append(X[i:i+seq_len]); ys.append(y[i+seq_len])
        return np.array(Xs), np.array(ys)

    X_seq, y_seq = create_sequences(X_scaled, y_scaled, SEQUENCE_LENGTH)
    lstm_split = int(len(X_seq) * CONFIG['TRAIN_SPLIT_RATIO'])

    lstm_model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(SEQUENCE_LENGTH, len(feature_cols))),
        Dropout(0.2), LSTM(32, return_sequences=False), Dropout(0.2),
        Dense(16, activation='relu'), Dense(1)
    ])
    lstm_model.compile(optimizer='adam', loss='mse', metrics=['mae'])

    history = lstm_model.fit(
        X_seq[:lstm_split], y_seq[:lstm_split], epochs=100, batch_size=32,
        validation_data=(X_seq[lstm_split:], y_seq[lstm_split:]),
        callbacks=[EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)],
        verbose=1
    )

    y_pred_lstm = scaler_y.inverse_transform(lstm_model.predict(X_seq[lstm_split:])).flatten()
    y_actual_lstm = scaler_y.inverse_transform(y_seq[lstm_split:]).flatten()
    lstm_mae = mean_absolute_error(y_actual_lstm, y_pred_lstm)
    lstm_rmse = np.sqrt(mean_squared_error(y_actual_lstm, y_pred_lstm))
    lstm_mape = np.mean(np.abs((y_actual_lstm - y_pred_lstm) / y_actual_lstm)) * 100
    print(f"\n📊 LSTM: MAE ₹{lstm_mae:.2f} | RMSE ₹{lstm_rmse:.2f} | MAPE {lstm_mape:.2f}%")

    lstm_model.save('lstm_price_model.keras')
    print("💾 Saved: lstm_price_model.keras")

# =============================================================================
# FORECAST FUTURE PRICES
# =============================================================================
print("\n" + "="*70)
print("🔮 STEP 9: FORECAST FUTURE PRICES")
print("="*70)

last_data = df_feat.tail(30)
last_date = last_data['Date'].iloc[-1]
price_history = last_data['Price'].tolist()

print(f"   Last date: {last_date.strftime('%Y-%m-%d')}")
print(f"   Last price: ₹{price_history[-1]:.2f}")

forecasts = []
for day in range(1, CONFIG['FORECAST_DAYS'] + 1):
    future_date = last_date + timedelta(days=day)
    current_prices = price_history.copy()
    features = {}

    for lag in CONFIG['LAG_DAYS']:
        idx = len(current_prices) - lag
        features[f'price_lag_{lag}'] = current_prices[idx] if idx >= 0 else current_prices[0]
    for window in CONFIG['ROLLING_WINDOWS']:
        w = current_prices[-window:] if len(current_prices) >= window else current_prices
        features[f'rolling_mean_{window}'] = np.mean(w)
        features[f'rolling_std_{window}'] = np.std(w) if len(w) > 1 else 0
        features[f'rolling_min_{window}'] = np.min(w)
        features[f'rolling_max_{window}'] = np.max(w)

    features['price_change_1d'] = (current_prices[-1] - current_prices[-2]) / current_prices[-2] if len(current_prices) > 1 else 0
    features['price_change_7d'] = (current_prices[-1] - current_prices[-7]) / current_prices[-7] if len(current_prices) > 7 else 0
    features['price_momentum'] = current_prices[-1] - (current_prices[-7] if len(current_prices) > 7 else current_prices[0])
    features['ema_7'] = pd.Series(current_prices[-7:]).ewm(span=7, adjust=False).mean().iloc[-1]
    features['ema_21'] = pd.Series(current_prices[-21:]).ewm(span=21, adjust=False).mean().iloc[-1]
    if 'price_spread' in feature_cols: features['price_spread'] = np.std(current_prices[-7:])*2
    if 'Min_Price' in feature_cols: features['Min_Price'] = current_prices[-1]*0.9
    if 'Max_Price' in feature_cols: features['Max_Price'] = current_prices[-1]*1.1
    if 'Arrivals' in feature_cols:
        features['Arrivals'] = last_data['Arrivals'].iloc[-1] if 'Arrivals' in last_data.columns else 0

    features['year'] = future_date.year; features['month'] = future_date.month
    features['quarter'] = (future_date.month-1)//3+1; features['day_of_week'] = future_date.weekday()
    features['day_of_month'] = future_date.day; features['day_of_year'] = future_date.timetuple().tm_yday
    features['week_of_year'] = future_date.isocalendar()[1]
    features['is_weekend'] = 1 if future_date.weekday()>=5 else 0
    features['month_sin'] = np.sin(2*np.pi*future_date.month/12)
    features['month_cos'] = np.cos(2*np.pi*future_date.month/12)
    features['dow_sin'] = np.sin(2*np.pi*future_date.weekday()/7)
    features['dow_cos'] = np.cos(2*np.pi*future_date.weekday()/7)

    fv = pd.DataFrame([features])[feature_cols]
    pred = max(xgb_model.predict(fv)[0], 0)
    forecasts.append({'date': future_date.strftime('%Y-%m-%d'), 'day': future_date.strftime('%A'), 'price': round(float(pred), 2)})
    price_history.append(pred)

print("\n📊 Predicted Prices:")
for f in forecasts:
    print(f"   {f['date']} ({f['day'][:3]}): ₹{f['price']:,.2f}")

# Save forecast chart
fig, ax = plt.subplots(figsize=(14, 6))
recent = df_feat.tail(60)
ax.plot(recent['Date'], recent['Price'], label='Historical', color='#2E86AB', linewidth=2)
forecast_dates = [pd.Timestamp(f['date']) for f in forecasts]
forecast_prices = [f['price'] for f in forecasts]
ax.plot(forecast_dates, forecast_prices, label='Forecast', color='#E8451E', linewidth=2.5, marker='D', markersize=5, linestyle='--')
cv_std = cv_df['mae'].std()
ax.fill_between(forecast_dates, [p-cv_std*2 for p in forecast_prices], [p+cv_std*2 for p in forecast_prices],
                alpha=0.15, color='#E8451E', label='Confidence Band (±2σ)')
ax.axvline(x=df_feat['Date'].iloc[-1], color='gray', linestyle=':', alpha=0.7)
ax.set_title(f'🔮 {CONFIG["COMMODITY"]} Price Forecast — Next {CONFIG["FORECAST_DAYS"]} Days', fontsize=15, fontweight='bold')
ax.set_ylabel('Price (₹/Quintal)'); ax.legend(); ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('price_forecast.png', dpi=150, bbox_inches='tight')
print("💾 Saved: price_forecast.png")

# =============================================================================
# SAVE MODEL ARTIFACTS
# =============================================================================
print("\n" + "="*70)
print("💾 STEP 10: SAVING ARTIFACTS")
print("="*70)

# Historical data for charts (last 90 days)
historical = df_feat.tail(90)[['Date', 'Price']].copy()
historical['Date'] = historical['Date'].dt.strftime('%Y-%m-%d')

model_artifacts = {
    'model': xgb_model,
    'feature_cols': feature_cols,
    'config': CONFIG,
    'target_col': target_col,
    'selected_market': selected_market,
    'train_metrics': {'mae': float(train_mae), 'rmse': float(train_rmse)},
    'val_metrics': {'mae': float(val_mae), 'rmse': float(val_rmse), 'mape': float(val_mape)},
    'cv_results': cv_df.to_dict(orient='list'),
    'last_known_data': df_feat.tail(30).to_dict(orient='list'),
    'forecasts': forecasts,
    'historical_prices': historical.to_dict(orient='records'),
    'feature_importance': importance_df.head(15).to_dict(orient='records'),
    'lstm_metrics': {'mae': float(lstm_mae), 'rmse': float(lstm_rmse), 'mape': float(lstm_mape)} if lstm_mae else None,
    'comparison': {
        'XGBoost': {'mae': float(val_mae), 'rmse': float(val_rmse), 'mape': float(val_mape)},
    },
    'data_info': {
        'total_records': len(df_feat),
        'date_range': f"{df_feat['Date'].min().strftime('%Y-%m-%d')} to {df_feat['Date'].max().strftime('%Y-%m-%d')}",
        'num_features': len(feature_cols),
    },
}

if lstm_mae:
    model_artifacts['comparison']['LSTM'] = {'mae': float(lstm_mae), 'rmse': float(lstm_rmse), 'mape': float(lstm_mape)}

with open('price_prediction_model.pkl', 'wb') as f:
    pickle.dump(model_artifacts, f)
print(f"   ✅ Saved: price_prediction_model.pkl ({os.path.getsize('price_prediction_model.pkl')/(1024*1024):.2f} MB)")

# Also save as JSON for easy frontend consumption
frontend_data = {
    'commodity': CONFIG['COMMODITY'],
    'market': selected_market,
    'forecasts': forecasts,
    'historical': historical.to_dict(orient='records'),
    'metrics': {
        'XGBoost': {'mae': round(val_mae,2), 'rmse': round(val_rmse,2), 'mape': round(val_mape,2)},
    },
    'cv_mean_mae': round(cv_df['mae'].mean(), 2),
    'feature_importance': importance_df.head(10).to_dict(orient='records'),
    'data_info': model_artifacts['data_info'],
}
if lstm_mae:
    frontend_data['metrics']['LSTM'] = {'mae': round(lstm_mae,2), 'rmse': round(lstm_rmse,2), 'mape': round(lstm_mape,2)}

with open('price_forecast_data.json', 'w') as f:
    json.dump(frontend_data, f, indent=2, default=str)
print("   ✅ Saved: price_forecast_data.json")

print("\n" + "="*70)
print("✅ ALL DONE! Models trained and saved.")
print("="*70)
print(f"\n   XGBoost:  MAE ₹{val_mae:.2f} | RMSE ₹{val_rmse:.2f} | MAPE {val_mape:.2f}%")
if lstm_mae:
    print(f"   LSTM:     MAE ₹{lstm_mae:.2f} | RMSE ₹{lstm_rmse:.2f} | MAPE {lstm_mape:.2f}%")
print(f"\n   Forecast: {len(forecasts)} days ({forecasts[0]['date']} → {forecasts[-1]['date']})")
print(f"   Avg predicted price: ₹{np.mean([f['price'] for f in forecasts]):,.2f}")
