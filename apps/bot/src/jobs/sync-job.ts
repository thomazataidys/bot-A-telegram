import { SyncAlreadyRunningError, syncTrackedAnimes } from '@animebot/core';

export async function runSyncJob(): Promise<void> {
  try {
    const result = await syncTrackedAnimes();
    console.log(
      `Sync: ${result.syncedAnimesCount} anime(s), ${result.upsertedEpisodesCount} episódio(s)`,
    );
  } catch (error) {
    if (error instanceof SyncAlreadyRunningError) return;
    console.error('Erro no job de sincronização:', error);
  }
}
