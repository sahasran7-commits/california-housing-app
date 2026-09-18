# California Housing Value Study

A data science research project investigating whether publicly available structural and geographic housing data can be used to estimate residential property prices — and which characteristics matter most.

The project includes data cleaning, exploratory data analysis, five trained and compared machine-learning models, an interpretability analysis, and an interactive web app.

**Live app:** see `app/housing_app_bundled.html` (open directly in a browser, or view the published version shared alongside this repo).

## Headline result

Trained on 1990 California census data (uncapped block groups), a histogram gradient boosting model explained **82.9%** of the variance in median home value on held-out test data, with a typical prediction error of **$27,195** — a 59% error reduction versus a naive mean-prediction baseline.

| Model | MAE | RMSE | R² |
|---|---:|---:|---:|
| Mean baseline | $77,235 | $96,259 | −0.0004 |
| Ridge regression | $42,103 | $57,188 | 0.647 |
| Random forest | $27,128 | $40,507 | 0.823 |
| Gradient boosting | $30,232 | $43,403 | 0.797 |
| **Hist. gradient boosting** | **$27,195** | **$39,829** | **0.829** |

Full writeup: [`paper/research_paper.md`](paper/research_paper.md)

## Research question

> To what extent can machine-learning models predict residential property prices using publicly available structural and geographic housing data, and which characteristics contribute most to those estimates?

## Repository structure

```
housing-price-data-science/
├── README.md
├── data/
│   ├── raw/housing.csv              # original 1990 census data
│   └── processed/                    # cleaned data, model results, feature importance
├── src/
│   ├── preprocessing.py              # cleaning + stratified train/test split
│   ├── eda.py                        # generates all figures in figures/
│   └── models.py                     # trains + evaluates all 4 models, saves best model
├── figures/                           # 6 generated charts (PNG)
├── app/
│   ├── index.html, app.js, embedded_data.js   # source for the app
│   └── housing_app_bundled.html               # single-file, ready to open/deploy
└── paper/
    └── research_paper.md             # full research writeup
```

## Reproducing the analysis

```bash
cd src
python3 preprocessing.py   # cleans data/raw/housing.csv -> data/processed/housing_clean.csv
python3 eda.py              # writes 5 figures to ../figures/
python3 models.py           # trains 5 models (leakage-safe split), prints metrics, saves best model
```

Requires: `pandas`, `numpy`, `scikit-learn`, `matplotlib`, `joblib`.

## Data source and important limitation

Data is 1990 U.S. Census block-group data for California, as commonly distributed for teaching (e.g. in Aurélien Géron's *Hands-On Machine Learning*), originally from StatLib. **`median_house_value` is top-coded at $500,001** in the source data (4.7% of rows) — those rows are excluded from model training/evaluation so the model isn't taught a false ceiling. See `paper/research_paper.md` Section 9 for the full limitations discussion, including why this is correlational, not causal, evidence.

## The app

`app/housing_app_bundled.html` is a single self-contained HTML file (no server, no dependencies) with four sections:
- **Explore Data** — real charts (income vs. price, price by location, distribution, correlations) drawn from a sample of the actual cleaned dataset
- **Prediction** — a live calculator using the fitted linear regression's actual coefficients (kept lightweight for the browser; the paper's headline number comes from the larger random forest model)
- **Model** — the full model comparison table and feature importances, from the real evaluation run
- **Research** — methodology and limitations

## What this project demonstrates

Python & pandas · statistics & correlation · data cleaning with documented, reversible decisions · exploratory visualization · supervised machine learning (regression) · rigorous train/test evaluation without data leakage · model interpretability · turning analysis into a working application · research writing.
