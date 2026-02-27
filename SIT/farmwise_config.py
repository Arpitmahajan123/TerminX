"""
FarmWise AI — Configuration & Crop Database
"""

# ═══════════════════════════════════════════════════════════
# CROP DATABASE — Agronomic parameters for supported crops
# ═══════════════════════════════════════════════════════════

CROP_DB = {
    'Tomato': {
        'maturity_days': (60, 85), 'optimal_temp': (20, 30),
        'critical_humidity': 80, 'rain_tolerance': 'low',
        'max_rain_harvest_mm': 5, 'price_volatility': 'high',
        'shelf_life_days': 7, 'spoilage_rate_per_day': 0.08,
        'harvest_season': ['Oct','Nov','Dec','Jan','Feb','Mar'],
        'cold_storage_temp': (8, 12), 'base_price': 2000,
    },
    'Wheat': {
        'maturity_days': (120, 150), 'optimal_temp': (15, 25),
        'critical_humidity': 70, 'rain_tolerance': 'medium',
        'max_rain_harvest_mm': 10, 'price_volatility': 'low',
        'shelf_life_days': 180, 'spoilage_rate_per_day': 0.002,
        'harvest_season': ['Mar','Apr','May'],
        'cold_storage_temp': (10, 15), 'base_price': 2200,
    },
    'Rice': {
        'maturity_days': (90, 150), 'optimal_temp': (20, 35),
        'critical_humidity': 85, 'rain_tolerance': 'high',
        'max_rain_harvest_mm': 15, 'price_volatility': 'medium',
        'shelf_life_days': 365, 'spoilage_rate_per_day': 0.001,
        'harvest_season': ['Oct','Nov','Dec'],
        'cold_storage_temp': (12, 18), 'base_price': 2500,
    },
    'Onion': {
        'maturity_days': (100, 150), 'optimal_temp': (15, 30),
        'critical_humidity': 75, 'rain_tolerance': 'low',
        'max_rain_harvest_mm': 3, 'price_volatility': 'very_high',
        'shelf_life_days': 30, 'spoilage_rate_per_day': 0.03,
        'harvest_season': ['Mar','Apr','May','Nov','Dec'],
        'cold_storage_temp': (0, 4), 'base_price': 1500,
    },
    'Potato': {
        'maturity_days': (75, 120), 'optimal_temp': (15, 25),
        'critical_humidity': 80, 'rain_tolerance': 'low',
        'max_rain_harvest_mm': 5, 'price_volatility': 'medium',
        'shelf_life_days': 60, 'spoilage_rate_per_day': 0.015,
        'harvest_season': ['Jan','Feb','Mar'],
        'cold_storage_temp': (2, 7), 'base_price': 1200,
    },
}

# ═══════════════════════════════════════════════════════════
# PRESERVATION ACTIONS DATABASE
# ═══════════════════════════════════════════════════════════

PRESERVATION_DB = [
    {'action': 'Cold Storage', 'cost_per_quintal': 150, 'effectiveness': 0.90,
     'shelf_extension_days': 30, 'applicable': ['Tomato','Potato','Onion']},
    {'action': 'Solar Drying', 'cost_per_quintal': 30, 'effectiveness': 0.70,
     'shelf_extension_days': 90, 'applicable': ['Tomato','Onion']},
    {'action': 'Hermetic Storage Bags', 'cost_per_quintal': 50, 'effectiveness': 0.85,
     'shelf_extension_days': 120, 'applicable': ['Wheat','Rice']},
    {'action': 'Ventilated Storage', 'cost_per_quintal': 20, 'effectiveness': 0.60,
     'shelf_extension_days': 15, 'applicable': ['Potato','Onion']},
    {'action': 'Zero Energy Cool Chamber', 'cost_per_quintal': 80, 'effectiveness': 0.75,
     'shelf_extension_days': 10, 'applicable': ['Tomato','Potato']},
    {'action': 'Waxing/Coating', 'cost_per_quintal': 40, 'effectiveness': 0.65,
     'shelf_extension_days': 7, 'applicable': ['Tomato']},
    {'action': 'Silica Gel Packets', 'cost_per_quintal': 25, 'effectiveness': 0.55,
     'shelf_extension_days': 60, 'applicable': ['Wheat','Rice']},
    {'action': 'Traditional Jute Bags (improved)', 'cost_per_quintal': 10, 'effectiveness': 0.40,
     'shelf_extension_days': 20, 'applicable': ['Wheat','Rice','Onion','Potato']},
]

