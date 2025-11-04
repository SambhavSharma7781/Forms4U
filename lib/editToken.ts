// Simple utility functions for response editing
import crypto from 'crypto';

/**
 * Generate a random edit token
 * Simple और secure token generation
 */
export function generateEditToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate token expiry based on time limit setting
 * @param editTimeLimit - "24h", "7d", "30d", "always"
 */
export function calculateTokenExpiry(editTimeLimit: string): Date | null {
  const now = new Date();
  
  switch (editTimeLimit) {
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    case 'always':
      return null; // Never expires
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default 24h
  }
}

/**
 * Check if edit token is still valid
 * @param expiry - Token expiry date (null means never expires)
 */
export function isTokenValid(expiry: Date | null): boolean {
  if (expiry === null) {
    return true; // Never expires
  }
  return new Date() < expiry;
}

/**
 * Format time remaining for display
 * @param expiry - Token expiry date
 */
export function formatTimeRemaining(expiry: Date | null): string {
  if (expiry === null) {
    return 'No time limit';
  }
  
  const now = new Date();
  const remaining = expiry.getTime() - now.getTime();
  
  if (remaining <= 0) {
    return 'Expired';
  }
  
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else {
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  }
}