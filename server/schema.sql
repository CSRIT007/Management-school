-- Management School database schema

CREATE OR REPLACE FUNCTION records_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION records_sync_id_in_data()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data = jsonb_set(
    COALESCE(NEW.data, '{}'::jsonb),
    '{id}',
    to_jsonb(NEW.id),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS records (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, id)
);

-- Backfill id inside JSON for any legacy rows before adding the check constraint.
UPDATE records
SET data = jsonb_set(COALESCE(data, '{}'::jsonb), '{id}', to_jsonb(id), true)
WHERE data->>'id' IS DISTINCT FROM id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'records_collection_check'
  ) THEN
    ALTER TABLE records ADD CONSTRAINT records_collection_check CHECK (
      collection IN (
        'students', 'classes', 'deadlines', 'payments', 'bookIssues',
        'alumni', 'categories', 'products', 'orders'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'records_data_is_object'
  ) THEN
    ALTER TABLE records ADD CONSTRAINT records_data_is_object CHECK (
      jsonb_typeof(data) = 'object'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'records_id_matches_data'
  ) THEN
    ALTER TABLE records ADD CONSTRAINT records_id_matches_data CHECK (
      data->>'id' IS NULL OR data->>'id' = id
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
CREATE INDEX IF NOT EXISTS idx_records_collection_created ON records(collection, created_at);
CREATE INDEX IF NOT EXISTS idx_records_data_gin ON records USING gin (data);

DROP TRIGGER IF EXISTS trg_records_set_updated_at ON records;
CREATE TRIGGER trg_records_set_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION records_set_updated_at();

DROP TRIGGER IF EXISTS trg_records_sync_id_in_data ON records;
CREATE TRIGGER trg_records_sync_id_in_data
  BEFORE INSERT OR UPDATE ON records
  FOR EACH ROW
  EXECUTE FUNCTION records_sync_id_in_data();
