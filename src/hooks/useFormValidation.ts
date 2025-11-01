import { useState, useCallback } from 'react';

export type ValidationRule = {
  validator: (value: string) => boolean;
  message: string;
};

export type FieldRules = {
  [key: string]: ValidationRule[];
};

export function useFormValidation(rules: FieldRules) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = useCallback(
    (fieldName: string, value: string) => {
      const fieldRules = rules[fieldName] || [];
      for (const rule of fieldRules) {
        if (!rule.validator(value)) {
          setErrors((prev) => ({ ...prev, [fieldName]: rule.message }));
          return false;
        }
      }
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
      return true;
    },
    [rules]
  );

  const validateAll = useCallback(
    (values: { [key: string]: string }) => {
      let isValid = true;
      const newErrors: { [key: string]: string } = {};

      Object.keys(rules).forEach((fieldName) => {
        const fieldRules = rules[fieldName] || [];
        const value = values[fieldName] || '';
        for (const rule of fieldRules) {
          if (!rule.validator(value)) {
            newErrors[fieldName] = rule.message;
            isValid = false;
            break;
          }
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [rules]
  );

  const markTouched = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateAll,
    markTouched,
    reset,
    hasError: (fieldName: string) => !!errors[fieldName],
    getError: (fieldName: string) => errors[fieldName] || '',
  };
}

// Validatori comuni
export const validators = {
  required: (message = 'This field is required'): ValidationRule => ({
    validator: (value) => value.trim().length > 0,
    message,
  }),
  email: (message = 'Invalid email address'): ValidationRule => ({
    validator: (value) => {
      if (!value.trim()) return true; // required è separato
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message,
  }),
  minLength: (min: number, message?: string): ValidationRule => ({
    validator: (value) => {
      if (!value.trim()) return true;
      return value.length >= min;
    },
    message: message || `Must be at least ${min} characters`,
  }),
  maxLength: (max: number, message?: string): ValidationRule => ({
    validator: (value) => {
      if (!value.trim()) return true;
      return value.length <= max;
    },
    message: message || `Must be at most ${max} characters`,
  }),
  phone: (message = 'Invalid phone number'): ValidationRule => ({
    validator: (value) => {
      if (!value.trim()) return true;
      return /^\+?[\d\s\-()]+$/.test(value) && value.replace(/\D/g, '').length >= 8;
    },
    message,
  }),
  passwordMatch: (otherValue: string, message = 'Passwords do not match'): ValidationRule => ({
    validator: (value) => value === otherValue,
    message,
  }),
};