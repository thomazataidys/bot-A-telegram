import { z } from 'zod';

export const airingNodeSchema = z.object({
  episode: z.number().int(),
  airingAt: z.number().int(),
});

export const mediaSchema = z.object({
  id: z.number().int(),
  idMal: z
    .number()
    .int()
    .nullish()
    .transform((v) => v ?? null),
  title: z.object({
    romaji: z.string(),
    english: z
      .string()
      .nullish()
      .transform((v) => v ?? null),
  }),
  bannerImage: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  coverImage: z
    .object({
      extraLarge: z.string().nullish(),
      large: z.string().nullish(),
      color: z.string().nullish(),
    })
    .nullish()
    .transform((v) => ({
      extraLarge: v?.extraLarge ?? null,
      large: v?.large ?? null,
      color: v?.color ?? null,
    })),
  siteUrl: z.string(),
  format: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  status: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  episodes: z
    .number()
    .int()
    .nullish()
    .transform((v) => v ?? null),
  nextAiringEpisode: airingNodeSchema.nullish().transform((v) => v ?? null),
});

export const airingMediaSchema = mediaSchema.extend({
  airingSchedule: z
    .object({ nodes: z.array(airingNodeSchema.nullable()) })
    .nullish()
    .transform((v) => ({ nodes: (v?.nodes ?? []).filter((n) => n !== null) })),
});

export const searchResponseSchema = z.object({
  Page: z.object({ media: z.array(mediaSchema) }),
});

export const singleMediaResponseSchema = z.object({
  Media: mediaSchema.nullable(),
});

export const airingResponseSchema = z.object({
  media: z.object({ media: z.array(airingMediaSchema) }),
  recent: z.object({
    airingSchedules: z.array(
      z.object({
        mediaId: z.number().int(),
        episode: z.number().int(),
        airingAt: z.number().int(),
      }),
    ),
  }),
});

export const graphqlEnvelopeSchema = z.object({
  data: z.unknown().nullish(),
  errors: z
    .array(
      z.object({
        message: z.string(),
        status: z.number().nullish(),
      }),
    )
    .nullish(),
});
