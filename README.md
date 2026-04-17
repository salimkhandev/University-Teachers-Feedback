# University Teachers Feedback System

An AI-powered platform designed to streamline the collection and analysis of student feedback for university teachers. The system uses Google's Gemini AI to provide intelligent summaries and insights from feedback data, helping administrators make data-driven decisions.

## 🚀 Tech Stack

- **Frontend**: React (Vite), React Router, Recharts, TailwindCSS
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **AI Integration**: Google Gemini AI (@google/generative-ai)
- **Authentication**: JWT & BcryptJS
- **Data Processing**: CSV Parse, Multer (for file uploads)

## 📁 Project Structure

```text
University-Teachers-Feedback/
├── frontend/               # React client application
├── backend/                # Express API server
├── System_architecture_design.txt  # Design documentation
└── .gitignore              # Root exclusion rules
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- pnpm (`npm install -g pnpm`)
- MongoDB Atlas or local instance

### Backend Setup
1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Install dependencies:
   ```powershell
   pnpm install
   ```
3. Create a `.env` file and configure:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   ```
4. Start the development server:
   ```powershell
   pnpm dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   pnpm install
   ```
3. Start the development server:
   ```powershell
   pnpm dev
   ```

## ✨ Key Features

- **Student Portal**: Secure feedback submission using roll numbers and OTP/Password.
- **AI Analysis**: Automatic summarization of teacher performance using Gemini AI.
- **Admin Dashboard**: Visual analytics with Recharts for department and teacher-wise performance.
- **Feedback Management**: CRUD operations for subjects, departments, and teachers.
- **Data Import**: Bulk import system for students and teachers via CSV.

## 📄 License

This project is for educational purposes.
