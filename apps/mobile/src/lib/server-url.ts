import Constants from 'expo-constants';

/**
 * This method returns the server URL based on the environment for mobile app.
 */
export const getServerUrl = () => {
  // Get the API URL from environment variables first
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (apiUrl) {
    return apiUrl;
  }

  // Check if we're in production build
  if (!__DEV__) {
    return "https://saveit.now";
  }

  // Fallback to localhost for development
  return "http://localhost:3000";
};