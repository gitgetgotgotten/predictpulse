import pandas as pd
import json
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
import numpy as np

# Load mock data
with open('predictpulse_mockdata.json', 'r') as f:
    data = json.load(f)

# Prepare features and labels
features = []
labels = []

pages = ['Home', 'ProductList', 'ProductDetails', 'About', 'Contact']

for i in range(len(data) - 1):
    current = data[i]
    next_page = data[i + 1]['page']

    hour = pd.to_datetime(current['time']).hour
    device = current['device']
    os = current['os']
    browser = current['browser']
    screen_width = current['screen']['width']
    current_page = current['page']
    prev_page = current['navPath'][0] if len(current['navPath']) > 1 else current_page

    features.append([hour, device, os, browser, screen_width, current_page, prev_page])
    labels.append(next_page)

# Encode categorical features
le_device = LabelEncoder()
le_os = LabelEncoder()
le_browser = LabelEncoder()
le_page = LabelEncoder()

le_page.fit(pages)
features_df = pd.DataFrame(features, columns=['hour', 'device', 'os', 'browser', 'screen_width', 'current_page', 'prev_page'])
features_df['device'] = le_device.fit_transform(features_df['device'])
features_df['os'] = le_os.fit_transform(features_df['os'])
features_df['browser'] = le_browser.fit_transform(features_df['browser'])
features_df['current_page'] = le_page.transform(features_df['current_page'])
features_df['prev_page'] = le_page.transform(features_df['prev_page'])

# Encode labels
y = le_page.transform(labels)

# Train Decision Tree
clf = DecisionTreeClassifier(max_depth=5, random_state=42)
clf.fit(features_df, y)

# Export model as JS rules
def export_decision_tree(clf, feature_names, le_page):
    tree = clf.tree_
    lines = ["export function predictNextPage(hour, device_encoded, os_encoded, browser_encoded, screen_width, current_page_encoded, prev_page_encoded) {"]

    def recurse(node, depth, checked_features):
        indent = "  " * depth
        if tree.feature[node] != -2:  # Not a leaf
            feature = feature_names[tree.feature[node]]
            threshold = tree.threshold[node]
            # Skip if feature was already checked (avoids contradictory conditions)
            if feature in checked_features:
                recurse(tree.children_right[node], depth, checked_features)
                return
            if feature in ['hour', 'screen_width']:  # Continuous features
                lines.append(f"{indent}if ({feature} <= {threshold:.2f}) {{")
                recurse(tree.children_left[node], depth + 1, checked_features)
                lines.append(f"{indent}}} else {{")
                recurse(tree.children_right[node], depth + 1, checked_features)
                lines.append(f"{indent}}}")
            else:  # Categorical features
                lines.append(f"{indent}if ({feature}_encoded == {int(threshold)}) {{")
                recurse(tree.children_left[node], depth + 1, checked_features + [feature])
                lines.append(f"{indent}}} else {{")
                recurse(tree.children_right[node], depth + 1, checked_features + [feature])
                lines.append(f"{indent}}}")
        else:  # Leaf node
            class_idx = np.argmax(tree.value[node])
            page = le_page.inverse_transform([class_idx])[0]
            lines.append(f"{indent}return '{page}';")

    recurse(0, 1, [])
    lines.append("}")
    with open('src/utils/predictNextPage.js', 'w') as f:
        f.write('\n'.join(lines))

# Export rules
export_decision_tree(clf, features_df.columns, le_page)

# Save encoders
with open('./public/encoders.json', 'w') as f:
    json.dump({
        'device': le_device.classes_.tolist(),
        'os': le_os.classes_.tolist(),
        'browser': le_browser.classes_.tolist(),
        'page': le_page.classes_.tolist()
    }, f, indent=2)