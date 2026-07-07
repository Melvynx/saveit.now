import { mobileConfig } from "./config";

/**
 * This method returns the server URL based on the environment for mobile app.
 */
export const getServerUrl = () => mobileConfig.apiUrl;
