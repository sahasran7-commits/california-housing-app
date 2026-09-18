"""Exploratory data analysis: generates figures used in the paper/app."""
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("../data/processed/housing_clean.csv")
# Drop the top-coded rows for price-related plots so the $500,001 spike
# doesn't distort the visuals (documented in preprocessing.py).
df_uncapped = df[~df["value_capped"]]

FIG_DIR = "../figures"

# 1. Price distribution
plt.figure(figsize=(7, 4.5))
plt.hist(df_uncapped["median_house_value"], bins=50, color="#3b6ea5", edgecolor="white")
plt.xlabel("Median House Value ($)")
plt.ylabel("Number of Block Groups")
plt.title("Distribution of Median House Value (capped rows excluded)")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/01_price_distribution.png", dpi=150)
plt.close()

# 2. Income vs price
plt.figure(figsize=(7, 4.5))
plt.scatter(df_uncapped["median_income"], df_uncapped["median_house_value"],
            alpha=0.15, s=10, color="#3b6ea5")
plt.xlabel("Median Income (tens of thousands $)")
plt.ylabel("Median House Value ($)")
plt.title("Median Income vs. Median House Value")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/02_income_vs_price.png", dpi=150)
plt.close()

# 3. Geographic scatter, colored by price
plt.figure(figsize=(6.5, 6))
sc = plt.scatter(df_uncapped["longitude"], df_uncapped["latitude"],
                  c=df_uncapped["median_house_value"], cmap="viridis",
                  s=8, alpha=0.5)
plt.colorbar(sc, label="Median House Value ($)")
plt.xlabel("Longitude")
plt.ylabel("Latitude")
plt.title("Geographic Distribution of Housing Prices (California)")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/03_geographic_price.png", dpi=150)
plt.close()

# 4. Correlation matrix (numeric features only)
num_cols = ["median_house_value", "median_income", "housing_median_age",
            "total_rooms", "total_bedrooms", "population", "households",
            "rooms_per_household", "bedrooms_per_room", "population_per_household"]
corr = df_uncapped[num_cols].corr()
plt.figure(figsize=(8, 7))
im = plt.imshow(corr, cmap="coolwarm", vmin=-1, vmax=1)
plt.colorbar(im, label="Pearson correlation")
plt.xticks(range(len(num_cols)), num_cols, rotation=90)
plt.yticks(range(len(num_cols)), num_cols)
plt.title("Correlation Matrix")
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/04_correlation_matrix.png", dpi=150)
plt.close()

# 5. Price by ocean proximity
plt.figure(figsize=(7, 4.5))
order = df_uncapped.groupby("ocean_proximity")["median_house_value"].median().sort_values().index
data_by_group = [df_uncapped[df_uncapped["ocean_proximity"] == g]["median_house_value"] for g in order]
plt.boxplot(data_by_group, labels=order, showfliers=False)
plt.ylabel("Median House Value ($)")
plt.title("House Value by Ocean Proximity Category")
plt.xticks(rotation=20)
plt.tight_layout()
plt.savefig(f"{FIG_DIR}/05_price_by_location_category.png", dpi=150)
plt.close()

print("Correlation of each feature with median_house_value:")
print(corr["median_house_value"].sort_values(ascending=False))
print("\nSaved 5 figures to", FIG_DIR)
