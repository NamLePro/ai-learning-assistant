import Constants from 'expo-constants';

const FALLBACK_IP = '10.7.136.66';

const hostUri = Constants.expoConfig?.hostUri;
const host = hostUri ? hostUri.split(':')[0] : FALLBACK_IP;

export const BASE_URL = `http://${host}:5000/api`;