# ═══════════════════════════════════════════════════════════
# MARKET DATABASE (sample markets with distances)
# ═══════════════════════════════════════════════════════════

MARKET_DB = {
    'Azadpur (Delhi)': {'state': 'Delhi', 'tier': 1, 'avg_volume': 5000, 'transit_base_hrs': 8},
    'Vashi (Mumbai)': {'state': 'Maharashtra', 'tier': 1, 'avg_volume': 4500, 'transit_base_hrs': 12},
    'Madanapalli': {'state': 'Andhra Pradesh', 'tier': 2, 'avg_volume': 2000, 'transit_base_hrs': 4},
    'Kolar': {'state': 'Karnataka', 'tier': 2, 'avg_volume': 1800, 'transit_base_hrs': 3},
    'Lasalgaon': {'state': 'Maharashtra', 'tier': 2, 'avg_volume': 3000, 'transit_base_hrs': 6},
    'Indore': {'state': 'Madhya Pradesh', 'tier': 2, 'avg_volume': 2500, 'transit_base_hrs': 7},
    'Local Mandi': {'state': 'Local', 'tier': 3, 'avg_volume': 500, 'transit_base_hrs': 1},
}

# ═══════════════════════════════════════════════════════════
# SEASONAL WEATHER BASELINES (IMD historical patterns)
# ═══════════════════════════════════════════════════════════

MONTHLY_RAIN_PROB = {
    1:0.05, 2:0.08, 3:0.10, 4:0.12, 5:0.15, 6:0.45,
    7:0.65, 8:0.60, 9:0.50, 10:0.25, 11:0.10, 12:0.05
}

MONTHLY_HUMIDITY = {
    1:(50,70), 2:(45,65), 3:(40,60), 4:(35,55), 5:(40,65), 6:(60,85),
    7:(70,95), 8:(75,95), 9:(65,90), 10:(55,80), 11:(50,75), 12:(50,70)
}

MONTHLY_TEMP = {
    1:15, 2:18, 3:25, 4:32, 5:36, 6:34,
    7:30, 8:29, 9:29, 10:27, 11:22, 12:17
}

# ═══════════════════════════════════════════════════════════
# MULTILINGUAL TEMPLATES
# ═══════════════════════════════════════════════════════════

LANG_TEMPLATES = {
    'en': {
        'harvest_now': "🟢 HARVEST NOW — Best window: {start} to {end}",
        'wait': "🟡 WAIT {days} days — Price expected to rise by ₹{gain}",
        'delay': "🔴 DELAY — {reason}",
        'risk_low': "Risk is LOW ({score}/100). Good conditions for harvest.",
        'risk_med': "Risk is MEDIUM ({score}/100). Monitor weather closely.",
        'risk_high': "Risk is HIGH ({score}/100). {advice}",
        'best_market': "Sell at {market} for best price (~₹{price}/quintal)",
        'spoilage': "Spoilage risk: {level} — {action} recommended (₹{cost}/quintal)",
        'reason_weather': "Weather is {cond} (rain {rain}%, humidity {hum}%)",
        'reason_price': "Price trend: {dir} by {pct}% in next 7 days",
        'reason_maturity': "Crop is {status} ({pct}% mature)",
    },
    'hi': {
        'harvest_now': "🟢 अभी काटें — सबसे अच्छा समय: {start} से {end}",
        'wait': "🟡 {days} दिन रुकें — कीमत ₹{gain} बढ़ने की उम्मीद",
        'delay': "🔴 रुकें — {reason}",
        'risk_low': "जोखिम कम है ({score}/100)। फसल काटने के लिए अच्छी स्थिति।",
        'risk_med': "जोखिम मध्यम है ({score}/100)। मौसम पर नज़र रखें।",
        'risk_high': "जोखिम अधिक है ({score}/100)। {advice}",
        'best_market': "{market} में बेचें — सबसे अच्छी कीमत (~₹{price}/क्विंटल)",
        'spoilage': "खराब होने का खतरा: {level} — {action} सुझाव (₹{cost}/क्विंटल)",
        'reason_weather': "मौसम {cond} है (बारिश {rain}%, नमी {hum}%)",
        'reason_price': "कीमत का रुझान: अगले 7 दिनों में {pct}% {dir}",
        'reason_maturity': "फसल {status} है ({pct}% पकी)",
    },
}
