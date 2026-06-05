/**
 * Application error handling module
 * Requirement 14.5: Proper error handling and logging
 */

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error codes used throughout the application
 */
export const ErrorCodes = {
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_WEIGHT: 'INVALID_WEIGHT',
  MISSING_PHOTO: 'MISSING_PHOTO',
  OUTSIDE_TIME_WINDOW: 'OUTSIDE_TIME_WINDOW',
  INVALID_FISH_TYPE: 'INVALID_FISH_TYPE',
  
  // Authorization errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SELF_CONFIRMATION: 'SELF_CONFIRMATION',
  NOT_NEIGHBOR_PEG: 'NOT_NEIGHBOR_PEG',
  INVALID_ROLE: 'INVALID_ROLE',
  
  // Business logic errors
  ALREADY_CONFIRMED: 'ALREADY_CONFIRMED',
  TEAM_DISQUALIFIED: 'TEAM_DISQUALIFIED',
  ZAVOD_NOT_ACTIVE: 'ZAVOD_NOT_ACTIVE',
  ZAVOD_NOT_FOUND: 'ZAVOD_NOT_FOUND',
  TYM_NOT_FOUND: 'TYM_NOT_FOUND',
  ULOVEK_NOT_FOUND: 'ULOVEK_NOT_FOUND',
  PEG_ALREADY_ASSIGNED: 'PEG_ALREADY_ASSIGNED',
  USER_NOT_IN_TEAM: 'USER_NOT_IN_TEAM',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  REALTIME_ERROR: 'REALTIME_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Error messages in Czech for user-facing errors
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Validation
  [ErrorCodes.INVALID_INPUT]: 'Neplatný vstup',
  [ErrorCodes.INVALID_WEIGHT]: 'Minimální váha ryby je 5 kg',
  [ErrorCodes.MISSING_PHOTO]: 'Fotografie je povinná',
  [ErrorCodes.OUTSIDE_TIME_WINDOW]: 'Závod neprobíhá',
  [ErrorCodes.INVALID_FISH_TYPE]: 'Neplatný druh ryby',
  
  // Authorization
  [ErrorCodes.UNAUTHORIZED]: 'Nejste přihlášen',
  [ErrorCodes.FORBIDDEN]: 'Nemáte oprávnění k této akci',
  [ErrorCodes.SELF_CONFIRMATION]: 'Nelze potvrdit vlastní úlovek',
  [ErrorCodes.NOT_NEIGHBOR_PEG]: 'Můžete potvrdit pouze sousední pegy',
  [ErrorCodes.INVALID_ROLE]: 'Neplatná role uživatele',
  
  // Business logic
  [ErrorCodes.ALREADY_CONFIRMED]: 'Úlovek již byl potvrzen',
  [ErrorCodes.TEAM_DISQUALIFIED]: 'Tým byl diskvalifikován',
  [ErrorCodes.ZAVOD_NOT_ACTIVE]: 'Závod není aktivní',
  [ErrorCodes.ZAVOD_NOT_FOUND]: 'Závod nebyl nalezen',
  [ErrorCodes.TYM_NOT_FOUND]: 'Tým nebyl nalezen',
  [ErrorCodes.ULOVEK_NOT_FOUND]: 'Úlovek nebyl nalezen',
  [ErrorCodes.PEG_ALREADY_ASSIGNED]: 'Peg je již přiřazen jinému týmu',
  [ErrorCodes.USER_NOT_IN_TEAM]: 'Uživatel není členem týmu',
  
  // System
  [ErrorCodes.DATABASE_ERROR]: 'Chyba databáze',
  [ErrorCodes.STORAGE_ERROR]: 'Chyba při ukládání souboru',
  [ErrorCodes.REALTIME_ERROR]: 'Chyba realtime připojení',
  [ErrorCodes.UNKNOWN_ERROR]: 'Neznámá chyba',
};

/**
 * Create an AppError with the appropriate message
 */
export function createError(code: ErrorCode, statusCode: number = 400): AppError {
  return new AppError(ErrorMessages[code], code, statusCode);
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to a standardized error response
 */
export function toErrorResponse(error: unknown): {
  code: string;
  message: string;
  details?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
    };
  }
  
  if (error instanceof Error) {
    return {
      code: ErrorCodes.UNKNOWN_ERROR,
      message: error.message,
    };
  }
  
  return {
    code: ErrorCodes.UNKNOWN_ERROR,
    message: ErrorMessages[ErrorCodes.UNKNOWN_ERROR],
  };
}
