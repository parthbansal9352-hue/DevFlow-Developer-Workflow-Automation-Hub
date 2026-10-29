/**
 * Appwrite Authentication Service
 */

import { account, ID } from '../config/appwrite';
import { isValidEmail, isValidPassword } from '../utils/validators';

export const authService = {
  /**
   * Register a new user account and automatically establish a session.
   * @param {string} email
   * @param {string} password
   * @param {string} name
   */
  async register(email, password, name) {
    if (!isValidEmail(email)) {
      throw new Error('Please provide a valid email address.');
    }
    if (!isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters long.');
    }
    const sanitizedName = (name || '').trim();

    const userId = ID.unique();
    // 1. Create account
    await account.create({
      userId,
      email: email.trim(),
      password,
      name: sanitizedName,
    });

    // 2. Establish session
    await account.createEmailPasswordSession({
      email: email.trim(),
      password,
    });

    // 3. Return user profile
    return await account.get();
  },

  /**
   * Login with email and password.
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    if (!isValidEmail(email)) {
      throw new Error('Please provide a valid email address.');
    }
    if (!password) {
      throw new Error('Password is required.');
    }

    await account.createEmailPasswordSession({
      email: email.trim(),
      password,
    });

    return await account.get();
  },

  /**
   * Fetch current authenticated user. Returns null if unauthenticated.
   */
  async getCurrentUser() {
    try {
      return await account.get();
    } catch {
      return null;
    }
  },

  /**
   * Fetch current active session.
   */
  async getSession() {
    try {
      return await account.getSession({ sessionId: 'current' });
    } catch {
      return null;
    }
  },

  /**
   * Logout current device session.
   */
  async logout() {
    try {
      await account.deleteSession({ sessionId: 'current' });
    } catch (err) {
      // If already logged out or session expired, ignore
      if (err?.code !== 401) {
        throw err;
      }
    }
  },
};
