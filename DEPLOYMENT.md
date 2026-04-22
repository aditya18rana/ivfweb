# Render + Neon Deployment

## 1. Neon Database

1. Create a new Neon project.
2. Copy the pooled `DATABASE_URL`.
3. Keep SSL enabled in the URL.

## 2. Render Web Service

1. Push this project to GitHub.
2. In Render, create a new `Web Service`.
3. Connect the repo.
4. Use:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables:
   - `DATA_PROVIDER=postgres`
   - `DATABASE_URL=<your Neon connection string>`

## 3. First Boot

- On first start, the app will create tables automatically.
- If your local `data/*.json` files already contain demo data, the first Postgres boot will import them when the database is empty.
- If the database is empty and no JSON seed exists, default demo logins will be created:
  - `owner / owner123`
  - `admin / admin123`
  - `satellite / demo123`

## 4. Local Modes

- Local JSON mode:
  - `DATA_PROVIDER=json`
  - `npm start`

- Local Postgres mode:
  - `DATA_PROVIDER=postgres`
  - `DATABASE_URL=...`
  - `npm start`

## 5. Before Showing Hospitals

- Change demo passwords.
- Create your own owner password.
- Use real hospital/admin usernames.
- Later, move from free Render/Neon to paid plans for reliability.
