import pandas as pd
import json
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
from collections import Counter
import joblib
import logging
import sys
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def load_model_and_encoders():
    logger.info("Loading model and encoders...")
    try:
        clf = joblib.load('model.joblib')
        ohe = joblib.load('ohe_encoder.joblib')
        page_encoder = joblib.load('page_encoder.joblib')
        scaler = joblib.load('scaler.joblib')
        feature_names = joblib.load('feature_names.joblib')
        transition_freq = joblib.load('transition_freq.joblib')
        with open('public/encoders.json', 'r') as f:
            encoders = json.load(f)
        logger.info(f"Page encoder classes: {page_encoder.classes_}")
        logger.info(f"Feature names: {feature_names}, count: {len(feature_names)}")
        return clf, ohe, encoders, page_encoder, scaler, feature_names, transition_freq
    except Exception as e:
        logger.error(f"Failed to load model or encoders: {e}")
        sys.exit(1)

def load_and_validate_data(file_path):
    logger.info("Loading data...")
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        required_keys = ['page', 'navPath', 'userAgent', 'timestamp', 'loadTime', 'browser', 'device', 'screenWidth']
        valid_data = [entry for entry in data if all(key in entry for key in required_keys)]
        logger.info(f"Loaded {len(valid_data)} valid entries from {len(data)} total entries")
        if len(valid_data) < 2:
            logger.error("Insufficient valid data points (need at least 2)")
            sys.exit(1)
        return valid_data
    except Exception as e:
        logger.error(f"Failed to load or validate data: {e}")
        sys.exit(1)

def filter_data_by_model_vocabulary(data, page_map):
    valid_data = [entry for entry in data if entry['page'].lower() in page_map]
    logger.info(f"Valid pages after filtering: {len(valid_data)}")
    return valid_data

def extract_features(entry, full_data, i, transition_freq):
    try:
        nav_path = entry['navPath']
        prev_page = nav_path[-2].lower() if len(nav_path) >= 2 else 'none'
        current_page = entry['page'].lower()
        next_page = full_data[i+1]['page'].lower() if i < len(full_data)-1 else 'none'
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

def prepare_features_for_prediction(features_dict, ohe, scaler, feature_names):
    categorical_data = pd.DataFrame(
        [[features_dict['page'], features_dict['prev_page'], features_dict['device'], features_dict['browser']]],
        columns=['page', 'prev_page', 'device', 'browser']
    )
    logger.debug(f"Categorical data: {categorical_data.to_dict()}")

    try:
        encoded_cols = pd.DataFrame(
            ohe.transform(categorical_data),
            columns=ohe.get_feature_names_out(['page', 'prev_page', 'device', 'browser'])
        )
        logger.debug(f"Encoded columns: {ohe.get_feature_names_out(['page', 'prev_page', 'device', 'browser']).tolist()}")
    except Exception as e:
        logger.warning(f"One-hot encoding failed: {e}. Using zeros.")
        encoded_cols = pd.DataFrame(
            [[0] * len(ohe.get_feature_names_out(['page', 'prev_page', 'device', 'browser']))],
            columns=ohe.get_feature_names_out(['page', 'prev_page', 'device', 'browser'])
        )

    numeric_data = pd.DataFrame(
        [[features_dict['screenWidth'], features_dict['loadTime'], features_dict['transition_frequency']]],
        columns=['screenWidth', 'loadTime', 'transition_frequency']
    )
    numeric_data = pd.DataFrame(
        scaler.transform(numeric_data),
        columns=numeric_data.columns
    )
    features = pd.concat([numeric_data, encoded_cols], axis=1)
    logger.debug(f"Features before alignment: {features.columns.tolist()}")

    for col in feature_names:
        if col not in features.columns:
            features[col] = 0
    features = features[feature_names]
    logger.info(f"Generated features: {features.columns.tolist()}, count: {len(features.columns)}")

    return features.to_numpy()

def count_cache_hits(assets):
    return sum(1 for asset in assets if asset.get('fromCache', False))

