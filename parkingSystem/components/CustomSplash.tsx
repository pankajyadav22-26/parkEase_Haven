import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync(); // Ensure splash screen doesn't hide automatically

export default function CustomSplash({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    // Hide the splash screen after the video starts playing
    SplashScreen.hideAsync();
  }, []);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if ('didJustFinish' in status && status.didJustFinish) {
      // Hide the splash screen and proceed to the next screen
      SplashScreen.hideAsync();
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <Video
        source={require('../assets/videos/splash.mp4')}
        shouldPlay
        resizeMode={ResizeMode.STRETCH}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        isLooping={false}
        style={StyleSheet.absoluteFillObject} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    position: 'relative', 
  },
});