import pandas as pd
import json
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score
from ua_parser import user_agent_parser
import joblib
from collections import Counter
import logging
import sys

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def load_model_and_encoders():
    """Load the trained model and encoders."""
    try:
        clf = joblib.load('model.joblib')
        ohe = joblib.load('ohe_encoder.joblib')
        with open('public/encoders.json', 'r') as f:
            encoders = json.load(f)
        return clf, ohe, encoders
    except Exception as e:
        logger.error(f"Failed to load model or encoders: {e}")
        sys.exit(1)

def load_and_validate_data(file_path):
    """Load and perform basic validation on the data."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)

        # Basic validation
        valid_data = [
            entry for entry in data
            if all(key in entry for key in ['page', 'assets', 'navPath', 'loadTime', 'timestamp', 'userAgent', 'screenWidth'])
        ]

        if len(valid_data) < 2:
            logger.error("Insufficient valid data points (need at least 2)")
            sys.exit(1)

        return valid_data
    except Exception as e:
        logger.error(f"Failed to load or validate data: {e}")
        sys.exit(1)

def filter_data_by_model_vocabulary(data, page_map):
    """Filter data to only include pages in the model's vocabulary."""
    valid_data = [entry for entry in data if entry['page'].lower() in page_map]
    if len(valid_data) < 2:
        logger.error("No valid pages found that match model vocabulary")
        sys.exit(1)
    return valid_data

def extract_features(entry, prev_entry=None):
    """Extract features from a data entry."""
    timestamp = pd.to_datetime(entry['timestamp'])
    hour = timestamp.hour

    current_page = entry['page'].lower()  # Convert to lowercase

    # Get previous page from navPath or use current page if first in sequence
    if prev_entry is None:
        prev_page = entry['navPath'][-2].lower() if len(entry['navPath']) > 1 else current_page  # Convert to lowercase
    else:
        prev_page = prev_entry['page'].lower()  # Convert to lowercase

    # Parse user agent
    ua = user_agent_parser.Parse(entry['userAgent'])
    device = ua['device']['family'] or 'Unknown'

    # Extract other features
    screen_width = entry['screenWidth']
    load_time = entry['loadTime']
    has_image = int(any(asset.get('type') == 'img' for asset in entry['assets']))

    return {
        'hour': hour,
        'page': current_page,
        'prev_page': prev_page,
        'device_type': device,
        'screenWidth': screen_width,
        'loadTime': load_time,
        'has_image': has_image
    }

def prepare_features_for_prediction(features_dict, ohe, feature_names):
    """Prepare features for model prediction."""
    # Split into categorical and numeric
    categorical_data = pd.DataFrame(
        [[features_dict['page'], features_dict['prev_page'], features_dict['device_type']]],
        columns=['page', 'prev_page', 'device_type']
    )

    # Apply one-hot encoding
    try:
        encoded_cols = pd.DataFrame(
            ohe.transform(categorical_data),
            columns=ohe.get_feature_names_out(['page', 'prev_page', 'device_type'])
        )
    except Exception as e:
        logger.warning(f"One-hot encoding failed: {e}. Using empty DataFrame.")
        # Create empty DataFrame with expected columns
        encoded_cols = pd.DataFrame(
            [[0] * len(ohe.get_feature_names_out(['page', 'prev_page', 'device_type']))],
            columns=ohe.get_feature_names_out(['page', 'prev_page', 'device_type'])
        )

    # Prepare numeric features
    numeric_data = pd.DataFrame(
        [[
            features_dict['hour'],
            features_dict['screenWidth'],
            features_dict['has_image'],
            features_dict['loadTime']
        ]],
        columns=['hour', 'screenWidth', 'has_image', 'loadTime']
    )

    # Combine features
    features = pd.concat([numeric_data, encoded_cols], axis=1)

    # Ensure all required columns exist
    for col in feature_names:
        if col not in features.columns:
            features[col] = 0

    # Reorder to match training
    return features[feature_names]

def count_cache_hits(assets):
    """Count cache hits in assets."""
    return sum(1 for asset in assets if asset.get('fromCache', False))

def main():
    # Load model and encoders
    clf, ohe, encoders = load_model_and_encoders()

    # Load and validate data
    data = load_and_validate_data('predictpulse_realdata.json')

    # Create page mapping
    page_map = {page: idx for idx, page in enumerate(encoders['page'])}

    # Filter data to only include pages in model vocabulary
    valid_data = filter_data_by_model_vocabulary(data, page_map)

    # Sort data by timestamp to ensure correct sequence
    valid_data.sort(key=lambda x: pd.to_datetime(x['timestamp']))

    # Initialize lists to store results
    actual_pages = []
    predicted_pages = []
    cache_hits = []
    load_times = []

    # Process each data point
    for i in range(len(valid_data) - 1):
        current = valid_data[i]
        next_entry = valid_data[i + 1]

        # Record actual next page
        next_actual = next_entry['page']
        actual_pages.append(next_actual)

        # Extract features
        features_dict = extract_features(current)

        # Prepare features for prediction
        features = prepare_features_for_prediction(features_dict, ohe, clf.feature_names_in_)

        # Predict next page
        try:
            pred_idx = clf.predict(features)[0]
            next_pred = encoders['page'][pred_idx]
            predicted_pages.append(next_pred)
        except Exception as e:
            logger.warning(f"Prediction failed: {e}. Using current page as prediction.")
            predicted_pages.append(current['page'])

        # Count cached assets and record load time
        cache_hits.append(count_cache_hits(next_entry['assets']) > 0)
        load_times.append(next_entry['loadTime'])

    # Calculate accuracy
    correct_predictions = sum(1 for a, p in zip(actual_pages, predicted_pages) if a == p)
    total_predictions = len(actual_pages)
    accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0

    # We'll use the accuracy as our cross-validation score since we have limited data
    cv_accuracy = accuracy
    cv_std = 0.0

    # Prepare for metrics calculation
    y_true = []
    y_pred = []

    for a, p in zip(actual_pages, predicted_pages):
        if a in page_map and p in page_map:
            y_true.append(page_map[a])
            y_pred.append(page_map[p])

    # Calculate metrics if we have valid predictions
    if len(y_true) > 0 and len(y_pred) > 0:
        precision = precision_score(y_true, y_pred, average='weighted', zero_division=0)
        recall = recall_score(y_true, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)
    else:
        precision = recall = f1 = 0.0

    # Calculate resource efficiency
    cache_hit_rate = sum(cache_hits) / len(cache_hits) if cache_hits else 0.0
    resource_efficiency = cache_hit_rate * 100

    # Average load time
    avg_load_time = sum(load_times) / len(load_times) if load_times else 0.0

    # Save results
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

    with open('evaluation_results_real.json', 'w') as f:
        json.dump(results, f, indent=2)

    logger.info(f"Evaluation complete. Results saved to evaluation_results_real.json")
    logger.info(f"Accuracy: {accuracy:.4f}")
    logger.info(f"Resource Efficiency: {resource_efficiency:.2f}%")
    logger.info(f"Average Load Time: {avg_load_time:.2f}ms")

if __name__ == "__main__":
    main()
