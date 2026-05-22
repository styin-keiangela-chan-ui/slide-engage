// Generate a random event code like #ABC123
export function generateEventCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '#';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate a session token for anonymous participants
export function generateSessionToken(): string {
  return 'sess_' + crypto.randomUUID();
}

// Simple password hashing (for demo — use bcrypt in production)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Format relative time
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Get interaction type icon
export function getInteractionIcon(type: string): string {
  const icons: Record<string, string> = {
    poll: '📊',
    quiz: '🧠',
    qa: '❓',
    word_cloud: '☁️',
    feedback: '⭐',
    survey: '📝',
  };
  return icons[type] || '📋';
}

// Get interaction type label
export function getInteractionLabel(type: string): string {
  const labels: Record<string, string> = {
    poll: 'Poll',
    quiz: 'Quiz',
    qa: 'Q&A',
    word_cloud: 'Word Cloud',
    feedback: 'Feedback',
    survey: 'Survey',
  };
  return labels[type] || type;
}

// Get status color class
export function getStatusClass(status: string): string {
  switch (status) {
    case 'live': return 'status-live';
    case 'closed': return 'status-done';
    case 'archived': return 'status-done';
    default: return 'status-draft';
  }
}

// Get status label
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'live': return '🔴 Live';
    case 'closed': return '✅ Done';
    case 'archived': return 'Archived';
    default: return 'Draft';
  }
}

// Option letters
export const OPTION_LETTERS = 'ABCDEFGHIJ'.split('');

// Colors for chart bars
export const CHART_COLORS = [
  '#2D8A4E', '#1A6BB5', '#D46B08', '#8B1A4A',
  '#6B21A8', '#0E7490', '#B45309', '#DC2626',
];
