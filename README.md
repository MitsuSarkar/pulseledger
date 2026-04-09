PulseLedger is a full-stack financial dashboard designed to track Indian stocks in real-time with a clean, modern UI.

It combines:

📊 Portfolio tracking
📡 Live market data
📰 Stock-specific news
🏦 Ownership insights (FII/DII)
💻 Desktop-ready app (Electron EXE)

Built as a production-style project, it simulates tools used in trading desks and investment analysis workflows.

✨ Features
📊 Portfolio & Watchlist
Add NSE/BSE stocks dynamically
Track quantity, average price
Real-time P&L calculation
Portfolio-level metrics:
Total value
Net profit/loss
% returns
📡 Live Market Data
Real-time stock prices via Yahoo Finance API
Metrics included:
Current price
Day low / high
52-week range
Volume
30-day return
📉 Interactive Charts
Historical price data
Clean visual charts using Recharts
Supports multiple time ranges
📰 News Integration
Latest news for selected stock
Google News RSS integration
Clickable external sources
🏦 Ownership Signals (FII / DII)
Institutional holding breakdown:
Promoters
FII
DII
Public
Quarterly trend indicators
🎨 Modern UI
Dark / Light mode toggle
Bento grid layout
Neo-brutalism-inspired design
Clean financial dashboard aesthetics
💻 Desktop Application
Packaged using Electron
Runs as a standalone .exe
No browser required
Backend + frontend bundled
🖼️ Screenshots

Dashboard Overview

Watchlist & Portfolio

Stock Details Panel

News & Ownership Signals

🛠️ Tech Stack
Frontend
React (Vite)
CSS (custom styling)
Recharts (data visualization)
Backend
Node.js
Express.js
Yahoo Finance (chart API)
Google News RSS
Desktop
Electron
Electron Builder
⚙️ Installation (Development)

git clone https://github.com/your-username/pulseledger.git
cd pulseledger
npm install
npm run dev

🖥️ Run Desktop App (Dev Mode)
npm start
📦 Build Windows EXE
npm run dist:win
Output:
/release/PulseLedger.exe
📁 Project Structure
pulseledger/
├── client/        # React frontend
├── server/        # Express backend
├── electron/      # Desktop wrapper
├── dist/          # Built frontend
├── release/       # Final EXE build
⚠️ Notes
Market data is sourced from public Yahoo endpoints (best-effort accuracy)
Ownership data is currently simulated (can be replaced with real APIs)
Internet connection required for live data
🎯 Use Cases
Retail investors tracking portfolios
Students learning financial analytics
Demonstrating full-stack + finance projects
Resume/portfolio project for:
Finance roles
Data roles
FinTech roles
🔥 Future Improvements
🔔 Price alerts
📈 Advanced indicators (RSI, MACD)
☁️ Cloud sync
📱 Mobile version
🧠 AI-based insights
👤 Author
Sumit Sarkar

GitHub: https://github.com/MitsuSarkar
LinkedIn: https://www.linkedin.com/in/mitsusarkar
⭐ If you like this project

Give it a star ⭐ helps a lot!
