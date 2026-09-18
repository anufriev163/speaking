# 🎙️ Говори — Next-gen AI Voice Dictation for Windows & macOS

> **Speak naturally, write instantly.** The open-source, subscription-free alternative to Wispr Flow, Aqua Voice, and Superwhisper with sub-200ms latency.  
> Интеллектуальный голосовой ввод в любое приложение на базе **Whisper Large-v3-turbo** и **Llama 3.3 70B** — 100% бесплатно и без подписок.

[![Релиз](https://img.shields.io/github/v/release/anufriev163/speaking?color=blue&label=Версия)](https://github.com/anufriev163/speaking/releases/latest)
[![Скачать для Windows](https://img.shields.io/badge/Скачать-Windows%20(exe)-success?logo=windows)](https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-setup-1.0.6.exe)
[![Скачать для macOS](https://img.shields.io/badge/Скачать-macOS%20(dmg)-black?logo=apple)](https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-1.0.6.dmg)
[![GitHub Stars](https://img.shields.io/github/stars/anufriev163/speaking?style=social)](https://github.com/anufriev163/speaking)
[![Лицензия](https://img.shields.io/badge/Лицензия-MIT-orange)](#)

---

## 🚀 Скачать приложение

| Платформа | Файл загрузки | Инструкция |
| :--- | :--- | :--- |
| **Windows 10 / 11 (64-бит)** | [**Скачать Говори (govori-setup-1.0.6.exe)**](https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-setup-1.0.6.exe) | Запустите инсталлятор и следуйте подсказкам мастера установки. |
| **Windows 7 / 8 / 32-бит (Legacy)** | [**Скачать для старых ПК (govori-legacy-setup-1.0.6.exe)**](https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-legacy-setup-1.0.6.exe) | Облегчённая сборка для 32-битных и устаревших систем. |
| **macOS (Apple Silicon & Intel)** | [**Скачать DMG (govori-1.0.6.dmg)**](https://github.com/anufriev163/speaking/releases/download/v1.0.6/govori-1.0.6.dmg) | Откройте DMG и перетащите «говори» в папку Applications. |

> [!TIP]
> **При первом запуске на Windows (SmartScreen):**
> Так как приложение новое и открытое (Open Source), Windows может показать синее окно защиты *«Система защитила ваш компьютер»*.
> Нажмите **«Подробнее»** ➔ **«Выполнить в любом случае»**. Это стандартная процедура для программ без платного корпоративного сертификата Microsoft.

---

## ⚡ Чем «Говори» лучше аналогов?

| Возможность | Обычные сервисы (diktuy.ru и др.) | «Говори» (Govori AI) |
|---|---|---|
| **Скорость отклика (Latency)** | 2 000 – 4 000 мс | **⚡ 150 – 300 мс** (LPU-ускоренный Groq Whisper v3) |
| **Режимы записи** | Только клик | ✅ **Toggle** (нажал/отжал) и **Push-to-Talk** (говоришь пока держишь клавишу) |
| **ИИ-корректор стиля** | Базовая пунктуация | ✅ **Llama 3.3 70B** / GPT-4o-mini (исправление оговорок, пунктуация, стиль) |
| **Контекст приложения** | ❌ Не знает, куда вводится текст | ✅ **Автодетект**: форматирует код в IDE, живой стиль в мессенджерах, строгий в Word |
| **Слова-паразиты и запинки** | ❌ Оставляет все «эээ», «нуу», оговорки | ✅ **Умная очистка**: вырезает паразиты, учитывает исправления («в 5, ой нет, в 6» → «в 6») |
| **Голосовые команды (Hands-Free)** | ❌ Нет | ✅ «Новая строка», «новый абзац», «точка с запятой», «тире» |
| **Вставка текста** | Часто через буфер обмена (затирает `Ctrl+V`) | ✅ **Нативный `SendInput`** Unicode-символов (буфер обмена чист) |
| **Модель использования** | Платная подписка с лимитами минут/кредитов | ✅ **BYOK (Свой ключ)**: бесплатный ключ Groq дает **14 400 запросов в день бесплатно**! |
| **Безопасность ключей** | Обычный текст | ✅ Windows DPAPI (`safeStorage`) — ключи зашифрованы в ОС |
| **Потребление ресурсов** | 400 – 700 МБ RAM | ✅ Оптимизированный стек (~80–120 МБ) с нативным FFI (`koffi`) |

---

## 🛠️ Архитектура и стек технологий

- **Десктоп-оболочка**: Electron + Vite + React 19 + TypeScript + Tailwind CSS
- **Нативная интеграция Windows**: `koffi` (C-FFI) к библиотекам `user32.dll` и `kernel32.dll`:
  - `GetForegroundWindow` / `QueryFullProcessImageNameW` — мгновенный детект активного софта (VS Code, Telegram, Word и т.д.)
  - `SendInput` — прямой ввод символов в фокус текстового поля
  - `GetAsyncKeyState` — плавный Push-to-Talk без задержек
- **Аудио-движок**: Web Audio API + MediaStream (16 kHz Mono)
- **STT & LLM Pipeline**:
  - Сверхбыстрый Groq Whisper Large-v3-turbo (инференс ~150-250 мс)
  - Llama 3.3 70B Versatile для умной коррекции пунктуации и форматирования
  - OpenAI Whisper-1 / GPT-4o-mini fallback
  - Локальный / оффлайн режим
- **Floating HUD**: Frameless, Always-on-top плавающая пилюля (Dynamic Island) с живым эквалайзером (Waveform), PTT-индикатором и скоростью.
- **Автообновление**: Встроенный модуль `electron-updater`, проверяющий релизы на GitHub.

---

## ⌨️ Управление

- **`Ctrl + Space`** (настраивается) — начать / остановить диктовку (или удерживать в режиме Push-to-Talk).
- **Иконка в трее** — быстрый доступ к виджету, настройкам, проверке обновлений и выходу.
- **Клик по шестеренке в HUD** — открыть окно настроек (ИИ провайдеры, корректор, словарь, макросы, автозапуск).

---

## 🚀 Разработка и сборка

```bash
# 1. Установка зависимостей
npm install

# 2. Запуск в режиме разработки
npm run dev

# 3. Сборка установщика для Windows
npm run dist
```

---

## ⭐ Поддержите проект

Если **«Говори»** экономит ваше время и ускоряет работу — поставьте **звезду на GitHub**! Это лучшая мотивация развивать проект и добавлять новые функции.

[![Star History Chart](https://api.star-history.com/svg?repos=anufriev163/speaking&type=Date)](https://star-history.com/#anufriev163/speaking&Date)

---

## 📄 Лицензия

Распространяется под лицензией MIT. Подробности в файле [LICENSE](LICENSE).

