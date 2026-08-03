create index if not exists idx_ai_learning_events_run_type_created
  on public.ai_learning_events(generation_run_id, event_type, created_at desc);
