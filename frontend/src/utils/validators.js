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
 * Must contain at least one uppercase letter, lowercase letter, number, and symbol, with a minimum length of 12 characters.
 */
export const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) return false;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return hasUppercase && hasLowercase && hasDigit && hasSymbol;
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
  if (!phone) return false; // Mandatory field
  const cleanPhone = phone.replace(/[\s-]/g, '');
  const re = /^(07\d{8}|\+947\d{8})$/; // Sri Lankan patterns
  return re.test(cleanPhone);
};
