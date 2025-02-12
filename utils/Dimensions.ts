import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const screenHeight = height;
const screenWidth = width;

// Guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number) => (screenWidth / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (screenHeight / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export { scale, verticalScale, moderateScale, screenHeight, screenWidth };
