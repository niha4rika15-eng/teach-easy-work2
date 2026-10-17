# teach-easy-work2

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-je8ehsnx)

## Supabase deployment note

The application source has been aligned to the inspected live schema. Before deploying these changes, review and apply `supabase/migrations/20261017223000_harden_profiles_and_sync_schema.sql` in the intended Supabase project. Do not blindly replay the earlier migrations against an existing project; reconcile its migration history first. The separate RAG/evaluation/storage migration is not required by this template-draft flow and remains unapplied unless those features are separately reviewed and enabled.

The profile trigger assigns new accounts the `student` role because client-supplied signup metadata is not a trusted source for authorization. Promote professors and administrators through a trusted database or server-side administrative process. The content studio currently creates deterministic template drafts, not AI-generated or independently verified content.
