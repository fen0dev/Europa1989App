export enum ErrorCode {
    NETWORK_ERROR = 'NETWORK_ERROR',
    UNAUTHORIZED = 'UNAUTHORIZED',
    NOT_FOUND = 'NOT_FOUND',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    SERVER_ERROR = 'SERVER_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
  
export class AppError extends Error {
    constructor(
      public code: ErrorCode,
      message: string,
      public originalError?: any,
      public userMessage?: string
    ) {
      super(message);
      this.name = 'AppError';
    }
}
  
export function handleApiError(error: any): AppError {
    // Errori Supabase
    if (error?.code) {
      switch (error.code) {
        case 'PGRST116':
          return new AppError(
            ErrorCode.NOT_FOUND,
            'Resource not found',
            error,
            'The requested item was not found.'
          );
        case '23505': // Unique violation
          return new AppError(
            ErrorCode.VALIDATION_ERROR,
            'Duplicate entry',
            error,
            'This item already exists.'
          );
        default:
          return new AppError(
            ErrorCode.SERVER_ERROR,
            error.message || 'Server error',
            error,
            'Something went wrong. Please try again.'
          );
      }
    }
  
    // Errori di rete
    if (error?.message?.includes('Network') || error?.message?.includes('fetch')) {
      return new AppError(
        ErrorCode.NETWORK_ERROR,
        'Network error',
        error,
        'Please check your internet connection and try again.'
      );
    }
  
    // Errori di autenticazione
    if (error?.status === 401 || error?.status === 403) {
      return new AppError(
        ErrorCode.UNAUTHORIZED,
        'Unauthorized',
        error,
        'Please log in to continue.'
      );
    }
  
    // Default
    return new AppError(
      ErrorCode.UNKNOWN_ERROR,
      error?.message || 'Unknown error',
      error,
      'An unexpected error occurred. Please try again.'
    );
}
  
// Logger strutturato
export const logger = {
    error: (message: string, error?: any, context?: Record<string, any>) => {
      if (__DEV__) {
        console.error(`[ERROR] ${message}`, {
          error,
          context,
          timestamp: new Date().toISOString(),
        });
      }
      // In produzione, inviare a servizio di logging
    },
    warn: (message: string, context?: Record<string, any>) => {
      if (__DEV__) {
        console.warn(`[WARN] ${message}`, context);
      }
    },
    info: (message: string, context?: Record<string, any>) => {
      if (__DEV__) {
        console.log(`[INFO] ${message}`, context);
      }
    },
};