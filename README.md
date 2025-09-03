# Community Food Bank App 🍽️

A full-stack web application that connects food donors with people in need, featuring real-time notifications, Google Maps integration, and a comprehensive admin dashboard.

![Community Food Bank](https://via.placeholder.com/800x400/0ea5e9/ffffff?text=Community+Food+Bank+App)

## ✨ Features

### 🎯 Core Features
- **Food Donation System**: Easy-to-use form for donors to list available food items
- **Request System**: People in need can browse donations or submit specific requests
- **Google Maps Integration**: Interactive maps showing pickup locations
- **Real-time Notifications**: Instant alerts when new donations are posted
- **User Authentication**: Optional Firebase Auth with guest access
- **Mobile-Responsive Design**: Works perfectly on desktop and mobile devices

### 👥 User Roles
- **Donors**: Post food donations with location and contact details
- **Recipients**: Browse and request available donations
- **Guests**: Full access without registration requirement
- **Admin**: Dashboard to manage all donations and requests

### 🔧 Technical Features
- **Real-time Updates**: Firebase Firestore for live data synchronization
- **Location Services**: Google Maps API for pickup locations
- **Search & Filtering**: Advanced search with location-based filtering
- **Status Tracking**: Track donations from available to completed
- **Cloud Messaging**: Firebase FCM for push notifications

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Firebase project
- Google Maps API key

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Firebase Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication, Firestore, and Cloud Messaging
   - Update `src/config/firebase.js` with your config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   }
   ```

3. **Google Maps Setup**
   - Get API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Maps JavaScript API and Places API
   - Create `.env` file:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Run the App**
   ```bash
   npm run dev
   ```

## 📱 App Structure

```
src/
├── components/
│   ├── common/          # Reusable components
│   │   ├── AuthModal.jsx
│   │   ├── DonationCard.jsx
│   │   ├── DonationMap.jsx
│   │   ├── LocationPicker.jsx
│   │   ├── NotificationToast.jsx
│   │   ├── RequestForm.jsx
│   │   └── SearchFilters.jsx
│   └── layout/          # Layout components
│       └── Navbar.jsx
├── contexts/            # React contexts
│   ├── AuthContext.jsx
│   └── NotificationContext.jsx
├── pages/               # Page components
│   ├── AdminPage.jsx
│   ├── DonationsPage.jsx
│   ├── DonatePage.jsx
│   ├── Home.jsx
│   ├── ProfilePage.jsx
│   └── ReceivePage.jsx
├── config/              # Configuration
│   └── firebase.js
└── App.jsx
```

## 🎨 UI/UX Features

### Design System
- **Tailwind CSS**: Utility-first CSS framework
- **Responsive Design**: Mobile-first approach
- **Custom Color Palette**: Primary blues and success greens
- **Accessibility**: WCAG compliant components

### User Experience
- **Guest-Friendly**: No mandatory registration
- **Intuitive Navigation**: Clear categorization and navigation
- **Visual Feedback**: Loading states, success/error messages
- **Real-time Updates**: Live data without page refreshes

## 🗺️ Google Maps Features

- **Interactive Location Picker**: Click-to-select locations
- **Address Search**: Search and geocode addresses
- **Donation Markers**: Color-coded status indicators
- **Directions Integration**: Direct links to Google Maps
- **Responsive Maps**: Optimized for mobile devices

## 🔔 Notification System

### Types of Notifications
- **New Donations**: Alert recipients about available food
- **Status Updates**: Confirm successful actions
- **Error Handling**: Clear error messages
- **Success Feedback**: Positive reinforcement

### Implementation
- **Toast Notifications**: Non-intrusive popup messages
- **Real-time Alerts**: Firebase Cloud Messaging
- **Contextual Notifications**: Relevant to user actions

## 👨‍💼 Admin Dashboard

### Features
- **Statistics Overview**: Total donations, requests, users
- **Content Management**: Edit/delete donations and requests
- **Status Management**: Update item statuses
- **User Insights**: Track platform usage

### Access Control
- Simple email-based admin identification
- Can be extended with role-based permissions

## 🛡️ Security & Privacy

### Data Protection
- **Minimal Data Collection**: Only necessary information
- **Firebase Security Rules**: Restrict unauthorized access
- **Guest Privacy**: Anonymous usage option
- **Contact Safety**: Secure contact information sharing

### Best Practices
- **Input Validation**: All forms validated
- **XSS Protection**: Sanitized user inputs
- **Authentication**: Secure Firebase Auth
- **HTTPS Only**: Secure data transmission

## 🚀 Deployment

### Firebase Hosting
```bash
npm run build
firebase deploy
```

### Vercel Deployment
```bash
npm run build
# Deploy to Vercel via GitHub integration
```

### Environment Variables
```env
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
VITE_FIREBASE_API_KEY=your_firebase_key
# Add other Firebase config as needed
```

## 📊 Data Schema

### Donations Collection
```javascript
{
  id: "auto-generated",
  foodItem: "string",
  quantity: "string", 
  location: "string",
  coordinates: { lat: number, lng: number },
  contactInfo: "string",
  donorId: "string",
  donorName: "string",
  status: "available|claimed|completed",
  createdAt: "timestamp",
  claimedBy: "string|null",
  claimedAt: "timestamp|null"
}
```

### Requests Collection
```javascript
{
  id: "auto-generated",
  foodType: "string",
  quantity: "string",
  urgency: "low|medium|high|urgent",
  location: "string",
  contactInfo: "string",
  requesterId: "string",
  requesterName: "string", 
  status: "open|fulfilled",
  createdAt: "timestamp",
  description: "string"
}
```

## 🐛 Troubleshooting

### Common Issues

**Firebase Connection Issues**
- Verify Firebase configuration in `src/config/firebase.js`
- Check Firebase project settings and API keys
- Ensure Firestore rules allow read/write access

**Google Maps Not Loading**
- Verify Google Maps API key in `.env` file
- Enable required APIs in Google Cloud Console
- Check browser console for API errors

**Build Errors**
- Run `npm install` to ensure all dependencies
- Check Node.js version compatibility
- Clear cache: `npm run dev -- --force`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Firebase** for backend infrastructure
- **Google Maps** for location services  
- **Tailwind CSS** for styling framework
- **React** for frontend framework
- **Vite** for build tooling

---

**Built with ❤️ for communities fighting hunger**

> This app demonstrates the power of technology to address social issues and bring communities together. Every donation, no matter how small, makes a difference in someone's life.
