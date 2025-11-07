# BeachGuardians 🌊

**Clean Coasts, Clear Future**

BeachGuardians is a comprehensive platform that connects volunteers, NGOs, and communities to organize and participate in beach cleanup events. The platform gamifies environmental action through points, badges, and leaderboards while providing powerful AI-driven tools for content generation and impact tracking.

## ✨ Features

### Core Functionality
- **Event Management**: Create, discover, and join beach cleanup events with detailed location information
- **Waste Logging**: Track collected waste by type and weight through an intuitive logging system
- **Interactive Map**: Visualize cleanup events and locations on an interactive map
- **User Profiles**: Comprehensive volunteer profiles with contribution history and achievements

### Gamification & Engagement
- **Points System**: Earn points for participating in events and logging waste
- **Badge System**: Unlock achievements and badges for various milestones
- **Leaderboards**: Compete with other volunteers and NGOs on local and global leaderboards
- **Digital Certificates**: Automated certificate generation for event participation

### AI-Powered Features
- **AI Content Generation**: Automatically generate social media posts, captions, and promotional content
- **Event Summaries**: AI-generated summaries of cleanup events with impact metrics
- **Engagement Messaging**: Personalized volunteer engagement messages
- **Certificate Text Generation**: AI-assisted certificate content creation
- **Image Generation**: Generate event images and hero graphics

### Analytics & Reporting
- **Impact Dashboard**: Real-time statistics on waste collected, volunteers engaged, and events organized
- **Impact Analytics**: Detailed charts and visualizations of environmental impact
- **Event Summaries**: Comprehensive reports on cleanup events
- **Waste Composition Analysis**: Track and visualize different types of waste collected

### Admin Features
- **User Management**: Admin tools for managing volunteers and NGO accounts
- **Event Administration**: Full control over event creation, editing, and management
- **Certificate Issuance**: Issue digital certificates to volunteers
- **AI Features Dashboard**: Centralized access to all AI-powered tools

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.3.3** - React framework with App Router
- **React 18.3.1** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Leaflet** - Interactive maps
- **Recharts** - Data visualization
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend & Services
- **Firebase** - Authentication, Firestore database, and hosting
- **Firebase Admin SDK** - Server-side Firebase operations
- **Next.js API Routes** - Serverless API endpoints

### AI & Machine Learning
- **Genkit** - AI orchestration framework
- **OpenAI API** - GPT models for content generation
- **Google Generative AI** - Additional AI capabilities
- **DALL-E** - Image generation

### Additional Tools
- **Nodemailer** - Email sending
- **PDF-lib** - PDF generation for certificates
- **Google APIs** - Additional integrations
- **Date-fns** - Date manipulation

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Firebase CLI** (for deployment)
- **Git**

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BeachGuardians
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Google Generative AI
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# Email Configuration (for Nodemailer)
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=your_from_email
```

### 4. Firebase Setup

1. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase (if not already done):
```bash
firebase init firestore
```

4. Deploy Firestore security rules:
```bash
firebase deploy --only firestore:rules
```

For detailed Firebase setup instructions, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### 6. Run AI Development Server (Optional)

For AI features development:

```bash
npm run genkit:dev
```

Or with watch mode:

```bash
npm run genkit:watch
```

## 📁 Project Structure

```
BeachGuardians/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/             # Protected app routes
│   │   │   ├── admin/         # Admin dashboard pages
│   │   │   ├── dashboard/     # User dashboard
│   │   │   ├── events/        # Event management
│   │   │   ├── leaderboard/   # Leaderboard pages
│   │   │   ├── map/           # Interactive map
│   │   │   └── profile/       # User profile
│   │   ├── (auth)/            # Authentication pages
│   │   ├── api/               # API routes
│   │   │   ├── ai/            # AI endpoints
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── certificate/   # Certificate endpoints
│   │   │   ├── events/        # Event endpoints
│   │   │   └── ...
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── admin/             # Admin components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── events/            # Event components
│   │   ├── gamification/      # Leaderboard & badges
│   │   ├── landing/           # Landing page components
│   │   ├── layout/            # Layout components
│   │   ├── ui/                # Reusable UI components
│   │   └── waste/             # Waste logging components
│   ├── ai/                    # AI flows and configurations
│   │   └── flows/             # Genkit AI flows
│   ├── lib/                   # Utility functions and configurations
│   ├── context/               # React context providers
│   └── hooks/                 # Custom React hooks
├── public/                    # Static assets
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
├── firebase.json              # Firebase configuration
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
└── package.json               # Dependencies and scripts
```

## 🎯 Available Scripts

- `npm run dev` - Start development server
- `npm run dev:turbo` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit AI development server
- `npm run genkit:watch` - Start Genkit with watch mode

## 🔐 Authentication

The application uses Firebase Authentication with:
- Email/Password authentication
- OTP (One-Time Password) verification
- Volunteer OTP verification
- Admin verification system for NGO accounts

## 🗺️ Key Features Explained

### Event Management
- Create events with location, date, time, and description
- View events on an interactive map
- Filter and search events
- Edit and manage your events
- Track event attendance and participation

### Waste Logging
- Log waste collected during cleanup events
- Categorize waste by type (plastic, glass, metal, etc.)
- Track weight and quantity
- Automatic point calculation based on waste logged

### Gamification
- Earn points for various activities
- Unlock badges for achievements
- Compete on leaderboards (individual and NGO)
- Track your progress and impact

### AI Features
- **Social Media Posts**: Generate engaging social media content for events
- **Event Summaries**: Automatically create comprehensive event summaries
- **Engagement Messages**: Generate personalized messages for volunteers
- **Certificate Text**: Create certificate content with AI assistance
- **Image Generation**: Generate event images and promotional graphics

## 🌐 Deployment

### Deploy to Firebase Hosting

1. Build the application:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

### Deploy to Vercel

The application can also be deployed to Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is part of a Capstone Project for Semester 3.

## 📞 Support

For issues, questions, or contributions, please open an issue on the repository.

## 🙏 Acknowledgments

- Built with Next.js and Firebase
- AI capabilities powered by OpenAI and Google Generative AI
- UI components from Radix UI
- Maps powered by Leaflet

---

**Made with ❤️ for cleaner beaches and a better future**
