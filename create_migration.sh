
#!/bin/bash

# Check if a migration message is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <migration_message>"
  exit 1
fi

# Create a new migration
flask db migrate -m "$1"

# Apply the migration
flask db upgrade

echo "Migration completed successfully!"
