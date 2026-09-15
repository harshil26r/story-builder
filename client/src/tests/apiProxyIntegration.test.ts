import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState, useEffect } from 'react';
import {
  authApi,
  charactersApi,
  storiesApi,
  nodesApi,
} from '../services/api';
import { AppError } from '../types/domain';

// A mock component to test the 4 UI states contract
function TestComponent({ fetchCharacter }: { fetchCharacter: () => Promise<any> }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const loadData = async () => {
    setStatus('loading');
    try {
      const result = await fetchCharacter();
      setData(result);
      setStatus('success');
    } catch (err) {
      if (err instanceof AppError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unknown error');
      }
      setStatus('error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return React.createElement('div', null,
    status === 'loading' && React.createElement('div', { 'data-testid': 'loading-state' }, 'Loading...'),
    status === 'error' && React.createElement('div', { 'data-testid': 'error-state' },
      React.createElement('p', null, errorMsg),
      React.createElement('button', { onClick: loadData }, 'Retry')
    ),
    status === 'success' && data?.length === 0 && React.createElement('div', { 'data-testid': 'empty-state' }, 'No characters found.'),
    status === 'success' && data?.length > 0 && React.createElement('div', { 'data-testid': 'success-state' }, 'Characters loaded')
  );
}

describe('API Service Proxy Integration Contract', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('constructs relative URLs without hardcoded backend host URLs', async () => {
    // Override fetch to capture the URL
    const calls: string[] = [];
    fetchMock.mockImplementation(async (url: string | URL | Request) => {
      calls.push(url.toString());
      return new Response(JSON.stringify({}), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    // We invoke a few methods from each API module to verify they use relative URLs
    await authApi.me();
    await charactersApi.list();
    await storiesApi.list();
    await nodesApi.list('test-story-id');

    expect(calls.length).toBeGreaterThan(0);
    calls.forEach(url => {
      // They should start with /api or /s, and definitely not http://localhost
      expect(url).toMatch(/^\/(api|s)\//);
      expect(url).not.toMatch(/^https?:\/\//);
    });
  });

  it('translates 502/504 proxy failure from fetch into an AppError with status code and fallback message', async () => {
    fetchMock.mockImplementationOnce(async () => {
      return new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    });

    try {
      await charactersApi.list();
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('502');
      expect(err.message).toBe('Something went wrong.');
    }

    fetchMock.mockImplementationOnce(async () => {
      return new Response('Gateway Timeout', { status: 504, statusText: 'Gateway Timeout' });
    });

    try {
      await charactersApi.list();
      expect.fail('Should have thrown an error');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('504');
      expect(err.message).toBe('Something went wrong.');
    }
  });

  it('verifies the 4 UI states contract (Loading -> Error -> Success -> Empty)', async () => {
    // 1. Initial load fails with 502 (Proxy Error)
    fetchMock.mockImplementationOnce(async () => {
      return new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    });

    render(React.createElement(TestComponent, { fetchCharacter: () => charactersApi.list() }));
    
    // Loading state is displayed initially
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();

    // Eventually errors out
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });
    
    // Check error message
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();

    // 2. Retry load, succeeds with empty list
    fetchMock.mockImplementationOnce(async () => {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    const user = userEvent.setup();
    const retryBtn = screen.getByText('Retry');
    await user.click(retryBtn);

    // Transitions back to loading initially, but may resolve instantly in test
    // Eventually succeeds with empty state
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });
});
