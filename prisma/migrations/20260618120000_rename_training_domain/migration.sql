-- Rename training-domain tables and relation scalar columns in place.
-- This preserves data and existing foreign-key relationships.

DO $$
BEGIN
  IF to_regclass('"TrainingLog"') IS NOT NULL AND to_regclass('"Workout"') IS NULL THEN
    ALTER TABLE "TrainingLog" RENAME TO "Workout";
  END IF;

  IF to_regclass('"ExerciseLog"') IS NOT NULL AND to_regclass('"WorkoutExercise"') IS NULL THEN
    ALTER TABLE "ExerciseLog" RENAME TO "WorkoutExercise";
  END IF;

  IF to_regclass('"SetLog"') IS NOT NULL AND to_regclass('"WorkoutSet"') IS NULL THEN
    ALTER TABLE "SetLog" RENAME TO "WorkoutSet";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'WorkoutExercise'
      AND column_name = 'trainingId'
  ) THEN
    ALTER TABLE "WorkoutExercise" RENAME COLUMN "trainingId" TO "workoutId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'WorkoutSet'
      AND column_name = 'exerciseLogId'
  ) THEN
    ALTER TABLE "WorkoutSet" RENAME COLUMN "exerciseLogId" TO "workoutExerciseId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'HrvRecording'
      AND column_name = 'trainingLogId'
  ) THEN
    ALTER TABLE "HrvRecording" RENAME COLUMN "trainingLogId" TO "workoutId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'SyncopeLog'
      AND column_name = 'trainingLogId'
  ) THEN
    ALTER TABLE "SyncopeLog" RENAME COLUMN "trainingLogId" TO "workoutId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'BloodPressureLog'
      AND column_name = 'trainingId'
  ) THEN
    ALTER TABLE "BloodPressureLog" RENAME COLUMN "trainingId" TO "workoutId";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"HrvRecording_trainingLogId_key"') IS NOT NULL
     AND to_regclass('"HrvRecording_workoutId_key"') IS NULL THEN
    ALTER INDEX "HrvRecording_trainingLogId_key" RENAME TO "HrvRecording_workoutId_key";
  END IF;

  IF to_regclass('"BloodPressureLog_trainingId_idx"') IS NOT NULL
     AND to_regclass('"BloodPressureLog_workoutId_idx"') IS NULL THEN
    ALTER INDEX "BloodPressureLog_trainingId_idx" RENAME TO "BloodPressureLog_workoutId_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('"WorkoutExercise"')
      AND conname = 'ExerciseLog_trainingId_fkey'
  ) THEN
    ALTER TABLE "WorkoutExercise" RENAME CONSTRAINT "ExerciseLog_trainingId_fkey" TO "WorkoutExercise_workoutId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('"WorkoutExercise"')
      AND conname = 'ExerciseLog_exerciseId_fkey'
  ) THEN
    ALTER TABLE "WorkoutExercise" RENAME CONSTRAINT "ExerciseLog_exerciseId_fkey" TO "WorkoutExercise_exerciseId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('"WorkoutExercise"')
      AND conname = 'ExerciseLog_userId_fkey'
  ) THEN
    ALTER TABLE "WorkoutExercise" RENAME CONSTRAINT "ExerciseLog_userId_fkey" TO "WorkoutExercise_userId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('"WorkoutSet"')
      AND conname = 'SetLog_exerciseLogId_fkey'
  ) THEN
    ALTER TABLE "WorkoutSet" RENAME CONSTRAINT "SetLog_exerciseLogId_fkey" TO "WorkoutSet_workoutExerciseId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('"WorkoutSet"')
      AND conname = 'SetLog_userId_fkey'
  ) THEN
    ALTER TABLE "WorkoutSet" RENAME CONSTRAINT "SetLog_userId_fkey" TO "WorkoutSet_userId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('"HrvRecording"')
      AND conname = 'HrvRecording_trainingLogId_fkey'
  ) THEN
    ALTER TABLE "HrvRecording" RENAME CONSTRAINT "HrvRecording_trainingLogId_fkey" TO "HrvRecording_workoutId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('"SyncopeLog"')
      AND conname = 'SyncopeLog_trainingLogId_fkey'
  ) THEN
    ALTER TABLE "SyncopeLog" RENAME CONSTRAINT "SyncopeLog_trainingLogId_fkey" TO "SyncopeLog_workoutId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = to_regclass('"BloodPressureLog"')
      AND conname = 'BloodPressureLog_trainingId_fkey'
  ) THEN
    ALTER TABLE "BloodPressureLog" RENAME CONSTRAINT "BloodPressureLog_trainingId_fkey" TO "BloodPressureLog_workoutId_fkey";
  END IF;
END $$;
