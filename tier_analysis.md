# SeniorCare Hub: Tier Analysis & Strategy 📊

A clear separation between Basic (Free) and Premium tiers ensures that core safety and health features remain accessible to all seniors while advanced, AI-powered tools provide high value for subscribers.

## 🟢 Basic (Free Plan)
*Core utility and safety features for daily living.*

| Feature | Description |
| :--- | :--- |
| **Medication Tracking** | Manual logging of medications and doses. |
| **Vitals Logging** | Manual entry of BP, Heart Rate, Glucose, etc. |
| **Emergency SOS** | One-tap "Call Family" functionality. |
| **Care Coordination** | Linking with **1** primary Caregiver for data viewing. |
| **Appointments** | Basic calendar management for doctor visits. |
| **Pill Reminders** | Standard push notifications for medication times. |

---

## 💎 Premium Plan
*Advanced AI-driven tools, deep insights, and enhanced convenience.*

| Feature | Description |
| :--- | :--- |
| **Voice Assistant (AI)** | 🗣️ Control the app and log vitals using natural voice commands. |
| **Pill ID Scanner** | 💊 Instant identification of medications via camera. |
| **AI Food Scanner** | 🥗 Dietary analysis and safety warnings for every meal. |
| **Daily Exercises** | 🏋️ 3D guided senior-friendly movement routines and timers. |
| **Advanced Sleep Tracking** | 🌙 7-day history, quality analysis, and personalized sleep tips. |
| **Video Calls** | 📹 High-definition video calling with family and care teams. |
| **Unlimited Caregivers** | 👨‍👩‍👧‍👦 Connect **2 or more** family members to the senior's health dashboard. |
| **Ad-Free Experience** | 🚫 Pure, uninterrupted experience with no advertisements. |
| **Weekly Health Report** | 📊 AI-generated PDF summary of all vitals and adherence trends. |
| **Priority Support** | 🚀 Faster response times for technical assistance. |

---

## 🚀 Monetization Strategy
1. **The "Wow" Moment**: Users see the Pill Scanner and Voice Assistant buttons immediately on the home screen. Tapping them opens the **Premium Modal** with a compelling "Upgrade to Unlock" message.
2. **Data Retention**: Basic users can see 24 hours of history; Premium users get lifetime data access.
3. **Caregiver Network**: Seniors can link one child for free, but a "Care Team" requires Premium.

## 🛠️ Current Implementation Status
- [x] **Premium Modal**: Implemented and gating Voice, Pill ID, Food Scanner, and Sleep History.
- [x] **Store Logic**: `isPremium` flag added to `userStore` and Supabase.
- [ ] **Ads Integration**: Placeholder for future AdMob implementation (Basic tier).
- [ ] **Health Reports**: Future enhancement for Premium.

> [!TIP]
> This structure ensures the app's "Medical Utility" remains free (Safety First), while the "AI Magic" generates revenue to cover API costs (Gemini/Vision).
