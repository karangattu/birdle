import assert from 'node:assert/strict';
import test from 'node:test';

const mockListeners = {};
Object.defineProperty(globalThis, 'document', {
  value: {
    visibilityState: 'visible',
    addEventListener(event, callback) {
      mockListeners[event] = callback;
    },
    removeEventListener(event, callback) {
      delete mockListeners[event];
    }
  },
  configurable: true,
  writable: true
});

let requestCallCount = 0;
let releaseCallCount = 0;
let requestShouldThrow = false;
const mockSentinel = {
  released: false,
  release() {
    releaseCallCount++;
    this.released = true;
    if (this.onrelease) this.onrelease();
    return Promise.resolve();
  },
  addEventListener(event, callback) {
    if (event === 'release') {
      this.onrelease = callback;
    }
  }
};

Object.defineProperty(globalThis, 'navigator', {
  value: {
    wakeLock: {
      request(type) {
        requestCallCount++;
        if (requestShouldThrow) {
          return Promise.reject(new Error('Wake lock error'));
        }
        mockSentinel.released = false;
        return Promise.resolve(mockSentinel);
      }
    }
  },
  configurable: true,
  writable: true
});

const { requestWakeLock, releaseWakeLock, getWakeLockSentinel } = await import('../js/wake-lock-utils.js');

test('wake lock request succeeds when wakeLock is supported', async () => {
  requestCallCount = 0;
  releaseCallCount = 0;
  requestShouldThrow = false;

  const result = await requestWakeLock();
  assert.equal(result, true);
  assert.equal(requestCallCount, 1);
  assert.notEqual(getWakeLockSentinel(), null);
});

test('wake lock request returns false when wakeLock request throws/fails', async () => {
  await releaseWakeLock();
  requestCallCount = 0;
  requestShouldThrow = true;

  const result = await requestWakeLock();
  assert.equal(result, false);
  assert.equal(getWakeLockSentinel(), null);
});

test('wake lock release works correctly', async () => {
  requestShouldThrow = false;
  await requestWakeLock();
  assert.notEqual(getWakeLockSentinel(), null);

  releaseCallCount = 0;
  await releaseWakeLock();
  assert.equal(releaseCallCount, 1);
  assert.equal(getWakeLockSentinel(), null);
});

test('wake lock recovers on visibility changes when enabled', async () => {
  requestShouldThrow = false;
  await requestWakeLock();
  assert.notEqual(getWakeLockSentinel(), null);

  const sentinel = getWakeLockSentinel();
  if (sentinel.onrelease) sentinel.onrelease();
  assert.equal(getWakeLockSentinel(), null);

  requestCallCount = 0;
  globalThis.document.visibilityState = 'visible';
  if (mockListeners['visibilitychange']) {
    await mockListeners['visibilitychange']();
  }
  assert.equal(requestCallCount, 1);
  assert.notEqual(getWakeLockSentinel(), null);
});
