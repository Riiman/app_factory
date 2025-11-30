"""Manually add COMPLETED to SubmissionStatus enum

Revision ID: 720595df4498
Revises: f1e1dd31413d
Create Date: 2025-11-29 04:22:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '720595df4498'
down_revision = 'f1e1dd31413d'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('submissions', schema=None) as batch_op:
        batch_op.alter_column('status',
               existing_type=sa.Enum('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', name='submissionstatus'),
               type_=sa.Enum('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', name='submissionstatus'),
               existing_nullable=False)


def downgrade():
    with op.batch_alter_table('submissions', schema=None) as batch_op:
        batch_op.alter_column('status',
               existing_type=sa.Enum('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', name='submissionstatus'),
               type_=sa.Enum('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', name='submissionstatus'),
               existing_nullable=False)