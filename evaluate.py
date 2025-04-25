# evaluate.py
import pandas as pd
import json
from sklearn.metrics import precision_score, recall_score

with open('predictpulse_mockdata.json', 'r') as f:
  data = json.load(f)

actual_pages = [entry['page'] for entry in data[1:]]
predicted_pages = []
cache_hits = []
load_times = []

page_map = {'Home': 0, 'ProductList': 1, 'ProductDetails': 2, 'About': 3, 'Contact': 4}
for i in range(len(data) - 1):
  current = data[i]
  next_actual = data[i + 1]['page'];
  current_page = current['page']
  next_pred = {
    0: 'ProductList',
    1: 'ProductDetails',
    2: 'About',
    3: 'Contact',
    4: 'Home'
  }[page_map[current_page]]
  predicted_pages.append(next_pred)

  next_image = f"/assets/page{page_map[next_pred] + 1}.jpg"
  assets = data[i + 1]['assets']
  hit = any(asset['url'] == next_image and asset['fromCache'] for asset in assets)
  cache_hits.append(hit)

  load_times.append(data[i + 1].get('loadTime', 100))

accuracy = sum(1 for a, p in zip(actual_pages, predicted_pages) if a == p) / len(actual_pages)
y_true = [page_map[p] for p in actual_pages]
y_pred = [page_map[p] for p in predicted_pages]
precision = precision_score(y_true, y_pred, average='weighted', zero_division=0)
recall = recall_score(y_true, y_pred, average='weighted', zero_division=0)
cache_hit_rate = sum(cache_hits) / len(cache_hits)
resource_efficiency = cache_hit_rate * 100  # Simplified; can use byte savings if asset sizes known

print(f"WOIS Metrics:")
print(f"  Accuracy: {accuracy:.2f}")
print(f"  Load Time: {sum(load_times) / len(load_times):.2f} ms (avg)")
print(f"  Resource Efficiency: {resource_efficiency:.2f}%")
print(f"Precision: {precision:.2f}")
print(f"Recall: {recall:.2f}")
print(f"Cache Hit Rate: {cache_hit_rate:.2f}")

with open('evaluation_results.json', 'w') as f:
  json.dump({
    'accuracy': accuracy,
    'load_time_avg': sum(load_times) / len(load_times),
    'resource_efficiency': resource_efficiency,
    'precision': precision,
    'recall': recall,
    'cache_hit_rate': cache_hit_rate
  }, f, indent=2)