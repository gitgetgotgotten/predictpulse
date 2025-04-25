# PredictPulse
A predictive caching system that dynamically preloads web assets based on user behavior, using a Decision Tree model.

## Overview
*PredictPulse* enhances web performance by predicting and preloading assets (images, CSS, JS, fonts) based on user navigation patterns, device context, and network conditions. Unlike static preloading, it adapts using a client-side Decision Tree trained on user data.

## Features
- **Dynamic Preloading**: Predicts next page/assets using a Decision Tree.
- **Network-Aware**: Delays prefetch for low-bandwidth users (`navigator.connection.downlink`).
- **Cold-Start Optimization**: Uses time, device, OS, browser, screen size.
- **Open-Source**: Deployed at [gitgetgotgotten.github.io/predictpulse](https://gitgetgotgotten.github.io/predictpulse).

## Run
1. Clone: `git clone https://github.com/gitgetgotgotten/predictpulse`
2. Install: `npm install`
3. Generate mock data: `node scripts/generate_mockdata.js`
4. Train model: `pip install pandas scikit-learn && python train_model.py`
5. Start: `npm run dev`
6. Visit: `http://localhost:5173`

## Deploy
1. Build: `npm run build`
2. Deploy: `npm run deploy`
3. Visit: `https://gitgetgotgotten.github.io/predictpulse`

## Evaluate
1. Run: `python evaluate.py`
2. Check: `evaluation_results.json`

## Real-World Data Collection
Logs are stored in IndexedDB and uploaded to a private GitHub repo (`predictpulse-data`, `data` branch) after each page visit. To set up:
1. Create a private repo: `predictpulse-data`.
2. Create a `data` branch.
3. Generate a GitHub Personal Access Token with `repo` scope.
4. Set token: `localStorage.setItem('github_token', 'your_token')` in browser console (testing only).
5. Test uploads: Navigate pages locally and check `predictpulse_realdata.json` in `predictpulse-data`.
6. Aggregate logs: `GITHUB_TOKEN=your_token node scripts/upload_logs.js` (server-side, after collecting logs).

## Privacy
User data is anonymized (page visits, device stats) and only collected with consent via a popup. Logs are stored in a private GitHub repo, accessible only to collaborators.

## License
MIT