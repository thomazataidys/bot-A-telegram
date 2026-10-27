'use client';

import * as React from 'react';
import type {
  AniListMedia,
  GroupedUserList,
  ListStatus,
} from '@/types/contracts';
import {
  addAnimeToUserListAction,
  removeEntryAction,
  searchAnimeAction,
  setEntryProgressAction,
  setEntryStatusAction,
} from './actions';
import { AnimeSearchCombobox } from '@/components/anime-search-combobox';
import { UserListTabs } from '@/components/user-list-tabs';

export interface UserDetailClientProps {
  userList: GroupedUserList;
}

export function UserDetailClient({
  userList,
}: UserDetailClientProps): React.JSX.Element {
  const userId = userList.user.id;

  const handleSelectAnime = React.useCallback(
    async (media: AniListMedia, status: ListStatus) => {
      await addAnimeToUserListAction(userId, media.id, status);
    },
    [userId],
  );

  const handleSetProgress = React.useCallback(
    async (entryId: string, episode: number) => {
      await setEntryProgressAction(userId, entryId, episode);
    },
    [userId],
  );

  const handleSetStatus = React.useCallback(
    async (entryId: string, status: ListStatus) => {
      await setEntryStatusAction(userId, entryId, status);
    },
    [userId],
  );

  const handleRemoveEntry = React.useCallback(
    async (entryId: string) => {
      await removeEntryAction(userId, entryId);
    },
    [userId],
  );

  return (
    <div className="space-y-6">
      <AnimeSearchCombobox
        onSearch={searchAnimeAction}
        onSelect={handleSelectAnime}
      />

      <UserListTabs
        userList={userList}
        onSetProgress={handleSetProgress}
        onSetStatus={handleSetStatus}
        onRemoveEntry={handleRemoveEntry}
      />
    </div>
  );
}
