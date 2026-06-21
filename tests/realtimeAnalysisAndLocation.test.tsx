import { expect, test, vi, beforeEach } from 'vitest';
import { stopMediaStream } from '../services/cameraService';
import { resolveCoordsFromLocationString } from '../components/Dashboard';
import { getWeatherData } from '../services/weatherService';

// Mock GoogleGenAI client for geminiService tests using vi.hoisted to avoid TDZ issues
const { mockGenerateContent } = vi.hoisted(() => {
  return {
    mockGenerateContent: vi.fn(),
  };
});

vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
      BOOLEAN: 'BOOLEAN',
      NUMBER: 'NUMBER',
    },
    Modality: {
      TEXT: 'TEXT',
      IMAGE: 'IMAGE',
    },
  };
});

// Import geminiService AFTER mocking GoogleGenAI
import { analyzeRealTimeFrame, diagnosePlant } from '../services/geminiService';

beforeEach(() => {
  vi.restoreAllMocks();
  mockGenerateContent.mockReset();
  sessionStorage.setItem('agri_vision_gemini_api_key', 'test-api-key');
});

test('stopMediaStream stops all live tracks and nullifies video srcObject', () => {
  const stopSpy1 = vi.fn();
  const stopSpy2 = vi.fn();

  const mockTrack1 = { readyState: 'live', stop: stopSpy1 } as unknown as MediaStreamTrack;
  const mockTrack2 = { readyState: 'live', stop: stopSpy2 } as unknown as MediaStreamTrack;
  const mockTrack3 = { readyState: 'ended', stop: vi.fn() } as unknown as MediaStreamTrack;

  const mockStream = {
    getTracks: () => [mockTrack1, mockTrack2, mockTrack3],
  } as unknown as MediaStream;

  const mockVideoElement = {
    srcObject: {} as any,
  } as unknown as HTMLVideoElement;

  stopMediaStream(mockStream, mockVideoElement);

  expect(stopSpy1).toHaveBeenCalledOnce();
  expect(stopSpy2).toHaveBeenCalledOnce();
  expect(mockVideoElement.srcObject).toBeNull();
});

test('resolveCoordsFromLocationString resolves coordinates for Egyptian cities and string coordinates', () => {
  const cairo = resolveCoordsFromLocationString('Cairo');
  expect(cairo).toEqual({ lat: 30.0444, lng: 31.2357 });

  const alex = resolveCoordsFromLocationString('الإسكندرية');
  expect(alex).toEqual({ lat: 31.2001, lng: 29.9187 });

  const custom = resolveCoordsFromLocationString('27.1828, 31.4159');
  expect(custom).toEqual({ lat: 27.1828, lng: 31.4159 });

  const invalid = resolveCoordsFromLocationString('Invalid Location');
  expect(invalid).toBeNull();
});

test('getWeatherData falls back to static weather data or fetches real weather with correct structure', async () => {
  const data = await getWeatherData(30.0444, 31.2357, 'en');
  expect(data).toBeDefined();
  expect(data.location).toBeTruthy();
  if (data.location.includes('Approximate') || data.location.includes('تقريبي')) {
    expect(data.location).toContain('Approximate Location');
  } else {
    expect(data.location).toMatch(/Cairo|EG|Atabah|Egypt|القاهرة/i);
  }
  expect(data.temperature).toBeDefined();
  expect(data.condition).toBeDefined();
  expect(data.forecast).toHaveLength(3);
});

test('analyzeRealTimeFrame parses detected plant disease results correctly', async () => {
  mockGenerateContent.mockResolvedValue({
    text: JSON.stringify({
      isPlantDetected: true,
      confidence: 0.92,
      message: '',
      diagnosis: {
        detected: true,
        issues: ['Late Blight'],
        action: 'Apply fungicide',
      },
    }),
  });

  const result = await analyzeRealTimeFrame('data:image/jpeg;base64,mockbase64data');

  expect(result.isPlantDetected).toBe(true);
  expect(result.confidence).toBe(0.92);
  expect(result.detected).toBe(true);
  expect(result.issues).toEqual(['Late Blight']);
  expect(result.action).toBe('Apply fungicide');
});

test('analyzeRealTimeFrame handles non-plant frame correctly', async () => {
  mockGenerateContent.mockResolvedValue({
    text: JSON.stringify({
      isPlantDetected: false,
      confidence: 0.15,
      message: 'لم يتم كشف نبات',
      diagnosis: null,
    }),
  });

  const result = await analyzeRealTimeFrame('mockbase64data');

  expect(result.isPlantDetected).toBe(false);
  expect(result.confidence).toBe(0.15);
  expect(result.message).toBe('لم يتم كشف نبات');
  expect(result.detected).toBe(false);
  expect(result.issues).toEqual([]);
});
