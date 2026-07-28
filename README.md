# 💳 Your Finance — Personal Wealth & Expense Command Center

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://your-finance-nu.vercel.app)
[![GitHub License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

**Your Finance** is a modern, responsive personal wealth and transaction management platform built for speed, security, and visual elegance. It features multi-tenant database isolation powered by **Supabase PostgreSQL**, Row Level Security (RLS) policies, interactive **Chart.js** analytics, custom Windows 11-style glass select popovers, and real-time toast notifications.

---

## 🚀 Live Demo

👉 **[https://your-finance-nu.vercel.app](https://your-finance-nu.vercel.app)**

---

## ✨ Features

- **🛡️ Isolated User Vaults**: Multi-tenant database architecture with Supabase Row Level Security (RLS) guaranteeing per-user data isolation.
- **📊 Real-Time Financial Dashboard**: Instant computation of Net Worth, Monthly Income, Monthly Expenses, and Savings Rate.
- **💳 Linked Accounts & Cards**: Track savings accounts, credit cards, fixed deposits, and cash balances (supports UPI / GPay, Card, and Cash payment flows).
- **🏷️ Custom Category Engine**: Dynamically create custom transaction categories that seamlessly sync across entry forms and analytical filters.
- **📈 Interactive Analytics & Trajectory**: Responsive Chart.js cashflow trends line chart and category expenditure doughnut breakdown.
- **🔔 Notification Center & Toast Engine**: Real-time glassmorphism popover notification drawer paired with floating toast banners.
- **📁 CSV Ledger Export**: One-click export of complete transaction ledgers for accounting and spreadsheet reporting.
- **⚡ Instant Demo Mode**: Built-in *"Load Demo Data"* feature to immediately populate realistic transactions for reviewers and job interviewers.

---

## 🛠️ Technology Stack

- **Frontend Core**: HTML5 (Semantic Structure), JavaScript (ES6+ Modular Architecture).
- **Styling**: Vanilla CSS3 (Custom Glassmorphism Design System, CSS Variables, Flexbox/Grid).
- **Backend & Database**: [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Realtime REST API).
- **Authentication**: Official Google Identity Services SDK (OAuth 2.0 SSO) & Email/Password Vault Auth.
- **Data Visualization**: [Chart.js](https://www.chartjs.org/) (Line and Doughnut Charts).
- **Icons & Typography**: FontAwesome 6.4 Free, Plus Jakarta Sans, Inter (Google Fonts).

---

## 📁 Modular Project Structure

```text
personal-finance-insights/
├── index.html                   # HTML5 Entry Point
├── package.json                 # Project Metadata & npm serve scripts
├── vercel.json                  # Vercel Deployment & No-Cache Header Rules
├── schema.sql                   # Supabase PostgreSQL Database Schema & RLS Policies
├── README.md                    # Project Documentation & Architecture Guide
│
├── css/                         # Modular CSS Stylesheets
│   ├── main.css                 # Theme Variables, Layout, Sidebar, & Header
│   ├── auth.css                 # Gateway Login & Google OAuth Styling
│   ├── components.css           # Glass Cards, Buttons, Toast Banners, Select Popovers
│   └── views.css                # Screen Views, Modals, Tables, & Advisory Grid
│
└── js/                          # Modular JavaScript Modules
    ├── config.js                # Environment & API Credentials Config
    ├── database.js              # Supabase Async CRUD & State Persistence
    ├── ui-components.js         # Custom Select Popovers & Floating Toasts
    ├── notifications.js         # Notification Drawer Engine & Triggers
    ├── auth.js                  # User DB, Authentication, & Session Manager
    ├── charts.js                # Chart.js Visualizations Engine
    ├── views.js                 # View Routing, Dashboard Renderers, & Modals
    └── app.js                   # Application Bootstrap & Global Listeners
```

---

## 💻 Local Setup & Development Instructions

### Option 1: Using `npx serve` (Recommended)
1. Clone the repository:
   ```bash
   git clone https://github.com/Deepakvk07/your-finance.git
   cd your-finance
   ```
2. Start the local server:
   ```bash
   npx serve .
   ```
3. Open `http://localhost:3000` in your browser.

### Option 2: Using Python HTTP Server
```bash
python -m http.server 8080
```
Open `http://localhost:8080` in your browser.

---

## 🗄️ Database Setup (Supabase PostgreSQL + RLS)

To set up your own Supabase backend:
1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Paste and run the contents of [`schema.sql`](./schema.sql).
4. Copy your **Supabase URL** and **Anon Key** into `js/config.js` or set them as environment variables on Vercel.

---

## 🗺️ Known Limitations & Future Roadmap

- **Open Banking API Integration**: Future releases will connect with Account Aggregator APIs for direct automatic bank statement syncing.
- **Automated Bill Reminders**: Push notifications for upcoming credit card bill due dates.
- **Budget Goal Alerts**: Custom threshold alerts when category spending exceeds monthly target allocations.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
