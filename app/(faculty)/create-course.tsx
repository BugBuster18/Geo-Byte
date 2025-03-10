import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import { createCourse } from '@/lib/appwrite';

const CLASS_OPTIONS = [
  { label: '4th Sem CSE-A', value: '4thSemCseA' },
  { label: '4th Sem CSE-B', value: '4thSemCseB' },
];

const CreateCourse = () => {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [formData, setFormData] = useState({
    courseId: '',
    courseName: '',
    className: ''
  });
  const [loading, setLoading] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  const handleCreateCourse = async () => {
    if (!formData.courseId || !formData.courseName || !formData.className) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      await createCourse({
        ...formData,
        facultyId: user?.$id || ''
      });
      Alert.alert('Success', 'Course created successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.push({
              pathname: '/(faculty)/(tabs)',
              params: { refresh: 'true' }
            });
          }
        }
      ]);
    } catch (error) {
      console.error('Create course error:', error);
      Alert.alert('Error', 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = (value: string) => {
    setFormData(prev => ({ ...prev, className: value }));
    setShowClassPicker(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-rubik-bold mb-6">Create New Course</Text>

        <View className="space-y-4">
          <View>
            <Text className="font-rubik-medium mb-1">Course ID</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 font-rubik"
              placeholder="e.g., CS301"
              value={formData.courseId}
              onChangeText={(text) => setFormData(prev => ({ ...prev, courseId: text }))}
            />
          </View>

          <View>
            <Text className="font-rubik-medium mb-1">Course Name</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 font-rubik"
              placeholder="e.g., Data Structures"
              value={formData.courseName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, courseName: text }))}
            />
          </View>

          <View>
            <Text className="font-rubik-medium mb-1">Class Name</Text>
            <TouchableOpacity
              onPress={() => setShowClassPicker(true)}
              className="border border-gray-300 rounded-lg p-3"
            >
              <Text className="font-rubik">
                {formData.className || 'Select Class'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleCreateCourse}
            disabled={loading}
            className={`bg-blue-500 py-3 rounded-lg mt-4 ${loading ? 'opacity-70' : ''}`}
          >
            <Text className="text-white text-center font-rubik-medium">
              {loading ? 'Creating...' : 'Create Course'}
            </Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showClassPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowClassPicker(false)}
        >
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-xl">
              <View className="p-4 border-b border-gray-200">
                <Text className="text-lg font-rubik-medium text-center">Select Class</Text>
              </View>
              <FlatList
                data={CLASS_OPTIONS}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectClass(item.value)}
                    className="p-4 border-b border-gray-100"
                  >
                    <Text className="font-rubik text-center">{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                onPress={() => setShowClassPicker(false)}
                className="p-4 bg-gray-100"
              >
                <Text className="text-center font-rubik-medium text-blue-500">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default CreateCourse;
