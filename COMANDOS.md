# Comandos do Bot — AnimeBot

Tudo que dá para fazer com o bot no Telegram, no privado ou no grupo.

---

## Antes de usar no grupo

1. No **@BotFather**: `/setprivacy` → escolha o bot → **Disable** (sem isso o bot não lê links e atalhos no grupo).
2. Adicione o bot ao grupo.
3. Mande `/configurargrupo` dentro do grupo (só para quem está em `ADMIN_TELEGRAM_IDS` no `.env`).

---

## Comandos

| Comando | O que faz | Exemplo |
|---|---|---|
| `/start` | Boas-vindas e resumo do que o bot faz. | `/start` |
| `/ajuda` | Lista todos os comandos e atalhos. | `/ajuda` |
| `/buscar <nome>` | Busca na AniList e mostra até 5 resultados, cada um com botão **➕ Adicionar**. | `/buscar frieren` |
| `/add <nome ou link>` | Adiciona um anime à sua lista. Por nome, mostra até 3 opções para escolher; por link da AniList ou MAL, adiciona direto. | `/add solo leveling` |
| `/lista` | Mostra a **sua** lista, agrupada por status (Assistindo, Quero ver, Completo). Toque no ⚙️ do anime para abrir os botões. | `/lista` |
| `/lista @usuario` | Mostra a lista de outra pessoa (só leitura). | `/lista @luiz` |
| `/global` | Todos os animes de todo mundo, com quem acompanha e em qual episódio. | `/global` |
| `/semana` | Episódios **desta semana** (segunda a domingo) dos animes da sua lista. | `/semana` |
| `/semana todos` | Episódios desta semana dos animes de todo mundo. | `/semana todos` |
| `/proxima` | Episódios da **próxima semana** da sua lista. | `/proxima` |
| `/proxima todos` | Episódios da próxima semana de todo mundo. | `/proxima todos` |
| `/vi <nome> <ep>` | Registra o último episódio que você viu. Se o nome bater com mais de um anime, mostra botões para escolher. | `/vi solo leveling 5` |
| `/remover <nome>` | Remove um anime da sua lista (pede confirmação). | `/remover frieren` |
| `/configurargrupo` | **Só admin, dentro do grupo.** Define este grupo como o que recebe os avisos de episódio novo. | `/configurargrupo` |

> Os horários de `/semana` e `/proxima` já vêm com o atraso somado (padrão +1 h do Japão), ou seja, é a hora estimada em que o episódio sai legendado.

---

## Atalhos (sem comando)

| Atalho | O que faz | Exemplo |
|---|---|---|
| `+ nome do anime` | Mostra até 3 opções; toque na correta para adicionar como **Assistindo**. | `+ dandadan` |
| Colar link da **AniList** | Adiciona direto à sua lista. | `https://anilist.co/anime/154587` |
| Colar link do **MyAnimeList** | Adiciona direto à sua lista. | `https://myanimelist.net/anime/52991` |
| Colar link da **Crunchyroll** | Mostra opções para você confirmar qual é o anime. | `https://www.crunchyroll.com/pt-br/series/GDKHZEJ0K/solo-leveling` |
| Colar o **compartilhamento de episódio** da Crunchyroll (botão compartilhar do app) | O bot lê o título, a temporada e o episódio do texto, mostra opções (priorizando a temporada certa) e, ao adicionar, pergunta se quer **salvar o progresso** naquele episódio. | `Check Out Solo Leveling S2 E5: Isso não é nada demais on Crunchyroll! https://www.crunchyroll.com/watch/GG1U2Q5V2/its-not-a-big-deal` |

Funciona em qualquer mensagem, no grupo ou no privado — o anime vai para a lista de **quem mandou**.

> Se a busca não achar nada, o bot tenta de novo com o título encurtado (antes da vírgula e depois antes dos dois-pontos) antes de dizer "Nenhum anime encontrado".
> Se o anime já estiver na sua lista, o bot responde **"Já está na sua lista"** e mostra os botões dele.
> Para adicionar pelo número da AniList use `/add 86` (o atalho `+ 86`, só com número, é ignorado).

---

## Botões de cada anime

Aparecem ao adicionar um anime ou ao tocar no ⚙️ em `/lista`.

| Botão | O que faz |
|---|---|
| `➕1 ep` | Soma 1 ao seu progresso. Ao chegar no último episódio, pergunta **"Marcar como completo?"**. |
| `✏️ Definir ep` | Pede o número do episódio — responda com o número na próxima mensagem. |
| `▶️ Assistindo` | Muda o status para Assistindo. |
| `🕒 Quero ver` | Muda o status para Quero ver. |
| `✅ Completo` | Marca como completo (o progresso vai para o último episódio). |
| `🗑 Remover` | Remove o anime da sua lista (com confirmação). |

Os botões só mexem na lista de **quem clicou**. Se alguém tocar no botão da lista de outra pessoa, recebe o aviso **"Esta lista não é sua."**

---

## Aviso de episódio novo (automático)

Cerca de **1 h depois** da exibição no Japão, o bot manda **uma** mensagem no grupo marcando todo mundo que tem o anime em **Assistindo** ou **Quero ver**:

```
🔔 Episódio novo!
Solo Leveling Season 2 — episódio 8 já deve estar disponível.
@thomaz @luiz
```

| Botão do aviso | O que faz |
|---|---|
| `✅ Vi` | Define o seu progresso como o episódio avisado (se o anime estiver na sua lista). |
| `🔗 AniList` | Abre a página do anime na AniList. |

- Quem marcou o anime como **Completo** não é mencionado.
- O mesmo episódio nunca é avisado duas vezes.
- Adicionar um anime antigo não dispara avisos de episódios que já passaram.
- O atraso (padrão 60 min) e o grupo podem ser mudados no painel, em **Configurações**.
