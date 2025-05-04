import pandas as pd
import json
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from ua_parser import user_agent_parser
import joblib
import numpy as np
import os

def load_data():
    data = []
    for file in ['predictpulse_mockdata.json', 'predictpulse_realdata.json']:
        if os.path.exists(file):
            try:
                with open(file, 'r') as f:
                    data.extend(json.load(f))
                print(f"Loaded data from {file}")
            except Exception as e:
                print(f"Error loading {file}: {e}")
    if not data:
        raise ValueError("No data loaded")
    return data

def preprocess_data(data):
    if not data:
        print("No data to preprocess")
        return pd.DataFrame()
    df = pd.DataFrame(data)
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    df = df.dropna(subset=['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    df['screenWidth'] = df['screenWidth'].astype(int, errors='ignore')
    df['loadTime'] = df['loadTime'].astype(float, errors='ignore')
    df['asset_count'] = df['assets'].apply(len)
    df['has_image'] = df['assets'].apply(lambda x: any(a['type'] == 'img' for a in x)).astype(int)
    df['prev_page'] = df['navPath'].apply(lambda x: x[-2] if len(x) >= 2 else x[-1])
    df['next_page'] = df['page'].shift(-1)
    df = df.dropna(subset=['next_page'])
    # New feature: device type
    df['device_type'] = df['userAgent'].apply(lambda x: user_agent_parser.Parse(x)['device']['family'] or 'Unknown')
    return df

def encode_features(df):
    if df.empty:
        print("Empty DataFrame for encoding")
        return df, {}
    encoders = {}
    # Label encoding for next_page
    encoders['next_page'] = LabelEncoder()
    df['next_page'] = encoders['next_page'].fit_transform(df['next_page'])
    # One-hot encoding for page, prev_page, device_type
    categorical_cols = ['page', 'prev_page', 'device_type']
    ohe = OneHotEncoder(sparse_output=False, handle_unknown='ignore')  # Changed sparse to sparse_output
    encoded_cols = pd.DataFrame(ohe.fit_transform(df[categorical_cols]), columns=ohe.get_feature_names_out(categorical_cols))
    df = pd.concat([df.drop(categorical_cols, axis=1).reset_index(drop=True), encoded_cols.reset_index(drop=True)], axis=1)
    encoders['ohe'] = ohe
    return df, encoders

def generate_js_model(clf, encoders, features):
    def tree_to_js(node, depth=0):
        indent = "  " * depth
        if clf.tree_.children_left[node] == -1:
            class_idx = np.argmax(clf.tree_.value[node])
            return f"{indent}return '{encoders['next_page'].classes_[class_idx]}';\n"
        feature = features[clf.tree_.feature[node]]
        threshold = clf.tree_.threshold[node]
        left = clf.tree_.children_left[node]
        right = clf.tree_.children_right[node]
        condition = f"data['{feature}'] <= {threshold}"
        return (
            f"{indent}if ({condition}) {{\n" +
            tree_to_js(left, depth + 1) +
            f"{indent}}} else {{\n" +
            tree_to_js(right, depth + 1) +
            f"{indent}}}\n"
        )

    js_code = "export function predictNextPage(data) {\n" + tree_to_js(0) + "}\n"
    with open('src/utils/predictNextPage.js', 'w') as f:
        f.write(js_code)

def train_model(df):
    if df.empty:
        print("Empty DataFrame for training")
        return None, None
    # Explicitly select numeric and relevant features
    features = ['hour', 'screenWidth', 'loadTime', 'asset_count', 'has_image'] + \
               [col for col in df.columns if col.startswith('page_') or col.startswith('prev_page_') or col.startswith('device_type_')]
    df = df.dropna(subset=features + ['next_page'])
    if df.empty:
        print("No valid training data")
        return None, None
    X = df[features]
    y = df['next_page']
    clf = DecisionTreeClassifier(max_depth=5, min_samples_split=20, min_samples_leaf=10, random_state=42)
    clf.fit(X, y)
    return clf, features

def main():
    data = load_data()
    df = preprocess_data(data)
    df, encoders = encode_features(df)
    clf, features = train_model(df)
    if clf:
        joblib.dump(clf, 'model.joblib')
        with open('public/encoders.json', 'w') as f:
            json.dump({
                'next_page': list(encoders['next_page'].classes_),
                'ohe_categories': [list(cat) for cat in encoders['ohe'].categories_]
            }, f, indent=2)
        generate_js_model(clf, encoders, features)

if __name__ == "__main__":
    main()