import sys
import os
import json

# Set UTF-8 encoding for standard I/O on Windows
if sys.platform == 'win32':
    import io
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', line_buffering=True)
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)

model = None

def get_model():
    global model
    if model is None:
        from faster_whisper import WhisperModel
        model = WhisperModel('small', device='cpu', compute_type='int8')
    return model

def log(msg):
    sys.stderr.write(f"[WhisperWorker] {msg}\n")
    sys.stderr.flush()

def reply(req_id, payload):
    # Echo request id so the host can match answers to requests
    payload["id"] = req_id
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()

log("Worker initialized")

while True:
    req_id = None
    try:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue

        req = json.loads(line)
        req_id = req.get("id")
        action = req.get("action")

        if action == "ping":
            reply(req_id, {"status": "ok", "pong": True})
            continue

        if action == "warmup":
            get_model()
            reply(req_id, {"status": "ok", "warmed": True})
            continue

        if action == "transcribe":
            audio_path = req.get("path")
            if not audio_path or not os.path.exists(audio_path):
                reply(req_id, {"status": "error", "message": f"File not found: {audio_path}"})
                continue

            m = get_model()
            req_lang = req.get("language")
            chosen_lang = req_lang if (req_lang in ("ru", "en")) else None

            segments, info = m.transcribe(
                audio_path,
                language=chosen_lang,
                beam_size=2,
                temperature=0.0,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            text_parts = [seg.text.strip() for seg in segments if seg.text.strip()]
            full_text = " ".join(text_parts).strip()

            reply(req_id, {
                "status": "ok",
                "text": full_text,
                "duration": getattr(info, "duration", 0)
            })
            continue

        reply(req_id, {"status": "error", "message": f"Unknown action: {action}"})

    except Exception as e:
        log(f"Error handling request: {e}")
        try:
            reply(req_id, {"status": "error", "message": str(e)})
        except Exception:
            pass
