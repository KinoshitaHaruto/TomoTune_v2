"""
Cloudflare R2 へ MP3 ファイルをアップロードするスクリプト

事前準備:
  pip install boto3

使い方:
  $ cd backend
  $ R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx R2_BUCKET_NAME=xxx \
    python -m scripts.upload_to_r2

または .env に以下を設定してから実行:
  R2_ACCOUNT_ID=xxx
  R2_ACCESS_KEY_ID=xxx
  R2_SECRET_ACCESS_KEY=xxx
  R2_BUCKET_NAME=xxx
"""

import os
import sys
import mimetypes

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("boto3 が必要です: pip install boto3")
    sys.exit(1)

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, ".env"))

ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
ACCESS_KEY = os.environ.get("R2_ACCESS_KEY_ID", "")
SECRET_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")
BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "")

if not all([ACCOUNT_ID, ACCESS_KEY, SECRET_KEY, BUCKET_NAME]):
    print("環境変数が不足しています: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME")
    sys.exit(1)

STATIC_DIR = os.path.join(BASE_DIR, "static")


def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        region_name="auto",
    )


def upload_mp3s():
    client = get_r2_client()
    mp3_files = [f for f in os.listdir(STATIC_DIR) if f.endswith(".mp3")]

    if not mp3_files:
        print(f"MP3ファイルが見つかりません: {STATIC_DIR}")
        return

    print(f"{len(mp3_files)} 件のMP3をアップロードします...")

    for filename in sorted(mp3_files):
        filepath = os.path.join(STATIC_DIR, filename)
        content_type = mimetypes.guess_type(filename)[0] or "audio/mpeg"

        try:
            client.upload_file(
                filepath,
                BUCKET_NAME,
                filename,
                ExtraArgs={"ContentType": content_type},
            )
            print(f"  ✓ {filename}")
        except ClientError as e:
            print(f"  ✗ {filename}: {e}")

    print("アップロード完了")


if __name__ == "__main__":
    upload_mp3s()
