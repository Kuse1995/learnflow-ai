-- Add enhanced delivery tracking columns to parent_messages
ALTER TABLE parent_messages 
ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retry_backoff_seconds INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS queued_offline BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS offline_queue_position INTEGER;

-- Create delivery_attempts table for detailed tracking
CREATE TABLE IF NOT EXISTS public.delivery_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES parent_messages(id) ON DELETE CASCADE,
  channel delivery_channel NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  succeeded BOOLEAN,
  error_code TEXT,
  error_message TEXT,
  provider_response JSONB,
  network_available BOOLEAN DEFAULT true,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create offline_message_queue for local-first queuing
CREATE TABLE IF NOT EXISTS public.offline_message_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES parent_messages(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  payload JSONB NOT NULL,
  target_channel delivery_channel,
  priority INTEGER DEFAULT 2,
  created_offline_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  sync_attempts INTEGER DEFAULT 0,
  last_sync_error TEXT,
  device_id TEXT,
  is_synced BOOLEAN DEFAULT false
);

-- Create delivery_processor_state for tracking processor health
CREATE TABLE IF NOT EXISTS public.delivery_processor_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES schools(id),
  processor_type TEXT NOT NULL DEFAULT 'default',
  last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
  messages_processed INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  is_healthy BOOLEAN DEFAULT true,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_message ON delivery_attempts(message_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_channel ON delivery_attempts(channel, succeeded);
CREATE INDEX IF NOT EXISTS idx_offline_queue_pending ON offline_message_queue(school_id, is_synced) WHERE NOT is_synced;
CREATE INDEX IF NOT EXISTS idx_parent_messages_retry ON parent_messages(next_retry_at) WHERE delivery_status = 'queued';
CREATE INDEX IF NOT EXISTS idx_parent_messages_offline ON parent_messages(queued_offline) WHERE queued_offline = true;

-- Enable RLS
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_processor_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_attempts
CREATE POLICY "School admins can view delivery attempts"
ON delivery_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM parent_messages pm
    WHERE pm.id = delivery_attempts.message_id
    AND (
      is_super_admin(auth.uid()) OR
      is_school_admin(auth.uid(), pm.school_id)
    )
  )
);

-- RLS Policies for offline_message_queue
CREATE POLICY "Users can manage their school's offline queue"
ON offline_message_queue FOR ALL
USING (
  is_super_admin(auth.uid()) OR
  is_school_admin(auth.uid(), school_id) OR
  has_school_role(auth.uid(), 'teacher', school_id)
);

-- RLS Policies for delivery_processor_state
CREATE POLICY "Admins can view processor state"
ON delivery_processor_state FOR SELECT
USING (
  is_super_admin(auth.uid()) OR
  (school_id IS NOT NULL AND is_school_admin(auth.uid(), school_id))
);

