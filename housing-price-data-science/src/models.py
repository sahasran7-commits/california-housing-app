"""
Train and evaluate models for median house value prediction.

Leakage-safe procedure:
1. Load raw data and drop top-coded target rows (documented census cap).
2. Engineer ratio + metro-distance features.
3. Stratified 80/20 split on income BEFORE any learned transform.
4. Imputation, scaling, and one-hot encoding fit on TRAIN only.
5. Compare baseline, ridge, random forest, gradient boosting,
   and histogram gradient boosting on the held-out test set.
"""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import Ridge
from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
)
from sklearn.dummy import DummyRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score
import joblib

from preprocessing import load_raw, train_test_split_data

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "data" / "raw" / "housing.csv"
MODEL_DIR = ROOT / "app"
RESULTS_PATH = ROOT / "data" / "processed" / "model_results.json"
IMPORTANCE_PATH = ROOT / "data" / "processed" / "feature_importance.csv"

NUMERIC_FEATURES = [
    "longitude",
    "latitude",
    "housing_median_age",
    "total_rooms",
    "total_bedrooms",
    "population",
    "households",
    "median_income",
    "rooms_per_household",
    "bedrooms_per_room",
    "population_per_household",
    "dist_to_sf",
    "dist_to_la",
]
CATEGORICAL_FEATURES = ["ocean_proximity"]
TARGET = "median_house_value"


def add_features(df):
    df = df.copy()
    rooms = df["total_rooms"].replace(0, np.nan)
    hh = df["households"].replace(0, np.nan)
    df["rooms_per_household"] = df["total_rooms"] / hh
    df["bedrooms_per_room"] = df["total_bedrooms"] / rooms
    df["population_per_household"] = df["population"] / hh
    df["dist_to_sf"] = np.sqrt((df["longitude"] + 122.42) ** 2 + (df["latitude"] - 37.77) ** 2)
    df["dist_to_la"] = np.sqrt((df["longitude"] + 118.24) ** 2 + (df["latitude"] - 34.05) ** 2)
    return df


def clip_ratios_from_train(train, test, cols, q=0.995):
    train = train.copy()
    test = test.copy()
    for col in cols:
        cap = train[col].quantile(q)
        train[col] = train[col].clip(upper=cap)
        test[col] = test[col].clip(upper=cap)
    return train, test


def build_preprocessor():
    num_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="median")),
        ("scale", StandardScaler()),
    ])
    cat_pipe = Pipeline([
        ("impute", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])
    return ColumnTransformer([
        ("num", num_pipe, NUMERIC_FEATURES),
        ("cat", cat_pipe, CATEGORICAL_FEATURES),
    ])


def evaluate(y_true, y_pred):
    return {
        "MAE": round(float(mean_absolute_error(y_true, y_pred)), 2),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 2),
        "R2": round(float(r2_score(y_true, y_pred)), 4),
    }


def main():
    raw = load_raw(RAW_PATH)
    df = raw[raw["median_house_value"] < 500001].copy()
    df = add_features(df)

    train_df, test_df = train_test_split_data(df, test_size=0.2, random_state=42)
    ratio_cols = ["rooms_per_household", "bedrooms_per_room", "population_per_household"]
    train_df, test_df = clip_ratios_from_train(train_df, test_df, ratio_cols)

    X_train = train_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y_train = train_df[TARGET]
    X_test = test_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y_test = test_df[TARGET]

    results = {}
    fitted = {}
    cv_rmse = {}

    models = {
        "Mean Baseline": DummyRegressor(strategy="mean"),
        "Ridge Regression": Ridge(alpha=1.0),
        "Random Forest": RandomForestRegressor(
            n_estimators=250,
            min_samples_leaf=2,
            max_features="sqrt",
            random_state=42,
            n_jobs=1,
        ),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=250,
            learning_rate=0.05,
            max_depth=4,
            subsample=0.8,
            random_state=42,
        ),
        "Hist Gradient Boosting": HistGradientBoostingRegressor(
            max_iter=250,
            learning_rate=0.06,
            max_depth=8,
            min_samples_leaf=20,
            random_state=42,
        ),
    }

    for name, model in models.items():
        if name == "Mean Baseline":
            pipe = model
            pipe.fit(X_train, y_train)
        else:
            pipe = Pipeline([("prep", build_preprocessor()), ("model", model)])
            pipe.fit(X_train, y_train)
            scores = cross_val_score(
                pipe, X_train, y_train,
                scoring="neg_root_mean_squared_error",
                cv=3, n_jobs=1,
            )
            cv_rmse[name] = round(float(-scores.mean()), 2)
        results[name] = evaluate(y_test, pipe.predict(X_test))
        fitted[name] = pipe
        print(name, results[name], "CV_RMSE=", cv_rmse.get(name), flush=True)

    best_name = min(
        (k for k in results if k != "Mean Baseline"),
        key=lambda k: results[k]["RMSE"],
    )
    print(f"\nBest model on held-out test set: {best_name}", flush=True)

    best = fitted[best_name]
    inner = best.named_steps["model"] if hasattr(best, "named_steps") else None
    if inner is not None and hasattr(inner, "feature_importances_"):
        cat_names = list(
            best.named_steps["prep"]
            .named_transformers_["cat"]
            .named_steps["onehot"]
            .get_feature_names_out(CATEGORICAL_FEATURES)
        )
        feature_names = NUMERIC_FEATURES + cat_names
        importances = inner.feature_importances_
        n = min(len(feature_names), len(importances))
        imp_df = pd.DataFrame({
            "feature": feature_names[:n],
            "importance": importances[:n],
        }).sort_values("importance", ascending=False)
        IMPORTANCE_PATH.parent.mkdir(parents=True, exist_ok=True)
        imp_df.to_csv(IMPORTANCE_PATH, index=False)
        print("\nTop features:\n", imp_df.head(8), flush=True)

    payload = {
        "results": results,
        "cv_rmse": cv_rmse,
        "best_model": best_name,
        "n_train": int(len(train_df)),
        "n_test": int(len(test_df)),
        "notes": "Split before imputation. Distance-to-SF/LA features added. Top-coded rows excluded.",
    }
    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_PATH.write_text(json.dumps(payload, indent=2))
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best, MODEL_DIR / "best_model.joblib")
    if "Ridge Regression" in fitted:
        joblib.dump(fitted["Ridge Regression"], MODEL_DIR / "linear_model.joblib")
    print(f"\nSaved results to {RESULTS_PATH}", flush=True)


if __name__ == "__main__":
    main()
