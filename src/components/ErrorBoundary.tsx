import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Shows what went wrong instead of dying to a blank screen.
 *
 * A release APK has no dev overlay and no attached console, so an uncaught render
 * error is indistinguishable from "the app crashes when I open it". This catches the
 * error and puts its message and component stack on screen where they can be read
 * back — the difference between a diagnosis and a guess.
 */
interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  stack: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, stack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, stack: info.componentStack ?? '' });
  }

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.heading}>Something broke on startup</Text>
          <Text style={styles.hint}>
            Screenshot this and send it over — the lines below say exactly what failed.
          </Text>

          <Text style={styles.label}>Error</Text>
          <Text style={styles.mono} selectable>
            {error.name}: {error.message}
          </Text>

          {!!error.stack && (
            <>
              <Text style={styles.label}>Stack</Text>
              <Text style={styles.mono} selectable>
                {error.stack.split('\n').slice(0, 12).join('\n')}
              </Text>
            </>
          )}

          {!!stack && (
            <>
              <Text style={styles.label}>Component tree</Text>
              <Text style={styles.mono} selectable>
                {stack.split('\n').filter(Boolean).slice(0, 12).join('\n')}
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1F2933' },
  scroll: { padding: 24, paddingTop: 72, gap: 4 },
  heading: { fontSize: 22, fontWeight: '800', color: '#fff' },
  hint: { fontSize: 14, color: '#B0B7C0', marginBottom: 18, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: '#F0932B', marginTop: 18 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#E4E7EB', lineHeight: 18, marginTop: 6 },
});
