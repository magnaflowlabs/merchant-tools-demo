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
 * validate Keystore form data
 * @param formData form data
 * @returns validation error array, empty array means validation passed
 */
export function validateKeystoreForm(formData: KeystoreFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  // validate wallet name
  if (!formData.walletName.trim()) {
    errors.push({ field: 'walletName', message: 'please input wallet name' });
  } else if (formData.walletName.trim().length < 2) {
    errors.push({ field: 'walletName', message: 'wallet name must be at least 2 characters' });
  } else if (formData.walletName.includes(' ') || formData.walletName.includes('.')) {
    errors.push({ field: 'walletName', message: 'wallet name cannot contain spaces or dots' });
  }

  // validate description/user token (optional field)
  if (formData.description !== undefined) {
    if (!formData.description.trim()) {
      errors.push({ field: 'description', message: 'please input user token' });
    } else if (formData.description.trim().length < 3) {
      errors.push({ field: 'description', message: 'user token must be at least 3 characters' });
    }
  }

  // validate password
  if (!formData.password) {
    errors.push({ field: 'password', message: 'please input password' });
  } else if (formData.password.length < 8) {
    errors.push({ field: 'password', message: 'password length must be at least 8 characters' });
  } else if (formData.password.length > 50) {
    errors.push({ field: 'password', message: 'password length cannot exceed 50 characters' });
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
