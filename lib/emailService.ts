const BACKEND_URL = process.env.EXPO_PUBLIC_SERVER_ENDPOINT;

export const sendOTPEmail = async (email: string, otp: string) => {
  try {
    const response = await fetch(`http://10.0.10.55:3030/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};
