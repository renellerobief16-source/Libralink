# Libralink Backend - Node.js/Express.js

Backend API for Libralink Library Management System using Node.js, Express.js, and Supabase PostgreSQL.

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database (via Supabase)
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Multer** - File uploads
- **Dotenv** - Environment variables

## Installation

1. Install dependencies:
```bash
cd backend-node
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your Supabase credentials:
```
SUPABASE_URL=your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-key
```

## Database Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL schema from `../backend/database/supabase_schema.sql` in Supabase SQL Editor
3. Update your `.env` file with Supabase credentials

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user

### Users
- `GET /api/users` - Get all users (Admin/Librarian only)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/school/:school_id` - Get users by school
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Schools
- `GET /api/schools` - Get all schools
- `GET /api/schools/:id` - Get school by ID
- `POST /api/schools` - Create school (Super Admin only)
- `PUT /api/schools/:id` - Update school (Super Admin only)
- `DELETE /api/schools/:id` - Delete school (Super Admin only)

### Books
- `GET /api/books` - Get all books
- `GET /api/books/popular` - Get popular books
- `GET /api/books/:id` - Get book by ID
- `POST /api/books` - Create book (Librarian/Admin only)
- `PUT /api/books/:id` - Update book (Librarian/Admin only)
- `DELETE /api/books/:id` - Delete book (Admin only)

### Borrows
- `GET /api/borrow/active` - Get all active borrows
- `GET /api/borrow/student/:student_id` - Get borrows by student
- `POST /api/borrow` - Create borrow request (Student only)
- `PUT /api/borrow/:id/return` - Return book (Librarian only)

### Activity Logs
- `GET /api/activity-logs` - Get all activity logs (Admin/Librarian only)
- `GET /api/activity-logs/recent` - Get recent activity logs

### Announcements
- `GET /api/announcements` - Get all announcements
- `POST /api/announcements` - Create announcement (Admin only)

## Authentication

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Project Structure

```
backend-node/
├── config/
│   └── database.js          # PostgreSQL connection
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── errorHandler.js      # Error handling
├── models/
│   ├── User.js              # User model
│   ├── School.js            # School model
│   ├── Book.js              # Book model (to be implemented)
│   └── BorrowTransaction.js # Borrow model (to be implemented)
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User routes
│   ├── schools.js           # School routes
│   ├── books.js             # Book routes
│   ├── borrows.js           # Borrow routes
│   ├── activityLogs.js      # Activity log routes
│   └── announcements.js     # Announcement routes
├── uploads/                 # File upload directory
├── .env                     # Environment variables
├── package.json             # Dependencies
├── server.js               # Main server file
└── README.md               # This file
```

## TODO

- [ ] Implement Book model with full CRUD operations
- [ ] Implement BorrowTransaction model
- [ ] Implement ActivityLog model
- [ ] Implement Announcement model
- [ ] Add file upload handling with Multer
- [ ] Add input validation with express-validator
- [ ] Add comprehensive error handling
- [ ] Add rate limiting
- [ ] Add API documentation (Swagger)
- [ ] Add unit tests
- [ ] Add integration tests

## Migration from PHP Backend

The PHP backend is still available in the `backend/` directory. To switch between backends:

1. **PHP Backend**: Update frontend API base URL to point to `http://localhost/libralinkk/backend/api`
2. **Node.js Backend**: Update frontend API base URL to point to `http://localhost:5000/api`

## License

ISC
