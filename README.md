# Health App API

A comprehensive RESTful API for tracking health, workouts, nutrition, and body metrics. Built with Node.js, Express, TypeScript, and Prisma ORM.

## Overall Functionality

The Health App API provides a centralized system for users to monitor and analyze various health-related data points. It is designed to help users identify correlations between their nutrition, training, sleep, and the occurrence of symptoms (such as syncope or dizziness).

**Key Functional Areas:**
- **User Management:** Secure registration, login, and profile management.
- **Training & Exercise:** Detailed logging of workouts, including specific exercises, sets, reps, and weights.
- **Nutrition & Diet:** Tracking of food intake, meal planning, nutrient analysis (including micronutrients), and goal setting.
- **Vitals & Body Metrics:** Monitoring of blood pressure, sleep quality, and body composition (weight, BMI, etc.).
- **Symptom Tracking:** Logging of symptoms and syncope events, including triggers and severity, with support for image uploads.
- **HRV Analysis:** Advanced Heart Rate Variability (HRV) recording and metrics analysis for recovery and stress monitoring.
- **Daily Logs:** High-level daily summaries of energy, water intake, and overall well-being.
- **Analytics:** Endpoints to retrieve data trends over time (monthly views) for various metrics.

## Data Models

The API stores the following primary data entities:

### Core & User
- **User:** Basic profile information (email, name, gender, birth year).
- **UserGoals:** Nutritional targets (calories, macros, fiber, salt, etc.).

### Training & Physical Activity
- **TrainingLog:** High-level workout session data (duration, avg heart rate, calories burned).
- **Exercise:** Definitions of exercises.
- **ExerciseLog:** Specific exercises performed within a training session.
- **SetLog:** Individual sets within an exercise (reps, weight, type).

### Nutrition & Intake
- **Food:** Food items with nutritional values per 100g.
- **NutrientFacts:** Detailed micronutrient data (vitamins, minerals, fatty acids) for food.
- **Meal:** Pre-defined meal compositions.
- **MealIngredient:** Link between meals and foods with specific weights.
- **MealLog:** Records of when a meal was consumed.
- **FoodLog:** Individual food items consumed, linked to meal logs.
- **IntakeLog:** Tracking of water, electrolytes, caffeine, and alcohol.

### Health & Vitals
- **BodyLog:** Body metrics (weight, height, fat/muscle mass, BMI, BMR).
- **BloodPressureLog:** Systolic/diastolic pressure, pulse, and context (position, caffeine).
- **SleepLog:** Sleep duration, quality (rested score), and smart-watch metrics.
- **DailyLog:** Daily energy levels, water intake, and symptom burden.

### Symptoms & HRV
- **SymptomLog:** Detailed symptom events (type, severity, triggers, position).
- **SymptomPicture:** Images associated with symptom logs.
- **SyncopeLog:** Specific records of fainting events (type, outcome, amnesia).
- **HrvRecording:** HRV data sessions linked to sleep or training.
- **HrvWindow:** Time-segmented windows within an HRV recording.
- **hrvMetrics:** Detailed time-domain, frequency-domain, and non-linear HRV metrics.

## API Endpoints

All endpoints are prefixed with `/api`.

### Users & Auth
- `POST /api/users/register` — Register a new user
- `POST /api/users/login` — Login and receive JWT
- `POST /api/users/logout` — Logout user
- `GET /api/users/getUserAge` — Get user's age

### Training & Exercise
- **Training:**
  - `GET /api/training/getTraining` — Get all training logs
  - `GET /api/training/getTraining/:id` — Get a specific training log
  - `POST /api/training/createTraining` — Create a new training log
  - `PATCH /api/training/updateTraining/:id` — Update a training log
  - `DELETE /api/training/deleteTraining/:id` — Delete a training log
  - `GET /api/training/getTrainingNames` — Get training names
  - `GET /api/training/recalculateTrainingCalories` — Recalculate calories
