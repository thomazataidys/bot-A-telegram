import type { User } from '@animebot/db';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapa texto para uso seguro em mensagens Telegram com parse_mode HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Remove "@" inicial, espaços nas pontas e converte para minúsculas; null se ficar vazio. */
export function normalizeUsername(username: string | null | undefined): string | null {
  if (username == null) return null;
  const normalized = username.trim().replace(/^@+/, '').trim().toLowerCase();
  return normalized === '' ? null : normalized;
}

/** Menção em HTML: `@username`, link `tg://user` ou apenas o nome escapado. */
export function formatUserMention(user: Pick<User, 'name' | 'username' | 'telegramId'>): string {
  if (user.username) return `@${escapeHtml(user.username)}`;
  const name = escapeHtml(user.name);
  if (user.telegramId !== null) {
    return `<a href="tg://user?id=${user.telegramId.toString()}">${name}</a>`;
  }
  return name;
}
