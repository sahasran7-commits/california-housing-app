# Machine Learning for Residential Property Price Estimation: An Analysis of Structural and Geographic Predictors

## Abstract

This study investigates whether publicly available structural and geographic housing data can predict residential property values, using 20,640 California census block groups from the 1990 U.S. Census. Five models — a mean baseline, ridge regression, random forest, gradient boosting, and histogram gradient boosting — were trained on an 80% split and evaluated once on a held-out 20% test set. Imputation and scaling were fit on the training set only. The histogram gradient boosting model performed best, explaining 82.9% of the variance in median home value (R² = 0.829) with a mean absolute error of $27,195. Median household income was the strongest single predictor, followed by ocean proximity and household composition. Limitations include the age of the data, the exclusion of top-coded high-value block groups, and the correlational (non-causal) nature of the findings.

## 1. Introduction

Housing prices are shaped by a mix of observable characteristics (size, age, room counts) and harder-to-measure factors (location desirability, local amenities, market conditions). This project asks how much of that price can be recovered from a modest set of structural and geographic variables alone, and which of those variables matter most.

## 2. Research Question

**Primary:** To what extent can machine-learning models predict residential property prices using publicly available structural and geographic housing data?

**Secondary:**
1. Which variables are most strongly associated with property price?
2. How do different machine-learning models compare?
3. How much does geographic information (location, ocean proximity) contribute to prediction accuracy?
4. What are the practical limitations of applying this kind of model?

## 3. Data

