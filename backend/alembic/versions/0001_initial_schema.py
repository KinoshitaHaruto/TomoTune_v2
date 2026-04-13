"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "music_types",
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_index(op.f("ix_music_types_code"), "music_types", ["code"], unique=False)

    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("spotify_id", sa.String(), nullable=True),
        sa.Column("score_vc", sa.Float(), nullable=True),
        sa.Column("score_ma", sa.Float(), nullable=True),
        sa.Column("score_pr", sa.Float(), nullable=True),
        sa.Column("score_hs", sa.Float(), nullable=True),
        sa.Column("var_vc", sa.Float(), nullable=True),
        sa.Column("var_ma", sa.Float(), nullable=True),
        sa.Column("var_pr", sa.Float(), nullable=True),
        sa.Column("var_hs", sa.Float(), nullable=True),
        sa.Column("last_liked_at", sa.DateTime(), nullable=True),
        sa.Column("music_type_code", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["music_type_code"], ["music_types.code"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("spotify_id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_name"), "users", ["name"], unique=False)
    op.create_index(op.f("ix_users_spotify_id"), "users", ["spotify_id"], unique=False)

    op.create_table(
        "songs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("artist", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("parameters", sa.String(), nullable=True),
        sa.Column("spotify_track_id", sa.String(), nullable=True),
        sa.Column("album_image", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("spotify_track_id"),
    )
    op.create_index(op.f("ix_songs_id"), "songs", ["id"], unique=False)
    op.create_index(op.f("ix_songs_spotify_track_id"), "songs", ["spotify_track_id"], unique=False)
    op.create_index(op.f("ix_songs_title"), "songs", ["title"], unique=False)

    op.create_table(
        "follows",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("follower_id", sa.String(), nullable=False),
        sa.Column("followed_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["followed_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["follower_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("follower_id", "followed_id", name="uq_follower_followed"),
    )
    op.create_index(op.f("ix_follows_id"), "follows", ["id"], unique=False)

    op.create_table(
        "like_logs",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("song_id", sa.Integer(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=True),
        sa.Column("observation_source", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_like_logs_id"), "like_logs", ["id"], unique=False)

    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("song_id", sa.Integer(), nullable=False),
        sa.Column("comment", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_posts_id"), "posts", ["id"], unique=False)

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False, autoincrement=True),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_comments_id"), "comments", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_comments_id"), table_name="comments")
    op.drop_table("comments")
    op.drop_index(op.f("ix_posts_id"), table_name="posts")
    op.drop_table("posts")
    op.drop_index(op.f("ix_like_logs_id"), table_name="like_logs")
    op.drop_table("like_logs")
    op.drop_index(op.f("ix_follows_id"), table_name="follows")
    op.drop_table("follows")
    op.drop_index(op.f("ix_songs_title"), table_name="songs")
    op.drop_index(op.f("ix_songs_spotify_track_id"), table_name="songs")
    op.drop_index(op.f("ix_songs_id"), table_name="songs")
    op.drop_table("songs")
    op.drop_index(op.f("ix_users_spotify_id"), table_name="users")
    op.drop_index(op.f("ix_users_name"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
    op.drop_index(op.f("ix_music_types_code"), table_name="music_types")
    op.drop_table("music_types")