-- Function to record a delivery attempt
CREATE OR REPLACE FUNCTION record_delivery_attempt(
  p_message_id UUID,
  p_channel delivery_channel,
  p_succeeded BOOLEAN,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_latency_ms INTEGER DEFAULT NULL,
  p_provider_response JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id UUID;
  v_attempt_number INTEGER;
BEGIN
  -- Get next attempt number for this message/channel combo
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
  FROM delivery_attempts
  WHERE message_id = p_message_id AND channel = p_channel;

  -- Insert the attempt record
  INSERT INTO delivery_attempts (
    message_id, channel, attempt_number, 
    succeeded, error_code, error_message, 
    latency_ms, provider_response, completed_at
  ) VALUES (
    p_message_id, p_channel, v_attempt_number,
    p_succeeded, p_error_code, p_error_message,
    p_latency_ms, p_provider_response, now()
  )
  RETURNING id INTO v_attempt_id;

  -- Update the parent message based on result
  IF p_succeeded THEN
    UPDATE parent_messages
    SET 
      delivery_status = 'sent',
      attempted_channel = p_channel,
      delivered_at = now(),
      delivery_completed_at = now(),
      next_retry_at = NULL
    WHERE id = p_message_id;
  ELSE
    -- Update channel-specific failure tracking
    CASE p_channel
      WHEN 'whatsapp' THEN
        UPDATE parent_messages SET 
          whatsapp_attempted = true, 
          whatsapp_failed_at = now(),
          last_attempt_at = now(),
          retry_count = COALESCE(retry_count, 0) + 1
        WHERE id = p_message_id;
      WHEN 'sms' THEN
        UPDATE parent_messages SET 
          sms_attempted = true, 
          sms_failed_at = now(),
          last_attempt_at = now(),
          retry_count = COALESCE(retry_count, 0) + 1
        WHERE id = p_message_id;
      WHEN 'email' THEN
        UPDATE parent_messages SET 
          email_attempted = true, 
          email_failed_at = now(),
          last_attempt_at = now(),
          retry_count = COALESCE(retry_count, 0) + 1
        WHERE id = p_message_id;
    END CASE;
  END IF;

  RETURN v_attempt_id;
END;
$$;

-- Function to get next message to process (with retry backoff)
CREATE OR REPLACE FUNCTION get_next_queued_message(p_school_id UUID DEFAULT NULL)
RETURNS TABLE(
  message_id UUID,
  channel delivery_channel,
  priority INTEGER,
  retry_count INTEGER,
  recipient_contact JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id as message_id,
    COALESCE(pm.attempted_channel, 
      CASE 
        WHEN pc.whatsapp_number IS NOT NULL THEN 'whatsapp'::delivery_channel
        WHEN pc.sms_number IS NOT NULL THEN 'sms'::delivery_channel
        ELSE 'email'::delivery_channel
      END
    ) as channel,
    COALESCE(mq.priority_level, 2) as priority,
    COALESCE(pm.retry_count, 0) as retry_count,
    jsonb_build_object(
      'parent_contact_id', pc.id,
      'whatsapp', pc.whatsapp_number,
      'sms', pc.sms_number,
      'email', pc.email
    ) as recipient_contact
  FROM parent_messages pm
  LEFT JOIN parent_contacts pc ON pm.parent_contact_id = pc.id
  LEFT JOIN message_queue mq ON pm.id = mq.message_id
  WHERE pm.delivery_status = 'queued'
    AND (p_school_id IS NULL OR pm.school_id = p_school_id)
    AND (pm.next_retry_at IS NULL OR pm.next_retry_at <= now())
  ORDER BY 
    COALESCE(mq.priority_level, 2) DESC,
    pm.created_at ASC
  LIMIT 1
  FOR UPDATE OF pm SKIP LOCKED;
END;
$$;

-- Function to schedule retry with exponential backoff
CREATE OR REPLACE FUNCTION schedule_message_retry(
  p_message_id UUID,
  p_base_delay_seconds INTEGER DEFAULT 60
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retry_count INTEGER;
  v_backoff_seconds INTEGER;
  v_next_retry TIMESTAMPTZ;
  v_max_retries INTEGER := 5;
BEGIN
  SELECT COALESCE(retry_count, 0) INTO v_retry_count
  FROM parent_messages WHERE id = p_message_id;

  -- Check if max retries exceeded
  IF v_retry_count >= v_max_retries THEN
    UPDATE parent_messages 
    SET 
      delivery_status = 'failed',
      internal_notes = COALESCE(internal_notes, '') || E'\nMax retries exceeded at ' || now()::text
    WHERE id = p_message_id;
    RETURN NULL;
  END IF;

  -- Calculate exponential backoff: base * 2^retry_count (capped at 1 hour)
  v_backoff_seconds := LEAST(p_base_delay_seconds * POWER(2, v_retry_count)::INTEGER, 3600);
  v_next_retry := now() + (v_backoff_seconds || ' seconds')::interval;

  UPDATE parent_messages
  SET 
    next_retry_at = v_next_retry,
    retry_backoff_seconds = v_backoff_seconds
  WHERE id = p_message_id;

  RETURN v_next_retry;
END;
$$;

-- Function to sync offline queue when back online
CREATE OR REPLACE FUNCTION sync_offline_queue(p_school_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_synced_count INTEGER := 0;
  v_queue_item RECORD;
BEGIN
  FOR v_queue_item IN 
    SELECT * FROM offline_message_queue 
    WHERE school_id = p_school_id AND NOT is_synced
    ORDER BY created_offline_at ASC
  LOOP
    -- Try to sync each item
    BEGIN
      -- If message_id exists, update the parent message
      IF v_queue_item.message_id IS NOT NULL THEN
        UPDATE parent_messages
        SET 
          delivery_status = 'queued',
          queued_offline = false,
          updated_at = now()
        WHERE id = v_queue_item.message_id;
      END IF;

      -- Mark as synced
      UPDATE offline_message_queue
      SET 
        is_synced = true,
        synced_at = now()
      WHERE id = v_queue_item.id;

      v_synced_count := v_synced_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Record sync error but continue
      UPDATE offline_message_queue
      SET 
        sync_attempts = sync_attempts + 1,
        last_sync_error = SQLERRM
      WHERE id = v_queue_item.id;
    END;
  END LOOP;

  RETURN v_synced_count;
END;
$$;