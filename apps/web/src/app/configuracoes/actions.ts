'use server';

import { revalidatePath } from 'next/cache';
import { getSettings, updateSettings } from '@animebot/core';
import { settingsFormSchema, type AppSettings } from '@/types/contracts';

export async function saveSettingsAction(input: AppSettings): Promise<void> {
  const parsed = settingsFormSchema.safeParse({
    groupChatId: input.groupChatId ?? '',
    notificationDelayMinutes: input.notificationDelayMinutes,
    syncIntervalMinutes: input.syncIntervalMinutes,
    timezone: input.timezone,
    autoApproveUsers: input.autoApproveUsers,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    throw new Error(firstIssue?.message ?? 'Configurações inválidas.');
  }

  await updateSettings({
    groupChatId:
      parsed.data.groupChatId.length > 0 ? parsed.data.groupChatId : null,
    notificationDelayMinutes: parsed.data.notificationDelayMinutes,
    syncIntervalMinutes: parsed.data.syncIntervalMinutes,
    timezone: parsed.data.timezone,
    autoApproveUsers: parsed.data.autoApproveUsers,
  });

  revalidatePath('/configuracoes');
  revalidatePath('/');
}

export async function sendTestGroupMessageAction(
  groupChatIdInput?: string,
): Promise<void> {
  const botToken = process.env.BOT_TOKEN?.trim();
  if (!botToken) {
    throw new Error(
      'A variável BOT_TOKEN não está configurada no ambiente do servidor.',
    );
  }

  const storedSettings = await getSettings();
  const targetChatId = (
    groupChatIdInput?.trim() ||
    storedSettings.groupChatId ||
    ''
  ).trim();

  if (!targetChatId) {
    throw new Error(
      'Nenhum ID de grupo (groupChatId) informado ou salvo nas configurações.',
    );
  }

  if (!/^-?\d+$/.test(targetChatId)) {
    throw new Error(
      'O ID do grupo deve conter apenas números (ex.: -1001234567890).',
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: '🔔 <b>Mensagem de teste — AnimeBot</b>\nAs notificações do painel administrativo estão conectadas a este grupo!',
        parse_mode: 'HTML',
      }),
    },
  );

  if (!response.ok) {
    let description = `HTTP ${response.status}`;
    try {
      const data = (await response.json()) as { description?: string };
      if (data.description) {
        description = data.description;
      }
    } catch {
      // ignora erro de parse do corpo
    }
    throw new Error(
      `Falha ao enviar mensagem pelo Telegram (${description}). Verifique se o bot está no grupo.`,
    );
  }
}
