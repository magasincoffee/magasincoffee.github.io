# Shared Core

`shared-core-v1.js` is the canonical cross-portal foundation.

It owns only reusable primitives:

- Supabase client and auth/profile access
- role helpers
- date/week utilities
- time/shift classification
- HTML escaping
- store access helpers
- generic UI feedback/loading helpers

Business logic belongs in the relevant module engine, not here.