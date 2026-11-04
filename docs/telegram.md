# Telegram notifications

The sentinel, the security watch, pr-metadata's "ready" notice and the watchdog send short messages through
`bin/notify`. Without Telegram they still work (desktop notifications and run summaries), but you miss alerts away from
the computer.

## Setup (5 minutes)

1. In Telegram, open a chat with `@BotFather`, send `/newbot`, choose a name and a username ending in `bot`. BotFather
   replies with a token like `123456:ABC...`. Keep it out of any chat, ticket or file.
2. In a terminal:

   ```bash
   <harness_dir>/bin/notify --setup
   ```

   Paste the token when asked (it is not shown). The helper checks it with Telegram and prints the bot's username.
3. On your phone, open the bot (`https://t.me/<username>`) and press **Start** within 3 minutes. The helper finds the
   chat, saves the token and the chat id in `<secrets_dir>/telegram.env` (permission 600), and sends a test message.
4. For a team: add the bot to a group, send `/start@<username>` in the group, run `--setup` again, keep the token, and
   pick the group.

Check any time: `<harness_dir>/bin/notify --status` and `<harness_dir>/bin/notify --test`.

## Behaviour

- Plain text only (issue titles are written by outsiders: no Markdown or HTML parsing).
- The token is never on a command line; curl reads the URL from standard input.
- Text with private details (your `private-patterns.txt`) is replaced by a short "withheld" notice.
- Quiet hours: from 23:00 to 07:00 local time messages arrive without sound. Change with
  `TELEGRAM_QUIET_HOURS=22-8` (or `off`) in `telegram.env`.
- Exit codes: 0 sent, 3 not set up (callers carry on), 5 Telegram refused or unreachable.
