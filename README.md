# PredictPulse
A navigation prediction and asset preloading system that forecasts user navigation paths and preloads web assets using a Decision Tree model.

## Overview
PredictPulse enhances web performance by predicting user navigation paths and preloading assets (images, CSS, JS) for the next page, based on interaction patterns, device context, and session data. It uses a client-side Decision Tree model trained on user logs via `train_model.py`, dynamically adapting to `userAgent` and `screenWidth`. The system achieves 54.55% accuracy with a 100-log dataset and introduces the Web Operational Intelligence Score (WOIS) to evaluate adaptive intelligence.

## Features
- **Navigation Prediction & Preloading**: Forecasts next pages and preloads assets using a Decision Tree model.
- **Dynamic Adaptation**: Adjusts predictions based on `userAgent` and `screenWidth`.
- **User Context Awareness**: Incorporates device type, OS, browser, and screen size.
- **Open-Source**: Deployed at [gitgetgotgotten.github.io/predictpulse](https://gitgetgotgotten.github.io/predictpulse).

## Init
1. **Clone**: `git clone https://github.com/gitgetgotgotten/predictpulse`
2. **Go**: `cd predictpulse`
3. **Install**: `npm install`
4. **Generate mock data**: `node scripts/generate_mockdata.js` (outputs to `predictpulse_mockdata.json`)
5. **Train model**: `pip install pandas scikit-learn numpy ua-parser && python train_model.py` (outputs to `src/utils/predictNextPage.js`, `public/encoders.json`, `public/asset_map.json`)

## Deploy
1. **Build**: `npm run build`
2. **Deploy**: `npm run deploy`
3. **Visit**: Your [https://gitgetgotgotten.github.io/predictpulse](https://gitgetgotgotten.github.io/predictpulse) equivalent

## Redeploy
1. `git checkout main`
2. `Remove-Item -Recurse -Force dist` (Windows PowerShell)
   - macOS/Linux: `rm -rf dist`
3. `git push origin :gh-pages`
4. `python train_model.py`
5. `python generate_asset_map.py`
6. `npm run build`
7. `node scripts/build.js`
8. `cp public/asset_map.json dist/asset_map.json`
9. `npm run deploy`

## Evaluate (Mock)
1. **Run**: `python evaluate.py`
2. **Check**: `evaluation_results.json`

## Evaluate (Real)
1. **Run**: `python evaluate_real.py`
2. **Check**: `evaluation_results_real.json`

## Real-World Data Collection
Logs are stored in IndexedDB and uploaded to a private GitHub repo (`predictpulse-data`, `data` branch) after each page visit. To set up:
- Create a private repo: `predictpulse-data`.
- Create a `data` branch.
- Generate a GitHub Personal Access Token with repo scope.
- Set token: `localStorage.setItem('github_token', 'your_token')` in browser console (for downloads only, manually removed after use).
- Test uploads: Navigate pages and check `predictpulse_realdata.json` in `predictpulse-data`.
- Aggregate logs: `GITHUB_TOKEN=your_token node scripts/upload_logs.js` (server-side, after collecting logs).
- Use Vercel to securely store the GitHub token and request data from there, ensuring safe management and access to the private repo.

## Privacy
User data is anonymized (page visits, device stats) and collected only with consent via a popup. Logs are stored in a private GitHub repo, accessible to collaborators.

## License
MIT