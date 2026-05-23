import '@testing-library/jest-dom';
import 'jest-canvas-mock';
import { vi } from 'vitest';

global.jest = vi;

// Mock window.indexedDB
const indexedDB = {
  open: vi.fn(),
};
(global as any).indexedDB = indexedDB;
