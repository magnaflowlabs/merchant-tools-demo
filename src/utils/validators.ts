/**
 * Keystore form data validation interface
 */
export interface KeystoreFormData {
  walletName: string;
  description?: string;
  password: string;
  confirmPassword: string;
}

export interface ValidationError {
  field: keyof KeystoreFormData;
  message: string;
}

/**
 * Input validation constants
 */
const VALIDATION_LIMITS = {
  WALLET_NAME_MIN: 2,
  WALLET_NAME_MAX: 50,
  DESCRIPTION_MIN: 3,
  DESCRIPTION_MAX: 200,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 50,
} as const;

/**
 * Allowed character patterns
 */
const CHARACTER_PATTERNS = {
  // Alphanumeric, underscore, hyphen (no spaces, dots, or special chars)
  WALLET_NAME: /^[a-zA-Z0-9_-]+$/,
  // Alphanumeric and common safe characters for description
  DESCRIPTION: /^[a-zA-Z0-9_\s-]+$/,
} as const;

/**
 * Sanitize string input - remove control characters and trim
 */
function sanitizeInput(input: string): string {
  // Remove control characters (except common whitespace)
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Validate string length
 */
function validateLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

/**
 * validate Keystore form data
 * @param formData form data
 * @returns validation error array, empty array means validation passed
 */
export function validateKeystoreForm(formData: KeystoreFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  // validate wallet name
  const sanitizedWalletName = sanitizeInput(formData.walletName);
  if (!sanitizedWalletName) {
    errors.push({ field: 'walletName', message: 'please input wallet name' });
  } else if (
    !validateLength(
      sanitizedWalletName,
      VALIDATION_LIMITS.WALLET_NAME_MIN,
      VALIDATION_LIMITS.WALLET_NAME_MAX
    )
  ) {
    errors.push({
      field: 'walletName',
      message: `wallet name must be between ${VALIDATION_LIMITS.WALLET_NAME_MIN} and ${VALIDATION_LIMITS.WALLET_NAME_MAX} characters`,
    });
  } else if (!CHARACTER_PATTERNS.WALLET_NAME.test(sanitizedWalletName)) {
    errors.push({
      field: 'walletName',
      message: 'wallet name can only contain letters, numbers, underscores, and hyphens',
    });
  }

  // validate description/user token (optional field)
  if (formData.description !== undefined) {
    const sanitizedDescription = sanitizeInput(formData.description);
    if (!sanitizedDescription) {
      errors.push({ field: 'description', message: 'please input user token' });
    } else if (
      !validateLength(
        sanitizedDescription,
        VALIDATION_LIMITS.DESCRIPTION_MIN,
        VALIDATION_LIMITS.DESCRIPTION_MAX
      )
    ) {
      errors.push({
        field: 'description',
        message: `user token must be between ${VALIDATION_LIMITS.DESCRIPTION_MIN} and ${VALIDATION_LIMITS.DESCRIPTION_MAX} characters`,
      });
    } else if (!CHARACTER_PATTERNS.DESCRIPTION.test(sanitizedDescription)) {
      errors.push({
        field: 'description',
        message: 'user token contains invalid characters',
      });
    }
  }

  // validate password
  const sanitizedPassword = sanitizeInput(formData.password);
  if (!sanitizedPassword) {
    errors.push({ field: 'password', message: 'please input password' });
  } else if (
    !validateLength(
      sanitizedPassword,
      VALIDATION_LIMITS.PASSWORD_MIN,
      VALIDATION_LIMITS.PASSWORD_MAX
    )
  ) {
    errors.push({
      field: 'password',
      message: `password must be between ${VALIDATION_LIMITS.PASSWORD_MIN} and ${VALIDATION_LIMITS.PASSWORD_MAX} characters`,
    });
  } else if (sanitizedPassword.includes(' ') && sanitizedPassword.trim() !== sanitizedPassword) {
    errors.push({
      field: 'password',
      message: 'password cannot start or end with spaces',
    });
  }

  // validate confirm password
  if (!formData.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'please confirm password' });
  } else if (formData.password !== formData.confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'the two passwords entered are inconsistent',
    });
  }

  return errors;
}

/**
 * validate single field
 * @param field
 * @param value
 * @param formData
 * @returns validation error message, undefined means validation passed
 */
export function validateKeystoreField(
  field: keyof KeystoreFormData,
  value: string,
  formData?: Partial<KeystoreFormData>
): string | undefined {
  switch (field) {
    case 'walletName':
      if (!value.trim()) {
        return 'please input wallet name';
      }
      if (value.trim().length < 2) {
        return 'wallet name must be at least 2 characters';
      }
      if (value.includes(' ') || value.includes('.')) {
        return 'wallet name cannot contain spaces or dots';
      }
      break;

    case 'description':
      if (value !== undefined) {
        if (!value.trim()) {
          return 'please input user token';
        }
        if (value.trim().length < 3) {
          return 'user token must be at least 3 characters';
        }
      }
      break;

    case 'password':
      if (!value) {
        return 'please input password';
      }
      if (value.length < 8) {
        return 'password length must be at least 8 characters';
      }
      if (value.length > 50) {
        return 'password length cannot exceed 50 characters';
      }
      break;

    case 'confirmPassword':
      if (!value) {
        return 'please confirm password';
      }
      if (formData?.password && value !== formData.password) {
        return 'the two passwords entered are inconsistent';
      }
      break;
  }

  return undefined;
}
