# Diagram Generation Prompts for University Teachers Feedback System

These prompts are designed for AI image generation models to create professional, technical diagrams that mimic the style of the reference ERD diagram. Each prompt includes specific context from the University Teachers Feedback System project.

---

## Figure 4.1: System Architecture Diagram

**Prompt:**
Create a professional three-tier system architecture diagram for a University Teachers Feedback System. Style should mimic technical software architecture diagrams with clean boxes, arrows, and professional color scheme (blues, grays, whites). The diagram should show:

**Components:**
- **Frontend Layer**: React/Vite SPA box with label "Frontend (React/Vite)" - includes icons for React, Vite, TailwindCSS
- **Backend API Layer**: Node.js/Express box with label "Backend API (Node.js/Express)" - includes icons for Node.js, Express, JWT
- **Database Layer**: MongoDB Atlas box with label "Database (MongoDB Atlas)" - includes MongoDB icon
- **External Services**: Google Gemini AI box with label "AI Service (Google Gemini)" - includes AI icon

**Connections:**
- Arrow from User/Browser → Frontend (HTTPS)
- Arrow from Frontend → Backend API (HTTPS with JWT authentication)
- Arrow from Backend API → MongoDB Atlas (Database connection)
- Arrow from Backend API → Google Gemini AI (API calls)

**Security Layers:**
- JWT Authentication layer between Frontend and Backend
- Role-Based Access Control (RBAC) label near Backend
- SSL/TLS encryption labels on all connections

**Layout:** Horizontal flow from left to right: User → Frontend → Backend → Database/AI Services

**Style:** Professional software architecture diagram with rounded rectangles, clear typography, technical icons, and subtle gradients. Use blue for frontend, green for backend, orange for database, purple for AI services.

---

## Figure 4.2: System Use-Case Diagram

**Prompt:**
Create a professional UML Use-Case diagram for a University Teachers Feedback System. Style should mimic standard UML use-case diagrams with stick figure actors, ovals for use cases, and connecting lines. Professional color scheme (blues, grays).

**Actors (Stick Figures):**
- **Student** (left side)
- **Teacher** (center)
- **Administrator** (right side)

**Use Cases (Ovals):**

**Student Use Cases:**
- Login
- View Teachers
- Submit Feedback
- Edit Feedback
- Logout

**Teacher Use Cases:**
- Login
- View Ratings
- View AI Summary
- Chat with AI
- Logout

**Administrator Use Cases:**
- Login
- View Rankings
- Track Students
- Manage Users
- Configure AI Settings
- Logout

**Connections:**
- Lines connecting each actor to their respective use cases
- "include" relationships where appropriate (e.g., Login included in all other use cases)
- System boundary rectangle enclosing all use cases

**Layout:** Actors on the outside, use cases inside system boundary. Group use cases by actor proximity.

**Style:** Clean UML use-case diagram with standard notation, clear labels, professional colors (light blue for use cases, dark blue for actors).

---

## Figure 4.3: Data Flow Diagram (DFD Level 1)

**Prompt:**
Create a professional Level 1 Data Flow Diagram for a University Teachers Feedback System. Style should mimic technical DFD diagrams with rounded rectangles for processes, parallel lines for data stores, open rectangles for external entities, and arrows for data flow. Professional color scheme (blues, greens, grays).

**External Entities (Open Rectangles):**
- **Student Actor** (left)
- **Teacher Actor** (right)

**Processes (Rounded Rectangles):**
- **Login Process** (authentication)
- **Student Dashboard** (view assignments)
- **Feedback System** (submit feedback)
- **Teacher Dashboard** (retrieve ratings)
- **AI Summary Service** (generate summaries)

**Data Stores (Parallel Lines):**
- **MongoDB Database** (central storage)

**Data Flow (Arrows with labels):**
- Student → Login Process: "credentials"
- Login Process → Student Dashboard: "session token"
- Student Dashboard → Feedback System: "teacher selection"
- Student → Feedback System: "rating, comment"
- Feedback System → MongoDB Database: "feedback data"
- Teacher Dashboard → MongoDB Database: "query ratings"
- MongoDB Database → Teacher Dashboard: "rating data"
- Teacher Dashboard → AI Summary Service: "feedback data"
- AI Summary Service → MongoDB Database: "cached summary"
- AI Summary Service → Teacher Dashboard: "AI summary"

**Layout:** Left-to-right flow with Student on left, Teacher on right, Database at bottom center.

**Style:** Professional DFD with clear process boundaries, labeled data flows, and distinct visual hierarchy for entities, processes, and stores.

---

## Figure 4.4: Entity Relationship Diagram (ERD)

**Prompt:**
Create a professional Entity Relationship Diagram for a University Teachers Feedback System database. Style should mimic the reference ERD with entity boxes, relationship lines with cardinality notation (1, N, M), and professional color scheme (blues, grays, whites).

