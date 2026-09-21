import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isConfigured, supabase } from './supabase';
import { Identity } from './types';

type ErrorContext = Record<string, unknown>;

let identity: Identity | null = null;
let screen = 'startup';
let reporting = false;

export function setErrorIdentity(value: Identity | null) {
  identity = value;
}

export function setErrorScreen(value: string) {
  screen = value;
}

function errorId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normaliseError(value: unknown): { name: string; message: string; stack: string | null } {
  if (value instanceof Error) {
    return { name: value.name || 'Error', message: value.message, stack: value.stack ?? null };
  }
  if (typeof value === 'string') return { name: 'Error', message: value, stack: null };
  try {
    return { name: 'UnknownError', message: JSON.stringify(value), stack: null };
  } catch {
    return { name: 'UnknownError', message: String(value), stack: null };
  }
}

/**
 * Fire-and-forget error logging. Reporting must never throw or hide the original
 * failure, especially when the device is offline or the table has not been created.
 */
export function reportError(value: unknown, context: ErrorContext = {}): string {
  const reference = errorId();
  if (!isConfigured || reporting) return reference;

  const error = normaliseError(value);
  reporting = true;
  void (async () => {
    try {
      const { error: insertError } = await supabase.from('error_logs').insert({
        reference,
        user_id: identity?.id ?? null,
        user_role: identity?.role ?? null,
        error_name: error.name,
        message: error.message.slice(0, 4000),
        stack: error.stack?.slice(0, 16000) ?? null,
        screen,
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version ?? null,
        context,
      });
      if (insertError) console.warn('Could not save error report:', insertError.message);
    } catch (insertError) {
      console.warn('Could not save error report:', insertError);
    } finally {
      reporting = false;
    }
  })();

  return reference;
}

/** Capture uncaught JavaScript errors while preserving React Native's normal handler. */
export function installGlobalErrorReporting() {
  const errorUtils = (globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler(): (error: Error, isFatal?: boolean) => void;
      setGlobalHandler(handler: (error: Error, isFatal?: boolean) => void): void;
    };
  }).ErrorUtils;

  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, { source: 'global', isFatal: !!isFatal });
    previous(error, isFatal);
  });
}
