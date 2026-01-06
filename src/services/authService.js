import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { auth } from './firebase';

export const authService = {
  // Sign up
  async signUp(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

    // ✅ NEW: Sign in SMS workers anonymously
  async signInAnonymous() {
    try {
      console.log("🔐 Signing in anonymously...");
      const userCredential = await signInAnonymously(auth);
      console.log("✅ Anonymous sign-in successful");
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("❌ Anonymous sign-in failed:", error);
      return { success: false, error: error.message };
    }
  },

  // ✅ NEW: Ensure SMS worker is authenticated
  async ensureSMSWorkerAuth(accessKey) {
    const currentUser = auth.currentUser;
    
    console.log("=== SMS Worker Auth Check ===");
    console.log("Access Key:", accessKey);
    console.log("Current User:", currentUser?.uid);
    console.log("Is Anonymous:", currentUser?.isAnonymous);
    
    // ✅ If user is already authenticated (anonymous OR regular), just return
    if (currentUser) {
      console.log("✅ User already authenticated - skipping sign in");
      return { success: true, user: currentUser };
    }
    
    // ✅ Only sign in anonymously if there's an accessKey AND no current user
    if (accessKey && !currentUser) {
      console.log("📱 SMS worker detected - authenticating anonymously...");
      return await authService.signInAnonymous();
    }
    
    // No accessKey and no user - let the app handle it (probably redirect to login)
    console.log("⚠️ No user and no access key");
    return { success: false, error: 'Not authenticated' };
  },

  // Listen to auth state changes
  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  },

  // Sign in
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Listen to auth state changes
  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  },

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }
};