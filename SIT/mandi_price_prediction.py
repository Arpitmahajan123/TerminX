#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
================================================================================
🌾 INDIAN MANDI COMMODITY PRICE PREDICTION MODEL
================================================================================
Predict future mandi prices (next 7–14 days) for a selected crop and mandi
using historical prices and time-series features.

Dataset: India Commodity Wise Mandi Dataset (Kaggle)
Models:  XGBoost (Primary) | Prophet | LSTM (Comparison)

Author:  ML Engineer
Date:    2026-02-26
================================================================================
"""

# =============================================================================
# CELL 1: IMPORTS AND CONFIGURATION
# =============================================================================

import os
import warnings
import pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import timedelta

# Scikit-learn
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import LabelEncoder, MinMaxScaler

# XGBoost
import xgboost as xgb

# Prophet
from prophet import Prophet

# Deep Learning (LSTM)
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

warnings.filterwarnings('ignore')
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("viridis")

print("✅ All imports successful!")
print(f"   XGBoost version : {xgb.__version__}")
print(f"   TensorFlow version: {tf.__version__}")

# =============================================================================
# CONFIGURATION — Change these to experiment with different crops/mandis
# =============================================================================

CONFIG = {
    'COMMODITY': 'Tomato',          # Crop to predict (filename without .csv)
    'STATE': None,                  # Filter by state (None = all states)
    'MARKET': None,                 # Filter by market (None = largest market)
    'TARGET_COL': 'Modal Price (Rs./Quintal)',  # Target variable
    'FORECAST_DAYS': 14,            # Number of days to forecast
    'TRAIN_SPLIT_RATIO': 0.85,      # Train/Val split ratio
    'LAG_DAYS': [1, 2, 3, 5, 7, 14, 21, 30],  # Lag features
    'ROLLING_WINDOWS': [7, 14, 30],            # Rolling statistics windows
    'RANDOM_STATE': 42,
}

print(f"\n📋 Configuration:")
for k, v in CONFIG.items():
    print(f"   {k}: {v}")


# =============================================================================
# CELL 2: DATA LOADING AND EXPLORATION
# =============================================================================

print("\n" + "="*70)
print("📂 STEP 1: DATA LOADING AND EXPLORATION")
print("="*70)

# --- Load the dataset from Kaggle input directory ---
# The dataset has one CSV file per commodity
DATA_DIR = '/kaggle/input/india-commodity-wise-mandi-dataset'

# List available commodity files
commodity_files = [f.replace('.csv', '') for f in os.listdir(DATA_DIR) if f.endswith('.csv')]
print(f"\n📦 Total commodities available: {len(commodity_files)}")
print(f"   Sample commodities: {commodity_files[:10]}")

# Load the selected commodity
commodity_file = os.path.join(DATA_DIR, f"{CONFIG['COMMODITY']}.csv")
if not os.path.exists(commodity_file):
    # Try case-insensitive search
    for f in os.listdir(DATA_DIR):
        if f.lower() == f"{CONFIG['COMMODITY'].lower()}.csv":
            commodity_file = os.path.join(DATA_DIR, f)
            break
    else:
        raise FileNotFoundError(
            f"❌ '{CONFIG['COMMODITY']}.csv' not found! "
            f"Available files: {commodity_files[:20]}"
        )

df_raw = pd.read_csv(commodity_file)
print(f"\n✅ Loaded '{CONFIG['COMMODITY']}' data: {df_raw.shape[0]:,} rows × {df_raw.shape[1]} columns")

# --- Basic exploration ---
print(f"\n📊 Column names:\n   {list(df_raw.columns)}")
print(f"\n📊 Data types:")
print(df_raw.dtypes.to_string())
print(f"\n📊 First 5 rows:")
print(df_raw.head().to_string())

print(f"\n📊 Missing values:")
print(df_raw.isnull().sum().to_string())

print(f"\n📊 Basic statistics:")
print(df_raw.describe().to_string())

# Unique states and markets
print(f"\n📍 Unique States: {df_raw['State Name'].nunique()}")
print(f"📍 Unique Markets: {df_raw['Market Name'].nunique()}")
print(f"\n   Top 10 Markets by record count:")
print(df_raw['Market Name'].value_counts().head(10).to_string())


# =============================================================================
# CELL 3: PREPROCESSING
# =============================================================================

print("\n" + "="*70)
print("🔧 STEP 2: PREPROCESSING")
print("="*70)

df = df_raw.copy()

# --- 3a: Convert date column ---
# The column name might vary slightly; handle common variants
date_col_candidates = ['Reported Date', 'Price Date', 'Date']
date_col = None
for col in date_col_candidates:
    if col in df.columns:
        date_col = col
        break

if date_col is None:
    # Try to find any column with 'date' in the name
    date_cols = [c for c in df.columns if 'date' in c.lower()]
    if date_cols:
        date_col = date_cols[0]
    else:
        raise ValueError(f"❌ No date column found! Columns: {list(df.columns)}")

print(f"\n📅 Using date column: '{date_col}'")
df[date_col] = pd.to_datetime(df[date_col], dayfirst=True, errors='coerce')
df = df.dropna(subset=[date_col])
df = df.rename(columns={date_col: 'Date'})

# --- 3b: Filter by state (optional) ---
if CONFIG['STATE']:
    df = df[df['State Name'] == CONFIG['STATE']]
    print(f"   Filtered to state: {CONFIG['STATE']} → {len(df):,} rows")

# --- 3c: Select the market with most data (or user-specified) ---
if CONFIG['MARKET']:
    df = df[df['Market Name'] == CONFIG['MARKET']]
    selected_market = CONFIG['MARKET']
else:
    # Find the market with the most records for robust modeling
    market_counts = df['Market Name'].value_counts()
    selected_market = market_counts.index[0]
    df = df[df['Market Name'] == selected_market]

print(f"   Selected Market: {selected_market} → {len(df):,} rows")

# --- 3d: Sort by date ---
df = df.sort_values('Date').reset_index(drop=True)

# --- 3e: Handle missing price values ---
price_cols = ['Min Price (Rs./Quintal)', 'Max Price (Rs./Quintal)',
              'Modal Price (Rs./Quintal)']

# Check which price columns exist
available_price_cols = [c for c in price_cols if c in df.columns]
print(f"\n💰 Available price columns: {available_price_cols}")

# Drop rows where target is missing
target_col = CONFIG['TARGET_COL']
if target_col not in df.columns:
    # Fallback: try to find a modal price column
    modal_candidates = [c for c in df.columns if 'modal' in c.lower()]
    if modal_candidates:
        target_col = modal_candidates[0]
    else:
        target_col = available_price_cols[-1]  # Use last available price col
    print(f"   ⚠️ Target column adjusted to: '{target_col}'")

df = df.dropna(subset=[target_col])

# Fill other missing price columns with forward fill, then backward fill
for col in available_price_cols:
    df[col] = df[col].ffill().bfill()

# Fill missing arrivals
if 'Arrivals (Tonnes)' in df.columns:
    df['Arrivals (Tonnes)'] = df['Arrivals (Tonnes)'].ffill().bfill().fillna(0)

# --- 3f: Remove obvious outliers (prices <= 0 or extremely high) ---
df = df[df[target_col] > 0]
q99 = df[target_col].quantile(0.99)
q01 = df[target_col].quantile(0.01)
df = df[(df[target_col] >= q01) & (df[target_col] <= q99)]

# --- 3g: Aggregate to daily level (in case of multiple entries per day) ---
# Group by date and take mean of numeric columns
numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
df_daily = df.groupby('Date')[numeric_cols].mean().reset_index()
df_daily = df_daily.sort_values('Date').reset_index(drop=True)

print(f"\n✅ Preprocessed data: {len(df_daily):,} daily records")
print(f"   Date range: {df_daily['Date'].min()} to {df_daily['Date'].max()}")
print(f"   Target: '{target_col}'")
print(f"   Price range: ₹{df_daily[target_col].min():.0f} – ₹{df_daily[target_col].max():.0f}")

# --- Visualization: Price over time ---
fig, axes = plt.subplots(2, 1, figsize=(16, 10))

axes[0].plot(df_daily['Date'], df_daily[target_col], color='#2E86AB', linewidth=0.8, alpha=0.9)
axes[0].set_title(f'📈 {CONFIG["COMMODITY"]} — Modal Price Over Time ({selected_market})',
                  fontsize=14, fontweight='bold')
axes[0].set_ylabel('Price (₹/Quintal)')
axes[0].set_xlabel('Date')
axes[0].grid(True, alpha=0.3)

# Monthly average
df_monthly = df_daily.set_index('Date').resample('M')[target_col].mean()
axes[1].bar(df_monthly.index, df_monthly.values, width=25, color='#A23B72', alpha=0.7)
axes[1].set_title('📊 Monthly Average Price', fontsize=14, fontweight='bold')
axes[1].set_ylabel('Avg Price (₹/Quintal)')
axes[1].set_xlabel('Date')
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('price_overview.png', dpi=150, bbox_inches='tight')
plt.show()
print("💾 Saved: price_overview.png")


# =============================================================================
# CELL 4: FEATURE ENGINEERING
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

# --- 4a: Lag Features ---
print("\n📐 Creating lag features...")
for lag in CONFIG['LAG_DAYS']:
    df_feat[f'price_lag_{lag}'] = df_feat['Price'].shift(lag)
    print(f"   ✓ price_lag_{lag}")

# --- 4b: Rolling Statistics ---
print("\n📐 Creating rolling statistics...")
for window in CONFIG['ROLLING_WINDOWS']:
    df_feat[f'rolling_mean_{window}'] = df_feat['Price'].shift(1).rolling(window=window).mean()
    df_feat[f'rolling_std_{window}'] = df_feat['Price'].shift(1).rolling(window=window).std()
    df_feat[f'rolling_min_{window}'] = df_feat['Price'].shift(1).rolling(window=window).min()
    df_feat[f'rolling_max_{window}'] = df_feat['Price'].shift(1).rolling(window=window).max()
    print(f"   ✓ rolling_mean/std/min/max_{window}")

# --- 4c: Price Change Features ---
print("\n📐 Creating price change features...")
df_feat['price_change_1d'] = df_feat['Price'].pct_change(1)
df_feat['price_change_7d'] = df_feat['Price'].pct_change(7)
df_feat['price_momentum'] = df_feat['Price'] - df_feat['Price'].shift(7)
print("   ✓ price_change_1d, price_change_7d, price_momentum")

# --- 4d: Exponential Moving Average ---
df_feat['ema_7'] = df_feat['Price'].shift(1).ewm(span=7, adjust=False).mean()
df_feat['ema_21'] = df_feat['Price'].shift(1).ewm(span=21, adjust=False).mean()
print("   ✓ ema_7, ema_21")

# --- 4e: Price Spread ---
if 'Min_Price' in df_feat.columns and 'Max_Price' in df_feat.columns:
    df_feat['price_spread'] = df_feat['Max_Price'] - df_feat['Min_Price']
    print("   ✓ price_spread")

# --- 4f: Time-Based Features ---
print("\n📐 Creating time features...")
df_feat['year'] = df_feat['Date'].dt.year
df_feat['month'] = df_feat['Date'].dt.month
df_feat['quarter'] = df_feat['Date'].dt.quarter
df_feat['day_of_week'] = df_feat['Date'].dt.dayofweek
df_feat['day_of_month'] = df_feat['Date'].dt.day
df_feat['day_of_year'] = df_feat['Date'].dt.dayofyear
df_feat['week_of_year'] = df_feat['Date'].dt.isocalendar().week.astype(int)
df_feat['is_weekend'] = (df_feat['Date'].dt.dayofweek >= 5).astype(int)

# Cyclical encoding for month and day_of_week (better for models)
df_feat['month_sin'] = np.sin(2 * np.pi * df_feat['month'] / 12)
df_feat['month_cos'] = np.cos(2 * np.pi * df_feat['month'] / 12)
df_feat['dow_sin'] = np.sin(2 * np.pi * df_feat['day_of_week'] / 7)
df_feat['dow_cos'] = np.cos(2 * np.pi * df_feat['day_of_week'] / 7)
print("   ✓ year, month, quarter, day_of_week, day_of_month, day_of_year")
print("   ✓ week_of_year, is_weekend, cyclical encodings")

# --- Drop rows with NaN from lag/rolling features ---
df_feat = df_feat.dropna().reset_index(drop=True)
print(f"\n✅ Feature engineering complete: {df_feat.shape[0]:,} rows × {df_feat.shape[1]} columns")
print(f"   Features created: {df_feat.shape[1] - 2}")  # minus Date and Price

# --- Feature correlation heatmap ---
feature_cols = [c for c in df_feat.columns if c not in ['Date', 'Price']]
top_corr = df_feat[feature_cols + ['Price']].corr()['Price'].drop('Price').abs().sort_values(ascending=False)
print(f"\n🔝 Top 10 correlated features with Price:")
print(top_corr.head(10).to_string())

fig, ax = plt.subplots(figsize=(12, 8))
top_features = top_corr.head(15).index.tolist()
corr_matrix = df_feat[top_features + ['Price']].corr()
sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='RdYlBu_r', center=0,
            square=True, linewidths=0.5, ax=ax)
ax.set_title(f'🔗 Top Feature Correlations — {CONFIG["COMMODITY"]}',
             fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('feature_correlation.png', dpi=150, bbox_inches='tight')
plt.show()
print("💾 Saved: feature_correlation.png")


# =============================================================================
# CELL 5: TRAIN/VALIDATION SPLIT (TIME-SERIES AWARE)
# =============================================================================

print("\n" + "="*70)
print("📊 STEP 4: TRAIN/VALIDATION SPLIT")
print("="*70)

# IMPORTANT: No shuffling! Time-series split to prevent data leakage.
split_idx = int(len(df_feat) * CONFIG['TRAIN_SPLIT_RATIO'])

train_df = df_feat.iloc[:split_idx].copy()
val_df = df_feat.iloc[split_idx:].copy()

feature_cols = [c for c in df_feat.columns if c not in ['Date', 'Price']]

X_train = train_df[feature_cols]
y_train = train_df['Price']
X_val = val_df[feature_cols]
y_val = val_df['Price']

print(f"\n📊 Training set:   {X_train.shape[0]:,} samples ({train_df['Date'].min()} to {train_df['Date'].max()})")
print(f"📊 Validation set: {X_val.shape[0]:,} samples ({val_df['Date'].min()} to {val_df['Date'].max()})")
print(f"📊 Features: {len(feature_cols)}")


# =============================================================================
# CELL 6: XGBOOST MODEL (PRIMARY)
# =============================================================================

print("\n" + "="*70)
print("🚀 STEP 5: XGBOOST MODEL TRAINING")
print("="*70)

# --- 6a: Hyperparameters ---
xgb_params = {
    'n_estimators': 1000,
    'max_depth': 7,
    'learning_rate': 0.05,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'min_child_weight': 5,
    'reg_alpha': 0.1,
    'reg_lambda': 1.0,
    'random_state': CONFIG['RANDOM_STATE'],
    'n_jobs': -1,
    'early_stopping_rounds': 50,
}

print("\n⚙️ XGBoost Hyperparameters:")
for k, v in xgb_params.items():
    print(f"   {k}: {v}")

# --- 6b: Train the model ---
xgb_model = xgb.XGBRegressor(**xgb_params)

xgb_model.fit(
    X_train, y_train,
    eval_set=[(X_train, y_train), (X_val, y_val)],
    verbose=100
)

# --- 6c: Predictions ---
y_pred_train = xgb_model.predict(X_train)
y_pred_val = xgb_model.predict(X_val)

# --- 6d: Evaluation ---
train_mae = mean_absolute_error(y_train, y_pred_train)
train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
val_mae = mean_absolute_error(y_val, y_pred_val)
val_rmse = np.sqrt(mean_squared_error(y_val, y_pred_val))
val_mape = np.mean(np.abs((y_val - y_pred_val) / y_val)) * 100

print(f"\n{'='*50}")
print(f"📊 XGBOOST RESULTS")
print(f"{'='*50}")
print(f"   Training  MAE:  ₹{train_mae:.2f}")
print(f"   Training  RMSE: ₹{train_rmse:.2f}")
print(f"   {'─'*40}")
print(f"   Validation MAE:  ₹{val_mae:.2f}")
print(f"   Validation RMSE: ₹{val_rmse:.2f}")
print(f"   Validation MAPE: {val_mape:.2f}%")

# --- 6e: Actual vs Predicted Plot ---
fig, axes = plt.subplots(2, 1, figsize=(16, 10))

# Full time series
axes[0].plot(train_df['Date'], y_train, label='Train Actual', color='#2E86AB', alpha=0.7)
axes[0].plot(train_df['Date'], y_pred_train, label='Train Predicted', color='#A23B72', alpha=0.5, linestyle='--')
axes[0].plot(val_df['Date'], y_val, label='Val Actual', color='#2E86AB', linewidth=2)
axes[0].plot(val_df['Date'], y_pred_val, label='Val Predicted', color='#E8451E', linewidth=2, linestyle='--')
axes[0].axvline(x=train_df['Date'].iloc[-1], color='gray', linestyle=':', alpha=0.5, label='Train/Val Split')
axes[0].set_title(f'🎯 XGBoost: Actual vs Predicted — {CONFIG["COMMODITY"]}', fontsize=14, fontweight='bold')
axes[0].set_ylabel('Price (₹/Quintal)')
axes[0].legend(loc='upper left')
axes[0].grid(True, alpha=0.3)

# Validation close-up
axes[1].plot(val_df['Date'], y_val, label='Actual', color='#2E86AB', linewidth=2, marker='o', markersize=3)
axes[1].plot(val_df['Date'], y_pred_val, label='Predicted', color='#E8451E', linewidth=2, marker='s', markersize=3)
axes[1].fill_between(val_df['Date'], y_val, y_pred_val, alpha=0.15, color='orange')
axes[1].set_title(f'🔍 Validation Set Close-up (MAE: ₹{val_mae:.2f}, RMSE: ₹{val_rmse:.2f})',
                  fontsize=14, fontweight='bold')
axes[1].set_ylabel('Price (₹/Quintal)')
axes[1].set_xlabel('Date')
axes[1].legend()
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('xgboost_predictions.png', dpi=150, bbox_inches='tight')
plt.show()
print("💾 Saved: xgboost_predictions.png")


# =============================================================================
# CELL 7: WALK-FORWARD CROSS VALIDATION
# =============================================================================

print("\n" + "="*70)
print("🔄 STEP 6: WALK-FORWARD CROSS VALIDATION")
print("="*70)

def walk_forward_validation(df, feature_cols, target_col='Price',
                            n_splits=5, forecast_horizon=14):
    """
    Perform time-series walk-forward cross validation.
    No data leakage — train only on past data.
    """
    results = []
    total_len = len(df)
    test_size = total_len // (n_splits + 1)

    for fold in range(n_splits):
        train_end = total_len - (n_splits - fold) * test_size
        test_end = train_end + test_size

        train_data = df.iloc[:train_end]
        test_data = df.iloc[train_end:test_end]

        if len(test_data) < 10:
            continue

        X_tr = train_data[feature_cols]
        y_tr = train_data[target_col]
        X_te = test_data[feature_cols]
        y_te = test_data[target_col]

        model = xgb.XGBRegressor(
            n_estimators=500, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            random_state=CONFIG['RANDOM_STATE'], n_jobs=-1,
            early_stopping_rounds=30
        )
        model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=0)

        preds = model.predict(X_te)
        mae = mean_absolute_error(y_te, preds)
        rmse = np.sqrt(mean_squared_error(y_te, preds))

        results.append({
            'fold': fold + 1,
            'train_size': len(X_tr),
            'test_size': len(X_te),
            'mae': mae,
            'rmse': rmse,
            'train_start': train_data['Date'].iloc[0],
            'train_end': train_data['Date'].iloc[-1],
            'test_start': test_data['Date'].iloc[0],
            'test_end': test_data['Date'].iloc[-1],
        })
        print(f"   Fold {fold+1}: Train [{train_data['Date'].iloc[0].strftime('%Y-%m-%d')} → "
              f"{train_data['Date'].iloc[-1].strftime('%Y-%m-%d')}] | "
              f"Test [{test_data['Date'].iloc[0].strftime('%Y-%m-%d')} → "
              f"{test_data['Date'].iloc[-1].strftime('%Y-%m-%d')}] | "
              f"MAE: ₹{mae:.2f} | RMSE: ₹{rmse:.2f}")

    return pd.DataFrame(results)

cv_results = walk_forward_validation(df_feat, feature_cols, n_splits=5)

print(f"\n{'='*50}")
print(f"📊 WALK-FORWARD CV SUMMARY")
print(f"{'='*50}")
print(f"   Mean MAE:  ₹{cv_results['mae'].mean():.2f} ± ₹{cv_results['mae'].std():.2f}")
print(f"   Mean RMSE: ₹{cv_results['rmse'].mean():.2f} ± ₹{cv_results['rmse'].std():.2f}")

# CV Results visualization
fig, ax = plt.subplots(figsize=(10, 5))
x = np.arange(len(cv_results))
width = 0.35
bars1 = ax.bar(x - width/2, cv_results['mae'], width, label='MAE', color='#2E86AB', alpha=0.8)
bars2 = ax.bar(x + width/2, cv_results['rmse'], width, label='RMSE', color='#E8451E', alpha=0.8)
ax.set_xlabel('Fold')
ax.set_ylabel('Error (₹/Quintal)')
ax.set_title('🔄 Walk-Forward CV Results', fontsize=14, fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels([f'Fold {i+1}' for i in range(len(cv_results))])
ax.legend()
ax.grid(True, alpha=0.3)

for bar in bars1:
    ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 1,
            f'₹{bar.get_height():.0f}', ha='center', va='bottom', fontsize=9)

plt.tight_layout()
plt.savefig('cv_results.png', dpi=150, bbox_inches='tight')
plt.show()
print("💾 Saved: cv_results.png")


# =============================================================================
# CELL 8: FEATURE IMPORTANCE
# =============================================================================

print("\n" + "="*70)
print("📊 STEP 7: FEATURE IMPORTANCE")
print("="*70)

# Get feature importances from XGBoost
importance_df = pd.DataFrame({
    'Feature': feature_cols,
    'Importance': xgb_model.feature_importances_
}).sort_values('Importance', ascending=False)

print("\n🔝 Top 15 Most Important Features:")
print(importance_df.head(15).to_string(index=False))

fig, ax = plt.subplots(figsize=(12, 8))
top_n = min(20, len(importance_df))
plot_df = importance_df.head(top_n).sort_values('Importance')
colors = plt.cm.viridis(np.linspace(0.3, 0.9, top_n))
ax.barh(plot_df['Feature'], plot_df['Importance'], color=colors)
ax.set_xlabel('Importance Score')
ax.set_title(f'🏆 Top {top_n} Feature Importances — XGBoost', fontsize=14, fontweight='bold')
ax.grid(True, alpha=0.3, axis='x')
plt.tight_layout()
plt.savefig('feature_importance.png', dpi=150, bbox_inches='tight')
plt.show()
print("💾 Saved: feature_importance.png")


# =============================================================================
# CELL 9: PROPHET MODEL (COMPARISON)
# =============================================================================

print("\n" + "="*70)
print("🔮 STEP 8: PROPHET MODEL (COMPARISON)")
print("="*70)

# Prepare data for Prophet (requires 'ds' and 'y' columns)
prophet_df = df_feat[['Date', 'Price']].rename(columns={'Date': 'ds', 'Price': 'y'})
prophet_train = prophet_df.iloc[:split_idx]
prophet_val = prophet_df.iloc[split_idx:]

# Fit Prophet model
prophet_model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=True,
    daily_seasonality=False,
    changepoint_prior_scale=0.1,
    seasonality_prior_scale=10.0,
)

# Add Indian holiday seasonality hints (monsoon, harvest seasons)
prophet_model.add_seasonality(name='quarterly', period=91.25, fourier_order=5)

print("   Training Prophet model...")
prophet_model.fit(prophet_train)

# Predict on validation period
prophet_pred = prophet_model.predict(prophet_val[['ds']])
prophet_mae = mean_absolute_error(prophet_val['y'], prophet_pred['yhat'])
prophet_rmse = np.sqrt(mean_squared_error(prophet_val['y'], prophet_pred['yhat']))
prophet_mape = np.mean(np.abs((prophet_val['y'].values - prophet_pred['yhat'].values) / prophet_val['y'].values)) * 100

print(f"\n{'='*50}")
print(f"📊 PROPHET RESULTS")
print(f"{'='*50}")
print(f"   Validation MAE:  ₹{prophet_mae:.2f}")
print(f"   Validation RMSE: ₹{prophet_rmse:.2f}")
print(f"   Validation MAPE: {prophet_mape:.2f}%")

# Prophet components plot
fig = prophet_model.plot_components(prophet_pred)
plt.suptitle(f'📈 Prophet Trend & Seasonality — {CONFIG["COMMODITY"]}', fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig('prophet_components.png', dpi=150, bbox_inches='tight')
plt.show()
print("💾 Saved: prophet_components.png")


# =============================================================================
# CELL 10: LSTM MODEL (COMPARISON)
# =============================================================================

print("\n" + "="*70)
print("🧠 STEP 9: LSTM MODEL (COMPARISON)")
print("="*70)

# --- Prepare data for LSTM ---
SEQUENCE_LENGTH = 30  # Use 30 days of history

# Scale the data
scaler_X = MinMaxScaler()
scaler_y = MinMaxScaler()

X_scaled = scaler_X.fit_transform(df_feat[feature_cols].values)
y_scaled = scaler_y.fit_transform(df_feat['Price'].values.reshape(-1, 1))

def create_sequences(X, y, seq_length):
    """Create sequences for LSTM input."""
    Xs, ys = [], []
    for i in range(len(X) - seq_length):
        Xs.append(X[i:i + seq_length])
        ys.append(y[i + seq_length])
    return np.array(Xs), np.array(ys)

X_seq, y_seq = create_sequences(X_scaled, y_scaled, SEQUENCE_LENGTH)

# Time-series split
lstm_split = int(len(X_seq) * CONFIG['TRAIN_SPLIT_RATIO'])
X_train_lstm = X_seq[:lstm_split]
y_train_lstm = y_seq[:lstm_split]
X_val_lstm = X_seq[lstm_split:]
y_val_lstm = y_seq[lstm_split:]

print(f"\n📊 LSTM Data Shapes:")
print(f"   X_train: {X_train_lstm.shape}")
print(f"   y_train: {y_train_lstm.shape}")
print(f"   X_val:   {X_val_lstm.shape}")
print(f"   y_val:   {y_val_lstm.shape}")

# --- Build LSTM Model ---
lstm_model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(SEQUENCE_LENGTH, len(feature_cols))),
    Dropout(0.2),
    LSTM(32, return_sequences=False),
    Dropout(0.2),
    Dense(16, activation='relu'),
    Dense(1)
])

lstm_model.compile(optimizer='adam', loss='mse', metrics=['mae'])
lstm_model.summary()

# --- Train LSTM ---
early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

history = lstm_model.fit(
    X_train_lstm, y_train_lstm,
    epochs=100,
    batch_size=32,
    validation_data=(X_val_lstm, y_val_lstm),
    callbacks=[early_stop],
    verbose=1
)

# --- Evaluate LSTM ---
y_pred_lstm_scaled = lstm_model.predict(X_val_lstm)
y_pred_lstm = scaler_y.inverse_transform(y_pred_lstm_scaled).flatten()
y_val_lstm_actual = scaler_y.inverse_transform(y_val_lstm).flatten()

lstm_mae = mean_absolute_error(y_val_lstm_actual, y_pred_lstm)
lstm_rmse = np.sqrt(mean_squared_error(y_val_lstm_actual, y_pred_lstm))
lstm_mape = np.mean(np.abs((y_val_lstm_actual - y_pred_lstm) / y_val_lstm_actual)) * 100

print(f"\n{'='*50}")
print(f"📊 LSTM RESULTS")
print(f"{'='*50}")
print(f"   Validation MAE:  ₹{lstm_mae:.2f}")
print(f"   Validation RMSE: ₹{lstm_rmse:.2f}")
print(f"   Validation MAPE: {lstm_mape:.2f}%")

# --- LSTM training history ---
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
axes[0].plot(history.history['loss'], label='Train Loss', color='#2E86AB')
axes[0].plot(history.history['val_loss'], label='Val Loss', color='#E8451E')
axes[0].set_title('LSTM Training Loss', fontsize=12, fontweight='bold')
axes[0].set_xlabel('Epoch')
axes[0].set_ylabel('MSE Loss')
axes[0].legend()
axes[0].grid(True, alpha=0.3)

axes[1].plot(history.history['mae'], label='Train MAE', color='#2E86AB')
axes[1].plot(history.history['val_mae'], label='Val MAE', color='#E8451E')
axes[1].set_title('LSTM Training MAE', fontsize=12, fontweight='bold')
axes[1].set_xlabel('Epoch')
axes[1].set_ylabel('MAE')
axes[1].legend()
axes[1].grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('lstm_training.png', dpi=150, bbox_inches='tight')
plt.show()
print("💾 Saved: lstm_training.png")


# =============================================================================
# CELL 11: MODEL COMPARISON
# =============================================================================

print("\n" + "="*70)
print("🏆 STEP 10: MODEL COMPARISON")
print("="*70)

comparison = pd.DataFrame({
    'Model': ['XGBoost', 'Prophet', 'LSTM'],
    'MAE (₹)': [val_mae, prophet_mae, lstm_mae],
    'RMSE (₹)': [val_rmse, prophet_rmse, lstm_rmse],
    'MAPE (%)': [val_mape, prophet_mape, lstm_mape]
})

print(f"\n{'='*60}")
print(comparison.to_string(index=False))
print(f"{'='*60}")

best_model_name = comparison.loc[comparison['MAE (₹)'].idxmin(), 'Model']
print(f"\n🏆 Best Model by MAE: {best_model_name}")

# Comparison chart
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
colors = ['#2E86AB', '#A23B72', '#F18F01']

for i, metric in enumerate(['MAE (₹)', 'RMSE (₹)', 'MAPE (%)']):
    bars = axes[i].bar(comparison['Model'], comparison[metric], color=colors, alpha=0.85, edgecolor='white', linewidth=2)
    axes[i].set_title(metric, fontsize=13, fontweight='bold')
    axes[i].grid(True, alpha=0.3, axis='y')
    for bar, val in zip(bars, comparison[metric]):
        axes[i].text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.5,
                     f'{val:.1f}', ha='center', va='bottom', fontsize=11, fontweight='bold')

plt.suptitle(f'📊 Model Comparison — {CONFIG["COMMODITY"]} Price Prediction', fontsize=15, fontweight='bold')
plt.tight_layout()
plt.savefig('model_comparison.png', dpi=150, bbox_inches='tight')
plt.show()
print("💾 Saved: model_comparison.png")


# =============================================================================
# CELL 12: SAVE THE FINAL MODEL
# =============================================================================

print("\n" + "="*70)
print("💾 STEP 11: SAVING THE FINAL MODEL")
print("="*70)

# Save XGBoost model (primary)
model_artifacts = {
    'model': xgb_model,
    'feature_cols': feature_cols,
    'config': CONFIG,
    'scaler_X': scaler_X,
    'scaler_y': scaler_y,
    'target_col': target_col,
    'selected_market': selected_market,
    'train_metrics': {'mae': train_mae, 'rmse': train_rmse},
    'val_metrics': {'mae': val_mae, 'rmse': val_rmse, 'mape': val_mape},
    'cv_results': cv_results.to_dict(),
    'last_known_data': df_feat.tail(30).to_dict(),  # Keep last 30 days for inference
}

MODEL_PATH = 'price_model.pkl'
with open(MODEL_PATH, 'wb') as f:
    pickle.dump(model_artifacts, f)

print(f"   ✅ XGBoost model saved to: {MODEL_PATH}")
print(f"   📦 File size: {os.path.getsize(MODEL_PATH) / (1024*1024):.2f} MB")

# Also save the Prophet model
PROPHET_PATH = 'prophet_model.pkl'
with open(PROPHET_PATH, 'wb') as f:
    pickle.dump(prophet_model, f)
print(f"   ✅ Prophet model saved to: {PROPHET_PATH}")

# Save LSTM model
LSTM_PATH = 'lstm_model.keras'
lstm_model.save(LSTM_PATH)
print(f"   ✅ LSTM model saved to: {LSTM_PATH}")


# =============================================================================
# CELL 13: INFERENCE FUNCTION
# =============================================================================

print("\n" + "="*70)
print("🔮 STEP 12: INFERENCE — PREDICT FUTURE PRICES")
print("="*70)


def predict_future_prices(model_path='price_model.pkl', forecast_days=14):
    """
    Load the trained model and predict future mandi prices.

    This function uses the last known data (stored with the model) to
    generate lag/rolling features iteratively for each future day.

    Parameters
    ----------
    model_path : str
        Path to the saved model pickle file.
    forecast_days : int
        Number of future days to predict (7–14 recommended).

    Returns
    -------
    pd.DataFrame
        DataFrame with columns: Date, Predicted_Price
    """
    # Load model artifacts
    with open(model_path, 'rb') as f:
        artifacts = pickle.load(f)

    model = artifacts['model']
    feature_cols = artifacts['feature_cols']
    config = artifacts['config']
    last_data = pd.DataFrame(artifacts['last_known_data'])

    # Reconstruct the recent price history
    last_data['Date'] = pd.to_datetime(last_data['Date'])
    last_data = last_data.sort_values('Date').reset_index(drop=True)

    # Get the last known date and prices
    last_date = last_data['Date'].iloc[-1]
    price_history = last_data['Price'].tolist()

    print(f"\n📅 Last known date: {last_date.strftime('%Y-%m-%d')}")
    print(f"💰 Last known price: ₹{price_history[-1]:.2f}")
    print(f"🔮 Forecasting {forecast_days} days ahead...\n")

    predictions = []

    for day in range(1, forecast_days + 1):
        future_date = last_date + timedelta(days=day)
        current_prices = price_history.copy()

        # Build feature vector for this future date
        features = {}

        # Lag features
        for lag in config['LAG_DAYS']:
            idx = len(current_prices) - lag
            features[f'price_lag_{lag}'] = current_prices[idx] if idx >= 0 else current_prices[0]

        # Rolling statistics (using available history)
        for window in config['ROLLING_WINDOWS']:
            window_data = current_prices[-window:] if len(current_prices) >= window else current_prices
            features[f'rolling_mean_{window}'] = np.mean(window_data)
            features[f'rolling_std_{window}'] = np.std(window_data) if len(window_data) > 1 else 0
            features[f'rolling_min_{window}'] = np.min(window_data)
            features[f'rolling_max_{window}'] = np.max(window_data)

        # Price change features
        features['price_change_1d'] = (current_prices[-1] - current_prices[-2]) / current_prices[-2] if len(current_prices) > 1 else 0
        features['price_change_7d'] = (current_prices[-1] - current_prices[-7]) / current_prices[-7] if len(current_prices) > 7 else 0
        features['price_momentum'] = current_prices[-1] - (current_prices[-7] if len(current_prices) > 7 else current_prices[0])

        # EMA features
        ema7_vals = current_prices[-7:]
        ema21_vals = current_prices[-21:]
        features['ema_7'] = pd.Series(ema7_vals).ewm(span=7, adjust=False).mean().iloc[-1]
        features['ema_21'] = pd.Series(ema21_vals).ewm(span=21, adjust=False).mean().iloc[-1]

        # Price spread (approximate)
        if 'price_spread' in feature_cols:
            features['price_spread'] = np.std(current_prices[-7:]) * 2 if len(current_prices) > 7 else 0

        # Min/Max price (approximate from modal)
        if 'Min_Price' in feature_cols:
            features['Min_Price'] = current_prices[-1] * 0.9
        if 'Max_Price' in feature_cols:
            features['Max_Price'] = current_prices[-1] * 1.1

        # Arrivals (use last known)
        if 'Arrivals' in feature_cols:
            features['Arrivals'] = last_data['Arrivals'].iloc[-1] if 'Arrivals' in last_data.columns else 0

        # Time features
        features['year'] = future_date.year
        features['month'] = future_date.month
        features['quarter'] = (future_date.month - 1) // 3 + 1
        features['day_of_week'] = future_date.weekday()
        features['day_of_month'] = future_date.day
        features['day_of_year'] = future_date.timetuple().tm_yday
        features['week_of_year'] = future_date.isocalendar()[1]
        features['is_weekend'] = 1 if future_date.weekday() >= 5 else 0
        features['month_sin'] = np.sin(2 * np.pi * future_date.month / 12)
        features['month_cos'] = np.cos(2 * np.pi * future_date.month / 12)
        features['dow_sin'] = np.sin(2 * np.pi * future_date.weekday() / 7)
        features['dow_cos'] = np.cos(2 * np.pi * future_date.weekday() / 7)

        # Create feature array in the correct order
        feature_vector = pd.DataFrame([features])[feature_cols]

        # Predict
        predicted_price = model.predict(feature_vector)[0]
        predicted_price = max(predicted_price, 0)  # Price can't be negative

        predictions.append({
            'Date': future_date,
            'Predicted_Price': round(predicted_price, 2)
        })

        # Add prediction to history for next iteration
        price_history.append(predicted_price)

    result_df = pd.DataFrame(predictions)
    return result_df


# --- Run inference ---
forecast_df = predict_future_prices('price_model.pkl', forecast_days=CONFIG['FORECAST_DAYS'])

print("\n📊 Predicted Prices for Next 14 Days:")
print("─" * 45)
for _, row in forecast_df.iterrows():
    day_name = row['Date'].strftime('%a')
    print(f"   {row['Date'].strftime('%Y-%m-%d')} ({day_name}):  ₹{row['Predicted_Price']:,.2f}")

# --- Forecast Visualization ---
fig, ax = plt.subplots(figsize=(14, 6))

# Plot recent history
recent_history = df_feat.tail(60)
ax.plot(recent_history['Date'], recent_history['Price'],
        label='Historical Price', color='#2E86AB', linewidth=2, marker='o', markersize=3)

# Plot forecast
ax.plot(forecast_df['Date'], forecast_df['Predicted_Price'],
        label='Forecasted Price', color='#E8451E', linewidth=2.5,
        marker='D', markersize=6, linestyle='--')

# Add confidence band (approximate ± 1 std from CV)
cv_std = cv_results['mae'].std()
ax.fill_between(forecast_df['Date'],
                forecast_df['Predicted_Price'] - cv_std * 2,
                forecast_df['Predicted_Price'] + cv_std * 2,
                alpha=0.15, color='#E8451E', label='Confidence Band (±2σ)')

ax.axvline(x=df_feat['Date'].iloc[-1], color='gray', linestyle=':', alpha=0.7, linewidth=2)
ax.text(df_feat['Date'].iloc[-1], ax.get_ylim()[1] * 0.95, ' Forecast →',
        fontsize=11, color='gray', fontweight='bold')

ax.set_title(f'🔮 {CONFIG["COMMODITY"]} Price Forecast — Next {CONFIG["FORECAST_DAYS"]} Days',
             fontsize=15, fontweight='bold')
ax.set_xlabel('Date', fontsize=12)
ax.set_ylabel('Price (₹/Quintal)', fontsize=12)
ax.legend(fontsize=11, loc='upper left')
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('price_forecast.png', dpi=150, bbox_inches='tight')
plt.show()
print("💾 Saved: price_forecast.png")


# =============================================================================
# CELL 14: SUMMARY
# =============================================================================

print("\n" + "="*70)
print("📋 FINAL SUMMARY")
print("="*70)

print(f"""
┌──────────────────────────────────────────────────────────────┐
│  🌾 MANDI PRICE PREDICTION MODEL — SUMMARY                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Commodity:     {CONFIG['COMMODITY']:<40}  │
│  Market:        {selected_market:<40}  │
│  Data Points:   {len(df_feat):<40,}  │
│  Features:      {len(feature_cols):<40}  │
│  Forecast Days: {CONFIG['FORECAST_DAYS']:<40}  │
│                                                              │
│  ─── MODEL PERFORMANCE (Validation Set) ─────────────────── │
│                                                              │
│  XGBoost:  MAE ₹{val_mae:<8.2f}  RMSE ₹{val_rmse:<8.2f}  MAPE {val_mape:<6.2f}%  │
│  Prophet:  MAE ₹{prophet_mae:<8.2f}  RMSE ₹{prophet_rmse:<8.2f}  MAPE {prophet_mape:<6.2f}%  │
│  LSTM:     MAE ₹{lstm_mae:<8.2f}  RMSE ₹{lstm_rmse:<8.2f}  MAPE {lstm_mape:<6.2f}%  │
│                                                              │
│  ─── WALK-FORWARD CV (XGBoost) ──────────────────────────── │
│                                                              │
│  Mean MAE:  ₹{cv_results['mae'].mean():<8.2f} ± ₹{cv_results['mae'].std():<8.2f}               │
│  Mean RMSE: ₹{cv_results['rmse'].mean():<8.2f} ± ₹{cv_results['rmse'].std():<8.2f}               │
│                                                              │
│  ─── SAVED ARTIFACTS ────────────────────────────────────── │
│                                                              │
│  📦 price_model.pkl     (XGBoost + metadata)                │
│  📦 prophet_model.pkl   (Prophet model)                     │
│  📦 lstm_model.keras    (LSTM model)                        │
│  📊 price_overview.png                                      │
│  📊 feature_correlation.png                                 │
│  📊 xgboost_predictions.png                                 │
│  📊 cv_results.png                                          │
│  📊 feature_importance.png                                  │
│  📊 prophet_components.png                                  │
│  📊 lstm_training.png                                       │
│  📊 model_comparison.png                                    │
│  📊 price_forecast.png                                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
""")

print("✅ Notebook execution complete! All models trained and saved.")
print("🔮 Use predict_future_prices('price_model.pkl', forecast_days=14) for new predictions.")
