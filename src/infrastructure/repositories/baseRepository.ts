import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { InfrastructureError } from '../errors';

export const unwrapData = async <T>(promise: PromiseLike<PostgrestSingleResponse<T>>): Promise<T> => {
  const { data, error } = await promise;
  if (error) throw new InfrastructureError(error.message);
  return data as T;
};

export const unwrapOptional = async <T>(promise: PromiseLike<PostgrestSingleResponse<T | null>>): Promise<T | null> => {
  const { data, error } = await promise;
  if (error) throw new InfrastructureError(error.message);
  return (data as T | null) ?? null;
};
