export type ParsedAnimeInput =
  | { type: 'anilist'; anilistId: number; rawUrl: string }
  | { type: 'mal'; malId: number; rawUrl: string }
  | {
      type: 'crunchyroll';
      seriesId: string;
      slug: string;
      searchQuery: string;
      rawUrl: string;
    }
  | { type: 'plus_query'; searchQuery: string };

const PROTOCOL = String.raw`(?:https?:\/\/)?(?:www\.)?`;
// Evita casar o host dentro de outro (ex.: "fakeanilist.co", "x.myanimelist.net").
const BOUNDARY = String.raw`(?<![\w.-])`;

const ANILIST_RE = new RegExp(`${BOUNDARY}${PROTOCOL}anilist\\.co\\/anime\\/(\\d+)(?!\\w)`, 'i');
const MAL_RE = new RegExp(`${BOUNDARY}${PROTOCOL}myanimelist\\.net\\/anime\\/(\\d+)(?!\\w)`, 'i');
// Idioma opcional: "pt-br", "en", "es-419"...
const CRUNCHYROLL_RE = new RegExp(
  `${BOUNDARY}${PROTOCOL}crunchyroll\\.com\\/(?:[a-z]{2}(?:-[a-z0-9]{2,4})?\\/)?series\\/([a-z0-9]+)\\/([\\w%-]+)`,
  'i',
);

const MIN_USEFUL_CHARS = 2;

/** "solo-leveling-season-2" -> "solo leveling season 2". */
export function slugToSearchQuery(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Slug com % inválido: usa o texto como está.
  }
  return decoded.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function findLink(text: string): { index: number; input: ParsedAnimeInput } | null {
  const found: { index: number; input: ParsedAnimeInput }[] = [];

  const anilist = ANILIST_RE.exec(text);
  if (anilist) {
    found.push({
      index: anilist.index,
      input: { type: 'anilist', anilistId: Number(anilist[1]), rawUrl: anilist[0] },
    });
  }
  const mal = MAL_RE.exec(text);
  if (mal) {
    found.push({
      index: mal.index,
      input: { type: 'mal', malId: Number(mal[1]), rawUrl: mal[0] },
    });
  }
  const crunchyroll = CRUNCHYROLL_RE.exec(text);
  if (crunchyroll) {
    const slug = crunchyroll[2] as string;
    found.push({
      index: crunchyroll.index,
      input: {
        type: 'crunchyroll',
        seriesId: crunchyroll[1] as string,
        slug,
        searchQuery: slugToSearchQuery(slug),
        rawUrl: crunchyroll[0],
      },
    });
  }

  // Vale o link que aparece primeiro na mensagem.
  return found.sort((a, b) => a.index - b.index)[0] ?? null;
}

/** "+ nome": exige o "+" no início e ao menos 2 letras/números úteis (ignora "+1", "++"). */
function parsePlusQuery(text: string): ParsedAnimeInput | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('+')) return null;
  const query = trimmed.slice(1).replace(/\s+/g, ' ').trim();
  if (query.startsWith('+')) return null;
  const useful = query.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (useful < MIN_USEFUL_CHARS || !/\p{L}/u.test(query)) return null;
  return { type: 'plus_query', searchQuery: query };
}

/**
 * Extrai um link de anime (AniList, MAL, Crunchyroll) de qualquer posição do texto,
 * ou detecta o atalho "+ <nome>" no início da mensagem.
 */
export function parseMessageInput(text: string): ParsedAnimeInput | null {
  if (text.trimStart().startsWith('/')) return null;
  return findLink(text)?.input ?? parsePlusQuery(text);
}

/**
 * Analisa o argumento do /add: link suportado, texto livre (busca) ou null
 * quando vazio ou quando é uma URL que não sabemos tratar.
 */
export function parseAddArgument(
  arg: string,
): ParsedAnimeInput | { type: 'search_query'; searchQuery: string } | null {
  const trimmed = arg.trim();
  if (trimmed === '') return null;

  const link = findLink(trimmed);
  if (link) return link.input;
  if (/^https?:\/\/\S+$/i.test(trimmed)) return null;

  const plus = parsePlusQuery(trimmed);
  if (plus?.type === 'plus_query') return { type: 'search_query', searchQuery: plus.searchQuery };
  return { type: 'search_query', searchQuery: trimmed.replace(/\s+/g, ' ') };
}