- **Exercise:**
  - `GET /api/exercise/getExercises` — Get all exercises
  - `GET /api/exercise/getExerciseNames` — Get exercise names
  - `GET /api/exercise/getExercise/:name` — Get exercise by name
  - `POST /api/exercise/createExercise` — Create exercise
  - `PATCH /api/exercise/changeExercise/:name` — Update exercise
  - `DELETE /api/exercise/deleteExercise/:name` — Delete exercise
- **Exercise Log:**
  - `GET /api/exerciseLog/getExerciseLog/:id` — Get exercise log by ID
  - `POST /api/exerciseLog/createExerciseLog` — Create exercise log
  - `PATCH /api/exerciseLog/changeExerciseLog/:id` — Update exercise log
  - `DELETE /api/exerciseLog/deleteExerciseLog/:id` — Delete exercise log
- **Sets:**
  - `GET /api/set/getSet/:id` — Get set by ID
  - `GET /api/set/getSetTypes` — Get set types
  - `GET /api/set/getSetUnits` — Get set units
  - `POST /api/set/createSet` — Create set
  - `PATCH /api/set/changeSet/:id` — Update set
  - `DELETE /api/set/deleteSet/:id` — Delete set

### Nutrition & Food
- **Food:**
  - `GET /api/food/` — Get all foods
  - `GET /api/food/:id` — Get food by ID
  - `POST /api/food/` — Create food
  - `PATCH /api/food/:id` — Update food
  - `DELETE /api/food/:id` — Delete food
  - `GET /api/food/search` — Search foods
  - `GET /api/food/my-foods` — Get user's custom foods
  - `GET /api/food/top-foods` — Get most used foods
- **Nutrients:**
  - `GET /api/food/:foodId/nutrients` — Get nutrients for a food
  - `POST /api/food/:foodId/nutrients` — Create nutrients
  - `PATCH /api/food/:foodId/nutrients` — Update nutrients
  - `DELETE /api/food/:foodId/nutrients` — Delete nutrients
- **Meals:**
  - `GET /api/meal/` — Get all meals
  - `GET /api/meal/:id` — Get meal by ID
  - `POST /api/meal/` — Create meal
  - `PATCH /api/meal/:id` — Update meal
  - `DELETE /api/meal/:id` — Delete meal
  - `POST /api/meal/:id/ingredients` — Add ingredient to meal
  - `PATCH /api/meal/:id/ingredients/:ingredientId` — Update ingredient
  - `DELETE /api/meal/:id/ingredients/:ingredientId` — Remove ingredient
- **Meal Logs:**
  - `GET /api/mealLog/` — Get all meal logs
  - `GET /api/mealLog/:id` — Get meal log by ID
  - `POST /api/mealLog/` — Create meal log
  - `PATCH /api/mealLog/:id` — Update meal log
  - `DELETE /api/mealLog/:id` — Delete meal log
  - `POST /api/meal/:id/log` — Log a specific meal
- **Food Logs:**
  - `GET /api/mealLog/:mealLogId/food-logs` — Get food logs for a meal log
  - `POST /api/mealLog/:mealLogId/food-logs` — Create food log
  - `PATCH /api/mealLog/:mealLogId/food-logs/:id` — Update food log
  - `DELETE /api/mealLog/:mealLogId/food-logs/:id` — Delete food log
- **Goals & NRV:**
  - `GET /api/goals/` — Get nutrition goals
  - `POST /api/goals/` — Create goals
  - `PATCH /api/goals/` — Update goals
  - `DELETE /api/goals/` — Delete goals
  - `GET /api/nrv/` — Get Nutrient Reference Values
  - `POST /api/nrv/progress` — Get NRV progress

### Vitals & Body
- **Body Log:**
  - `GET /api/bodyLog/getBodyLogs` — Get all body logs
  - `GET /api/bodyLog/getBodyLog/:id` — Get body log by ID
  - `POST /api/bodyLog/createBodyLog` — Create body log
  - `PATCH /api/bodyLog/updateBodyLog/:id` — Update body log
  - `DELETE /api/bodyLog/deleteBodyLog/:id` — Delete body log
  - `GET /api/bodyLog/getCaloriesBurnedOnDay` — Get calories burned on a day
