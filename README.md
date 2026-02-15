# Trading UI MVP

## Run locally

```bash
cd apps/web
npm install
npm run dev
```

Open:

- `http://localhost:3000/trade/BTCUSDT`
- `http://localhost:3000/portfolio`

## Notes

- The project includes mock API handlers under `src/app/api/*` so pages can work without a backend.
- Live WebSocket updates are enabled only when `NEXT_PUBLIC_WS_URL` is set.
  - Example: `NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws npm run dev`
