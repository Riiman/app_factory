"""add_acceptance_fields_to_scope_documents

Revision ID: 5c97ca55241c
Revises: aa533c42614b
Create Date: 2025-12-04 18:16:59.666305

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5c97ca55241c'
down_revision = 'aa533c42614b'
branch_labels = None
depends_on = None


def upgrade():
    # Add founder_accepted and admin_accepted columns to scope_documents table
    op.add_column('scope_documents', sa.Column('founder_accepted', sa.Boolean(), nullable=True))
    op.add_column('scope_documents', sa.Column('admin_accepted', sa.Boolean(), nullable=True))
    
    # Set default values for existing rows
    op.execute('UPDATE scope_documents SET founder_accepted = 0, admin_accepted = 0')


def downgrade():
    # Remove the columns if rolling back
    op.drop_column('scope_documents', 'admin_accepted')
    op.drop_column('scope_documents', 'founder_accepted')
