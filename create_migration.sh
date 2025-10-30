
#!/bin/bash

# Create a new migration
flask db migrate -m "Add verification and reset token fields to User model"

# Apply the migration
flask db upgrade

echo "Migration completed successfully!"
