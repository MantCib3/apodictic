import '@testing-library/jest-dom';

// Mock canvas API for chart.js
HTMLCanvasElement.prototype.getContext = jest.fn();
