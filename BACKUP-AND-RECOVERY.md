# Backup and recovery

Hustle & Shine uses Supabase Free, so production database recovery depends on regular logical exports. The repository includes `.github/workflows/supabase-backup.yml`, which creates an encrypted backup every day and can also be run manually.

## What the workflow backs up

The database portion follows Supabase's documented logical-backup pattern and captures:

- database roles
- application schema
- production table data
- Supabase migration-history schema and data
- a manifest and SHA-256 checksums

If the optional Supabase access-token secret is configured, the workflow also attempts to download the private `job-photos` bucket. This matters because database backups contain Storage metadata, not the actual uploaded files.

Nothing from the backup is committed to Git. Before upload, the workflow now decrypts the newly created archive into a temporary directory, verifies every internal SHA-256 checksum, and confirms `schema.sql` and `data.sql` are non-empty. The only uploaded GitHub Actions artifact is the encrypted archive plus its checksum.

## Required GitHub Actions secrets

Open the repository in GitHub, then go to **Settings → Secrets and variables → Actions → New repository secret**.

### 1. `SUPABASE_DB_URL`

In Supabase, open the production project and use **Connect** to copy the **Session pooler** Postgres connection string with the current database password filled in.

Store the entire connection string as the `SUPABASE_DB_URL` GitHub secret.

Never put this URL in a GitHub issue, commit, chat message, source file, or workflow body.

### 2. `BACKUP_ENCRYPTION_PASSWORD`

Create a long random password and save it in a password manager outside GitHub. Store the same value as the GitHub secret `BACKUP_ENCRYPTION_PASSWORD`.

Do not rely on GitHub as the only place that knows this password. GitHub will not show a repository-secret value again, and the backup cannot be decrypted without it.

A strong local generator is:

```bash
openssl rand -base64 48
```

### 3. `SUPABASE_ACCESS_TOKEN` — recommended

Create a Supabase personal access token from the Supabase account-token page and store it as `SUPABASE_ACCESS_TOKEN`.

The database backup does not require this token. It is used only to link the CLI to the project so the workflow can attempt to copy the private `job-photos` bucket into the encrypted archive.

## Schedule

The workflow runs daily at **10:17 UTC** and keeps each encrypted GitHub Actions artifact for **14 days**.

It can also be run from **Actions → Encrypted Supabase backup → Run workflow**.

If `SUPABASE_DB_URL` or `BACKUP_ENCRYPTION_PASSWORD` is missing, the workflow exits without creating a fake or empty backup.

## Verify a backup

Download an artifact from the GitHub Actions run. It contains an `.enc` file and a `.sha256` file.

Verify the encrypted file before decrypting:

```bash
sha256sum -c hns-supabase-backup-*.tar.gz.enc.sha256
```

Decrypt it with the same password stored outside GitHub:

```bash
export BACKUP_ENCRYPTION_PASSWORD='your-password-from-your-password-manager'

openssl enc -d -aes-256-cbc \
  -pbkdf2 \
  -iter 600000 \
  -md sha256 \
  -in hns-supabase-backup-YYYYMMDDTHHMMSSZ.tar.gz.enc \
  -out hns-supabase-backup.tar.gz \
  -pass env:BACKUP_ENCRYPTION_PASSWORD

tar -xzf hns-supabase-backup.tar.gz
```

Review `backup/manifest.txt` and `backup/SHA256SUMS` after extraction.

## Database restore outline

Create the replacement Supabase project first and use its Session pooler connection string. Supabase's documented logical restore order is roles, schema, then data:

```bash
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file backup/database/roles.sql \
  --file backup/database/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file backup/database/data.sql \
  --dbname "$NEW_SUPABASE_DB_URL"
```

Migration history can then be restored from `history_schema.sql` and `history_data.sql` if required.

For an actual disaster recovery, review current Supabase restore documentation before executing the restore because managed Auth/Storage behavior and platform tooling can change.

## Storage restore

If `backup/storage/job-photos` exists in the decrypted archive, link the Supabase CLI to the replacement project and copy the files back to the private bucket:

```bash
supabase storage cp backup/storage/job-photos ss:///job-photos -r --experimental --linked
```

The bucket and its RLS policies must exist before restoring objects.

## Recovery standard

For Hustle & Shine, a backup should not be treated as proven until all of these are true:

1. The scheduled workflow completed successfully.
2. The encrypted artifact exists and its SHA-256 checksum verifies.
3. The encryption password is stored outside GitHub.
4. The archive decrypts successfully.
5. `schema.sql` and `data.sql` are non-empty.
6. Storage status in `manifest.txt` is reviewed.
7. Every scheduled run passes the built-in decrypt-and-checksum recovery check.\n8. A full periodic restore drill is performed into a non-production project before a real emergency.

Never test a restore against the live production database.
