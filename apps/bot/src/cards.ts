import type { Api } from 'grammy';
import type { InlineKeyboardMarkup } from 'grammy/types';
import type { BotContext } from './context.js';
import { HTML_OPTIONS } from './messages.js';

/** Limite de legenda de uma foto no Telegram. */
export const CAPTION_LIMIT = 1024;

export interface AnimeCard {
  /** URL da imagem (capa ou banner); sem ela o card sai como texto. */
  imageUrl?: string | null;
  /** Legenda em HTML do Telegram. */
  caption: string;
  keyboard?: InlineKeyboardMarkup;
}

// Tag HTML, entidade (&amp;, &#39;) ou um caractere (code point).
const HTML_TOKEN = /<\/?[a-z][^>]*>|&(?:#\d+|#x[\da-f]+|[a-z]+);|[\s\S]/giu;

function closingTags(stack: string[]): string {
  return stack
    .map((name) => `</${name}>`)
    .reverse()
    .join('');
}

/**
 * Corta HTML do Telegram em até `max` caracteres, terminando com "…". Nunca deixa uma tag
 * aberta, uma tag partida ou uma entidade (&amp;) pela metade.
 */
export function fitCaption(html: string, max = CAPTION_LIMIT): string {
  if (html.length <= max) return html;

  let stack: string[] = [];
  let out = '';
  let safe = '';
  let safeStack: string[] = [];
  for (const token of html.match(HTML_TOKEN) ?? []) {
    const tag = /^<(\/?)([a-z][a-z0-9-]*)/i.exec(token);
    const next = [...stack];
    if (tag?.[1]) next.pop();
    else if (tag) next.push((tag[2] as string).toLowerCase());

    if ((out + token + closingTags(next) + '…').length > max) break;
    out += token;
    stack = next;
    // Só vale cortar depois de texto: evita tags vazias no fim.
    if (!tag) {
      safe = out;
      safeStack = next;
    }
  }
  return `${safe}…${closingTags(safeStack)}`;
}

/**
 * Envia um card: foto com legenda e botões; sem imagem, ou se o Telegram recusar a foto
 * (URL inválida, arquivo grande demais...), cai para uma mensagem de texto normal.
 * Com `BotContext` responde no chat atual; com `Api` é preciso passar o `chatId`.
 */
export async function sendAnimeCard(
  target: BotContext | Api,
  card: AnimeCard,
  chatId?: number | string,
): Promise<void> {
  const caption = fitCaption(card.caption);
  const options = { ...HTML_OPTIONS, reply_markup: card.keyboard };
  const photoOptions = {
    caption,
    parse_mode: HTML_OPTIONS.parse_mode,
    reply_markup: card.keyboard,
  };

  const isContext = 'reply' in target;
  if (!isContext && chatId === undefined)
    throw new Error('sendAnimeCard: chatId é obrigatório com Api');
  const sendText = (): Promise<unknown> =>
    isContext
      ? target.reply(caption, options)
      : target.sendMessage(chatId as number | string, caption, options);

  if (!card.imageUrl) {
    await sendText();
    return;
  }
  try {
    await (isContext
      ? target.replyWithPhoto(card.imageUrl, photoOptions)
      : target.sendPhoto(chatId as number | string, card.imageUrl, photoOptions));
  } catch (error) {
    console.warn('Não consegui enviar a imagem; enviando só o texto:', error);
    await sendText();
  }
}

/** Indica se a mensagem do botão clicado é uma foto (card com legenda). */
function isPhotoMessage(ctx: BotContext): boolean {
  const message = ctx.callbackQuery?.message;
  return message !== undefined && 'photo' in message && message.photo !== undefined;
}

/**
 * Edita a mensagem do botão clicado: legenda se for foto (editMessageCaption),
 * texto caso contrário. Sem `reply_markup`, os botões são removidos.
 */
export async function editCard(
  ctx: BotContext,
  html: string,
  reply_markup?: InlineKeyboardMarkup,
): Promise<void> {
  if (isPhotoMessage(ctx)) {
    await ctx.editMessageCaption({
      caption: fitCaption(html),
      parse_mode: HTML_OPTIONS.parse_mode,
      reply_markup,
    });
    return;
  }
  await ctx.editMessageText(html, { ...HTML_OPTIONS, reply_markup });
}
