import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, LayoutAnimation, Platform, UIManager, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

let reducedMotionPreference = false;
const MotionPrefsContext = createContext(false);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type MotionDirection = 'fade' | 'tab' | 'forward' | 'back' | 'taskIn' | 'taskOut';

export function MotionPrefsProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    const update = (value: boolean) => { reducedMotionPreference = value; setReduceMotion(value); };
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) update(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => { active = false; subscription.remove(); };
  }, []);
  return <MotionPrefsContext.Provider value={reduceMotion}>{children}</MotionPrefsContext.Provider>;
}

export const useMotionPrefs = () => useContext(MotionPrefsContext);
export const isReducedMotionEnabled = () => reducedMotionPreference;

export function configureLayoutMotion(reduceMotion: boolean, duration = 200) {
  if (Platform.OS === 'web') return;
  const ms = reduceMotion ? 100 : duration;
  LayoutAnimation.configureNext({
    duration: ms,
    create: { type: 'easeInEaseOut', property: 'opacity' },
    update: { type: 'easeInEaseOut', duration: ms },
    delete: { type: 'easeInEaseOut', property: 'opacity', duration: ms },
  });
}

export function MotionFrame({ direction, id, children }: {
  direction: MotionDirection; id: number; children: ReactNode;
}) {
  const reduceMotion = useMotionPrefs();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const duration = reduceMotion ? 100 : direction === 'tab' || direction === 'fade' ? 120
    : direction === 'back' ? 180 : 220;
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [duration, direction, id, progress]);
  const style = useAnimatedStyle(() => {
    const distance = reduceMotion ? 0 : direction === 'forward' ? width * 0.3
      : direction === 'back' ? -width * 0.3 : direction === 'taskIn' ? height * 0.3
        : direction === 'taskOut' ? -height * 0.12 : 0;
    const vertical = direction === 'taskIn' || direction === 'taskOut';
    return {
      opacity: progress.value,
      transform: vertical ? [{ translateY: distance * (1 - progress.value) }]
        : [{ translateX: distance * (1 - progress.value) }],
    };
  });
  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}
