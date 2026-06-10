// ============================================
// Client-side Input Validators
// Validate input fields before calling backend APIs
// ============================================

/**
 * Validates email address syntax.
 */
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

/**
 * Validates password strength.
 * Must contain at least one uppercase, one lowercase, and one number, min 6 characters.
 */
export const validatePassword = (password) => {
  if (password.length < 6) return false;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  return hasUppercase && hasLowercase && hasDigit;
};

/**
 * Validates Student ID format.
 * Can be any student ID string, must be 2-30 characters.
 */
export const validateStudentId = (studentId) => {
  return studentId && studentId.trim().length >= 2 && studentId.trim().length <= 30;
};

/**
 * Validates phone numbers (basic numerical pattern check).
 */
export const validatePhone = (phone) => {
  if (!phone) return true; // Optional field
  const re = /^\+?[1-9]\d{1,14}$/; // E.164 pattern
  return re.test(phone.replace(/[\s-]/g, ''));
};
