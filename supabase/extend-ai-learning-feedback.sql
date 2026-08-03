alter table public.ai_learning_events
  drop constraint if exists ai_learning_events_type_check;

alter table public.ai_learning_events
  add constraint ai_learning_events_type_check check (
    event_type in (
      'project_published',
      'site_regenerated',
      'section_regenerated',
      'explicit_positive',
      'explicit_negative'
    )
  );
