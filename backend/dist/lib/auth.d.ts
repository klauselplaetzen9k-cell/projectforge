export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
/**
 * Hash a password using bcrypt
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify a password against a hash
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * Generate an access token
 */
export declare function generateAccessToken(payload: TokenPayload): string;
/**
 * Generate a refresh token
 */
export declare function generateRefreshToken(payload: TokenPayload): string;
/**
 * Generate both access and refresh tokens
 */
export declare function generateTokenPair(payload: TokenPayload): TokenPair;
/**
 * Verify an access token
 */
export declare function verifyAccessToken(token: string): TokenPayload | null;
/**
 * Verify a refresh token
 */
export declare function verifyRefreshToken(token: string): TokenPayload | null;
/**
 * Verify any token (access or refresh) - tries access first, then refresh
 */
export declare function verifyToken(token: string): TokenPayload | null;
/**
 * Create a new user session with refresh token
 */
export declare function createUserSession(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string): Promise<{
    id: string;
    token: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    userId: string;
}>;
/**
 * Invalidate a specific session
 */
export declare function invalidateSession(token: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
/**
 * Invalidate all sessions for a user
 */
export declare function invalidateAllUserSessions(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
/**
 * Get session by refresh token
 */
export declare function getSessionByRefreshToken(refreshToken: string): Promise<({
    user: {
        id: string;
        createdAt: Date;
        email: string;
        passwordHash: string | null;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastLoginAt: Date | null;
        updatedAt: Date;
    };
} & {
    id: string;
    token: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    userId: string;
}) | null>;
/**
 * Get all active sessions for a user
 */
export declare function getUserSessions(userId: string): Promise<{
    id: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}[]>;
/**
 * Validate user credentials
 */
export declare function validateCredentials(email: string, password: string): Promise<{
    error: string;
    user?: undefined;
} | {
    user: {
        id: string;
        createdAt: Date;
        email: string;
        passwordHash: string | null;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastLoginAt: Date | null;
        updatedAt: Date;
    };
    error?: undefined;
} | null>;
/**
 * Create a new user
 */
export declare function createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}): Promise<{
    id: string;
    createdAt: Date;
    email: string;
    passwordHash: string | null;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: import(".prisma/client").$Enums.UserRole;
    isActive: boolean;
    lastLoginAt: Date | null;
    updatedAt: Date;
}>;
//# sourceMappingURL=auth.d.ts.map