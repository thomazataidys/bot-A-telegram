import { DEFAULT_SETTINGS, prisma } from '../src/index.js';
import type { SettingKey } from '../src/index.js';

// groupChatId não é seedado: é definido pelo /configurargrupo ou pelo painel.
const SEEDED_KEYS: readonly SettingKey[] = [
  'notificationDelayMinutes',
  'syncIntervalMinutes',
  'timezone',
  'autoApproveUsers',
];

async function main(): Promise<void> {
  for (const key of SEEDED_KEYS) {
    // update vazio: não sobrescreve valores já alterados pelo painel/bot.
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: DEFAULT_SETTINGS[key] },
    });
  }
  console.log(`Seed concluído: ${SEEDED_KEYS.length} settings padrão.`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
