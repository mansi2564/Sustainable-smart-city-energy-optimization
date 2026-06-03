# Sustainable-smart-city-energy-optimization
Developed a full-stack Smart City Energy Management System supports role-based access using React.js, TypeScript, Node.js, Express.js, MongoDB,and AI technologies to monitor energy consumption,detect anomalies,optimize renewable energy resources,support sustainable urban planning through real-time analytics and recommendations.
## 🌟 Features

### Authentication & Access Control
- **Unified Login System**: Single login page for both Residents and City Planners
- **Role-Based Registration**: Dropdown selection between Resident and City Planner
- **Access Control**: Residents require approval from City Planners before accessing the system
- **Document Upload**: City Planners can upload ID proof during registration

### Resident Dashboard
- **Personal Energy Dashboard**: Real-time energy consumption monitoring
- **Energy Monitor**: Historical data with threshold alerts
- **Renewable Site Suggestions**: Solar/Wind analysis based on geolocation
- **Smart Alerts**: Peak usage, anomalies, and optimization recommendations
- **AI Assistant Chatbot**: Rasa-powered conversational interface for energy advice

### City Planner Dashboard
- **City-Wide Energy Overview**: Total consumption, user metrics, renewable percentage
- **Regional Analytics**: Consumption by regions with efficiency metrics
- **Anomaly Detection**: Real-time alerts for unusual energy patterns
- **User Management**: Approve/reject resident registrations
- **Policy Planning**: AI-driven recommendations for energy policies
- **Reports & Export**: Data export functionality (PDF/CSV)

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Chart.js** for data visualization
- **Lucide React** for icons
- **Vite** for build tooling

### Backend
- **Node.js** with Express.js
- **MongoDB** for user data
- **JWT** for authentication
- **Multer** for file uploads
- **Nodemailer** for email notifications

### AI/ML
- **Rasa** for conversational AI assistant
- **TensorFlow.js** for client-side ML models (future integration)

## 🤖 AI Features

### Rasa Chatbot
The application includes a conversational AI assistant powered by Rasa that can:
- Answer energy-related questions
- Provide consumption optimization tips
- Explain government subsidies
- Help with renewable energy decisions

### Future AI Enhancements
- Predictive energy consumption forecasting
- Anomaly detection using machine learning
- Automated policy recommendations
- Smart grid optimization

## 📊 Data Visualization

- **Real-time Charts**: Energy consumption trends with Chart.js
- **Interactive Maps**: Renewable energy potential visualization
- **Responsive Dashboards**: Mobile-friendly interfaces
- **Export Capabilities**: PDF/CSV report generation

## 🔧 Development

### Available Scripts

```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Backend
cd server
npm run dev          # Start development server
npm run test         # Run tests
```
