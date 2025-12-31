# Frontend Tests

## Setup

Cài đặt dependencies:
```bash
npm install
```

## Chạy Tests

Chạy tất cả tests:
```bash
npm test
```

Chạy tests với watch mode:
```bash
npm test -- --watch
```

Chạy tests với UI:
```bash
npm run test:ui
```

Chạy tests với coverage:
```bash
npm run test:coverage
```

## Test Structure

- `setup.js`: Test configuration và mocks
- `BackupManager.test.jsx`: Tests cho BackupManager component

## Test Framework

- **Vitest**: Test runner (tương thích với Vite)
- **React Testing Library**: Testing utilities cho React components
- **jsdom**: DOM environment cho tests

## Notes

- Tests sử dụng mocked fetch API
- Cần mock AuthContext nếu component sử dụng authentication
- Tests tự động cleanup sau mỗi test case

