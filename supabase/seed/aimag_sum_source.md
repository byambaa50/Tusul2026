# Aimag / sum source record

Phase 1.1 did **not** seed aimag or sum rows because no authoritative,
downloadable official dataset was verified. Fill this record before importing
anything into `supabase/seed/aimag_sum_import.csv`.

| Field | Value |
| --- | --- |
| Publishing government body | _required_ |
| Official source URL | _required_ |
| Document / dataset title | _required_ |
| Publication or last-update date | _required_ |
| Retrieval date (UTC) | _required_ |
| Retrieved file SHA-256 | _required_ |
| Official language | Mongolian Cyrillic |
| Verified by | _required_ |
| Notes on any renamed or dissolved sums | _optional_ |

## Verification rules

1. The source must be a Mongolian government body or an official government
   publication. A third-party list, a blog, or the frontend mock data is not
   acceptable.
2. The file must contain both aimag and sum rows, with every sum belonging to
   exactly one aimag.
3. Names must be copied in official Mongolian Cyrillic. Do not translate,
   transliterate, or "correct" them.
4. Record the retrieval date and a SHA-256 checksum of the exact file used.
5. Run the import on a non-production database first. The import is idempotent
   for matching codes but must not be used to overwrite a different official
   revision without a reviewed mapping.
