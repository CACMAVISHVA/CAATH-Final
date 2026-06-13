import { supabase } from '../../lib/supabase';
import { appConfig } from '../../shared/config/appConfig';
import { generateTraceId } from '../../shared/utils/trace';
import { logger } from '../monitoring/logger';
import { ApiError, ApiRequestOptions } from './types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildUrl = (path: string, query?: ApiRequestOptions['query']) => {
  const base = appConfig.api.baseUrl ? `${appConfig.api.baseUrl}/${appConfig.api.version}` : '';
  const url = new URL(`${base}${path}`, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

type RequestInterceptor = (input: {
  path: string;
  options: ApiRequestOptions;
  headers: Record<string, string>;
  traceId: string;
}) => Promise<void> | void;

type ResponseInterceptor = (input: {
  path: string;
  status: number;
  traceId: string;
}) => Promise<void> | void;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

export const requestClient = {
  async request<TResponse, TBody = unknown>(path: string, options: ApiRequestOptions<TBody> = {}): Promise<TResponse> {
    const traceId = options.traceId ?? generateTraceId();
    const retry = options.retry ?? appConfig.api.maxRetries;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Trace-Id': traceId,
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    for (const interceptor of requestInterceptors) {
      await interceptor({ path, options, headers, traceId });
    }

    for (let attempt = 0; attempt <= retry; attempt += 1) {
      try {
        const response = await fetch(buildUrl(path, options.query), {
          method: options.method ?? 'GET',
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        });

        if (response.status === 429 && attempt < retry) {
          const backoff = 300 * (attempt + 1);
          logger.warn('rate_limited_retrying', { traceId, path, attempt, backoff });
          await sleep(backoff);
          continue;
        }

        if (!response.ok) {
          const responseText = await response.text();
          throw new ApiError(responseText || 'Request failed', response.status, undefined, traceId);
        }

        for (const interceptor of responseInterceptors) {
          await interceptor({ path, status: response.status, traceId });
        }

        return (await response.json()) as TResponse;
      } catch (error) {
        const isLastAttempt = attempt >= retry;
        if (isLastAttempt) {
          if (error instanceof ApiError) throw error;
          throw new ApiError('Network request failed', 0, 'NETWORK_ERROR', traceId);
        }
        await sleep(200 * (attempt + 1));
      }
    }

    throw new ApiError('Request failed unexpectedly', 0, 'UNKNOWN', traceId);
  },
  addRequestInterceptor(interceptor: RequestInterceptor) {
    requestInterceptors.push(interceptor);
  },
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    responseInterceptors.push(interceptor);
  },
};
