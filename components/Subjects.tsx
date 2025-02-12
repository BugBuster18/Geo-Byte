import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

interface SubjectsProps {
  name: string;
  code: string;
  subjectId?: string;
}

const Subjects: React.FC<SubjectsProps> = ({ name, code, subjectId = 'CS301' }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/subjects/[id]',
      params: { id: subjectId }
    });
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <View style={styles.subjectBox}>
        <View style={styles.codeContainer}>
          <Text style={styles.code}>{code}</Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  subjectBox: {
    width: 290,
    height: 50,
    backgroundColor: 'white',
    borderRadius: 5,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  codeContainer: {
    width: 70,
    paddingLeft: 15
  },
  nameContainer: {
    flex: 1,
    alignItems: 'center',
    paddingRight: 70 // This offsets the code width to maintain visual center
  },
  code: {
    fontFamily: 'Rubik-Bold',
    fontSize: 14
  },
  name: {
    fontFamily: 'Rubik-Regular',
    fontSize: 14
  }
});

export default Subjects;
