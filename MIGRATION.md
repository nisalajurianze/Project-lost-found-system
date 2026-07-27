# Production Data Migration

The migration is designed to be idempotent, but it must still be treated as a production change.

1. Take and verify a complete backup.
2. Restore the backup into an isolated replica-set staging database.
3. Set `MIGRATION_BACKUP_CONFIRMED=true` and the staging `MONGO_URI`.
4. Run:

```bash
cd backend
npm ci
npm run migrate
npm run seed:defaults
```

5. Review duplicate-claim repairs, normalized categories, refresh-session indexes, public-setting flags, and model index creation.
6. Run application integration and handover workflows against the migrated copy.
7. Schedule the production migration, stop writes/workers if required, rerun the same commands, and capture logs.

Never run the disabled legacy seed entrypoints. They intentionally exit without deleting data.
