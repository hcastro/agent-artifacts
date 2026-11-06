#!/usr/bin/env python3
"""Run offline MLX Whisper using an explicitly configured local model."""
import argparse
import contextlib
import json
import os
from pathlib import Path
import sys


def main():
    os.umask(0o077)
    os.environ.update(HF_HUB_OFFLINE='1', HF_HUB_DISABLE_TELEMETRY='1', DO_NOT_TRACK='1')
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('audio', type=Path); p.add_argument('model', type=Path); p.add_argument('output', type=Path)
    p.add_argument('--offset', type=float, default=0); p.add_argument('--language', choices=['en', 'es'])
    a = p.parse_args()
    try:
        if not a.model.is_dir() or not a.audio.is_file():
            raise ValueError('Local model and audio required')
        import mlx_whisper
        with contextlib.redirect_stdout(sys.stderr):
            result = mlx_whisper.transcribe(str(a.audio), path_or_hf_repo=str(a.model), language=a.language,
                                            task='transcribe', verbose=None, condition_on_previous_text=True)
        segments = []
        for s in result.get('segments', []):
            flags = []
            if s.get('avg_logprob', 0) < -1: flags.append('low_log_probability')
            if s.get('no_speech_prob', 0) > 0.6: flags.append('possible_non_speech')
            if s.get('compression_ratio', 0) > 2.4: flags.append('possible_repetition')
            segments.append(dict(start=a.offset + s['start'], end=a.offset + s['end'], text=s['text'], flags=flags))
        a.output.write_text(json.dumps(dict(text=result.get('text', ''), language=result.get('language'),
                              model=str(a.model), segments=segments, note='Speech only; no nonverbal audio coverage is established.'),
                                       ensure_ascii=False, indent=2) + '\n')
        a.output.chmod(0o600)
    except Exception:
        print('Local transcription failed. Check the configured MLX runtime and local model.', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