**Entities (Rectangles with fields):**

**User** (central entity)
- Fields: _id, username, password, role, name, email, createdAt
- Relationships: One-to-one with Student, One-to-many with TeacherAssignments

**Student**
- Fields: _id, userId, sectionId, semesterId, rollNumber, cnic, phone
- Relationships: Many-to-one with User, Many-to-one with Section, Many-to-one with Semester, One-to-many with Feedback

**Teacher**
- Fields: _id, userId, email
- Relationships: Many-to-one with User, One-to-many with TeacherAssignments, One-to-one with AISummary, One-to-many with ChatSession

**Department**
- Fields: _id, name, code
- Relationships: One-to-many with Semester

**Semester**
- Fields: _id, departmentId, number, label
- Relationships: Many-to-one with Department, One-to-many with Section

**Section**
- Fields: _id, semesterId, name
- Relationships: Many-to-one with Semester, One-to-many with Student, One-to-many with Subject

**Subject**
- Fields: _id, sectionId, name, code
- Relationships: Many-to-one with Section, One-to-many with TeacherAssignment

**TeacherAssignment**
- Fields: _id, teacherId, subjectId, sectionId, semesterId
- Relationships: Many-to-one with Teacher, Many-to-one with Subject, Many-to-one with Section, Many-to-one with Semester, One-to-many with Feedback

**Feedback**
- Fields: _id, studentId, assignmentId, rating, comment, version, createdAt
- Relationships: Many-to-one with Student, Many-to-one with TeacherAssignment

**AISummary**
- Fields: _id, teacherId, summaryText, feedbackCount, lastUpdated
- Relationships: One-to-one with Teacher

**ChatSession**
- Fields: _id, teacherId, messages, createdAt
- Relationships: Many-to-one with Teacher

**AISettings**
- Fields: _id, selectedModel, keys (array)
- Relationships: Singleton configuration entity

**Relationship Notation:**
- 1 (one)
- N (many)
- M (many, many-to-many)

**Layout:** Hierarchical with User at center, Department→Semester→Section→Subject chain on left, Teacher→TeacherAssignment→Feedback chain on right.

**Style:** Professional ERD with entity boxes showing primary keys (underlined), foreign keys, relationship lines with cardinality markers, and clear field listings.

---

## Figure 4.5: Activity Diagram (Feedback Submission)

**Prompt:**
Create a professional UML Activity Diagram for the Feedback Submission process in a University Teachers Feedback System. Style should mimic standard UML activity diagrams with rounded rectangles for activities, diamonds for decisions, and arrows for flow. Professional color scheme (blues, greens, grays).

**Activities (Rounded Rectangles):**
- Start
- Login
- Authentication
- View Dashboard
- Select Teacher
- Open Feedback Form
- Adjust Rating Slider
- Enter Comment
- Click Submit
- Validate Input
- Save to Database
- Update Progress
- Display Success
- End

**Decisions (Diamonds):**
- "Authentication Successful?" (Yes → View Dashboard, No → Login)
- "Form Valid?" (Yes → Save to Database, No → Open Feedback Form)
- "Save Successful?" (Yes → Update Progress, No → Display Error)

**Flow (Arrows):**
- Start → Login
- Login → Authentication
- Authentication → Decision: "Authentication Successful?"
- Decision (Yes) → View Dashboard
- Decision (No) → Login
- View Dashboard → Select Teacher
- Select Teacher → Open Feedback Form
- Open Feedback Form → Adjust Rating Slider
- Adjust Rating Slider → Enter Comment
- Enter Comment → Click Submit
- Click Submit → Validate Input
- Validate Input → Decision: "Form Valid?"
- Decision (Yes) → Save to Database
- Decision (No) → Open Feedback Form
- Save to Database → Decision: "Save Successful?"
- Decision (Yes) → Update Progress
- Decision (No) → Display Error
- Update Progress → Display Success
- Display Success → End
- Display Error → Open Feedback Form

**Swimlanes:** None (single actor process)

**Layout:** Top-to-bottom flow with clear decision branches.

**Style:** Professional activity diagram with standard UML notation, clear activity labels, and distinct decision diamonds.

---

## Figure 4.6: Deployment Diagram

**Prompt:**
Create a professional UML Deployment Diagram for a University Teachers Feedback System. Style should mimic standard UML deployment diagrams with 3D boxes for nodes, rectangles for components, and arrows for communication. Professional color scheme (blues, greens, oranges, grays).

**Nodes (3D Boxes):**

**User Node**
- Component: Web Browser
- Label: "User Device"

**Frontend Deployment Node**
- Platform: Vercel (Static Site)
- Component: React SPA
- Label: "Frontend (Vercel)"

