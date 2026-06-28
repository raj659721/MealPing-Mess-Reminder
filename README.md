# 🍽️ MealPing - Smart Mess Reminder & Tracker

![MealPing Banner](https://via.placeholder.com/1200x400/1e1e2f/ffffff?text=MealPing+-+Never+Miss+a+Meal+Again)

## 📖 The Problem
For students living away from home who rely on external mess services or tiffins, keeping track of daily meals is a major hassle. Traditionally, students and mess owners write down meal records in physical notebooks. Furthermore, with busy study schedules, students often forget to eat on time or forget to cancel their tiffins when they are eating out, leading to food waste and financial loss.

## 💡 Our Solution
**MealPing** is a modern, beautifully designed mobile application built to completely digitalize and automate mess record-keeping. 

Instead of manual notebooks, MealPing allows users to seamlessly log their meals, skip meals, and calculate their monthly bills automatically. Most importantly, it features a **Smart Reminder System**. By setting your preferred Lunch and Dinner times, the app will actively ping you to ask if you are taking your meal. It ensures that no student ever forgets their meal again!

---

## ✨ Key Features

- **✅ Daily Meal Logging:** Easily mark your Lunch and Dinner as "Taken" or "Skipped" with a single tap.
- **🔔 Persistent Reminders:** Set custom times for Lunch and Dinner. The app will remind you exactly when it's time to eat or cancel your tiffin.
- **📊 Analytics & Insights:** View detailed monthly breakdowns, attendance percentages, and visual charts of your eating habits.
- **📅 Range Tracker:** Track meals and calculate exact costs between any two specific dates.
- **🧾 Invoice Generation:** Instantly calculate your total monthly bill based on your custom "Cost Per Meal" and download a meal history invoice.
- **📱 Native Mobile Experience:** Built as a sleek Android APK using Capacitor and Vite, offering a premium, buttery-smooth user interface.

---

## 📸 Screenshots

*(Create a folder named `assets` in your repository and upload your screenshots there. The links below will display them automatically!)*

<div align="center">
  <img src="./assets/dashboard.png" width="22%" alt="Dashboard screen" />
  <img src="./assets/analytics.png" width="22%" alt="Analytics screen" />
  <img src="./assets/tracker.png" width="22%" alt="Range Tracker screen" />
  <img src="./assets/invoice.png" width="22%" alt="Invoice screen" />
</div>

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS, Shadcn UI, Framer Motion
- **Mobile Wrapper:** Capacitor (for native Android integration)
- **Database:** Supabase (PostgreSQL)
- **State Management & Routing:** React Query, React Router

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Android Studio (for building the APK)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/raj659721/MealPing-Mess-Reminder.git
   cd MealPing-Mess-Reminder
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Build the Android APK:**
   ```bash
   npm run build
   npx cap sync
   ```
   Open the `android` folder in Android Studio and click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 👨‍💻 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
[MIT](https://choosealicense.com/licenses/mit/)
