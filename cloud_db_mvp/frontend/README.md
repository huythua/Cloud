# Cloud DB Frontend

Front-end for Cloud DB MVP (React + Vite).

## Run (after Node.js installed)

```bash
cd frontend
npm install
npm run dev
```

This will start the dev server (default http://localhost:5173). The frontend calls backend at `http://127.0.0.1:8000` for auth endpoints.

To change backend URL, create a `.env` in the `frontend/` folder and set `VITE_API_URL`, for example:

```
VITE_API_URL=http://127.0.0.1:8000
```
