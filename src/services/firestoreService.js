import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export const firestoreService = {
  // Create document
  async create(collectionName, data) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Method to get documents from a top-level collection with optional queries
  getCollection: async (collectionName, queryConditions = []) => {
    try {
      let q = collection(db, collectionName);

      queryConditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });

      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data };
    } catch (error) {
      console.error(`Error getting collection ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Read document
  async getById(collectionName, id) {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      } else {
        return { success: false, error: 'Document not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Method to create a document in a top-level collection
  createDocument: async (collectionName, data) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), data);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  },

   async createUserProfile(uid, data) { // New function specifically for user profiles
    try {
      const docRef = doc(db, 'users', uid); // Set the document ID to the user's UID
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
      return { success: true, id: uid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Read all documents
  async getAll(collectionName, options = {}) {
  try {
    let q = collection(db, collectionName);
    
    // Apply where clauses if provided
    if (options.where && Array.isArray(options.where)) {
      const constraints = options.where.map(([field, operator, value]) => 
        where(field, operator, value)
      );
      q = query(q, ...constraints);
    }
    
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
},

  // Query documents
  async query(collectionName, conditions = []) {
    try {
      let q = collection(db, collectionName);
      
      // Apply where conditions
      conditions.forEach(({ field, operator, value }) => {
        q = query(q, where(field, operator, value));
      });
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update document
  async update(collectionName, id, data) {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete document
  async delete(collectionName, id) {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};