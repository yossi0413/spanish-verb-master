
import re

try:
    with open('data.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract CSV part
    match = re.search(r'const DEFAULT_DATA_CSV = `(.*?)`.trim\(\);', content, re.DOTALL)
    if not match:
        print("Could not find DEFAULT_DATA_CSV")
        exit(1)

    csv_data = match.group(1).strip()
    lines = csv_data.split('\n')
    
    print(f"Found {len(lines)} lines of CSV.")
    
    for i, line in enumerate(lines):
        if not line.strip(): continue
        parts = line.split(',')
        if len(parts) < 10:
            print(f"Error on line {i+1}: {line}")
            print(f"Expected 10+ columns, got {len(parts)}")
            exit(1)

    print("CSV data format looks correct.")

except Exception as e:
    print(f"An error occurred: {e}")
    exit(1)
