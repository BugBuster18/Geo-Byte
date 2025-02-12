import { Stack } from 'expo-router';

export default function SubjectsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animation: 'slide_from_right',
        presentation: 'card'
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
