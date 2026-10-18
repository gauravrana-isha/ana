# End-to-end tests

A production build of ana (with its service worker), run in Chromium against its own test database. They check that ana works offline, end to end: every screen opens offline, things added offline (moments, people, practices, photos) show straight away and reach the server once back online.

```sh
# A database on this machine; it's wiped and seeded with one test member each run.
createdb -h 127.0.0.1 -U postgres ana_e2e
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/ana_e2e npm run test:e2e
```

- The app runs at `http://ana.localhost:3105`. The service worker stays off on plain `localhost`, and `*.localhost` counts as a secure origin, so it can run.
- Setup refuses to wipe a database that isn't on this machine.
- Photos are stored on disk in these runs (`ANA_E2E_LOCAL_STORAGE=1`), not in R2.
- GitHub Actions runs them on every push (`.github/workflows/e2e.yml`).
