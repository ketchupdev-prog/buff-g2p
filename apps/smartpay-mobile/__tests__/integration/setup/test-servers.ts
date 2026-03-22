/**
 * Test Server Helpers
 * Location: fintech/smartpay-mobile/__tests__/integration/setup/test-servers.ts
 * 
 * Purpose:
 * - Start SmartPay Backend before tests
 * - Verify servers are ready
 * - Shutdown servers after tests
 */

import { ChildProcess, spawn } from 'child_process';
import axios from 'axios';
import path from 'path';

const BACKEND_PORT = process.env.TEST_BACKEND_PORT || '4000';
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const STARTUP_TIMEOUT = 30000;
const HEALTH_CHECK_INTERVAL = 500;

let backendProcess: ChildProcess | null = null;

/**
 * Wait for server to be ready
 */
async function waitForServer(
  url: string,
  timeoutMs: number = STARTUP_TIMEOUT
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await axios.get(`${url}/health`, { timeout: 1000 });
      if (response.status === 200) {
        return true;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }

  return false;
}

/**
 * Start SmartPay Backend server
 */
export async function startBackendServer(): Promise<void> {
  if (backendProcess) {
    console.log('⚠️  Backend server already running');
    return;
  }

  console.log('🚀 Starting SmartPay Backend server...');

  const backendDir = path.resolve(__dirname, '../../../../../smartpay-backend');
  const env = {
    ...process.env,
    PORT: BACKEND_PORT,
    NODE_ENV: 'test',
    DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret',
    BUFFR_WEBHOOK_SECRET: process.env.BUFFR_WEBHOOK_SECRET || 'test-webhook-secret',
  } as NodeJS.ProcessEnv;

  backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: backendDir,
    env,
    stdio: 'pipe',
    shell: true,
  });

  if (!backendProcess) {
    throw new Error('Failed to spawn backend process');
  }

  backendProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    if (output.includes('SmartPay Backend API Server') || output.includes('listening')) {
      console.log('[Backend]', output.trim());
    }
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error('[Backend Error]', data.toString().trim());
  });

  backendProcess.on('error', (error) => {
    console.error('[Backend Process Error]', error);
  });

  backendProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`[Backend] Process exited with code ${code}, signal ${signal}`);
    }
  });

  const isReady = await waitForServer(BACKEND_URL, STARTUP_TIMEOUT);

  if (!isReady) {
    stopBackendServer();
    throw new Error('Backend server failed to start within timeout');
  }

  console.log(`✅ Backend server ready at ${BACKEND_URL}`);
}

/**
 * Stop SmartPay Backend server
 */
export function stopBackendServer(): void {
  if (backendProcess) {
    console.log('🛑 Stopping SmartPay Backend server...');
    backendProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('⚠️  Force killing backend server');
        backendProcess.kill('SIGKILL');
      }
    }, 5000);

    backendProcess = null;
    console.log('✅ Backend server stopped');
  }
}

/**
 * Verify backend server is healthy
 */
export async function verifyBackendHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 3000 });
    return response.status === 200 && response.data.status === 'ok';
  } catch (error) {
    console.error('[Health Check] Backend server not healthy:', error);
    return false;
  }
}

/**
 * Get backend base URL
 */
export function getBackendUrl(): string {
  return BACKEND_URL;
}

/**
 * Check if server is running
 */
export function isBackendRunning(): boolean {
  return backendProcess !== null && !backendProcess.killed;
}
