import React from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import icons from "@/constants/icons";

interface CustomTouchableProps {
  index: number;
  arrowDirection: boolean;
  toggleArrow: (index: number) => void;
  title: string;
  children?: React.ReactNode;
}

const CustomTouchable: React.FC<CustomTouchableProps> = ({ index, arrowDirection, toggleArrow, title, children }) => {
  return (
    <View>
      <TouchableOpacity 
        style={styles.touchable}
        onPress={() => toggleArrow(index)}
        activeOpacity={1} // Disable the default touch feedback animation
      >
        <View style={styles.content}>
          <Image source={icons.bed} style={styles.icon} />
          <Text style={styles.text}>{title}</Text>
        </View>
        <Image source={icons.rightArrow} style={[styles.arrow, { transform: [{ rotate: arrowDirection ? '90deg' : '0deg' }] }]} />
      </TouchableOpacity>
      {arrowDirection && (
        <View style={styles.childrenContainer}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  touchable: {
    width: 310,
    height: 60,
    backgroundColor: 'white',
    borderWidth: 0,
    padding: 16,
    borderRadius: 5,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  text: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 18,
  },
  arrow: {
    width: 24,
    height: 24,
  },
  childrenContainer: {
    paddingLeft: 20,
    paddingTop: 10,
  },
});

export default CustomTouchable;
