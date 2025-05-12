import json
import pandas as pd
import numpy as np
import joblib
from xgboost import XGBClassifier
from sklearn.preprocessing import OneHotEncoder, LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split, TimeSeriesSplit, cross_val_score
from collections import Counter
import logging
import sys
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def load_and_validate_data(file_path):
    logger.info("Loading data...")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        required_keys = ['page', 'navPath', 'userAgent', 'timestamp', 'loadTime', 'browser', 'device', 'screenWidth']
        valid_data = [entry for entry in data if all(k in entry for k in required_keys)]
        logger.info(f"Loaded {len(valid_data)} valid entries from {len(data)} total entries.")
        if not valid_data:
            raise ValueError("No valid data entries found.")
        return valid_data
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        raise

def extract_features(entry, data, i, transition_freq):
    try:
        nav_path = entry['navPath']
        prev_page = nav_path[-2].lower() if len(nav_path) >= 2 else 'none'
        current_page = entry['page'].lower()
        next_page = data[i+1]['page'].lower() if i < len(data)-1 else 'none'
        transition = f"{current_page}_{next_page}"
        features = {
            'page': current_page,
            'prev_page': prev_page,
            'device': entry['device'].lower(),
            'browser': entry['browser'].lower(),
            'screenWidth': entry['screenWidth'],
            'loadTime': entry['loadTime'],
            'transition_frequency': transition_freq.get(transition, 0)
        }
        logger.debug(f"Extracted features: {features}")
        return features
    except Exception as e:
        logger.error(f"Error extracting features: {e}")
        raise

def prepare_features_for_training(data):
    features_list = []
    next_pages = []
    transitions = [(data[i]['page'].lower(), data[i+1]['page'].lower()) for i in range(len(data)-1)]
    transition_freq = Counter(transitions)
    logger.info(f"Page transitions: {transition_freq}")

    for i in range(len(data) - 1):
        current = data[i]
        next_entry = data[i + 1]
        features = extract_features(current, data, i, transition_freq)
        next_page = next_entry['page'].lower()
        features_list.append(features)
        next_pages.append(next_page)

    if not features_list:
        logger.error("No features extracted.")
        raise ValueError("No features extracted.")

    df = pd.DataFrame(features_list)
    logger.info(f"DataFrame columns: {df.columns.tolist()}")

    categorical_cols = ['page', 'prev_page', 'device', 'browser']
    numeric_cols = ['screenWidth', 'loadTime', 'transition_frequency']

    ohe = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
    encoded_cols = pd.DataFrame(
        ohe.fit_transform(df[categorical_cols]),
        columns=ohe.get_feature_names_out(categorical_cols)
    )
    logger.info(f"One-hot encoded columns: {ohe.get_feature_names_out(categorical_cols).tolist()}")

    features = pd.concat([df[numeric_cols], encoded_cols], axis=1)
    scaler = StandardScaler()
    features[numeric_cols] = scaler.fit_transform(features[numeric_cols])
    logger.info(f"Feature shape after scaling: {features.shape}")

    feature_names = features.columns.tolist()
    logger.info(f"Final feature names: {feature_names}, count: {len(feature_names)}")

    page_encoder = LabelEncoder()
    y_encoded = page_encoder.fit_transform(next_pages)
    logger.info(f"Page encoder classes: {page_encoder.classes_}")

    return features, ohe, page_encoder, y_encoded, scaler, feature_names, transition_freq

def main():
    data = load_and_validate_data('predictpulse_mockdata.json')
    try:
        X, ohe, page_encoder, y_encoded, scaler, feature_names, transition_freq = prepare_features_for_training(data)
    except Exception as e:
        logger.error(f"Error preparing features: {e}")
        raise

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    logger.info(f"X_train shape: {X_train.shape}, X_test shape: {X_test.shape}")
    logger.info(f"y_train shape: {y_train.shape}, y_test shape: {y_test.shape}")

    clf = XGBClassifier(
        random_state=42,
        max_depth=5,
        n_estimators=300,
        learning_rate=0.05,
        min_child_weight=3,
        subsample=0.8,
        colsample_bytree=0.8,
        gamma=0.1,
        eval_metric='mlogloss'
    )
    class_counts = Counter(y_encoded)
    total_samples = len(y_encoded)
    n_classes = len(class_counts)
    class_weights = {i: (total_samples / (n_classes * count)) ** 1.5 for i, count in class_counts.items()}
    logger.info(f"Class weights: {class_weights}")
    sample_weights = np.array([class_weights[y] for y in y_train])
    logger.info(f"Sample weights shape: {sample_weights.shape}")

    clf.fit(X_train, y_train, sample_weight=sample_weights)

    # Cross-validation
    tscv = TimeSeriesSplit(n_splits=5)
    cv_scores = cross_val_score(clf, X, y_encoded, cv=tscv, scoring='accuracy')
    cv_mean = cv_scores.mean()
    cv_std = cv_scores.std()
    logger.info(f"Cross-validation accuracy: {cv_mean:.4f} ± {cv_std:.4f}")

    test_accuracy = clf.score(X_test, y_test)
    logger.info(f"Test accuracy: {test_accuracy:.4f}")

    feature_importance = pd.Series(clf.feature_importances_, index=X.columns).sort_values(ascending=False)
    logger.info(f"Feature importance:\n{feature_importance}")
    nonzero_features = feature_importance[feature_importance > 0].index.tolist()
    logger.info(f"Non-zero importance features: {nonzero_features}, count: {len(nonzero_features)}")

    joblib.dump(clf, 'model.joblib')
    joblib.dump(ohe, 'ohe_encoder.joblib')
    joblib.dump(page_encoder, 'page_encoder.joblib')
    joblib.dump(scaler, 'scaler.joblib')
    joblib.dump(feature_names, 'feature_names.joblib')
    joblib.dump(transition_freq, 'transition_freq.joblib')

    encoders = {
        'page': list(page_encoder.classes_),
        'browser': ['chrome', 'firefox', 'safari', 'mobile safari'],
        'device': ['iphone', 'mac', 'other']
    }
    os.makedirs('public', exist_ok=True)
    with open('public/encoders.json', 'w') as f:
        json.dump(encoders, f, indent=2)

    # Save results
    results = {
        'accuracy': test_accuracy,
        'cross_validation_accuracy': cv_mean,
        'cross_validation_std': cv_std
    }
    os.makedirs('results', exist_ok=True)
    with open('train_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    logger.info("Model, encoders, and feature names saved successfully.")

if __name__ == "__main__":
    main()