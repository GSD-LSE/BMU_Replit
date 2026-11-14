import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Page not found', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Page not found
        </Text>
        <Text style={[styles.message, { color: colors.foreground }]}>This page isn&apos;t available. Return to Home.</Text>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={[styles.linkText, { color: colors.primaryForeground }]}>Go to Home</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    minHeight: 52,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
