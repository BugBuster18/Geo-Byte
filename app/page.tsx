import { View, Text } from 'react-native'
import React from 'react'

const page = () => {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('http://127.0.0.1:3000/data', {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:3000'
          },
          mode: 'cors',
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        // setError(error.message || 'Failed to fetch data');
      }
    };

    fetchData();
  }, []);

  return (
    <View className='flex flex-row justify-center items-center h-full'>
      {error ? (
        <Text>Error: {error}</Text>
      ) : (
        <Text>{data ? JSON.stringify(data) : 'Loading...'}</Text>
      )}
    </View>
  )
}

export default page