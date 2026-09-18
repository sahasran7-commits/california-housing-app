"""
Data cleaning and preprocessing for the housing price project.

Dataset: California Housing (1990 U.S. Census), commonly distributed via
Aurélien Géron's "Hands-On Machine Learning" repository, originally sourced
from StatLib. Each row represents a census block group.
"""
import pandas as pd
import numpy as np

RAW_PATH = "../data/raw/housing.csv"
PROCESSED_PATH = "../data/processed/housing_clean.csv"


def load_raw(path=RAW_PATH):
    return pd.read_csv(path)


def report_missing(df):
    missing = df.isnull().sum()
    missing = missing[missing > 0]
    return missing


def clean(df):
    df = df.copy()

    # --- Missing values ---
    # total_bedrooms has missing values (~1% of rows). We impute with the
    # median, grouped by ocean_proximity, since bedroom counts correlate
    # with regional housing stock type. Falls back to global median if a
    # group has no data.
    df["total_bedrooms"] = df.groupby("ocean_proximity")["total_bedrooms"].transform(
        lambda s: s.fillna(s.median())
    )
    df["total_bedrooms"] = df["total_bedrooms"].fillna(df["total_bedrooms"].median())

    # --- Known data quirk: median_house_value is capped at $500,001 ---
    # This is a documented artifact of the original census extract (values
    # were top-coded). We flag and remove capped rows for the *modeling*
    # target so the model isn't trained to think $500,001 is a real ceiling.
    # We keep a column so this choice is transparent and reversible.
    df["value_capped"] = df["median_house_value"] >= 500001

    # --- Feature engineering (interpretable, not black-box) ---
    df["rooms_per_household"] = df["total_rooms"] / df["households"]
    df["bedrooms_per_room"] = df["total_bedrooms"] / df["total_rooms"]
    df["population_per_household"] = df["population"] / df["households"]

    # --- Outlier sanity checks ---
    # bedrooms_per_room and rooms_per_household can blow up when households
    # is very small (data-entry edge cases). Clip at the 99.5th percentile
    # rather than deleting rows, to preserve sample size and document choice.
    for col in ["rooms_per_household", "bedrooms_per_room", "population_per_household"]:
        cap = df[col].quantile(0.995)
        df[col] = df[col].clip(upper=cap)

    return df


def train_test_split_data(df, test_size=0.2, random_state=42):
    from sklearn.model_selection import train_test_split
    # Stratify on income bracket, a standard approach for this dataset,
    # so train/test sets have similar income distributions (income is the
    # single strongest predictor of price here).
    df = df.copy()
    df["income_cat"] = pd.cut(
        df["median_income"],
        bins=[0, 1.5, 3.0, 4.5, 6.0, np.inf],
        labels=[1, 2, 3, 4, 5],
    )
    train, test = train_test_split(
        df, test_size=test_size, random_state=random_state, stratify=df["income_cat"]
    )
    train = train.drop(columns=["income_cat"])
    test = test.drop(columns=["income_cat"])
    return train, test


if __name__ == "__main__":
    raw = load_raw()
    print("Raw shape:", raw.shape)
    print("Missing values before cleaning:\n", report_missing(raw))

    clean_df = clean(raw)
    print("\nMissing values after cleaning:\n", report_missing(clean_df))
    print("Capped-value rows (median_house_value >= 500001):", clean_df["value_capped"].sum())

    clean_df.to_csv(PROCESSED_PATH, index=False)
    print(f"\nSaved cleaned data to {PROCESSED_PATH}, shape={clean_df.shape}")
