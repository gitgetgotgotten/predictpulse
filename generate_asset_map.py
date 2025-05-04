# generate_asset_map.py
import json

def generate_asset_map(data, output_path):
    asset_map = {
        'Home': [],
        'ProductList': [],
        'ProductDetails': [],
        'About': [],
        'Contact': []
    }

    # Keep only the most recent log per page
    latest_logs = {}
    for entry in data:
        page = entry.get('page')
        if page not in asset_map:
            continue
        timestamp = entry.get('timestamp', '')
        timestamp_val = timestamp if timestamp else '0'
        if page not in latest_logs or timestamp_val > latest_logs[page]['timestamp']:
            latest_logs[page] = entry

    # Process assets from the latest logs
    for page in asset_map:
        if page not in latest_logs:
            continue
        entry = latest_logs[page]
        seen = set()
        deduped_assets = []
        for asset in entry.get('assets', []):
            key = (asset['url'], asset['type'])
            if key not in seen:
                seen.add(key)
                deduped_assets.append({
                    'url': asset['url'],
                    'type': asset['type'],
                    'fromCache': asset['fromCache']
                })
        asset_map[page] = deduped_assets

    with open(output_path, 'w') as f:
        json.dump(asset_map, f, indent=2)

if __name__ == '__main__':
    try:
        with open('predictpulse_mockdata.json', 'r') as f:
            mock_data = json.load(f)
        real_data = []
        try:
            with open('predictpulse_realdata.json', 'r') as f:
                real_data = json.load(f)
        except FileNotFoundError:
            pass
        data = mock_data + real_data
        generate_asset_map(data, 'public/asset_map.json')
    except Exception as e:
        print(f"Error generating asset map: {e}")
