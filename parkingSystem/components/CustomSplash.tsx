import { StyleSheet, View, Image, Animated, Dimensions, StatusBar, Easing } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

type Props = {
  onFinish: () => void;
};

const CustomSplash = ({ onFinish }: Props) => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;  

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
        });

        const images = [
          require('../assets/images/splashscreen_logo.png'),
          require('../assets/images/bk.png'),
        ];
        const cacheImages = images.map(image => Asset.fromModule(image).downloadAsync());
        await Promise.all(cacheImages);

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );

    if (!appIsReady) {
      pulse.start();
    } else {
      pulse.stop();
    }

    return () => pulse.stop();
  }, [appIsReady]);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();

      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 20, 
          duration: 800,
          useNativeDriver: true,
          easing: Easing.cubic,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAnimationFinished(true);
        onFinish();
      });
    }
  }, [appIsReady]);

  if (animationFinished) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar hidden />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View 
        style={{ 
          transform: [
            { scale: scaleAnim }, 
            { scale: pulseAnim } 
          ] 
        }}
      >
        <Image 
            source={require('../assets/images/splashscreen_logo.png')} 
            style={styles.logo} 
            resizeMode="contain"
        />
      </Animated.View>

      {!appIsReady && (
         <View style={styles.loadingContainer}>
             <Animated.Text style={styles.loadingText}>ParkEase Haven</Animated.Text>
         </View>
      )}
    </Animated.View>
  );
};

export default CustomSplash;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    tintColor: '#FFFFFF',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 50,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    letterSpacing: 2,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
});