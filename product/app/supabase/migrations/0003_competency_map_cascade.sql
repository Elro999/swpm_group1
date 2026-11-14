-- 0003_competency_map_cascade.sql: fix a latent conflict in 0001.
-- competency_map.story_id was ON DELETE SET NULL, but the table also requires (is_gap OR story_id IS NOT NULL),
-- so deleting a mapped story (including "Delete my data") would violate the check and fail.
-- Now deleting a story removes its mapping row; the competency shows as "not matched yet" until re-matched.
-- Apply after 0002 in the Supabase SQL editor.

alter table competency_map drop constraint if exists competency_map_story_id_fkey;
alter table competency_map
  add constraint competency_map_story_id_fkey foreign key (story_id) references stories(id) on delete cascade;
