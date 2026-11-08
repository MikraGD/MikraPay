
# 🏦 MikraPay K-Bank (Virtual eWallet & Mini-Banking)

![MikraPay Banner](https://img.shields.io/badge/MikraPay-K--Bank-06b6d4?style=for-the-badge&logo=wallet)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%2FPages-F38020?style=for-the-badge&logo=cloudflare)

> **MikraPay K-Bank** is a high-performance, responsive private virtual eWallet and mini-banking platform built for peer-to-peer transfers, asset management, and simulated digital banking experiences among friends.

🌐 **Live Production App:** [mikrapay.mikrayoutube.workers.dev](https://mikrapay.mikrayoutube.workers.dev)

---

## ✨ Features Breakdown

### 🔐 Authentication & Security Gateway
* **Multi-Factor Auth & Passkey Support:** Native WebAuthn integration for biometric (TouchID / FaceID / Hardware Keys / Bitwarden) passwordless login.
* **SSO Simulations:** One-click Single Sign-On (Google, Facebook, Apple) with auto-verified credentials and signup bonus allocation.
* **Auto-Generated STK:** Instant 10-digit account number assignment upon registration (`generateStk()`).

### 💸 Core Banking & Transfers
* **Peer-to-Peer (P2P) Instant Transfer:** Zero-fee transfers using recipient 10-digit STK numbers.
* **Real Camera QR Scanner:** Built-in live camera feed scanning and image upload decoding for seamless QR payment processing.
* **Balance Shielding:** Toggle-able privacy mode to hide/show virtual balances on the main dashboard.

### 🐷 Savings Goals & Vaults
* **Target Savings:** Create custom goal vaults (e.g., *Gadgets, Gaming Gear, Valorant*) with progress tracking.
* **Flexible Liquidation:** Deposit funds into goal vaults or instantly withdraw back to the main wallet balance.

### 🛡️ Admin Panel & Liquidity Control
* **Liquidity Vault Management:** System Admin (`stk: 9999999999`) dashboard to adjust user balances, approve liquidity injections, and verify account statuses.
* **User Overview:** Complete user table displaying account verification tags, birthdays, and individual balances.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, TypeScript, Vite
* **Styling:** Tailwind CSS (Dark/Light mode support), Lucide Icons
* **Authentication:** WebAuthn API (Passkeys), Custom SSO Handlers
* **Deployment & CI/CD:** Cloudflare Pages / Workers, GitHub Actions
* **PWA & Mobile Ready:** Manifest enabled, Web Cam Stream QR scanner

---

## 🚀 Getting Started Locally

### Prerequisites
* **Node.js** `>= 18.0.0`
* **npm** or **yarn**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MikraGD/MikraPay.git
   cd MikraPay
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

---

## 📱 Mobile App (PWA & APK Export)

### PWA Installation
Open [https://mikrapay.mikrayoutube.workers.dev](https://mikrapay.mikrayoutube.workers.dev) on Chrome (Android) or Safari (iOS), tap **Options > Add to Home Screen** to install MikraPay as a standalone mobile application.

### Exporting Native APK (PWABuilder / Capacitor)
To build an `.apk` bundle without local Android Studio SDK:
1. Push your latest code to GitHub (`main` branch).
2. Visit **[PWABuilder](https://www.pwabuilder.com/)** and enter your production Cloudflare URL.
3. Click **Package for Stores > Android** and download your compiled `.apk` file.

---

## 📄 License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.