**Source:** 1990 U.S. Census data aggregated to the census block-group level for California. This dataset is widely used in statistical learning research and teaching (e.g., it appears in Aurélien Géron's *Hands-On Machine Learning*) and originates from StatLib.

**Sample:** 20,640 block groups, 10 original fields: longitude, latitude, housing median age, total rooms, total bedrooms, population, households, median income, median house value, and ocean proximity (a categorical distance-to-coast indicator).

**Unit of analysis:** Each row is a census block group (roughly 600–3,000 people), not an individual home — so this model estimates typical area-level value, not any single property's price.

## 4. Data Cleaning

- `total_bedrooms` was missing in 207 rows (~1.0%). Missing values were imputed with the median within each `ocean_proximity` group, since bedroom stock differs systematically by region type.
- `median_house_value` is top-coded: values are capped at $500,001 in the original extract. 965 rows (4.7%) sit at or above this cap. These rows were **excluded from model training and evaluation**, since including them would teach models a false ceiling. This means the reported model does not describe the highest-value areas well — a limitation, not an omission (see Section 9).
- Three engineered ratio features (`rooms_per_household`, `bedrooms_per_room`, `population_per_household`) were clipped at their 99.5th percentile to limit the influence of divide-by-small-household outliers, rather than deleting those rows outright.

## 5. Exploratory Data Analysis

Figures referenced below were generated directly from the cleaned dataset (`src/eda.py`, saved to `figures/`).

- **Price distribution** (`01_price_distribution.png`): right-skewed, consistent with housing markets generally.
- **Income vs. price** (`02_income_vs_price.png`): a clear positive, roughly linear-looking relationship, with meaningful scatter — income alone does not determine price.
- **Geographic distribution** (`03_geographic_price.png`): value is highest along the coast, especially near the Bay Area and Los Angeles, and lower inland.
- **Correlation matrix** (`04_correlation_matrix.png`) and univariate correlations with price:

| Feature | Correlation with price |
|---|---:|
| median_income | 0.643 |
| rooms_per_household | 0.180 |
| total_rooms | 0.143 |
| households | 0.095 |
| total_bedrooms | 0.074 |
| housing_median_age | 0.068 |
| population | 0.012 |
| bedrooms_per_room | −0.223 |
| population_per_household | −0.249 |

Notably, a higher bedrooms-to-rooms ratio and more people per household both correlate with *lower* prices — consistent with denser, lower-income housing.

- **Price by ocean proximity** (`05_price_by_location_category.png`): "Near Bay" and "Near Ocean" areas have the highest median values; "Inland" the lowest.

## 6. Methodology

**Train/test split:** 80% train, 20% test, stratified by an income bracket derived from `median_income` so both sets have comparable income distributions (a standard approach for this dataset, since income is its strongest single predictor).

**Preventing leakage:** All preprocessing (standard scaling of numeric features, one-hot encoding of `ocean_proximity`) was fit only on the training set inside a scikit-learn `Pipeline`, then applied to the test set. The test set was touched exactly once, for final evaluation.

**Models compared:**
1. **Mean baseline** — predicts the training-set mean price for every test row. Establishes the floor any real model must beat.
2. **Ridge regression** — linear model with L2 regularization.
3. **Random forest** (250 trees, sqrt features, min 2 samples/leaf).
4. **Gradient boosting** (250 estimators, learning rate 0.05, max depth 4, subsample 0.8).
5. **Histogram gradient boosting** (250 iterations, learning rate 0.06, max depth 8).
Two extra geographic features were added: Euclidean distance to San Francisco and to Los Angeles in coordinate space.

**Metrics:** Mean Absolute Error (MAE, average dollar error), Root Mean Squared Error (RMSE, penalizes large errors more), and R² (proportion of variance explained).

## 7. Results

| Model | MAE | RMSE | R² | 3-fold train CV RMSE |
|---|---:|---:|---:|---:|
| Mean baseline | $77,235 | $96,259 | −0.0004 | — |
| Ridge regression | $42,103 | $57,188 | 0.647 | $58,265 |
| Random forest | $27,128 | $40,507 | 0.823 | $43,409 |
| Gradient boosting | $30,232 | $43,403 | 0.797 | $45,114 |
| **Hist. gradient boosting** | **$27,195** | **$39,829** | **0.829** | **$42,518** |

Histogram gradient boosting performed best on RMSE and R². It cut RMSE by 59% relative to the mean baseline and by 30% relative to ridge regression. Random forest was close (R² = 0.823). The gap versus linear models indicates real non-linear structure and location–income interactions.

## 8. Model Interpretation

Permutation importances on the held-out test set for the best model (relative drop in R² when a feature is shuffled):

| Feature | Permutation importance |
|---|---:|
| latitude | 0.357 |
| median_income | 0.346 |
| longitude | 0.244 |
| dist_to_la | 0.170 |
| ocean_proximity | 0.153 |
| population_per_household | 0.131 |
| dist_to_sf | 0.118 |

Income remains one of the two strongest signals. Location — latitude, longitude, distance to the two major metros, and ocean proximity — dominates the rest, which is the expected pattern for California housing.

## 9. Limitations

- **Top-coding.** Excluding capped rows means this model's accuracy claims do not extend to the highest-value areas (roughly the top 5% of block groups).
- **Age of the data.** This is 1990 census data. Relative relationships (e.g., the importance of coastal proximity) may still hold directionally, but absolute dollar figures and possibly even relative feature importances would differ in today's market.
- **Correlation, not causation.** Strong associations here (e.g., population density and lower price) likely reflect deeper structural factors — zoning, school quality, historical development patterns — that the dataset doesn't directly measure. This model should not be read as identifying *causes* of price.
- **Coarse geography.** Predictions describe block-group averages, not individual homes.
- **No temporal validation.** All data comes from a single census snapshot; the model has not been tested on how well relationships generalize across time.

## 10. Conclusion

Publicly available structural and geographic data can explain a substantial share (83%) of the variation in California housing prices at the block-group level, with income as the dominant factor and location contributing independently and non-trivially. Non-linear models (random forest, gradient boosting) meaningfully outperform linear regression, indicating real interaction effects between income, location, and housing density. The approach generalizes conceptually to other regions and time periods, but any deployment on current data would require retraining on current data and re-examining the top-coding and geographic-coarseness limitations above.

## References

- Data: 1990 U.S. Census, California block groups, as distributed in Aurélien Géron, *Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow* (O'Reilly), originally from StatLib.
- Pedregosa, F. et al. (2011). Scikit-learn: Machine Learning in Python. *Journal of Machine Learning Research*, 12, 2825-2830.
