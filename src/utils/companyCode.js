import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Generates a random company join code in the format ABC-1234
 * @returns {string} A randomly generated company code
 */
export const generateCompanyCode = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';

  // Generate 3 random letters
  let letterPart = '';
  for (let i = 0; i < 3; i++) {
    letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // Generate 4 random numbers
  let numberPart = '';
  for (let i = 0; i < 4; i++) {
    numberPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return `${letterPart}-${numberPart}`;
};

/**
 * Checks if a company code already exists in Firestore
 * @param {string} code - The company code to check
 * @returns {Promise<boolean>} True if code exists, false otherwise
 */
export const isCodeExists = async (code) => {
  try {
    const normalizedCode = code.toUpperCase();
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, where('joinCode', '==', normalizedCode));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking code existence:', error);
    throw error;
  }
};

/**
 * Generates a unique company code that doesn't exist in the database
 * @param {number} maxAttempts - Maximum number of attempts to generate a unique code
 * @returns {Promise<string>} A unique company code
 */
export const generateUniqueCompanyCode = async (maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateCompanyCode();
    const exists = await isCodeExists(code);

    if (!exists) {
      return code;
    }
  }

  throw new Error('Failed to generate unique company code after maximum attempts');
};

/**
 * Validates the format of a company code
 * @param {string} code - The code to validate
 * @returns {boolean} True if format is valid, false otherwise
 */
export const isValidCodeFormat = (code) => {
  if (!code || typeof code !== 'string') return false;

  // Format: XXX-NNNN (3 letters, hyphen, 4 numbers)
  const codeRegex = /^[A-Z]{3}-\d{4}$/i;
  return codeRegex.test(code);
};

/**
 * Normalizes a company code to uppercase
 * @param {string} code - The code to normalize
 * @returns {string} Normalized code
 */
export const normalizeCode = (code) => {
  if (!code || typeof code !== 'string') return '';
  return code.toUpperCase().trim();
};

/**
 * Finds a company by its join code
 * @param {string} code - The company join code
 * @returns {Promise<{id: string, data: object} | null>} Company document or null if not found
 */
export const findCompanyByCode = async (code) => {
  try {
    const normalizedCode = normalizeCode(code);

    if (!isValidCodeFormat(normalizedCode)) {
      return null;
    }

    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, where('joinCode', '==', normalizedCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      data: doc.data()
    };
  } catch (error) {
    console.error('Error finding company by code:', error);
    throw error;
  }
};
