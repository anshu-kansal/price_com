from django.db import connection

tables = connection.introspection.table_names()
print("Tables with 'user' in name:")
for table in tables:
    if 'user' in table.lower():
        print(f"  - {table}")
