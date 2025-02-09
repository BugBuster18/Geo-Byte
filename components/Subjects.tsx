import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SubjectsProps {
  name: string;
}

const Subjects: React.FC<SubjectsProps> = ({ name }) => {
  return (
    <View style={styles.subjectBox}>
      <Text>{name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  subjectBox: {
    width: 290,
    height: 50,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Subjects;
