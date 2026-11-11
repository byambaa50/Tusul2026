# Aimag / sum reference data

## Status

No aimag or sum rows are seeded in Phase 1.1. No authoritative downloadable
dataset was verified on 2026-11-09.

Sources checked:

- `https://www.nso.mn` (National Statistics Office) was reachable, but no
  complete downloadable aimag/sum list with an official publication date was
  identified from the available page.
- `https://www.1212.mn` (official statistics portal) returned a transport error
  during retrieval.
- `https://data.gov.mn` returned a transport error; `https://opendata.gov.mn`
  returned no usable content.
- `https://legalinfo.mn` was reachable but did not provide a confirmed current
  administrative-unit dataset suitable for import.

Do not use `cashmeretrace/lib/mock/geo.ts`, a third-party list, or a hand-typed
list as the official source. A wrong aimag/sum mapping is worse than an empty
lookup.

## Files

- `aimag_sum_import_template.csv` - header-only template. Do not add rows until
  the source is verified and recorded.
- `aimag_sum_source.md` - mandatory source/provenance record.
- `aimag_sum_import.sql` - psql wrapper that creates a temporary staging table,
  loads the CSV, and runs the merge.
- `aimag_sum_merge.sql` - pure SQL validation and idempotent upsert. This is the
  part exercised by the Phase 1.1 PGlite tests.

## Import procedure

1. Obtain the official aimag/sum dataset from a Mongolian government source.
2. Record the publisher, URL, publication/update date, retrieval date, and
   SHA-256 checksum in `aimag_sum_source.md`.
3. Create `aimag_sum_import.csv` with the header:
   `aimag_code,aimag_name,sum_code,sum_name`.
4. Test on a non-production database:
   ```powershell
   psql "$env:DATABASE_URL" -v csv_path='supabase/seed/aimag_sum_import.csv' `
     -f supabase/seed/aimag_sum_import.sql
   ```
5. Verify counts and relationships:
   ```sql
   select count(*) from public.aimags;
   select count(*) from public.sums;
   select count(*) from public.sums s
     left join public.aimags a on a.id = s.aimag_id
    where a.id is null;  -- must be 0
   ```
6. Re-run the same import and confirm the counts do not change.

The merge rejects blank values, conflicting aimag names/codes, conflicting sum
names/codes within one aimag, and duplicate rows. It allows the same sum name
or code in different aimags only if the official source does so; the schema
enforces uniqueness within an aimag.

The `\copy` loader itself could not be executed in this environment because
`psql` is not installed. The merge/validation SQL was exercised in PGlite.
