import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import * as Updates from 'expo-updates';

const MIN_CHECK_INTERVAL_MS = 60_000;

/**
 * Downloads compatible EAS updates without delaying app startup, then lets the
 * user restart into the new bundle at a safe moment.
 */
export function useOtaUpdate() {
  const checking = useRef(false);
  const updateReady = useRef(false);
  const promptVisible = useRef(false);
  const lastCheckedAt = useRef(0);

  const showRestartPrompt = useCallback(() => {
    if (!updateReady.current || promptVisible.current) return;

    promptVisible.current = true;
    Alert.alert(
      'Update ready',
      'The latest version has been downloaded. Restart the app to apply it.',
      [
        {
          text: 'Restart now',
          onPress: () => {
            promptVisible.current = false;
            void Updates.reloadAsync();
          },
        },
      ],
      { cancelable: false },
    );
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || checking.current) return;

    if (updateReady.current) {
      showRestartPrompt();
      return;
    }

    const now = Date.now();
    if (now - lastCheckedAt.current < MIN_CHECK_INTERVAL_MS) return;

    checking.current = true;
    lastCheckedAt.current = now;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (!update.isAvailable) return;

      const downloaded = await Updates.fetchUpdateAsync();
      if (downloaded.isNew) {
        updateReady.current = true;
        showRestartPrompt();
      }
    } catch {
      // Update checks must never prevent the user from opening or using the app.
    } finally {
      checking.current = false;
    }
  }, [showRestartPrompt]);

  useEffect(() => {
    void checkForUpdate();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForUpdate();
    });

    return () => subscription.remove();
  }, [checkForUpdate]);
}
