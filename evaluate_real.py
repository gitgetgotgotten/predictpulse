import pandas as pd
import json
from sklearn.metrics import precision_score, recall_score, f1_score
from sklearn.model_selection import cross_val_score
from ua_parser import user_agent_parser
import joblib
import numpy as np

# Load model and encoders
try:
    clf = joblib.load('model.joblib')
    with open('public/encoders.json', 'r') as f:
        encoders = json.load(f)
except Exception as e:
    print(f"Failed to load model or encoders: {e}")
    exit(1)

with open('predictpulse_realdata.json', 'r') as f:
    data = json.load(f)

# Validate data
data = [entry for entry in data if 'page' in entry and 'assets' in entry and 'navPath' in entry and 'loadTime' in entry]
if len(data) < 2:
    print("Insufficient valid data")
    exit(1)

actual_pages = [entry['page'] for entry in data[1:]]
predicted_pages = []
cache_hits = []
load_times = []

page_map = {page: idx for idx, page in enumerate(encoders['page'])}
le_device = encoders['device']
le_os = encoders['os']
le_browser = encoders['browser']

for i in range(len(data) - 1):
    current = data[i]
    next_actual = data[i + 1]['page']
    current_page = current['page']
    if current_page not in page_map:
        continue

    timestamp = pd.to_datetime(current['timestamp'])
    hour = timestamp.hour
    ua = user_agent_parser.Parse(current['userAgent'])
    device = ua['device']['family'] or 'Unknown'
    os = ua['os']['family'] or 'Unknown'
    browser = ua['user_agent']['family'] or 'Unknown'
    screen_width = current['screenWidth']
    load_time = current['loadTime']
    prev_page = current['navPath'][-2] if len(current['navPath']) > 1 else current_page
    asset_count = len(current['assets'])
    has_image = any(asset['type'] == 'img' for asset in current['assets'])

    # Encode features
    device_encoded = le_device.index(device) if device in le_device else 0
    os_encoded = le_os.index(os) if os in le_os else 0
    browser_encoded = le_browser.index(browser) if browser in le_browser else 0
    current_page_encoded = page_map[current_page]
    prev_page_encoded = page_map[prev_page]
    has_image_encoded = int(has_image)

    # Prepare feature vector
    features = pd.DataFrame(
        [[hour, screen_width, current_page_encoded, prev_page_encoded, asset_count, has_image_encoded, load_time]],
        columns=['hour', 'screenWidth', 'page', 'prev_page', 'asset_count', 'has_image', 'loadTime']
    )

    # Predict next page
    pred_idx = clf.predict(features)[0]
    next_pred = encoders['page'][pred_idx]
    predicted_pages.append(next_pred)

    # Count cached assets
    assets = data[i + 1]['assets']
    cached_assets = sum(1 for asset in assets if asset['fromCache'])
    cache_hits.append(cached_assets > 0)
    load_times.append(data[i + 1]['loadTime'])

if not actual_pages:
    print("No valid page transitions")
    exit(1)

# Cross-validation
features_df = pd.DataFrame([
    [pd.to_datetime(d['timestamp']).hour, d['screenWidth'], page_map[d['page']],
     page_map[d['navPath'][-2] if len(d['navPath']) > 1 else d['page']],
     len(d['assets']), int(any(a['type'] == 'img' for a in d['assets'])), d['loadTime']]
    for d in data[:-1]
], columns=['hour', 'screenWidth', 'page', 'prev_page', 'asset_count', 'has_image', 'loadTime'])
cv_scores = cross_val_score(clf, features_df, [page_map[p] for p in actual_pages], cv=5, scoring='accuracy')

accuracy = sum(1 for a, p in zip(actual_pages, predicted_pages) if a == p) / len(actual_pages)
y_true = [page_map[p] for p in actual_pages]
y_pred = [page_map[p] for p in predicted_pages]
precision = precision_score(y_true, y_pred, average='weighted', zero_division=0)
recall = recall_score(y_true, y_pred, average='weighted', zero_division=0)
f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)
cache_hit_rate = sum(cache_hits) / len(cache_hits)
resource_efficiency = cache_hit_rate * 100

with open('evaluation_results_real.json', 'w') as f:
    json.dump({
        'accuracy': accuracy,
        'load_time_avg': sum(load_times) / len(load_times),
        'resource_efficiency': resource_efficiency,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'cross_validation_accuracy': cv_scores.mean(),
        'cross_validation_std': cv_scores.std()
    }, f, indent=2)