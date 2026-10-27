const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english }
  coverImage { large }
  siteUrl
  format
  status
  episodes
  nextAiringEpisode { episode airingAt }
`;

export const SEARCH_ANIME_QUERY = `
query ($search: String!, $perPage: Int!) {
  Page(perPage: $perPage) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {${MEDIA_FIELDS}}
  }
}`;

export const ANIME_BY_ID_QUERY = `
query ($id: Int!) {
  Media(id: $id, type: ANIME) {${MEDIA_FIELDS}}
}`;

export const ANIME_BY_MAL_ID_QUERY = `
query ($idMal: Int!) {
  Media(idMal: $idMal, type: ANIME) {${MEDIA_FIELDS}}
}`;

/**
 * Uma única requisição por lote: mídias com os próximos episódios (notYetAired)
 * + os episódios exibidos na janela [$from, $to], para não perder lançamentos entre syncs.
 */
export const AIRING_SCHEDULES_QUERY = `
query ($ids: [Int!], $from: Int!, $to: Int!) {
  media: Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {${MEDIA_FIELDS}
      airingSchedule(notYetAired: true, perPage: 25) {
        nodes { episode airingAt }
      }
    }
  }
  recent: Page(perPage: 50) {
    airingSchedules(mediaId_in: $ids, airingAt_greater: $from, airingAt_lesser: $to, sort: TIME_DESC) {
      mediaId
      episode
      airingAt
    }
  }
}`;
