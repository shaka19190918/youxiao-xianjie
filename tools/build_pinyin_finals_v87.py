"""Import byte-identical BLCU archive clips. This is NOT pronunciation approval."""
import argparse
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE_SHA = '07da9ac23960b9e7cf8a9a753ce63eab67474e6db6a4172d30a424ce303ad817'
FINALS = ['i', 'u', 'v', 'ui', 'iu', 'ie', 've', 'in', 'un', 'vn', 'ing', 'ong']

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    assert hashlib.sha256(args.archive.read_bytes()).hexdigest() == ARCHIVE_SHA
    target = ROOT / 'assets/pinyin-finals-v87'
    target.mkdir(exist_ok=True)
    files = {}
    with zipfile.ZipFile(args.archive) as archive:
        assert archive.testzip() is None
        for final in FINALS:
            for tone in range(1, 5):
                filename = f'{final}{tone}.mp3'
                members = [m for m in archive.infolist() if m.filename.rsplit('/', 1)[-1] == filename]
                assert len(members) == 1, filename
                data = archive.read(members[0])
                path = target / filename
                path.write_bytes(data)  # Generated asset, never downloaded from GitHub.
                probe = json.loads(subprocess.check_output([
                    'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                    '-of', 'json', str(path)], text=True))
                files[f'final_{final}|{tone}'] = dict(
                    audio='final_' + final, final=final, tone=tone, file=filename,
                    bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                    duration=float(probe['format']['duration']), phoneticReview='pending',
                )
    manifest = dict(schema='pinyin-finals-v87', count=48, checkedAt='2026-11-08',
        source='BLCU BCC historical download archive', archiveSha256=ARCHIVE_SHA,
        archiveUrl='https://web.archive.org/web/20220331230704id_/http://bcc.blcu.edu.cn/downloads/resources/%E6%B1%89%E8%AF%AD%E6%8B%BC%E9%9F%B3(mp3).zip',
        originalUrl='http://bcc.blcu.edu.cn/downloads/resources/%E6%B1%89%E8%AF%AD%E6%8B%BC%E9%9F%B3(mp3).zip',
        useScope='Non-commercial use requested by the site owner; no open/commercial license asserted.',
        professionalListeningComplete=False, files=files)
    (target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n', encoding='utf8')
    print('Imported 48 unchanged original clips; pronunciation review remains pending.')

if __name__ == '__main__':
    main()