def main():
    clf, ohe, encoders, page_encoder, scaler, feature_names, transition_freq = load_model_and_encoders()
    full_data = load_and_validate_data('predictpulse_mockdata.json')
    page_map = {page: idx for idx, page in enumerate(encoders['page'])}
    valid_data = filter_data_by_model_vocabulary(full_data, page_map)
    valid_data.sort(key=lambda x: pd.to_datetime(x['timestamp']))

    actual_pages = []
    predicted_pages = []
    cache_hits = []
    load_times = []
    error_probs = []

    for i in range(len(valid_data) - 1):
        current = valid_data[i]
        next_entry = valid_data[i + 1]
        next_actual = next_entry['page'].lower()
        actual_pages.append(next_actual)

        features_dict = extract_features(current, full_data, i, transition_freq)
        try:
            features = prepare_features_for_prediction(features_dict, ohe, scaler, feature_names)
            pred_idx = clf.predict(features)[0]
            pred_proba = clf.predict_proba(features)[0]
            logger.info(f"Raw prediction: {pred_idx}, probabilities: {pred_proba}")
            next_pred = page_encoder.inverse_transform([int(pred_idx)])[0]
            logger.info(f"Predicted page: {next_pred}")
            predicted_pages.append(next_pred)
            if next_actual != next_pred:
                logger.warning(f"Incorrect prediction: actual={next_actual}, predicted={next_pred}, features={features_dict}, probs={pred_proba}")
                error_probs.append((next_actual, next_pred, pred_proba))
        except Exception as e:
            logger.error(f"Prediction failed: {e}, input features: {features_dict}")
            predicted_pages.append(features_dict['page'])

        cache_hits.append(count_cache_hits(next_entry['assets']) > 0)
        load_times.append(next_entry['loadTime'])

    if not actual_pages:
        logger.error("No valid predictions made.")
        sys.exit(1)

    correct_predictions = sum(1 for a, p in zip(actual_pages, predicted_pages) if a == p)
    total_predictions = len(actual_pages)
    accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
    logger.info(f"Correct predictions: {correct_predictions}, Total predictions: {total_predictions}")

    errors = Counter((a, p) for a, p in zip(actual_pages, predicted_pages) if a != p)
    logger.info(f"Error counts: {errors}")
    logger.info(f"Top error probabilities: {error_probs[:10]}")

    y_true = [page_map[a] for a in actual_pages if a in page_map]
    y_pred = [page_map[p] for p in predicted_pages if p in page_map]
    logger.info(f"y_true distribution: {Counter(y_true)}")
    logger.info(f"y_pred distribution: {Counter(y_pred)}")

    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(page_map))))
    logger.info(f"Confusion matrix:\n{cm}")

    precision = precision_score(y_true, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_true, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)

    cache_hit_rate = sum(cache_hits) / len(cache_hits) if cache_hits else 0.0
    resource_efficiency = cache_hit_rate * 100
    avg_load_time = sum(load_times) / len(load_times) if load_times else 0.0

    # Load cross-validation results from training
    try:
        with open('train_results.json', 'r') as f:
            train_results = json.load(f)
        cv_accuracy = train_results.get('cross_validation_accuracy', 0.0)
        cv_std = train_results.get('cross_validation_std', 0.0)
    except Exception as e:
        logger.warning(f"Failed to load train results: {e}")
        cv_accuracy, cv_std = 0.0, 0.0

    results = {
        'accuracy': accuracy,
        'load_time_avg': avg_load_time,
        'resource_efficiency': resource_efficiency,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'cross_validation_accuracy': cv_accuracy,
        'cross_validation_std': cv_std
    }

    os.makedirs('results', exist_ok=True)
    with open('evaluation_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    logger.info(f"Evaluation complete. Results saved to results/evaluation_results.json")
    logger.info(f"Accuracy: {accuracy:.4f}")
    logger.info(f"Precision: {precision:.4f}")
    logger.info(f"Recall: {recall:.4f}")
    logger.info(f"F1 Score: {f1:.4f}")
    logger.info(f"Resource Efficiency: {resource_efficiency:.2f}%")
    logger.info(f"Average Load Time: {avg_load_time:.2f}ms")
    logger.info(f"Cross-validation accuracy: {cv_accuracy:.4f} ± {cv_std:.4f}")

if __name__ == "__main__":
    main()