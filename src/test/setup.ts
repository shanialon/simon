import '@testing-library/jest-dom/vitest';

// Finished games are saved; keep each test's history to itself
afterEach(() => {
  localStorage.clear();
});