- **Blood Pressure:**
  - `GET /api/vitals/bloodPressure/` — Get all BP logs
  - `GET /api/vitals/bloodPressure/:id` — Get BP log by ID
  - `POST /api/vitals/bloodPressure/` — Create BP log
  - `DELETE /api/vitals/bloodPressure/:id` — Delete BP log
- **Sleep:**
  - `GET /api/vitals/sleep/` — Get all sleep logs
  - `GET /api/vitals/sleep/:id` — Get sleep log by ID
  - `POST /api/vitals/sleep/` — Create sleep log
  - `DELETE /api/vitals/sleep/:id` — Delete sleep log

### Symptoms & Daily Logs
- **Daily Logs:**
  - `GET /api/symptoms/dailyLog/` — Get all daily logs
  - `GET /api/symptoms/dailyLog/:date` — Get daily log by date
  - `POST /api/symptoms/dailyLog/` — Create daily log
  - `DELETE /api/symptoms/dailyLog/:id` — Delete daily log
- **Symptoms:**
  - `GET /api/symptoms/symptom/` — Get all symptoms
  - `GET /api/symptoms/symptom/:id` — Get symptom by ID
  - `POST /api/symptoms/symptom/` — Create symptom
  - `PATCH /api/symptoms/symptom/:id` — Update symptom
  - `DELETE /api/symptoms/symptom/:id` — Delete symptom
  - `POST /api/symptoms/symptom/:id/pictures` — Upload symptom picture
  - `DELETE /api/symptoms/symptom/:id/pictures/:pictureId` — Delete symptom picture
- **Syncope:**
  - `GET /api/symptoms/syncope/` — Get all syncope logs
  - `GET /api/symptoms/syncope/:id` — Get syncope log by ID
  - `POST /api/symptoms/syncope/` — Create syncope log
  - `DELETE /api/symptoms/syncope/:id` — Delete syncope log

### HRV (Heart Rate Variability)
- `GET /api/hrv/getHrvRecording` — Get HRV recordings
- `GET /api/hrv/getHrvRecording/:id` — Get HRV recording by ID
- `GET /api/hrv/getHrvData/:id` — Get raw HRV data
- `GET /api/hrv/getHrvWindowData/:id` — Get windowed HRV data
- `GET /api/hrv/getHrvMetrics/:id` — Get HRV metrics
- `POST /api/hrv/createHrvRecording` — Create HRV recording
- `PATCH /api/hrv/updateHrvRecording/:id` — Update HRV recording
- `DELETE /api/hrv/deleteHrvRecording/:id` — Delete HRV recording

### Analysis & Dashboards
- **Calendar/Monthly Trends:**
  - `GET /api/analysis/calender/foodOverMonth` — Food intake over month
  - `GET /api/analysis/calender/microOverMonth` — Micronutrients over month
  - `GET /api/analysis/calender/symptomsOverMonth` — Symptoms over month
  - `GET /api/analysis/calender/syncopesOverMonth` — Syncopes over month
  - `GET /api/analysis/calender/bloodPressureOverMonth` — BP over month
  - `GET /api/analysis/calender/sleepOverMonth` — Sleep over month
  - `GET /api/analysis/calender/trainingOverMonth` — Training over month
  - `GET /api/analysis/calender/dailyLogsOverMonth` — Daily logs over month
  - `GET /api/analysis/calender/intakeLogsOverMonth` — Intake logs over month
- **Micro-nutrient Analysis:**
  - `GET /api/analysis/micro/:micro` — Specific micronutrient over time
- **Nutrition Dashboard:**
  - `GET /api/food/dashboard/daily` — Daily nutrition summary
  - `GET /api/food/dashboard/weekly` — Weekly nutrition summary
  - `GET /api/food/dashboard/monthly` — Monthly nutrition summary
  - `GET /api/food/dashboard/nutrition-over-time` — Nutrition trends

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

## Development

- **Linting:** Uses ESLint and Prettier
- **Hot Reload:** `ts-node-dev` for development server
- **Prisma Studio:** Run `npm run website` to open Prisma Studio for DB inspection

## License

This project is licensed under the MIT License. See the LICENSE file for details.