**Backend Deployment Node**
- Platform: Vercel (Serverless Functions)
- Component: Node.js Express API
- Label: "Backend API (Vercel)"

**Database Node**
- Platform: MongoDB Atlas
- Component: MongoDB Database
- Label: "Database (MongoDB Atlas)"

**External Service Node**
- Platform: Google Cloud
- Component: Gemini AI API
- Label: "AI Service (Google Gemini)"

**Communication (Arrows with labels):**
- User Device → Frontend: "HTTPS"
- Frontend → Backend API: "HTTPS (with JWT)"
- Backend API → Database: "MongoDB Connection"
- Backend API → AI Service: "HTTPS API Calls"

**Layout:** Left-to-right flow: User Device → Frontend → Backend → Database/AI Services

**Style:** Professional deployment diagram with 3D node representations, component icons, clear communication protocols, and cloud platform labels.

---

## Figure 4.7: Database Schema Class Diagram

**Prompt:**
Create a professional UML Class Diagram showing the Mongoose database schema for a University Teachers Feedback System. Style should mimic the reference ERD/class diagram with class boxes showing fields, data types, and relationships. Professional color scheme (blues, grays, whites).

**Classes (Rectangles with three sections):**

**User Class**
- Fields:
  - username: String (unique)
  - password: String (hashed)
  - role: Enum (admin, teacher, student)
  - name: String
  - email: String
  - createdAt: Date
- Methods: comparePassword()

**Department Class**
- Fields:
  - name: String
  - code: String (unique)

**Semester Class**
- Fields:
  - departmentId: ObjectId (FK to Department)
  - number: Number
  - label: String

**Section Class**
- Fields:
  - semesterId: ObjectId (FK to Semester)
  - name: String

**Subject Class**
- Fields:
  - sectionId: ObjectId (FK to Section)
  - name: String
  - code: String

**TeacherAssignment Class**
- Fields:
  - teacherId: ObjectId (FK to User)
  - subjectId: ObjectId (FK to Subject)
  - sectionId: ObjectId (FK to Section)
  - semesterId: ObjectId (FK to Semester)

**Student Class**
- Fields:
  - userId: ObjectId (FK to User)
  - sectionId: ObjectId (FK to Section)
  - semesterId: ObjectId (FK to Semester)
  - rollNumber: String (auto-generated)
  - cnic: String (unique)
  - phone: String

**Feedback Class**
- Fields:
  - studentId: ObjectId (FK to Student)
  - assignmentId: ObjectId (FK to TeacherAssignment)
  - rating: Number (1-10)
  - comment: String
  - version: Number
  - createdAt: Date

**AISummary Class**
- Fields:
  - teacherId: ObjectId (FK to User)
  - summaryText: String
  - feedbackCount: Number
  - lastUpdated: Date

**ChatSession Class**
- Fields:
  - teacherId: ObjectId (FK to User)
  - messages: Array (Object)
  - createdAt: Date

**AISettings Class**
- Fields:
  - selectedModel: String
  - keys: Array (Object)

**Relationships (Lines with cardinality):**
- User 1:1 Student
- User 1:N TeacherAssignment
- Department 1:N Semester
- Semester 1:N Section
- Section 1:N Subject
- Section 1:N Student
- Subject 1:N TeacherAssignment
- Teacher 1:N TeacherAssignment
- TeacherAssignment 1:N Feedback
- Student 1:N Feedback
- Teacher 1:1 AISummary
- Teacher 1:N ChatSession

**Layout:** Hierarchical with User at top, Department→Semester→Section→Subject chain on left, Student→Feedback chain on right.

**Style:** Professional class diagram with field types, primary keys (underlined), foreign keys, relationship lines with cardinality, and clear class boundaries.

---

## General Styling Instructions for All Diagrams

**Color Palette:**
- Primary Blue: #2563EB (for main components)
- Secondary Blue: #3B82F6 (for secondary elements)
- Green: #10B981 (for success/positive elements)
- Orange: #F59E0B (for databases/storage)
- Purple: #8B5CF6 (for AI/external services)
- Gray: #6B7280 (for neutral elements)
- White: #FFFFFF (for backgrounds)
- Light Gray: #F3F4F6 (for secondary backgrounds)

**Typography:**
- Sans-serif fonts (Arial, Helvetica, or similar)
- Clear, readable sizes (12-14pt for labels, 10-12pt for details)
- Bold for headers/primary labels
- Regular for secondary text

**Visual Elements:**
- Rounded corners (4-8px) for boxes
- Subtle gradients for depth
- Clear borders (1-2px)
- Consistent spacing (8-16px margins)
- Professional icons where appropriate
- High contrast for readability

**Technical Accuracy:**
- All relationships must match the actual system architecture
- Correct cardinality notation (1, N, M)
- Proper UML notation for each diagram type
- Accurate field names and data types
- Correct flow directions and connections
