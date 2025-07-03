# Health App API

A RESTful API for tracking health, workouts, nutrition, and body metrics. Built with Node.js, Express, TypeScript, and Prisma ORM.

## Features

- User registration, login, authentication (JWT & cookies)
- Training log management (CRUD)
- Exercise and set tracking
- Body log and nutrition log endpoints
- Input validation and sanitization
- Rate limiting, CORS, security headers (Helmet)
- Centralized error handling

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/health-app.git
   cd health-app
   ```

2. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables:**

   Create a `.env` file in the root directory:

   ```
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
   JWT_SECRET=your_jwt_secret
   FRONTEND_URL=http://localhost:3000
   FRONTEND_URL2=http://your-other-frontend.com
   NODE_ENV=development
   ```

4. **Run database migrations:**
   ```sh
   npm run migrate
   ```

5. **Generate Prisma client:**
   ```sh
   npm run generate
   ```

6. **Start the development server:**
   ```sh
   npm run dev
   ```

   The API will be available at `http://localhost:3000`.

## API Endpoints

All endpoints are prefixed with `/api`.

### Users

- `POST /api/users/register` — Register a new user
- `POST /api/users/login` — Login and receive JWT
- `POST /api/users/logout` — Logout user
- `POST /api/users/isAuthenticated` — Check authentication status

### Training

- `GET /api/training/getTraining` — Get all training logs
- `GET /api/training/getTraining/:id` — Get a specific training log
- `POST /api/training/createTraining` — Create a new training log
- `PATCH /api/training/updateTraining/:id` — Update a training log
- `DELETE /api/training/deleteTraining/:id` — Delete a training log
- `GET /api/training/getTrainingTypes` — Get distinct training types

### Exercise

- `GET /api/exercise/getExerciseNames` — Get exercise names
- `GET /api/exercise/getExercise/:id` — Get exercise by ID
- `POST /api/exercise/createExercise` — Create exercise
- `PATCH /api/exercise/changeExercise/:id` — Update exercise
- `DELETE /api/exercise/deleteExercise/:id` — Delete exercise

### Set

- `GET /api/set/getSet/:id` — Get set by ID
- `GET /api/set/getSetTypes` — Get set types
- `POST /api/set/createSet` — Create set
- `PATCH /api/set/changeSet/:id` — Update set
- `DELETE /api/set/deleteSet/:id` — Delete set

### Body

- `GET /api/body/getCaloriesBurnedOnDay` — Get calories burned on a day
- `POST /api/body/createBodyLog` — Create body log

## Development

- **Linting:** Uses ESLint and Prettier (see `.vscode/extensions.json` for recommended extensions)
- **Hot Reload:** `ts-node-dev` for development server
- **Prisma Studio:** Run `npm run website` to open Prisma Studio for DB inspection

## License

This project is licensed under the MIT License. See the LICENSE file for details.
