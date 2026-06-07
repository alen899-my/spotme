import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'userToken';
const USER_DATA_KEY = 'userData';

export async function setToken(token: string) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {}
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export async function getToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) return token;
  } catch {}
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {}
  return null;
}

export async function removeToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export async function setUserData(data: any) {
  try {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
  } catch {}
}

export async function getUserData(): Promise<any | null> {
  try {
    const data = await AsyncStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch {}
  return null;
}

export async function removeUserData() {
  try {
    await AsyncStorage.removeItem(USER_DATA_KEY);
  } catch {}
}

export async function clearAll() {
  await removeToken();
  await removeUserData();
}
